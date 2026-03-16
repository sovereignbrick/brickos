// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

fn resolve_locale_from_req(req: &HttpRequest) -> String {
    let al = req
        .headers()
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok());
    crate::services::content::resolve_locale(None, al)
}

// ── query param structs ──────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct MeasurementsQuery {
    pub limit: Option<i64>,
    pub profile: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct TrendQuery {
    pub period: Option<String>,
    pub profile: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct DemoDetailQuery {
    pub profile: Option<String>,
}

fn demo_profile(p: &Option<String>) -> &str {
    p.as_deref().unwrap_or("optimized")
}

// ── helpers ──────────────────────────────────────────────────────────────────

/// Convert period string → days (use 3650 for "all time")
fn period_to_days(period: &str) -> Option<i64> {
    match period {
        "7d" => Some(7),
        "30d" => Some(30),
        "3m" => Some(90),
        "6m" => Some(180),
        "1y" => Some(365),
        "all" => Some(3650),
        _ => None,
    }
}

/// Units for calculated markers (not stored in DB yet)
fn calc_unit(slug: &str) -> &'static str {
    match slug {
        "bmi" => "kg/m²",
        "whtr" | "gki" | "dr_boz_ratio" | "hct_hb_ratio" | "tg_hdl_ratio" => "ratio",
        "homa_ir" | "tyg_index" => "index",
        _ => "ratio",
    }
}

/// Build reference-range JSON from orange/green bounds.
/// Returns None if both green bounds are NULL (marker has no universal range).
fn build_range_json(
    orange_min: Option<f64>,
    green_min: Option<f64>,
    green_max: Option<f64>,
    orange_max: Option<f64>,
    unit: &str,
) -> Option<serde_json::Value> {
    if green_min.is_none() && green_max.is_none() {
        return None;
    }
    Some(json!({
        "green_min":        green_min,
        "green_max":        green_max,
        "yellow_low_min":   orange_min,
        "yellow_low_max":   green_min,
        "yellow_high_min":  green_max,
        "yellow_high_max":  orange_max,
        "red_low_max":      orange_min,
        "red_high_min":     orange_max,
        "unit":             unit,
    }))
}

// ── GET /markers ─────────────────────────────────────────────────────────────

pub async fn list(
    pool: web::Data<PgPool>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT mk.marker_slug, mk.marker_name, mk.unit_canonical, mk.display_order, z.zone_slug
           FROM markers mk
           JOIN zones z ON z.id = mk.zone_id
           ORDER BY mk.display_order"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    use sqlx::Row;
    let markers: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "marker_slug":    r.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "marker_name":    r.try_get::<String, _>("marker_name").unwrap_or_default(),
                "unit_canonical": r.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "display_order":  r.try_get::<i32, _>("display_order").unwrap_or_default(),
                "zone_slug":      r.try_get::<String, _>("zone_slug").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": markers, "error": null })))
}

// ── GET /markers/{slug} ───────────────────────────────────────────────────────

pub async fn detail(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    use sqlx::Row;

    // ── Try standard markers table first ─────────────────────────────────────
    let maybe_row = sqlx::query(
        "SELECT id, marker_name, unit_canonical, source_type FROM markers WHERE marker_slug = $1",
    )
    .bind(&marker_slug)
    .fetch_optional(pool.get_ref())
    .await?;

    if let Some(row) = maybe_row {
        let marker_id: uuid::Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
        let marker_name: String = row.try_get("marker_name").unwrap_or_default();
        let unit: String = row.try_get("unit_canonical").unwrap_or_default();
        let source_type: String = row
            .try_get("source_type")
            .unwrap_or_else(|_| "home".to_string());

        // Zone memberships
        let zones = fetch_zones(&pool, &marker_slug, "en").await?;

        // Standard reference range
        let rr = fetch_range(&pool, marker_id, auth.user_id, "standard", &unit).await?;
        // Fasting override
        let fasting = fetch_range(&pool, marker_id, auth.user_id, "fasting", &unit).await?;

        // Latest measurement
        let latest =
            fetch_latest_measurement(&pool, auth.user_id, marker_id, &unit, enc.get_ref()).await?;

        // Description
        let description = fetch_description(&pool, &marker_slug, "en").await?;
        let fasting_explanation = fetch_fasting_explanation(&pool, &marker_slug, "en").await?;

        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "marker_id":       marker_slug,
                "name":            marker_name,
                "unit":            unit,
                "source_type":     source_type,
                "zones":           zones,
                "reference_range": rr,
                "fasting_range":   fasting,
                "fasting_explanation": fasting_explanation,
                "latest":          latest,
                "is_calculated":   false,
                "description":     description,
            },
            "error": null
        })));
    }

    // ── Try calculated_markers table ──────────────────────────────────────────
    let maybe_calc = sqlx::query(
        r#"SELECT id, marker_name, formula_description, default_thresholds, protocol_overrides, source_type, base_markers_required
           FROM calculated_markers WHERE marker_slug = $1"#,
    )
    .bind(&marker_slug)
    .fetch_optional(pool.get_ref())
    .await?;

    if let Some(row) = maybe_calc {
        let calc_id: uuid::Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
        let marker_name: String = row.try_get("marker_name").unwrap_or_default();
        let formula: String = row.try_get("formula_description").unwrap_or_default();
        let source_type: String = row
            .try_get("source_type")
            .unwrap_or_else(|_| "calculated".to_string());
        let thresholds: serde_json::Value = row.try_get("default_thresholds").unwrap_or(json!({}));
        let overrides: serde_json::Value = row.try_get("protocol_overrides").unwrap_or(json!({}));
        let unit = calc_unit(&marker_slug).to_string();

        let zones = fetch_zones(&pool, &marker_slug, "en").await?;

        let reference_range = {
            let om = thresholds["orange_min"].as_f64();
            let gmin = thresholds["green_min"].as_f64();
            let gmax = thresholds["green_max"].as_f64();
            let omax = thresholds["orange_max"].as_f64();
            build_range_json(om, gmin, gmax, omax, &unit)
        };

        // Fasting range from protocol_overrides
        let fasting_range = if let Some(ft) = overrides.get("fasting") {
            let om = ft["orange_min"].as_f64();
            let gmin = ft["green_min"].as_f64();
            let gmax = ft["green_max"].as_f64();
            let omax = ft["orange_max"].as_f64();
            build_range_json(om, gmin, gmax, omax, &unit)
        } else {
            None
        };

        // Latest calculated value
        let latest_calc = sqlx::query(
            r#"SELECT cmv.value::float8 as value, cmv.measured_at, cmv.status
               FROM calculated_marker_values cmv
               WHERE cmv.user_id = $1 AND cmv.calculated_marker_id = $2
                 AND cmv.is_deleted = false
               ORDER BY cmv.measured_at DESC LIMIT 1"#,
        )
        .bind(auth.user_id)
        .bind(calc_id)
        .fetch_optional(pool.get_ref())
        .await?;

        let latest = latest_calc.as_ref().map(|r| {
            json!({
                "value":     r.try_get::<f64, _>("value").unwrap_or_default(),
                "unit":      unit,
                "timestamp": r.try_get::<chrono::DateTime<chrono::Utc>, _>("measured_at")
                              .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "status":    r.try_get::<Option<String>, _>("status").unwrap_or(None),
            })
        });

        // Description
        let description = fetch_description(pool.get_ref(), &marker_slug, "en").await?;
        let fasting_explanation =
            fetch_fasting_explanation(pool.get_ref(), &marker_slug, "en").await?;

        // Base markers for calculated marker links
        let base_markers: Vec<String> = row
            .try_get::<Vec<String>, _>("base_markers_required")
            .unwrap_or_default();

        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "marker_id":       marker_slug,
                "name":            marker_name,
                "unit":            unit,
                "source_type":     source_type,
                "formula":         formula,
                "zones":           zones,
                "reference_range": reference_range,
                "fasting_range":   fasting_range,
                "fasting_explanation": fasting_explanation,
                "latest":          latest,
                "is_calculated":   true,
                "description":     description,
                "base_markers":    base_markers,
            },
            "error": null
        })));
    }

    Err(AppError::NotFound)
}

// ── GET /markers/{slug}/measurements?limit=5 ─────────────────────────────────

pub async fn marker_measurements(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    query: web::Query<MeasurementsQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let limit = query.limit.unwrap_or(5).clamp(1, 50);
    use sqlx::Row;

    // Verify marker exists (in markers or calculated_markers)
    let marker_exists = sqlx::query(
        "SELECT 1 FROM markers WHERE marker_slug = $1 UNION ALL SELECT 1 FROM calculated_markers WHERE marker_slug = $1 LIMIT 1",
    )
    .bind(&marker_slug)
    .fetch_optional(pool.get_ref())
    .await?;
    if marker_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let rows = sqlx::query(
        r#"SELECT
               m.id, m.value_canonical as value, m.unit_canonical,
               m.timestamp, m.status, m.protocol_tag,
               m.fasting_protocol, m.fasting_hours, m.diet_protocol,
               m.exercise_activity, m.sleep_hours, m.sleep_quality,
               m.stress_level, m.lifestyle_note,
               d.device_name
           FROM measurements m
           JOIN markers mk ON mk.id = m.marker_id
           LEFT JOIN devices d ON d.id = m.device_id
           WHERE m.user_id = $1 AND mk.marker_slug = $2 AND m.is_deleted = false
           ORDER BY m.timestamp DESC
           LIMIT $3"#,
    )
    .bind(auth.user_id)
    .bind(&marker_slug)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await?;

    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id":                r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
                "value":             enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()),
                "unit":              r.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "timestamp":         r.try_get::<chrono::DateTime<chrono::Utc>, _>("timestamp")
                                      .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "status":            r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "protocol_tag":      r.try_get::<String, _>("protocol_tag").unwrap_or_default(),
                "fasting_protocol":  r.try_get::<Option<String>, _>("fasting_protocol").unwrap_or(None),
                "fasting_hours":     r.try_get::<Option<i32>, _>("fasting_hours").unwrap_or(None),
                "diet_protocol":     r.try_get::<Option<String>, _>("diet_protocol").unwrap_or(None),
                "exercise_activity": r.try_get::<Option<String>, _>("exercise_activity").unwrap_or(None),
                "sleep_hours":       r.try_get::<Option<f64>, _>("sleep_hours").unwrap_or(None),
                "sleep_quality":     r.try_get::<Option<String>, _>("sleep_quality").unwrap_or(None),
                "stress_level":      r.try_get::<Option<i32>, _>("stress_level").unwrap_or(None),
                "lifestyle_note":    enc.decrypt_opt(r.try_get::<Option<String>, _>("lifestyle_note").unwrap_or(None)),
                "device_name":       r.try_get::<Option<String>, _>("device_name").unwrap_or(None),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

// ── GET /markers/{slug}/trend?period=3m ──────────────────────────────────────

pub async fn marker_trend(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    query: web::Query<TrendQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let period = query.period.as_deref().unwrap_or("3m");
    use sqlx::Row;

    let days = period_to_days(period).ok_or_else(|| {
        AppError::Validation("Invalid period. Use: 7d, 30d, 3m, 6m, 1y, all".to_string())
    })?;

    // Try standard markers first, then calculated markers
    let marker_row =
        sqlx::query("SELECT marker_name, unit_canonical FROM markers WHERE marker_slug = $1")
            .bind(&marker_slug)
            .fetch_optional(pool.get_ref())
            .await?;

    let (marker_name, unit, is_calculated) = if let Some(row) = marker_row {
        (
            row.try_get::<String, _>("marker_name").unwrap_or_default(),
            row.try_get::<String, _>("unit_canonical")
                .unwrap_or_default(),
            false,
        )
    } else {
        let calc_row =
            sqlx::query("SELECT marker_name FROM calculated_markers WHERE marker_slug = $1")
                .bind(&marker_slug)
                .fetch_optional(pool.get_ref())
                .await?
                .ok_or(AppError::NotFound)?;
        (
            calc_row
                .try_get::<String, _>("marker_name")
                .unwrap_or_default(),
            calc_unit(&marker_slug).to_string(),
            true,
        )
    };

    let days_str = format!("{} days", days);

    let rows = if is_calculated {
        // Calculated markers store values in calculated_marker_values
        sqlx::query(
            r#"SELECT cmv.measured_at, cmv.value::text as value,
                      cmv.status, 'standard' as protocol_tag
               FROM calculated_marker_values cmv
               JOIN calculated_markers cm ON cm.id = cmv.calculated_marker_id
               WHERE cmv.user_id = $1 AND cm.marker_slug = $2 AND cmv.is_deleted = false
                 AND cmv.measured_at >= now() - $3::interval
               ORDER BY cmv.measured_at ASC"#,
        )
        .bind(auth.user_id)
        .bind(&marker_slug)
        .bind(&days_str)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        sqlx::query(
            r#"SELECT m.timestamp as measured_at, m.value_canonical as value,
                      m.status, m.protocol_tag
               FROM measurements m
               JOIN markers mk ON mk.id = m.marker_id
               WHERE m.user_id = $1 AND mk.marker_slug = $2 AND m.is_deleted = false
                 AND m.timestamp >= now() - $3::interval
               ORDER BY m.timestamp ASC"#,
        )
        .bind(auth.user_id)
        .bind(&marker_slug)
        .bind(&days_str)
        .fetch_all(pool.get_ref())
        .await?
    };

    let points: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "measured_at":  r.try_get::<chrono::DateTime<chrono::Utc>, _>("measured_at")
                                 .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "value":        enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()),
                "status":       r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "protocol_tag": r.try_get::<String, _>("protocol_tag").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "marker_slug": marker_slug,
            "marker_name": marker_name,
            "unit":        unit,
            "points":      points,
        },
        "error": null
    })))
}

// ── private helpers ───────────────────────────────────────────────────────────

async fn fetch_zones(
    pool: &PgPool,
    marker_slug: &str,
    locale: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    use sqlx::Row;
    let rows = sqlx::query(
        r#"SELECT zm.zone_slug,
                  COALESCE(zt.name, zte.name, z.zone_name) AS zone_name,
                  z.zone_icon
           FROM zone_markers zm
           JOIN zones z ON z.zone_slug = zm.zone_slug
           LEFT JOIN zone_translations zt ON zt.zone_id = z.id AND zt.locale = $2
           LEFT JOIN zone_translations zte ON zte.zone_id = z.id AND zte.locale = 'en'
           WHERE zm.marker_slug = $1
           ORDER BY zm.display_order"#,
    )
    .bind(marker_slug)
    .bind(locale)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            json!({
                "slug": r.try_get::<String, _>("zone_slug").unwrap_or_default(),
                "name": r.try_get::<String, _>("zone_name").unwrap_or_default(),
                "icon": r.try_get::<String, _>("zone_icon").unwrap_or_default(),
            })
        })
        .collect())
}

async fn fetch_range(
    pool: &PgPool,
    marker_id: uuid::Uuid,
    user_id: uuid::Uuid,
    protocol: &str,
    unit: &str,
) -> Result<Option<serde_json::Value>, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"SELECT orange_min::float8, green_min::float8, green_max::float8, orange_max::float8
           FROM reference_ranges
           WHERE marker_id = $1
             AND protocol_context = $2
             AND (user_id = $3 OR user_id IS NULL)
           ORDER BY (user_id IS NULL) ASC
           LIMIT 1"#,
    )
    .bind(marker_id)
    .bind(protocol)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.as_ref().and_then(|r| {
        let om: Option<f64> = r.try_get("orange_min").ok().flatten();
        let gmin: Option<f64> = r.try_get("green_min").ok().flatten();
        let gmax: Option<f64> = r.try_get("green_max").ok().flatten();
        let omax: Option<f64> = r.try_get("orange_max").ok().flatten();
        build_range_json(om, gmin, gmax, omax, unit)
    }))
}

async fn fetch_latest_measurement(
    pool: &PgPool,
    user_id: uuid::Uuid,
    marker_id: uuid::Uuid,
    unit: &str,
    enc: &crate::services::encryption::Encryptor,
) -> Result<Option<serde_json::Value>, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"SELECT m.value_canonical as value, m.unit_canonical, m.timestamp, m.status,
                  d.device_name
           FROM measurements m
           LEFT JOIN devices d ON d.id = m.device_id
           WHERE m.user_id = $1 AND m.marker_id = $2 AND m.is_deleted = false
           ORDER BY m.timestamp DESC LIMIT 1"#,
    )
    .bind(user_id)
    .bind(marker_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.as_ref().map(|r| {
        json!({
            "value":       enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()),
            "unit":        r.try_get::<String, _>("unit_canonical").unwrap_or_else(|_| unit.to_string()),
            "timestamp":   r.try_get::<chrono::DateTime<chrono::Utc>, _>("timestamp")
                            .map(|t| t.to_rfc3339()).unwrap_or_default(),
            "status":      r.try_get::<Option<String>, _>("status").unwrap_or(None),
            "device_name": r.try_get::<Option<String>, _>("device_name").unwrap_or(None),
        })
    }))
}

// ── demo variants (called from handlers/demo.rs) ──────────────────────────────

pub async fn demo_detail(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    query: web::Query<DemoDetailQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let profile = demo_profile(&query.profile);
    let locale = resolve_locale_from_req(&req);
    use sqlx::Row;

    let maybe_row = sqlx::query(
        r#"SELECT m.id, COALESCE(mt.name, mte.name, m.marker_name) AS marker_name,
                  m.unit_canonical, m.source_type
           FROM markers m
           LEFT JOIN marker_translations mt ON mt.marker_id = m.id AND mt.locale = $2
           LEFT JOIN marker_translations mte ON mte.marker_id = m.id AND mte.locale = 'en'
           WHERE m.marker_slug = $1"#,
    )
    .bind(&marker_slug)
    .bind(&locale)
    .fetch_optional(pool.get_ref())
    .await?;

    if let Some(row) = maybe_row {
        let marker_id: uuid::Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
        let marker_name: String = row.try_get("marker_name").unwrap_or_default();
        let unit: String = row.try_get("unit_canonical").unwrap_or_default();
        let source_type: String = row
            .try_get("source_type")
            .unwrap_or_else(|_| "home".to_string());

        let zones = fetch_zones(pool.get_ref(), &marker_slug, &locale).await?;
        let rr = fetch_system_range(pool.get_ref(), marker_id, "standard", &unit).await?;
        let fasting = fetch_system_range(pool.get_ref(), marker_id, "fasting", &unit).await?;
        let latest =
            fetch_latest_demo_measurement(pool.get_ref(), marker_id, &unit, profile, enc.get_ref())
                .await?;
        let description = fetch_description(pool.get_ref(), &marker_slug, &locale).await?;
        let fasting_explanation =
            fetch_fasting_explanation(pool.get_ref(), &marker_slug, &locale).await?;

        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "marker_id":       marker_slug,
                "name":            marker_name,
                "unit":            unit,
                "source_type":     source_type,
                "zones":           zones,
                "reference_range": rr,
                "fasting_range":   fasting,
                "fasting_explanation": fasting_explanation,
                "latest":          latest,
                "is_calculated":   false,
                "description":     description,
            },
            "error": null
        })));
    }

    let maybe_calc = sqlx::query(
        r#"SELECT id, marker_name, formula_description, default_thresholds, protocol_overrides, source_type, base_markers_required
           FROM calculated_markers WHERE marker_slug = $1"#,
    )
    .bind(&marker_slug)
    .fetch_optional(pool.get_ref())
    .await?;

    if let Some(row) = maybe_calc {
        let marker_name: String = row.try_get("marker_name").unwrap_or_default();
        let formula: String = row.try_get("formula_description").unwrap_or_default();
        let source_type: String = row
            .try_get("source_type")
            .unwrap_or_else(|_| "calculated".to_string());
        let thresholds: serde_json::Value = row.try_get("default_thresholds").unwrap_or(json!({}));
        let overrides: serde_json::Value = row.try_get("protocol_overrides").unwrap_or(json!({}));
        let unit = calc_unit(&marker_slug).to_string();
        let base_markers: Vec<String> = row
            .try_get::<Vec<String>, _>("base_markers_required")
            .unwrap_or_default();

        let zones = fetch_zones(pool.get_ref(), &marker_slug, &locale).await?;
        let description = fetch_description(pool.get_ref(), &marker_slug, &locale).await?;
        let fasting_explanation =
            fetch_fasting_explanation(pool.get_ref(), &marker_slug, &locale).await?;
        let reference_range = {
            let om = thresholds["orange_min"].as_f64();
            let gmin = thresholds["green_min"].as_f64();
            let gmax = thresholds["green_max"].as_f64();
            let omax = thresholds["orange_max"].as_f64();
            build_range_json(om, gmin, gmax, omax, &unit)
        };

        let fasting_range = if let Some(ft) = overrides.get("fasting") {
            let om = ft["orange_min"].as_f64();
            let gmin = ft["green_min"].as_f64();
            let gmax = ft["green_max"].as_f64();
            let omax = ft["orange_max"].as_f64();
            build_range_json(om, gmin, gmax, omax, &unit)
        } else {
            None
        };

        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "marker_id":       marker_slug,
                "name":            marker_name,
                "unit":            unit,
                "source_type":     source_type,
                "formula":         formula,
                "zones":           zones,
                "reference_range": reference_range,
                "fasting_range":   fasting_range,
                "fasting_explanation": fasting_explanation,
                "latest":          null,
                "is_calculated":   true,
                "description":     description,
                "base_markers":    base_markers,
            },
            "error": null
        })));
    }

    Err(AppError::NotFound)
}

pub async fn demo_marker_measurements(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    query: web::Query<MeasurementsQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let limit = query.limit.unwrap_or(5).clamp(1, 50);
    let profile = demo_profile(&query.profile);
    use sqlx::Row;

    // Check both standard and calculated markers
    let marker_exists = sqlx::query(
        "SELECT 1 FROM markers WHERE marker_slug = $1 UNION ALL SELECT 1 FROM calculated_markers WHERE marker_slug = $1 LIMIT 1",
    )
    .bind(&marker_slug)
    .fetch_optional(pool.get_ref())
    .await?;
    if marker_exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Check if it's a calculated marker
    let is_calculated = sqlx::query("SELECT 1 FROM calculated_markers WHERE marker_slug = $1")
        .bind(&marker_slug)
        .fetch_optional(pool.get_ref())
        .await?
        .is_some();

    let items: Vec<serde_json::Value> = if is_calculated {
        let rows = sqlx::query(
            r#"SELECT cmv.id, cmv.value::text as value, cmv.status,
                      cmv.measured_at as timestamp, 'standard' as protocol_tag
               FROM calculated_marker_values cmv
               JOIN calculated_markers cm ON cm.id = cmv.calculated_marker_id
               WHERE cmv.is_demo = true AND cmv.demo_profile = $3 AND cm.marker_slug = $1 AND cmv.is_deleted = false
               ORDER BY cmv.measured_at DESC
               LIMIT $2"#,
        )
        .bind(&marker_slug)
        .bind(limit)
        .bind(profile)
        .fetch_all(pool.get_ref())
        .await?;

        let unit = calc_unit(&marker_slug).to_string();
        rows.iter().map(|r| {
            json!({
                "id":                r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
                "value":             r.try_get::<String, _>("value").ok().and_then(|s| s.parse::<f64>().ok()),
                "unit":              unit,
                "timestamp":         r.try_get::<chrono::DateTime<chrono::Utc>, _>("timestamp")
                                      .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "status":            r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "protocol_tag":      r.try_get::<String, _>("protocol_tag").unwrap_or_default(),
                "device_name":       Option::<String>::None,
            })
        }).collect()
    } else {
        let rows = sqlx::query(
            r#"SELECT m.id, m.value_canonical as value, m.unit_canonical,
                      m.timestamp, m.status, m.protocol_tag,
                      m.fasting_protocol, m.fasting_hours, m.diet_protocol,
                      m.exercise_activity, m.sleep_hours, m.sleep_quality,
                      m.stress_level, m.lifestyle_note,
                      d.device_name
               FROM measurements m
               JOIN markers mk ON mk.id = m.marker_id
               LEFT JOIN devices d ON d.id = m.device_id
               WHERE m.is_demo = true AND m.demo_profile = $3 AND mk.marker_slug = $1 AND m.is_deleted = false
               ORDER BY m.timestamp DESC
               LIMIT $2"#,
        )
        .bind(&marker_slug)
        .bind(limit)
        .bind(profile)
        .fetch_all(pool.get_ref())
        .await?;

        rows.iter().map(|r| {
            json!({
                "id":                r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
                "value":             enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()),
                "unit":              r.try_get::<String, _>("unit_canonical").unwrap_or_default(),
                "timestamp":         r.try_get::<chrono::DateTime<chrono::Utc>, _>("timestamp")
                                      .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "status":            r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "protocol_tag":      r.try_get::<String, _>("protocol_tag").unwrap_or_default(),
                "fasting_protocol":  r.try_get::<Option<String>, _>("fasting_protocol").unwrap_or(None),
                "fasting_hours":     r.try_get::<Option<i32>, _>("fasting_hours").unwrap_or(None),
                "diet_protocol":     r.try_get::<Option<String>, _>("diet_protocol").unwrap_or(None),
                "exercise_activity": r.try_get::<Option<String>, _>("exercise_activity").unwrap_or(None),
                "sleep_hours":       r.try_get::<Option<f64>, _>("sleep_hours").unwrap_or(None),
                "sleep_quality":     r.try_get::<Option<String>, _>("sleep_quality").unwrap_or(None),
                "stress_level":      r.try_get::<Option<i32>, _>("stress_level").unwrap_or(None),
                "lifestyle_note":    enc.decrypt_opt(r.try_get::<Option<String>, _>("lifestyle_note").unwrap_or(None)),
                "device_name":       r.try_get::<Option<String>, _>("device_name").unwrap_or(None),
            })
        }).collect()
    };

    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

pub async fn demo_marker_trend(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    query: web::Query<TrendQuery>,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let period = query.period.as_deref().unwrap_or("3m");
    let profile = demo_profile(&query.profile);
    use sqlx::Row;

    let days = period_to_days(period).ok_or_else(|| {
        AppError::Validation("Invalid period. Use: 7d, 30d, 3m, 6m, 1y, all".to_string())
    })?;

    // Try standard markers first, then calculated markers
    let marker_row =
        sqlx::query("SELECT marker_name, unit_canonical FROM markers WHERE marker_slug = $1")
            .bind(&marker_slug)
            .fetch_optional(pool.get_ref())
            .await?;

    let (marker_name, unit, is_calculated) = if let Some(row) = marker_row {
        (
            row.try_get::<String, _>("marker_name").unwrap_or_default(),
            row.try_get::<String, _>("unit_canonical")
                .unwrap_or_default(),
            false,
        )
    } else {
        let calc_row =
            sqlx::query("SELECT marker_name FROM calculated_markers WHERE marker_slug = $1")
                .bind(&marker_slug)
                .fetch_optional(pool.get_ref())
                .await?
                .ok_or(AppError::NotFound)?;
        (
            calc_row
                .try_get::<String, _>("marker_name")
                .unwrap_or_default(),
            calc_unit(&marker_slug).to_string(),
            true,
        )
    };

    let days_str = format!("{} days", days);

    let rows = if is_calculated {
        sqlx::query(
            r#"SELECT cmv.measured_at, cmv.value::text as value,
                      cmv.status, 'standard' as protocol_tag
               FROM calculated_marker_values cmv
               JOIN calculated_markers cm ON cm.id = cmv.calculated_marker_id
               WHERE cmv.is_demo = true AND cmv.demo_profile = $3 AND cm.marker_slug = $1 AND cmv.is_deleted = false
                 AND cmv.measured_at >= now() - $2::interval
               ORDER BY cmv.measured_at ASC"#,
        )
        .bind(&marker_slug)
        .bind(&days_str)
        .bind(profile)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        sqlx::query(
            r#"SELECT m.timestamp as measured_at, m.value_canonical as value,
                      m.status, m.protocol_tag
               FROM measurements m
               JOIN markers mk ON mk.id = m.marker_id
               WHERE m.is_demo = true AND m.demo_profile = $3 AND mk.marker_slug = $1 AND m.is_deleted = false
                 AND m.timestamp >= now() - $2::interval
               ORDER BY m.timestamp ASC"#,
        )
        .bind(&marker_slug)
        .bind(&days_str)
        .bind(profile)
        .fetch_all(pool.get_ref())
        .await?
    };

    let points: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "measured_at":  r.try_get::<chrono::DateTime<chrono::Utc>, _>("measured_at")
                                 .map(|t| t.to_rfc3339()).unwrap_or_default(),
                "value":        if is_calculated {
                                    r.try_get::<String, _>("value").ok().and_then(|s| s.parse::<f64>().ok()).map(|v| json!(v)).unwrap_or(json!(null))
                                } else {
                                    json!(enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()))
                                },
                "status":       r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "protocol_tag": r.try_get::<String, _>("protocol_tag").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "marker_slug": marker_slug,
            "marker_name": marker_name,
            "unit":        unit,
            "points":      points,
        },
        "error": null
    })))
}

// ── GET /markers/{slug}/content ───────────────────────────────────────────────

pub async fn marker_content(
    pool: web::Data<PgPool>,
    _auth: AuthenticatedUser,
    path: web::Path<String>,
    req: HttpRequest,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale_from_req(&req);
    let items = fetch_content_items(pool.get_ref(), &path.into_inner(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

pub async fn demo_marker_content(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    req: HttpRequest,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale_from_req(&req);
    let items = fetch_content_items(pool.get_ref(), &path.into_inner(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

// ── GET /markers/{slug}/foods ─────────────────────────────────────────────────

pub async fn marker_foods(
    pool: web::Data<PgPool>,
    _auth: AuthenticatedUser,
    path: web::Path<String>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let items = fetch_food_items(pool.get_ref(), &path.into_inner()).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

pub async fn demo_marker_foods(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let items = fetch_food_items(pool.get_ref(), &path.into_inner()).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

// ── GET /markers/{slug}/supplements ──────────────────────────────────────────

pub async fn marker_supplements(
    pool: web::Data<PgPool>,
    _auth: AuthenticatedUser,
    path: web::Path<String>,
    req: HttpRequest,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale_from_req(&req);
    let items = fetch_supplement_items(pool.get_ref(), &path.into_inner(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

pub async fn demo_marker_supplements(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    req: HttpRequest,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale_from_req(&req);
    let items = fetch_supplement_items(pool.get_ref(), &path.into_inner(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

// ── GET /markers/{slug}/references ───────────────────────────────────────────

pub async fn marker_references_list(
    pool: web::Data<PgPool>,
    _auth: AuthenticatedUser,
    path: web::Path<String>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let items = fetch_reference_items(pool.get_ref(), &path.into_inner()).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

pub async fn demo_marker_references(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let items = fetch_reference_items(pool.get_ref(), &path.into_inner()).await?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

async fn fetch_description(
    pool: &PgPool,
    marker_slug: &str,
    locale: &str,
) -> Result<Option<String>, AppError> {
    use sqlx::Row;

    // 1. Try marker_content in requested locale (rich content)
    let row = sqlx::query(
        r#"SELECT body_text FROM marker_content
           WHERE marker_id = $1 AND content_type = 'description' AND language = $2
           LIMIT 1"#,
    )
    .bind(marker_slug)
    .bind(locale)
    .fetch_optional(pool)
    .await?;

    if let Some(r) = row {
        return Ok(r.try_get::<String, _>("body_text").ok());
    }

    // 2. Try marker_translations.description (has DE translations)
    let trans = sqlx::query(
        r#"SELECT mt.description FROM marker_translations mt
           JOIN markers m ON m.id = mt.marker_id
           WHERE m.marker_slug = $1 AND mt.locale = $2 AND mt.description IS NOT NULL AND mt.description != ''
           LIMIT 1"#,
    )
    .bind(marker_slug)
    .bind(locale)
    .fetch_optional(pool)
    .await?;

    if let Some(r) = trans {
        return Ok(r.try_get::<String, _>("description").ok());
    }

    // 3. Fall back to English marker_content
    if locale != "en" {
        let fallback = sqlx::query(
            r#"SELECT body_text FROM marker_content
               WHERE marker_id = $1 AND content_type = 'description' AND language = 'en'
               LIMIT 1"#,
        )
        .bind(marker_slug)
        .fetch_optional(pool)
        .await?;
        return Ok(fallback.and_then(|r| r.try_get::<String, _>("body_text").ok()));
    }

    Ok(None)
}

async fn fetch_fasting_explanation(
    pool: &PgPool,
    marker_slug: &str,
    locale: &str,
) -> Result<Option<String>, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"SELECT body_text FROM marker_content
           WHERE marker_id = $1 AND content_type = 'fasting_explanation' AND language = $2
           LIMIT 1"#,
    )
    .bind(marker_slug)
    .bind(locale)
    .fetch_optional(pool)
    .await?;

    if let Some(r) = row {
        return Ok(r.try_get::<String, _>("body_text").ok());
    }

    if locale != "en" {
        let fallback = sqlx::query(
            r#"SELECT body_text FROM marker_content
               WHERE marker_id = $1 AND content_type = 'fasting_explanation' AND language = 'en'
               LIMIT 1"#,
        )
        .bind(marker_slug)
        .fetch_optional(pool)
        .await?;
        return Ok(fallback.and_then(|r| r.try_get::<String, _>("body_text").ok()));
    }

    Ok(None)
}

// ── private content helpers ───────────────────────────────────────────────────

async fn fetch_content_items(
    pool: &PgPool,
    marker_slug: &str,
    locale: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    use sqlx::Row;
    // Try requested locale first, fall back to English
    let rows = sqlx::query(
        r#"SELECT DISTINCT ON (content_type)
                  id, content_type, title, body_text, display_order, language
           FROM marker_content
           WHERE marker_id = $1 AND language IN ($2, 'en')
             AND content_type NOT IN ('description', 'fasting_explanation')
           ORDER BY content_type, CASE WHEN language = $2 THEN 0 ELSE 1 END, display_order"#,
    )
    .bind(marker_slug)
    .bind(locale)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(|r| json!({
        "id":           r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
        "content_type": r.try_get::<String, _>("content_type").unwrap_or_default(),
        "title":        r.try_get::<String, _>("title").unwrap_or_default(),
        "body_text":    r.try_get::<String, _>("body_text").unwrap_or_default(),
        "display_order":r.try_get::<i32, _>("display_order").unwrap_or_default(),
    })).collect())
}

async fn fetch_food_items(
    pool: &PgPool,
    marker_slug: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT id, food_name, food_name_de, food_category, display_order FROM marker_foods WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(marker_slug)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(|r| json!({
        "id":           r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
        "food_name":    r.try_get::<String, _>("food_name").unwrap_or_default(),
        "food_name_de": r.try_get::<Option<String>, _>("food_name_de").unwrap_or(None),
        "food_category":r.try_get::<Option<String>, _>("food_category").unwrap_or(None),
        "display_order":r.try_get::<i32, _>("display_order").unwrap_or_default(),
    })).collect())
}

async fn fetch_supplement_items(
    pool: &PgPool,
    marker_slug: &str,
    locale: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT id, supplement_name, supplement_name_de, typical_dose, typical_dose_de, notes, notes_de, display_order FROM marker_supplements WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(marker_slug)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(|r| {
        let is_de = locale == "de";
        let name_en: String = r.try_get("supplement_name").unwrap_or_default();
        let name_de: Option<String> = r.try_get("supplement_name_de").unwrap_or(None);
        let dose_en: Option<String> = r.try_get("typical_dose").unwrap_or(None);
        let dose_de: Option<String> = r.try_get("typical_dose_de").unwrap_or(None);
        let notes_en: Option<String> = r.try_get("notes").unwrap_or(None);
        let notes_de: Option<String> = r.try_get("notes_de").unwrap_or(None);
        json!({
            "id":              r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
            "supplement_name": if is_de { name_de.unwrap_or(name_en) } else { name_en },
            "typical_dose":    if is_de { dose_de.or(dose_en) } else { dose_en },
            "notes":           if is_de { notes_de.or(notes_en) } else { notes_en },
            "display_order":   r.try_get::<i32, _>("display_order").unwrap_or_default(),
        })
    }).collect())
}

async fn fetch_reference_items(
    pool: &PgPool,
    marker_slug: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT id, title, source, year, url, display_order FROM marker_references WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(marker_slug)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(|r| json!({
        "id":           r.try_get::<uuid::Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
        "title":        r.try_get::<String, _>("title").unwrap_or_default(),
        "source":       r.try_get::<Option<String>, _>("source").unwrap_or(None),
        "year":         r.try_get::<Option<i32>, _>("year").unwrap_or(None),
        "url":          r.try_get::<Option<String>, _>("url").unwrap_or(None),
        "display_order":r.try_get::<i32, _>("display_order").unwrap_or_default(),
    })).collect())
}

// ── private demo helpers ──────────────────────────────────────────────────────

async fn fetch_system_range(
    pool: &PgPool,
    marker_id: uuid::Uuid,
    protocol: &str,
    unit: &str,
) -> Result<Option<serde_json::Value>, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"SELECT orange_min::float8, green_min::float8, green_max::float8, orange_max::float8
           FROM reference_ranges
           WHERE marker_id = $1 AND protocol_context = $2 AND user_id IS NULL
           LIMIT 1"#,
    )
    .bind(marker_id)
    .bind(protocol)
    .fetch_optional(pool)
    .await?;

    Ok(row.as_ref().and_then(|r| {
        let om: Option<f64> = r.try_get("orange_min").ok().flatten();
        let gmin: Option<f64> = r.try_get("green_min").ok().flatten();
        let gmax: Option<f64> = r.try_get("green_max").ok().flatten();
        let omax: Option<f64> = r.try_get("orange_max").ok().flatten();
        build_range_json(om, gmin, gmax, omax, unit)
    }))
}

async fn fetch_latest_demo_measurement(
    pool: &PgPool,
    marker_id: uuid::Uuid,
    unit: &str,
    profile: &str,
    enc: &crate::services::encryption::Encryptor,
) -> Result<Option<serde_json::Value>, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        r#"SELECT m.value_canonical as value, m.unit_canonical, m.timestamp, m.status,
                  d.device_name
           FROM measurements m
           LEFT JOIN devices d ON d.id = m.device_id
           WHERE m.is_demo = true AND m.demo_profile = $2 AND m.marker_id = $1 AND m.is_deleted = false
           ORDER BY m.timestamp DESC LIMIT 1"#,
    )
    .bind(marker_id)
    .bind(profile)
    .fetch_optional(pool)
    .await?;

    Ok(row.as_ref().map(|r| {
        json!({
            "value":       enc.decrypt_f64(&r.try_get::<String, _>("value").unwrap_or_default()),
            "unit":        r.try_get::<String, _>("unit_canonical").unwrap_or_else(|_| unit.to_string()),
            "timestamp":   r.try_get::<chrono::DateTime<chrono::Utc>, _>("timestamp")
                            .map(|t| t.to_rfc3339()).unwrap_or_default(),
            "status":      r.try_get::<Option<String>, _>("status").unwrap_or(None),
            "device_name": r.try_get::<Option<String>, _>("device_name").unwrap_or(None),
        })
    }))
}
