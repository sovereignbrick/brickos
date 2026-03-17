// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    services::{
        encryption::Encryptor,
        pdf_report::{
            ReportDevice, ReportInfluenceFactor, ReportIngredient, ReportMarker, ReportParams,
        },
        tier,
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Public alias used by export.rs
pub fn period_to_from_public(period: &str) -> chrono::DateTime<Utc> {
    period_to_from(period)
}

fn period_to_from(period: &str) -> chrono::DateTime<Utc> {
    let now = Utc::now();
    match period {
        "7d" => now - Duration::days(7),
        "30d" => now - Duration::days(30),
        "3m" => now - Duration::days(90),
        "6m" => now - Duration::days(180),
        "1y" => now - Duration::days(365),
        "all" => chrono::DateTime::<Utc>::MIN_UTC,
        _ => now - Duration::days(90),
    }
}

fn compute_trend(values: &[f64]) -> String {
    if values.len() < 2 {
        return "N/A".to_string();
    }
    let n = values.len() as f64;
    let sum_x: f64 = (0..values.len()).map(|i| i as f64).sum();
    let sum_y: f64 = values.iter().sum();
    let sum_xy: f64 = values.iter().enumerate().map(|(i, v)| i as f64 * v).sum();
    let sum_x2: f64 = (0..values.len()).map(|i| (i as f64).powi(2)).sum();
    let denom = n * sum_x2 - sum_x.powi(2);
    if denom.abs() < f64::EPSILON {
        return "Stable".to_string();
    }
    let slope = (n * sum_xy - sum_x * sum_y) / denom;
    let avg = sum_y / n;
    let pct = if avg.abs() > f64::EPSILON {
        (slope / avg) * 100.0
    } else {
        0.0
    };
    if pct > 3.0 {
        "Increasing".to_string()
    } else if pct < -3.0 {
        "Decreasing".to_string()
    } else {
        "Stable".to_string()
    }
}

fn change_text(values: &[f64]) -> String {
    if values.len() < 2 {
        return String::new();
    }
    let first = values.last().unwrap_or(&0.0);
    let last = values.first().unwrap_or(&0.0);
    if first.abs() < f64::EPSILON {
        return String::new();
    }
    let pct = ((last - first) / first * 100.0).round();
    if pct > 0.0 {
        format!("+{:.0}% over period", pct)
    } else if pct < 0.0 {
        format!("{:.0}% over period", pct)
    } else {
        "No change".to_string()
    }
}

async fn get_report_marker_data(
    pool: &PgPool,
    enc: &Encryptor,
    user_id: Uuid,
    from: chrono::DateTime<Utc>,
    zones_filter: Option<&Vec<String>>,
) -> Result<Vec<ReportMarker>, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"SELECT
            mk.marker_name, mk.marker_slug, mk.unit_canonical as unit_default,
            z.zone_name,
            m.value_canonical, m.unit_canonical, m.status, m.timestamp
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        JOIN zones z ON z.id = mk.zone_id
        WHERE m.user_id = $1 AND m.is_deleted = false AND m.timestamp >= $2
        ORDER BY mk.marker_slug, m.timestamp DESC"#,
    )
    .bind(user_id)
    .bind(from)
    .fetch_all(pool)
    .await?;

    // Group by marker (preserve insertion order)
    let mut slug_order: Vec<String> = Vec::new();
    type MarkerEntry = (String, String, String, f64, String);
    let mut marker_groups: std::collections::HashMap<String, Vec<MarkerEntry>> =
        std::collections::HashMap::new();

    for row in &rows {
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        let name: String = row.try_get("marker_name").unwrap_or_default();
        let zone: String = row.try_get("zone_name").unwrap_or_default();
        let value_enc: String = row.try_get("value_canonical").unwrap_or_default();
        let unit: String = row.try_get("unit_canonical").unwrap_or_default();
        let status: String = row
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_default();
        let value = enc.decrypt_f64(&value_enc);

        if let Some(filter) = zones_filter {
            let zone_slug: String = zone.to_lowercase().replace(' ', "-");
            if !filter.iter().any(|z| z == &zone_slug || z == &zone) {
                continue;
            }
        }

        if !slug_order.contains(&slug) {
            slug_order.push(slug.clone());
        }
        marker_groups
            .entry(slug)
            .or_default()
            .push((name, zone, unit, value, status));
    }

    let mut markers = Vec::new();
    for slug in &slug_order {
        let entries = match marker_groups.get(slug) {
            Some(e) if !e.is_empty() => e,
            _ => continue,
        };
        let (ref name, ref zone, ref unit, latest_val, ref status) = entries[0];
        let values: Vec<f64> = entries.iter().take(10).map(|e| e.3).collect();
        let trend = compute_trend(&values);
        let change = change_text(&values);

        markers.push(ReportMarker {
            zone_name: zone.clone(),
            marker_name: name.clone(),
            latest_value: latest_val,
            unit: unit.clone(),
            status: status.clone(),
            trend,
            range_text: String::new(),
            change_text: change,
        });
    }

    Ok(markers)
}

async fn get_report_devices(pool: &PgPool, user_id: Uuid) -> Result<Vec<ReportDevice>, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT device_name, device_type, markers_measured FROM devices WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            let markers_json: Option<serde_json::Value> = r
                .try_get::<Option<serde_json::Value>, _>("markers_measured")
                .ok()
                .flatten();
            let markers: Vec<String> = markers_json
                .and_then(|v| {
                    v.as_array().map(|arr| {
                        arr.iter()
                            .filter_map(|item| item.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                })
                .unwrap_or_default();

            ReportDevice {
                name: r.try_get("device_name").unwrap_or_default(),
                device_type: r
                    .try_get::<Option<String>, _>("device_type")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
                markers,
            }
        })
        .collect())
}

async fn get_report_influence_factors(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<ReportInfluenceFactor>, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"SELECT id, name, factor_type, dosage, frequency
           FROM influence_factors
           WHERE user_id = $1 AND is_active = true
           ORDER BY factor_type, name"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let mut factors = Vec::new();
    for row in &rows {
        let factor_id: Uuid = row.try_get("id").unwrap_or_default();

        let ingr_rows = sqlx::query(
            "SELECT name, amount, role FROM influence_factor_ingredients WHERE factor_id = $1 ORDER BY sort_order",
        )
        .bind(factor_id)
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        let ingredients: Vec<ReportIngredient> = ingr_rows
            .iter()
            .map(|i| ReportIngredient {
                name: i.try_get::<String, _>("name").unwrap_or_default(),
                amount: i
                    .try_get::<Option<String>, _>("amount")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
                role: i
                    .try_get::<Option<String>, _>("role")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
            })
            .collect();

        factors.push(ReportInfluenceFactor {
            name: row.try_get::<String, _>("name").unwrap_or_default(),
            factor_type: row.try_get::<String, _>("factor_type").unwrap_or_default(),
            brand: String::new(),
            dosage: row
                .try_get::<Option<String>, _>("dosage")
                .ok()
                .flatten()
                .unwrap_or_default(),
            frequency: row
                .try_get::<Option<String>, _>("frequency")
                .ok()
                .flatten()
                .unwrap_or_default(),
            ingredients,
        });
    }

    Ok(factors)
}

fn quota_period_start(tier_slug: &str) -> NaiveDate {
    let today = Utc::now().date_naive();
    if tier_slug == "horizon" {
        // Weekly for Horizon
        let weekday = today.weekday().num_days_from_monday();
        today - Duration::days(weekday as i64)
    } else {
        // Monthly for others
        NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap_or(today)
    }
}

async fn check_and_increment_quota(
    pool: &PgPool,
    user_id: Uuid,
    tier_slug: &str,
    limit: Option<i32>,
) -> Result<(i32, Option<i32>), AppError> {
    let period_start = quota_period_start(tier_slug);

    let current: i32 = sqlx::query_scalar(
        "SELECT COALESCE((SELECT count FROM report_quota WHERE user_id = $1 AND report_type = 'health_pdf' AND period_start = $2), 0)",
    )
    .bind(user_id)
    .bind(period_start)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    if let Some(max) = limit {
        if current >= max {
            return Err(AppError::QuotaExceeded);
        }
    }

    sqlx::query(
        r#"INSERT INTO report_quota (user_id, report_type, period_start, count)
           VALUES ($1, 'health_pdf', $2, 1)
           ON CONFLICT (user_id, report_type, period_start)
           DO UPDATE SET count = report_quota.count + 1"#,
    )
    .bind(user_id)
    .bind(period_start)
    .execute(pool)
    .await?;

    Ok((current + 1, limit))
}

pub async fn record_history(
    pool: &PgPool,
    user_id: Uuid,
    report_type: &str,
    period: &str,
    size: i32,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO report_history (user_id, report_type, period, file_size_bytes) VALUES ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(report_type)
    .bind(period)
    .bind(size)
    .execute(pool)
    .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// POST /reports/health-pdf
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct PdfReportRequest {
    #[serde(default = "default_period")]
    pub period: String,
    pub zones: Option<Vec<String>>,
}

fn default_period() -> String {
    "3m".to_string()
}

pub async fn health_pdf(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    body: web::Json<PdfReportRequest>,
) -> Result<HttpResponse, AppError> {
    // Check tier
    let tier_limits = tier::get_user_tier(pool.get_ref(), auth.user_id).await?;

    // Glimpse and Focus cannot generate PDF reports
    if tier_limits.pdf_reports_monthly == Some(0) {
        return Ok(HttpResponse::Forbidden().json(json!({
            "data": null,
            "error": {
                "code": "upgrade_required",
                "message": "PDF health reports are available on Insight and above. Upgrade to generate reports for your doctor.",
                "upgrade_url": "/pricing"
            }
        })));
    }

    // Check quota
    check_and_increment_quota(
        pool.get_ref(),
        auth.user_id,
        &tier_limits.tier_slug,
        tier_limits.pdf_reports_monthly,
    )
    .await?;

    // Get user info
    use sqlx::Row;
    let user_row = sqlx::query("SELECT display_name, email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_one(pool.get_ref())
        .await?;
    let user_name: String = user_row
        .try_get::<Option<String>, _>("display_name")
        .ok()
        .flatten()
        .unwrap_or_else(|| "Health Report".to_string());
    let user_email: String = user_row
        .try_get::<Option<String>, _>("email")
        .ok()
        .flatten()
        .unwrap_or_default();

    // Get profile data (encrypted fields)
    let profile_row = sqlx::query(
        "SELECT height_cm, default_waist_cm, default_weight_kg, country_code, gender, age FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let user_age: Option<i32> = profile_row
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("age").ok().flatten())
        .map(|v| enc.decrypt_f64(&v) as i32);

    let user_gender: Option<String> = profile_row
        .as_ref()
        .and_then(|r| enc.decrypt_opt(r.try_get::<Option<String>, _>("gender").ok().flatten()));

    let user_country: Option<String> = profile_row.as_ref().and_then(|r| {
        r.try_get::<Option<String>, _>("country_code")
            .ok()
            .flatten()
    });

    let user_height_cm: Option<f64> = profile_row
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("height_cm").ok().flatten())
        .map(|v| enc.decrypt_f64(&v));

    let user_weight_kg: Option<f64> = profile_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_weight_kg")
                .ok()
                .flatten()
        })
        .map(|v| enc.decrypt_f64(&v));

    let user_waist_cm: Option<f64> = profile_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_waist_cm")
                .ok()
                .flatten()
        })
        .map(|v| enc.decrypt_f64(&v));

    // Get diet protocol and fasting protocol
    let pref_row = sqlx::query(
        "SELECT default_diet_protocol, default_fasting_protocol FROM user_preferences WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let protocol: String = pref_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_diet_protocol")
                .ok()
                .flatten()
        })
        .unwrap_or_default();

    let fasting_protocol: String = pref_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_fasting_protocol")
                .ok()
                .flatten()
        })
        .unwrap_or_default();

    let from = period_to_from(&body.period);
    let to = Utc::now();

    // Fetch marker data
    let markers = get_report_marker_data(
        pool.get_ref(),
        enc.get_ref(),
        auth.user_id,
        from,
        body.zones.as_ref(),
    )
    .await?;

    // Count measurements
    let measurement_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false AND timestamp >= $2",
    )
    .bind(auth.user_id)
    .bind(from)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Get unique zones
    let mut zones: Vec<String> = markers.iter().map(|m| m.zone_name.clone()).collect();
    zones.sort();
    zones.dedup();

    // Get devices
    let devices = get_report_devices(pool.get_ref(), auth.user_id).await?;

    // Get influence factors (replaces old medications)
    let influence_factors = get_report_influence_factors(pool.get_ref(), auth.user_id).await?;

    let params = ReportParams {
        user_name,
        user_email,
        user_age,
        user_gender,
        user_country,
        user_height_cm,
        user_weight_kg,
        user_waist_cm,
        date_from: from,
        date_to: to,
        total_markers: markers.len(),
        measurement_count,
        zones,
        diet_protocol: protocol,
        fasting_protocol,
        markers,
        devices,
        influence_factors,
        is_demo: false,
    };

    let pdf_bytes = crate::services::pdf_report::generate_health_report(&params).map_err(|e| {
        tracing::error!("PDF generation failed: {e}");
        AppError::Internal
    })?;

    let size = pdf_bytes.len() as i32;
    let _ = record_history(
        pool.get_ref(),
        auth.user_id,
        "health_pdf",
        &body.period,
        size,
    )
    .await;

    let filename = format!("health-report-{}.pdf", Utc::now().format("%Y-%m-%d"));
    Ok(HttpResponse::Ok()
        .content_type("application/pdf")
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", filename),
        ))
        .body(pdf_bytes))
}

// ---------------------------------------------------------------------------
// GET /reports/history
// ---------------------------------------------------------------------------

pub async fn report_history(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT id, report_type, period, file_size_bytes, created_at FROM report_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "report_type": r.try_get::<String, _>("report_type").unwrap_or_default(),
                "period": r.try_get::<String, _>("period").unwrap_or_default(),
                "file_size_bytes": r.try_get::<Option<i32>, _>("file_size_bytes").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at").unwrap_or_else(|_| Utc::now()).to_rfc3339(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": items,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /reports/quota
// ---------------------------------------------------------------------------

pub async fn report_quota(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let tier_limits = tier::get_user_tier(pool.get_ref(), auth.user_id).await?;
    let period_start = quota_period_start(&tier_limits.tier_slug);

    let used: i32 = sqlx::query_scalar(
        "SELECT COALESCE((SELECT count FROM report_quota WHERE user_id = $1 AND report_type = 'health_pdf' AND period_start = $2), 0)",
    )
    .bind(auth.user_id)
    .bind(period_start)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "used": used,
            "limit": tier_limits.pdf_reports_monthly,
            "period": if tier_limits.tier_slug == "horizon" { "week" } else { "month" },
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /export/json (Task 5)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct JsonExportQuery {
    pub period: Option<String>,
    pub zones: Option<String>,
    pub markers: Option<String>,
}

pub async fn export_json(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    query: web::Query<JsonExportQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Tier check
    tier::check_feature(pool.get_ref(), auth.user_id, "json_export").await?;

    // Log data access (GDPR audit trail)
    crate::services::access_log::log_self_access(
        pool.get_ref(),
        auth.user_id,
        "export_json",
        "measurements",
    )
    .await;

    let period = query.period.as_deref().unwrap_or("all");
    let from = period_to_from(period);

    // Profile (enhanced: includes country, waist, weight, gender, age)
    let profile_row = sqlx::query(
        "SELECT height_cm, default_waist_cm, default_weight_kg, country_code, gender, age FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let pref_row = sqlx::query(
        "SELECT default_diet_protocol, default_fasting_protocol, default_exercise, default_sleep_hours::text, default_sleep_quality, default_stress_level FROM user_preferences WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let protocol: String = pref_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_diet_protocol")
                .ok()
                .flatten()
        })
        .unwrap_or_default();

    let height = profile_row
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("height_cm").ok().flatten())
        .map(|v| enc.decrypt_f64(&v));

    let waist = profile_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_waist_cm")
                .ok()
                .flatten()
        })
        .map(|v| enc.decrypt_f64(&v));

    let weight = profile_row
        .as_ref()
        .and_then(|r| {
            r.try_get::<Option<String>, _>("default_weight_kg")
                .ok()
                .flatten()
        })
        .map(|v| enc.decrypt_f64(&v));

    let country_code = profile_row.as_ref().and_then(|r| {
        r.try_get::<Option<String>, _>("country_code")
            .ok()
            .flatten()
    });

    let gender = profile_row
        .as_ref()
        .and_then(|r| enc.decrypt_opt(r.try_get::<Option<String>, _>("gender").ok().flatten()));

    let age = profile_row
        .as_ref()
        .and_then(|r| r.try_get::<Option<String>, _>("age").ok().flatten())
        .map(|v| enc.decrypt_f64(&v));

    // Measurements
    let marker_filter: Option<Vec<String>> = query
        .markers
        .as_ref()
        .map(|m| m.split(',').map(|s| s.trim().to_string()).collect());

    let rows = sqlx::query(
        r#"SELECT m.timestamp, mk.marker_slug, mk.marker_name,
            m.value_canonical, m.unit_canonical, m.status,
            m.protocol_tag, m.diet_protocol, m.fasting_hours,
            m.exercise_activity, m.sleep_hours, m.sleep_quality,
            m.stress_level, m.lifestyle_note, d.device_name
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.user_id = $1 AND m.is_deleted = false AND m.timestamp >= $2
        ORDER BY m.timestamp DESC"#,
    )
    .bind(auth.user_id)
    .bind(from)
    .fetch_all(pool.get_ref())
    .await?;

    let mut measurements = Vec::new();
    for row in &rows {
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        if let Some(ref filter) = marker_filter {
            if !filter.contains(&slug) {
                continue;
            }
        }
        let ts: chrono::DateTime<Utc> = row.try_get("timestamp").unwrap_or_else(|_| Utc::now());
        let value = enc.decrypt_f64(
            &row.try_get::<String, _>("value_canonical")
                .unwrap_or_default(),
        );

        measurements.push(json!({
            "date": ts.format("%Y-%m-%d").to_string(),
            "time": ts.format("%H:%M").to_string(),
            "marker": slug,
            "marker_name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
            "value": value,
            "unit": row.try_get::<String, _>("unit_canonical").unwrap_or_default(),
            "status": row.try_get::<Option<String>, _>("status").ok().flatten(),
            "device": row.try_get::<Option<String>, _>("device_name").ok().flatten(),
            "lifestyle": {
                "protocol": row.try_get::<Option<String>, _>("diet_protocol").ok().flatten(),
                "fasting_hours": row.try_get::<Option<f32>, _>("fasting_hours").ok().flatten(),
                "exercise": row.try_get::<Option<String>, _>("exercise_activity").ok().flatten(),
                "sleep_hours": row.try_get::<Option<f32>, _>("sleep_hours").ok().flatten(),
                "stress": row.try_get::<Option<i32>, _>("stress_level").ok().flatten(),
            }
        }));
    }

    // Medications (legacy)
    let med_rows = sqlx::query(
        "SELECT medication_slug, custom_name, dosage, frequency, timing, start_date, end_date, notes, is_active, created_at FROM user_medications WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let meds: Vec<serde_json::Value> = med_rows
        .iter()
        .map(|r| {
            json!({
                "medication_slug": r.try_get::<String, _>("medication_slug").unwrap_or_default(),
                "custom_name": r.try_get::<Option<String>, _>("custom_name").ok().flatten(),
                "dosage": r.try_get::<Option<String>, _>("dosage").ok().flatten(),
                "frequency": r.try_get::<Option<String>, _>("frequency").ok().flatten(),
                "timing": r.try_get::<Option<String>, _>("timing").ok().flatten(),
                "start_date": r.try_get::<Option<chrono::NaiveDate>, _>("start_date").ok().flatten().map(|d| d.to_string()),
                "end_date": r.try_get::<Option<chrono::NaiveDate>, _>("end_date").ok().flatten().map(|d| d.to_string()),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
                "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                    .map(|t| t.to_rfc3339())
                    .unwrap_or_default(),
            })
        })
        .collect();

    // Influence factors with ingredients
    let inf_rows = sqlx::query(
        r#"SELECT id, name, factor_type, dosage, frequency,
                  form, prescriber, start_date, reason, notes, is_active, source, created_at
           FROM influence_factors
           WHERE user_id = $1
           ORDER BY factor_type, name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let mut influence_factors = Vec::new();
    for inf in &inf_rows {
        let factor_id: uuid::Uuid = inf.try_get("id").unwrap_or_default();

        let ingr_rows = sqlx::query(
            "SELECT name, amount, role, sort_order FROM influence_factor_ingredients WHERE factor_id = $1 ORDER BY sort_order",
        )
        .bind(factor_id)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let ingredients: Vec<serde_json::Value> = ingr_rows
            .iter()
            .map(|i| {
                json!({
                    "name": i.try_get::<String, _>("name").unwrap_or_default(),
                    "amount": i.try_get::<Option<String>, _>("amount").ok().flatten(),
                    "role": i.try_get::<Option<String>, _>("role").ok().flatten(),
                    "sort_order": i.try_get::<Option<i32>, _>("sort_order").ok().flatten(),
                })
            })
            .collect();

        influence_factors.push(json!({
            "id": factor_id,
            "name": inf.try_get::<String, _>("name").unwrap_or_default(),
            "factor_type": inf.try_get::<String, _>("factor_type").unwrap_or_default(),
            "brand": null,
            "dosage": inf.try_get::<Option<String>, _>("dosage").ok().flatten(),
            "frequency": inf.try_get::<Option<String>, _>("frequency").ok().flatten(),
            "form": inf.try_get::<Option<String>, _>("form").ok().flatten(),
            "prescriber": inf.try_get::<Option<String>, _>("prescriber").ok().flatten(),
            "start_date": inf.try_get::<Option<chrono::NaiveDate>, _>("start_date").ok().flatten().map(|d| d.to_string()),
            "reason": inf.try_get::<Option<String>, _>("reason").ok().flatten(),
            "notes": inf.try_get::<Option<String>, _>("notes").ok().flatten(),
            "is_active": inf.try_get::<bool, _>("is_active").unwrap_or(true),
            "source": inf.try_get::<Option<String>, _>("source").ok().flatten(),
            "created_at": inf.try_get::<chrono::DateTime<Utc>, _>("created_at")
                .map(|t| t.to_rfc3339())
                .unwrap_or_default(),
            "ingredients": ingredients,
        }));
    }

    // Devices
    let device_rows = sqlx::query(
        "SELECT device_name, device_type, markers_measured, status, calibration_notes, known_bias FROM devices WHERE user_id = $1 AND is_deleted = false",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let devices: Vec<serde_json::Value> = device_rows
        .iter()
        .map(|r| {
            json!({
                "device_name": r.try_get::<String, _>("device_name").unwrap_or_default(),
                "device_type": r.try_get::<Option<String>, _>("device_type").ok().flatten(),
                "markers_measured": r.try_get::<Option<serde_json::Value>, _>("markers_measured").ok().flatten(),
                "status": r.try_get::<Option<String>, _>("status").ok().flatten(),
                "calibration_notes": r.try_get::<Option<String>, _>("calibration_notes").ok().flatten(),
                "known_bias": r.try_get::<Option<String>, _>("known_bias").ok().flatten(),
            })
        })
        .collect();

    // Custom reference ranges
    let ref_rows = sqlx::query(
        r#"SELECT mk.marker_name, mk.marker_slug, rr.protocol_context,
                  rr.green_min::text, rr.green_max::text, rr.orange_min::text, rr.orange_max::text
           FROM reference_ranges rr
           JOIN markers mk ON mk.id = rr.marker_id
           WHERE rr.user_id = $1 AND rr.is_custom = true"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let custom_ref_ranges: Vec<serde_json::Value> = ref_rows
        .iter()
        .map(|r| {
            json!({
                "marker_name": r.try_get::<String, _>("marker_name").unwrap_or_default(),
                "marker_slug": r.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "protocol_context": r.try_get::<Option<String>, _>("protocol_context").ok().flatten(),
                "green_min": r.try_get::<Option<String>, _>("green_min").ok().flatten(),
                "green_max": r.try_get::<Option<String>, _>("green_max").ok().flatten(),
                "orange_min": r.try_get::<Option<String>, _>("orange_min").ok().flatten(),
                "orange_max": r.try_get::<Option<String>, _>("orange_max").ok().flatten(),
            })
        })
        .collect();

    // User preferences (lifestyle defaults)
    let lifestyle_defaults = pref_row.as_ref().map(|r| {
        json!({
            "default_diet_protocol": r.try_get::<Option<String>, _>("default_diet_protocol").ok().flatten(),
            "default_fasting_protocol": r.try_get::<Option<String>, _>("default_fasting_protocol").ok().flatten(),
            "default_exercise": r.try_get::<Option<String>, _>("default_exercise").ok().flatten(),
            "default_sleep_hours": r.try_get::<Option<String>, _>("default_sleep_hours").ok().flatten(),
            "default_sleep_quality": r.try_get::<Option<String>, _>("default_sleep_quality").ok().flatten(),
            "default_stress_level": r.try_get::<Option<String>, _>("default_stress_level").ok().flatten(),
        })
    });

    // Doctor Chat conversations (GDPR Art.20 portability - PRV-004)
    let conv_rows = sqlx::query(
        "SELECT id, title, agent_type, created_at FROM doctor_chat_conversations WHERE user_id = $1 AND is_deleted = false ORDER BY created_at",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let mut conversations = Vec::new();
    for conv in &conv_rows {
        let conv_id: uuid::Uuid = conv.try_get("id").unwrap_or_default();
        let msg_rows = sqlx::query(
            "SELECT role, content, tokens_used, created_at FROM doctor_chat_messages WHERE conversation_id = $1 ORDER BY created_at",
        )
        .bind(conv_id)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let messages: Vec<serde_json::Value> = msg_rows
            .iter()
            .map(|m| {
                let content_raw: String = m.try_get("content").unwrap_or_default();
                let content = enc.decrypt(&content_raw).unwrap_or(content_raw);
                json!({
                    "role": m.try_get::<String, _>("role").unwrap_or_default(),
                    "content": content,
                    "tokens_used": m.try_get::<Option<i32>, _>("tokens_used").ok().flatten(),
                    "created_at": m.try_get::<chrono::DateTime<Utc>, _>("created_at")
                        .map(|t| t.to_rfc3339())
                        .unwrap_or_default(),
                })
            })
            .collect();

        conversations.push(json!({
            "title": conv.try_get::<Option<String>, _>("title").ok().flatten(),
            "agent_type": conv.try_get::<Option<String>, _>("agent_type").ok().flatten(),
            "created_at": conv.try_get::<chrono::DateTime<Utc>, _>("created_at")
                .map(|t| t.to_rfc3339())
                .unwrap_or_default(),
            "messages": messages,
        }));
    }

    let export = json!({
        "exported_at": Utc::now().to_rfc3339(),
        "version": "1.3",
        "profile": {
            "height_cm": height,
            "default_waist_cm": waist,
            "default_weight_kg": weight,
            "country_code": country_code,
            "gender": gender,
            "age": age,
            "diet_protocol": protocol,
        },
        "measurements": measurements,
        "medications": meds,
        "influence_factors": influence_factors,
        "devices": devices,
        "custom_reference_ranges": custom_ref_ranges,
        "lifestyle_defaults": lifestyle_defaults,
        "conversations": conversations,
    });

    let json_str = serde_json::to_string_pretty(&export).map_err(|_| AppError::Internal)?;
    let size = json_str.len() as i32;

    let _ = record_history(pool.get_ref(), auth.user_id, "json_export", period, size).await;

    let filename = format!(
        "sovereign-health-export-{}.json",
        Utc::now().format("%Y-%m-%d")
    );
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", filename),
        ))
        .body(json_str))
}

// ---------------------------------------------------------------------------
// ZIP helpers
// ---------------------------------------------------------------------------
