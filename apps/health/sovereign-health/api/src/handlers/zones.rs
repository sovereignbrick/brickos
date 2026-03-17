// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::zone::{MarkerLatest, StatusSummary, ZoneDetail, ZoneSummary},
};

fn resolve_locale(req: &HttpRequest) -> String {
    let al = req
        .headers()
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("en");
    if al.contains("de") { "de".into() } else { "en".into() }
}

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    _enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale(&req);
    let rows = sqlx::query(
        r#"SELECT
            z.zone_slug, COALESCE(zt.name, z.zone_name) as zone_name,
            z.zone_icon, z.zone_color, z.display_order,
            COUNT(DISTINCT zm.marker_slug) as marker_count,
            COUNT(DISTINCT CASE WHEN latest.value IS NOT NULL THEN zm.marker_slug END) as markers_with_data,
            COUNT(DISTINCT CASE WHEN latest.status = 'green'  THEN zm.marker_slug END) as green_count,
            COUNT(DISTINCT CASE WHEN latest.status = 'orange' THEN zm.marker_slug END) as orange_count,
            COUNT(DISTINCT CASE WHEN latest.status = 'red'    THEN zm.marker_slug END) as red_count
        FROM zones z
        LEFT JOIN zone_translations zt ON zt.zone_id = z.id AND zt.locale = $2
        LEFT JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
        LEFT JOIN markers mk ON mk.marker_slug = zm.marker_slug
        LEFT JOIN LATERAL (
            SELECT value_canonical as value, status FROM measurements
            WHERE user_id = $1 AND marker_id = mk.id AND is_deleted = false
            ORDER BY timestamp DESC
            LIMIT 1
        ) latest ON mk.id IS NOT NULL
        GROUP BY z.zone_slug, zt.name, z.zone_name, z.zone_icon, z.zone_color, z.display_order
        ORDER BY z.display_order"#,
    )
    .bind(auth.user_id)
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    use sqlx::Row;
    let zones: Vec<ZoneSummary> = rows
        .iter()
        .map(|row| ZoneSummary {
            zone_slug: row.try_get("zone_slug").unwrap_or_default(),
            zone_name: row.try_get("zone_name").unwrap_or_default(),
            zone_icon: row.try_get("zone_icon").unwrap_or_default(),
            zone_color: row.try_get("zone_color").unwrap_or_default(),
            display_order: row.try_get("display_order").unwrap_or_default(),
            marker_count: row.try_get("marker_count").unwrap_or_default(),
            markers_with_data: row.try_get("markers_with_data").unwrap_or_default(),
            status_summary: StatusSummary {
                green: row.try_get("green_count").unwrap_or_default(),
                orange: row.try_get("orange_count").unwrap_or_default(),
                red: row.try_get("red_count").unwrap_or_default(),
            },
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": zones,
        "error": null
    })))
}

pub async fn detail(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let locale = resolve_locale(&req);
    let zone_slug = path.into_inner();

    // Fetch zone with translated name
    let zone_row = sqlx::query(
        r#"SELECT z.zone_slug, COALESCE(zt.name, z.zone_name) as zone_name,
                  z.zone_icon, z.zone_color
           FROM zones z
           LEFT JOIN zone_translations zt ON zt.zone_id = z.id AND zt.locale = $2
           WHERE z.zone_slug = $1"#,
    )
    .bind(&zone_slug)
    .bind(&locale)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let zone_name: String = zone_row.try_get("zone_name").unwrap_or_default();
    let zone_icon: String = zone_row.try_get("zone_icon").unwrap_or_default();
    let zone_color: String = zone_row.try_get("zone_color").unwrap_or_default();

    // Fetch standard markers linked to this zone via zone_markers
    let marker_rows = sqlx::query(
        r#"SELECT
            zm.marker_slug, zm.marker_type,
            COALESCE(mt.name, mk.marker_name) as marker_name,
            mk.unit_canonical, mk.source_type,
            m.latest_value, m.status, m.measured_at, m.device_name
        FROM zone_markers zm
        JOIN markers mk ON mk.marker_slug = zm.marker_slug
        LEFT JOIN marker_translations mt ON mt.marker_id = mk.id AND mt.locale = $3
        LEFT JOIN LATERAL (
            SELECT ms.value_canonical as latest_value, ms.status, ms.timestamp as measured_at,
                   dv.device_name
            FROM measurements ms
            LEFT JOIN devices dv ON dv.id = ms.device_id
            WHERE ms.user_id = $2 AND ms.marker_id = mk.id AND ms.is_deleted = false
            ORDER BY ms.timestamp DESC
            LIMIT 1
        ) m ON true
        WHERE zm.zone_slug = $1 AND zm.marker_type = 'standard'
        ORDER BY zm.display_order"#,
    )
    .bind(&zone_slug)
    .bind(auth.user_id)
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    let mut markers: Vec<MarkerLatest> = marker_rows
        .iter()
        .map(|row| MarkerLatest {
            marker_slug: row.try_get("marker_slug").unwrap_or_default(),
            marker_name: row.try_get("marker_name").unwrap_or_default(),
            latest_value: row
                .try_get::<Option<String>, _>("latest_value")
                .ok()
                .flatten()
                .map(|v| enc.decrypt_f64(&v)),
            unit: row.try_get("unit_canonical").unwrap_or_default(),
            status: row.try_get("status").ok().flatten(),
            measured_at: row.try_get("measured_at").ok().flatten(),
            source_type: row
                .try_get("source_type")
                .unwrap_or_else(|_| "home".to_string()),
            device_name: row.try_get("device_name").ok().flatten(),
            marker_type: "standard".to_string(),
        })
        .collect();

    // Fetch calculated markers linked to this zone
    let calc_rows = sqlx::query(
        r#"SELECT
            zm.marker_slug,
            COALESCE(mt.name, cm.marker_name) as marker_name,
            cm.source_type, zm.display_order,
            cv.value, cv.status, cv.measured_at
        FROM zone_markers zm
        JOIN calculated_markers cm ON cm.marker_slug = zm.marker_slug
        LEFT JOIN marker_translations mt ON mt.marker_id = cm.id AND mt.locale = $3
        LEFT JOIN LATERAL (
            SELECT cmv.value::float8 as value, cmv.status, cmv.measured_at
            FROM calculated_marker_values cmv
            WHERE cmv.user_id = $2 AND cmv.calculated_marker_id = cm.id
              AND cmv.is_deleted = false
            ORDER BY cmv.measured_at DESC
            LIMIT 1
        ) cv ON true
        WHERE zm.zone_slug = $1 AND zm.marker_type = 'calculated'
        ORDER BY zm.display_order"#,
    )
    .bind(&zone_slug)
    .bind(auth.user_id)
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    for row in &calc_rows {
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        let unit = match slug.as_str() {
            "bmi" => "kg/m\u{b2}",
            "homa_ir" | "tyg_index" => "index",
            _ => "ratio",
        };
        markers.push(MarkerLatest {
            marker_slug: slug,
            marker_name: row.try_get("marker_name").unwrap_or_default(),
            latest_value: row.try_get::<Option<f64>, _>("value").ok().flatten(),
            unit: unit.to_string(),
            status: row.try_get("status").ok().flatten(),
            measured_at: row.try_get("measured_at").ok().flatten(),
            source_type: row
                .try_get("source_type")
                .unwrap_or_else(|_| "calculated".to_string()),
            device_name: None,
            marker_type: "calculated".to_string(),
        });
    }

    let markers_with_data = markers.iter().filter(|m| m.latest_value.is_some()).count();
    let markers_total = markers.len();

    let detail = ZoneDetail {
        zone_slug,
        zone_name,
        zone_icon,
        zone_color,
        markers,
        markers_total,
        markers_with_data,
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": detail,
        "error": null
    })))
}
