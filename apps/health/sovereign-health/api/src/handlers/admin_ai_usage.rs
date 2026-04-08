// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Datelike;
use serde::Deserialize;
use sqlx::{PgPool, Row};

use crate::error::AppError;
use crate::middleware::auth::AdminUser;

#[derive(Deserialize)]
pub struct AiUsageQuery {
    period: Option<String>,
    date: Option<String>,
    app_key: Option<String>,
}

pub async fn get_usage(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<AiUsageQuery>,
) -> Result<HttpResponse, AppError> {
    let period = query.period.as_deref().unwrap_or("month");
    let date = query
        .date
        .as_deref()
        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());

    let (start_date, end_date) = match period {
        "day" => (date, date + chrono::Duration::days(1)),
        "week" => {
            let start = date - chrono::Duration::days(date.weekday().num_days_from_monday() as i64);
            (start, start + chrono::Duration::days(7))
        }
        "year" => {
            let start = chrono::NaiveDate::from_ymd_opt(date.year(), 1, 1).unwrap_or(date);
            let end = chrono::NaiveDate::from_ymd_opt(date.year() + 1, 1, 1).unwrap_or(date);
            (start, end)
        }
        _ => {
            // month
            let start =
                chrono::NaiveDate::from_ymd_opt(date.year(), date.month(), 1).unwrap_or(date);
            let end = if date.month() == 12 {
                chrono::NaiveDate::from_ymd_opt(date.year() + 1, 1, 1).unwrap_or(date)
            } else {
                chrono::NaiveDate::from_ymd_opt(date.year(), date.month() + 1, 1).unwrap_or(date)
            };
            (start, end)
        }
    };

    let app_key = query.app_key.as_deref().unwrap_or("");

    // Totals
    let totals = sqlx::query(
        "SELECT COALESCE(SUM(input_tokens), 0)::bigint as total_input, \
         COALESCE(SUM(output_tokens), 0)::bigint as total_output, \
         COALESCE(SUM(cost_eur::float8), 0.0) as total_cost, \
         COUNT(*)::bigint as total_calls \
         FROM ai_usage_log WHERE created_at >= $1::date AND created_at < $2::date \
         AND ($3 = '' OR COALESCE(app_key, 'shi') = $3)",
    )
    .bind(start_date)
    .bind(end_date)
    .bind(app_key)
    .fetch_one(pool.get_ref())
    .await?;

    // By user
    let by_user = sqlx::query(
        r#"SELECT a.user_id, u.email, u.display_name,
                  COALESCE((SELECT lt.slug FROM license_tiers lt JOIN user_licenses ul ON ul.tier_id = lt.id WHERE ul.user_id = a.user_id AND lt.is_active = true LIMIT 1), 'free') as tier,
                  SUM(a.input_tokens)::bigint as input_tokens,
                  SUM(a.output_tokens)::bigint as output_tokens,
                  SUM(a.cost_eur::float8) as cost_eur,
                  COUNT(*)::bigint as calls
           FROM ai_usage_log a
           LEFT JOIN users u ON u.id = a.user_id
           WHERE a.created_at >= $1::date AND a.created_at < $2::date
             AND ($3 = '' OR COALESCE(a.app_key, 'shi') = $3)
           GROUP BY a.user_id, u.email, u.display_name
           ORDER BY SUM(a.cost_eur::float8) DESC"#,
    )
    .bind(start_date)
    .bind(end_date)
    .bind(app_key)
    .fetch_all(pool.get_ref())
    .await?;

    // By model
    let by_model = sqlx::query(
        "SELECT model, COUNT(*)::bigint as calls, \
         SUM(cost_eur::float8) as cost_eur, \
         SUM(input_tokens)::bigint as input_tokens, \
         SUM(output_tokens)::bigint as output_tokens \
         FROM ai_usage_log WHERE created_at >= $1::date AND created_at < $2::date \
         AND ($3 = '' OR COALESCE(app_key, 'shi') = $3) \
         GROUP BY model ORDER BY SUM(cost_eur::float8) DESC",
    )
    .bind(start_date)
    .bind(end_date)
    .bind(app_key)
    .fetch_all(pool.get_ref())
    .await?;

    // By type
    let by_type = sqlx::query(
        "SELECT session_type, COUNT(*)::bigint as calls, \
         SUM(cost_eur::float8) as cost_eur \
         FROM ai_usage_log WHERE created_at >= $1::date AND created_at < $2::date \
         AND ($3 = '' OR COALESCE(app_key, 'shi') = $3) \
         GROUP BY session_type ORDER BY SUM(cost_eur::float8) DESC",
    )
    .bind(start_date)
    .bind(end_date)
    .bind(app_key)
    .fetch_all(pool.get_ref())
    .await?;

    let period_str = match period {
        "day" => date.format("%Y-%m-%d").to_string(),
        "week" => format!("{} W{}", date.format("%Y"), date.iso_week().week()),
        "year" => date.format("%Y").to_string(),
        _ => date.format("%Y-%m").to_string(),
    };

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "period": period_str,
            "date_range": { "start": start_date.to_string(), "end": end_date.to_string() },
            "total_cost_eur": totals.try_get::<f64, _>("total_cost").unwrap_or(0.0),
            "total_input_tokens": totals.try_get::<i64, _>("total_input").unwrap_or(0),
            "total_output_tokens": totals.try_get::<i64, _>("total_output").unwrap_or(0),
            "total_calls": totals.try_get::<i64, _>("total_calls").unwrap_or(0),
            "by_user": by_user.iter().map(|r| serde_json::json!({
                "user_id": r.try_get::<Option<uuid::Uuid>, _>("user_id").ok().flatten(),
                "email": r.try_get::<Option<String>, _>("email").ok().flatten().unwrap_or_else(|| "Public Chat".to_string()),
                "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "tier": r.try_get::<Option<String>, _>("tier").ok().flatten().unwrap_or_else(|| "free".to_string()),
                "input_tokens": r.try_get::<i64, _>("input_tokens").unwrap_or(0),
                "output_tokens": r.try_get::<i64, _>("output_tokens").unwrap_or(0),
                "cost_eur": r.try_get::<f64, _>("cost_eur").unwrap_or(0.0),
                "calls": r.try_get::<i64, _>("calls").unwrap_or(0),
            })).collect::<Vec<_>>(),
            "by_model": by_model.iter().map(|r| serde_json::json!({
                "model": r.try_get::<String, _>("model").unwrap_or_default(),
                "calls": r.try_get::<i64, _>("calls").unwrap_or(0),
                "cost_eur": r.try_get::<f64, _>("cost_eur").unwrap_or(0.0),
                "input_tokens": r.try_get::<i64, _>("input_tokens").unwrap_or(0),
                "output_tokens": r.try_get::<i64, _>("output_tokens").unwrap_or(0),
            })).collect::<Vec<_>>(),
            "by_type": by_type.iter().map(|r| serde_json::json!({
                "session_type": r.try_get::<String, _>("session_type").unwrap_or_default(),
                "calls": r.try_get::<i64, _>("calls").unwrap_or(0),
                "cost_eur": r.try_get::<f64, _>("cost_eur").unwrap_or(0.0),
            })).collect::<Vec<_>>(),
        },
        "error": null
    })))
}
