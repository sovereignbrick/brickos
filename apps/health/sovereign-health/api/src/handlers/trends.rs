// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::measurement::{CalculatedMarkerResponse, TrendPoint, TrendResponse},
};

#[derive(serde::Deserialize)]
pub struct TrendQuery {
    pub days: Option<i64>,
}

pub async fn trends(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    query: web::Query<TrendQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();

    // Validate days param (0 = all time)
    let days = query.days.unwrap_or(30);
    if !(0..=3650).contains(&days) {
        return Err(AppError::Validation(
            "days must be between 0 and 3650".to_string(),
        ));
    }

    // Check marker exists
    let marker_row =
        sqlx::query("SELECT id, marker_name, unit_canonical FROM markers WHERE marker_slug = $1")
            .bind(&marker_slug)
            .fetch_optional(pool.get_ref())
            .await?
            .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let marker_name: String = marker_row.try_get("marker_name").unwrap_or_default();
    let unit: String = marker_row.try_get("unit_canonical").unwrap_or_default();

    // Build interval string and fetch trend data
    let rows = if days == 0 {
        // All time — no date filter
        sqlx::query(
            r#"SELECT
                m.timestamp as measured_at,
                m.value_canonical as value,
                m.status,
                m.protocol_tag
            FROM measurements m
            JOIN markers mk ON mk.id = m.marker_id
            WHERE m.user_id = $1 AND mk.marker_slug = $2 AND m.is_deleted = false
            ORDER BY m.timestamp ASC
            LIMIT 1000"#,
        )
        .bind(auth.user_id)
        .bind(&marker_slug)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        let days_str = format!("{} days", days);
        sqlx::query(
            r#"SELECT
                m.timestamp as measured_at,
                m.value_canonical as value,
                m.status,
                m.protocol_tag
            FROM measurements m
            JOIN markers mk ON mk.id = m.marker_id
            WHERE m.user_id = $1 AND mk.marker_slug = $2 AND m.is_deleted = false
              AND m.timestamp >= now() - $3::interval
            ORDER BY m.timestamp ASC
            LIMIT 1000"#,
        )
        .bind(auth.user_id)
        .bind(&marker_slug)
        .bind(&days_str)
        .fetch_all(pool.get_ref())
        .await?
    };

    let points: Vec<TrendPoint> = rows
        .iter()
        .map(|row| TrendPoint {
            measured_at: row
                .try_get("measured_at")
                .unwrap_or_else(|_| chrono::Utc::now()),
            value: enc.decrypt_f64(&row.try_get::<String, _>("value").unwrap_or_default()),
            status: row.try_get("status").ok().flatten(),
            protocol_tag: row
                .try_get("protocol_tag")
                .unwrap_or_else(|_| "standard".to_string()),
        })
        .collect();

    let trend = TrendResponse {
        marker_slug,
        marker_name,
        unit,
        points,
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": trend,
        "error": null
    })))
}

pub async fn calculated_markers(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT
            cm.marker_slug, cm.marker_name, cm.formula_description,
            cm.display_order,
            cmv.value::float8 as latest_value,
            cmv.status,
            cmv.measured_at,
            cmv.protocol_tag
        FROM calculated_markers cm
        LEFT JOIN LATERAL (
            SELECT value, status, measured_at, protocol_tag
            FROM calculated_marker_values
            WHERE user_id = $1 AND calculated_marker_id = cm.id AND is_deleted = false
            ORDER BY measured_at DESC
            LIMIT 1
        ) cmv ON true
        ORDER BY cm.display_order"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    use sqlx::Row;
    let calculated: Vec<CalculatedMarkerResponse> = rows
        .iter()
        .map(|row| CalculatedMarkerResponse {
            marker_slug: row.try_get("marker_slug").unwrap_or_default(),
            marker_name: row.try_get("marker_name").unwrap_or_default(),
            formula: row.try_get("formula_description").unwrap_or_default(),
            latest_value: row.try_get("latest_value").ok().flatten(),
            status: row.try_get("status").ok().flatten(),
            measured_at: row.try_get("measured_at").ok().flatten(),
            protocol_tag: row.try_get("protocol_tag").ok().flatten(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": calculated,
        "error": null
    })))
}
