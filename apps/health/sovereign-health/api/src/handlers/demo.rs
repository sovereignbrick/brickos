// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        measurement::{MeasurementResponse, TrendPoint, TrendResponse},
        zone::{StatusSummary, ZoneSummary},
    },
    services::content,
};

#[derive(serde::Deserialize)]
pub struct TrendQuery {
    pub days: Option<i64>,
    pub profile: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub profile: Option<String>,
    pub from: Option<chrono::DateTime<Utc>>,
    pub to: Option<chrono::DateTime<Utc>>,
    pub marker: Option<String>,
    pub device_id: Option<Uuid>,
    pub source_type: Option<String>,
    pub protocol_tag: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ProfileQuery {
    pub profile: Option<String>,
}

fn profile_or_default(p: &Option<String>) -> &str {
    p.as_deref().unwrap_or("optimized")
}

fn extract_locale(req: &HttpRequest, query_locale: Option<&str>) -> String {
    let accept_lang = req
        .headers()
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok());
    content::resolve_locale(query_locale, accept_lang)
}

pub async fn demo_zones(
    pool: web::Data<PgPool>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
    query: web::Query<ProfileQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, None);
    let profile = profile_or_default(&query.profile);
    let rows = sqlx::query(
        r#"SELECT
            z.zone_slug,
            COALESCE(zt.name, zte.name, z.zone_name) AS zone_name,
            z.zone_icon, z.zone_color, z.display_order,
            COUNT(DISTINCT zm.marker_slug) as marker_count,
            COUNT(DISTINCT CASE WHEN latest.value IS NOT NULL THEN zm.marker_slug END) as markers_with_data,
            COUNT(DISTINCT CASE WHEN latest.status = 'green'  THEN zm.marker_slug END) as green_count,
            COUNT(DISTINCT CASE WHEN latest.status = 'orange' THEN zm.marker_slug END) as orange_count,
            COUNT(DISTINCT CASE WHEN latest.status = 'red'    THEN zm.marker_slug END) as red_count
        FROM zones z
        LEFT JOIN zone_translations zt ON zt.zone_id = z.id AND zt.locale = $2
        LEFT JOIN zone_translations zte ON zte.zone_id = z.id AND zte.locale = 'en'
        LEFT JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
        LEFT JOIN markers mk ON mk.marker_slug = zm.marker_slug
        LEFT JOIN LATERAL (
            SELECT value_canonical as value, status FROM measurements
            WHERE is_demo = true AND demo_profile = $1 AND marker_id = mk.id AND is_deleted = false
            ORDER BY timestamp DESC
            LIMIT 1
        ) latest ON mk.id IS NOT NULL
        GROUP BY z.zone_slug, COALESCE(zt.name, zte.name, z.zone_name), z.zone_icon, z.zone_color, z.display_order
        ORDER BY z.display_order"#,
    )
    .bind(profile)
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

    Ok(HttpResponse::Ok().json(json!({ "data": zones, "error": null })))
}

pub async fn demo_measurements(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, None);
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 200);
    let offset = (page - 1) * per_page;
    let profile = profile_or_default(&query.profile);

    // Parse comma-separated marker slugs
    let marker_slugs: Option<Vec<String>> = query.marker.as_ref().map(|m| {
        m.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    });

    let mut sql = String::from(
        r#"SELECT
            m.id, m.user_id, m.marker_id, m.timestamp,
            m.value_canonical,
            m.unit_canonical, m.status, m.protocol_tag, m.diet_protocol,
            m.fasting_protocol, m.fast_start_datetime, m.fasting_hours,
            m.meal_timing_tag, m.exercise_activity, m.sleep_hours,
            m.sleep_quality, m.stress_level, m.lifestyle_note, m.is_deleted, m.created_at,
            mk.marker_slug, COALESCE(mt.name, mte.name, mk.marker_name) as marker_name,
            d.device_name,
            COUNT(*) OVER() as total_count
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN marker_translations mt ON mt.marker_id = mk.id AND mt.locale = $2
        LEFT JOIN marker_translations mte ON mte.marker_id = mk.id AND mte.locale = 'en'
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.is_demo = true AND m.demo_profile = $1 AND m.is_deleted = false"#,
    );

    let mut bind_idx = 3u32;

    if query.from.is_some() {
        sql.push_str(&format!(" AND m.timestamp >= ${}", bind_idx));
        bind_idx += 1;
    }
    if query.to.is_some() {
        sql.push_str(&format!(" AND m.timestamp <= ${}", bind_idx));
        bind_idx += 1;
    }
    if let Some(ref slugs) = marker_slugs {
        if !slugs.is_empty() {
            let placeholders: Vec<String> = slugs
                .iter()
                .enumerate()
                .map(|(i, _)| format!("${}", bind_idx + i as u32))
                .collect();
            sql.push_str(&format!(
                " AND mk.marker_slug IN ({})",
                placeholders.join(",")
            ));
            bind_idx += slugs.len() as u32;
        }
    }
    if query.device_id.is_some() {
        sql.push_str(&format!(" AND m.device_id = ${}", bind_idx));
        bind_idx += 1;
    }
    if query.source_type.is_some() {
        sql.push_str(&format!(" AND mk.source_type = ${}", bind_idx));
        bind_idx += 1;
    }
    if query.protocol_tag.is_some() {
        sql.push_str(&format!(" AND m.protocol_tag = ${}", bind_idx));
        bind_idx += 1;
    }

    sql.push_str(&format!(
        " ORDER BY m.timestamp DESC LIMIT ${} OFFSET ${}",
        bind_idx,
        bind_idx + 1
    ));

    let mut q = sqlx::query(&sql).bind(profile).bind(&locale);

    if let Some(from) = query.from {
        q = q.bind(from);
    }
    if let Some(to) = query.to {
        q = q.bind(to);
    }
    if let Some(ref slugs) = marker_slugs {
        for slug in slugs {
            q = q.bind(slug.clone());
        }
    }
    if let Some(device_id) = query.device_id {
        q = q.bind(device_id);
    }
    if let Some(ref source_type) = query.source_type {
        q = q.bind(source_type.clone());
    }
    if let Some(ref protocol_tag) = query.protocol_tag {
        q = q.bind(protocol_tag.clone());
    }
    q = q.bind(per_page);
    q = q.bind(offset);

    let rows = q.fetch_all(pool.get_ref()).await?;

    use sqlx::Row;
    let total_count: i64 = rows
        .first()
        .and_then(|r| r.try_get::<i64, _>("total_count").ok())
        .unwrap_or(0);

    let measurements: Vec<MeasurementResponse> = rows
        .iter()
        .map(|row| MeasurementResponse {
            id: row.try_get("id").unwrap_or_default(),
            marker_slug: row.try_get("marker_slug").unwrap_or_default(),
            marker_name: row.try_get("marker_name").unwrap_or_default(),
            timestamp: row.try_get("timestamp").unwrap_or_else(|_| Utc::now()),
            value: enc.decrypt_f64(
                &row.try_get::<String, _>("value_canonical")
                    .unwrap_or_default(),
            ),
            unit: row.try_get("unit_canonical").unwrap_or_default(),
            status: row.try_get("status").ok().flatten(),
            protocol_tag: row
                .try_get("protocol_tag")
                .unwrap_or_else(|_| "standard".to_string()),
            fasting_protocol: row.try_get("fasting_protocol").ok().flatten(),
            fasting_hours: row.try_get("fasting_hours").ok().flatten(),
            diet_protocol: row.try_get("diet_protocol").ok().flatten(),
            meal_timing_tag: row
                .try_get("meal_timing_tag")
                .unwrap_or_else(|_| "unspecified".to_string()),
            exercise_activity: row.try_get("exercise_activity").ok().flatten(),
            sleep_hours: row.try_get("sleep_hours").ok().flatten(),
            sleep_quality: row.try_get("sleep_quality").ok().flatten(),
            stress_level: row.try_get("stress_level").ok().flatten(),
            lifestyle_note: enc.decrypt_opt(row.try_get("lifestyle_note").ok().flatten()),
            device_id: row.try_get("device_id").ok().flatten(),
            device_name: row.try_get("device_name").ok().flatten(),
            created_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": measurements,
        "meta": { "page": page, "per_page": per_page, "total": total_count },
        "error": null
    })))
}

pub async fn demo_trends(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<TrendQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, None);
    let marker_slug = path.into_inner();
    let days = query.days.unwrap_or(30);
    let profile = profile_or_default(&query.profile);
    if !(1..=365).contains(&days) {
        return Err(AppError::Validation(
            "days must be between 1 and 365".to_string(),
        ));
    }

    let marker_row = sqlx::query(
        r#"SELECT mk.id, COALESCE(mt.name, mte.name, mk.marker_name) as marker_name, mk.unit_canonical
           FROM markers mk
           LEFT JOIN marker_translations mt ON mt.marker_id = mk.id AND mt.locale = $2
           LEFT JOIN marker_translations mte ON mte.marker_id = mk.id AND mte.locale = 'en'
           WHERE mk.marker_slug = $1"#,
    )
    .bind(&marker_slug)
    .bind(&locale)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let marker_name: String = marker_row.try_get("marker_name").unwrap_or_default();
    let unit: String = marker_row.try_get("unit_canonical").unwrap_or_default();

    let days_str = format!("{} days", days);
    let rows = sqlx::query(
        r#"SELECT
            m.timestamp as measured_at,
            m.value_canonical as value,
            m.status,
            m.protocol_tag
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        WHERE m.is_demo = true AND m.demo_profile = $3 AND mk.marker_slug = $1 AND m.is_deleted = false
          AND m.timestamp >= now() - $2::interval
        ORDER BY m.timestamp ASC
        LIMIT 1000"#,
    )
    .bind(&marker_slug)
    .bind(&days_str)
    .bind(profile)
    .fetch_all(pool.get_ref())
    .await?;

    let points: Vec<TrendPoint> = rows
        .iter()
        .map(|row| TrendPoint {
            measured_at: row.try_get("measured_at").unwrap_or_else(|_| Utc::now()),
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

    Ok(HttpResponse::Ok().json(json!({ "data": trend, "error": null })))
}

pub async fn demo_zone_detail(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<ProfileQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, None);
    let zone_slug = path.into_inner();
    let profile = profile_or_default(&query.profile);

    let zone_row = sqlx::query(
        r#"SELECT z.zone_slug,
                  COALESCE(zt.name, zte.name, z.zone_name) AS zone_name,
                  z.zone_icon, z.zone_color
           FROM zones z
           LEFT JOIN zone_translations zt ON zt.zone_id = z.id AND zt.locale = $2
           LEFT JOIN zone_translations zte ON zte.zone_id = z.id AND zte.locale = 'en'
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

    let marker_rows = sqlx::query(
        r#"SELECT
            zm.marker_slug, COALESCE(mt.name, mte.name, mk.marker_name) as marker_name,
            mk.unit_canonical, mk.source_type,
            m.latest_value, m.status, m.measured_at, m.device_name
        FROM zone_markers zm
        JOIN markers mk ON mk.marker_slug = zm.marker_slug
        LEFT JOIN marker_translations mt ON mt.marker_id = mk.id AND mt.locale = $3
        LEFT JOIN marker_translations mte ON mte.marker_id = mk.id AND mte.locale = 'en'
        LEFT JOIN LATERAL (
            SELECT ms.value_canonical as latest_value, ms.status, ms.timestamp as measured_at,
                   dv.device_name
            FROM measurements ms
            LEFT JOIN devices dv ON dv.id = ms.device_id
            WHERE ms.is_demo = true AND ms.demo_profile = $2 AND ms.marker_id = mk.id AND ms.is_deleted = false
            ORDER BY ms.timestamp DESC
            LIMIT 1
        ) m ON true
        WHERE zm.zone_slug = $1 AND zm.marker_type = 'standard'
        ORDER BY zm.display_order"#,
    )
    .bind(&zone_slug)
    .bind(profile)
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    use crate::models::zone::MarkerLatest;
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

    // Fetch calculated markers for this zone
    let calc_rows = sqlx::query(
        r#"SELECT
            zm.marker_slug, cm.marker_name, cm.source_type
        FROM zone_markers zm
        JOIN calculated_markers cm ON cm.marker_slug = zm.marker_slug
        WHERE zm.zone_slug = $1 AND zm.marker_type = 'calculated'
        ORDER BY zm.display_order"#,
    )
    .bind(&zone_slug)
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
            latest_value: None,
            unit: unit.to_string(),
            status: None,
            measured_at: None,
            source_type: row
                .try_get("source_type")
                .unwrap_or_else(|_| "calculated".to_string()),
            device_name: None,
            marker_type: "calculated".to_string(),
        });
    }

    use crate::models::zone::ZoneDetail;
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

    Ok(HttpResponse::Ok().json(json!({ "data": detail, "error": null })))
}

pub async fn demo_measurements_filters(
    pool: web::Data<PgPool>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
    req: HttpRequest,
    query: web::Query<ProfileQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;
    let locale = extract_locale(&req, None);
    let profile = profile_or_default(&query.profile);

    let device_rows = sqlx::query(
        r#"SELECT DISTINCT d.id, d.device_name
        FROM measurements m
        JOIN devices d ON d.id = m.device_id
        WHERE m.is_demo = true AND m.demo_profile = $1 AND m.is_deleted = false AND m.device_id IS NOT NULL
        ORDER BY d.device_name"#,
    )
    .bind(profile)
    .fetch_all(pool.get_ref())
    .await?;

    let devices: Vec<serde_json::Value> = device_rows
        .iter()
        .map(|row| {
            json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "name": row.try_get::<String, _>("device_name").unwrap_or_default(),
            })
        })
        .collect();

    let marker_rows = sqlx::query(
        r#"SELECT mk.marker_slug, COALESCE(mt.name, mte.name, mk.marker_name) as marker_name, COUNT(*) as count
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN marker_translations mt ON mt.marker_id = mk.id AND mt.locale = $2
        LEFT JOIN marker_translations mte ON mte.marker_id = mk.id AND mte.locale = 'en'
        WHERE m.is_demo = true AND m.demo_profile = $1 AND m.is_deleted = false
        GROUP BY mk.marker_slug, COALESCE(mt.name, mte.name, mk.marker_name)
        ORDER BY COALESCE(mt.name, mte.name, mk.marker_name)"#,
    )
    .bind(profile)
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    let markers: Vec<serde_json::Value> = marker_rows
        .iter()
        .map(|row| {
            json!({
                "slug": row.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "name": row.try_get::<String, _>("marker_name").unwrap_or_default(),
                "count": row.try_get::<i64, _>("count").unwrap_or(0),
            })
        })
        .collect();

    let protocol_rows = sqlx::query(
        r#"SELECT DISTINCT protocol_tag
        FROM measurements
        WHERE is_demo = true AND demo_profile = $1 AND is_deleted = false AND protocol_tag IS NOT NULL
        ORDER BY protocol_tag"#,
    )
    .bind(profile)
    .fetch_all(pool.get_ref())
    .await?;

    let protocols: Vec<String> = protocol_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("protocol_tag").ok())
        .collect();

    let source_rows = sqlx::query(
        r#"SELECT DISTINCT mk.source_type
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        WHERE m.is_demo = true AND m.demo_profile = $1 AND m.is_deleted = false
        ORDER BY mk.source_type"#,
    )
    .bind(profile)
    .fetch_all(pool.get_ref())
    .await?;

    let source_types: Vec<String> = source_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("source_type").ok())
        .collect();

    let range_row = sqlx::query(
        r#"SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest
        FROM measurements
        WHERE is_demo = true AND demo_profile = $1 AND is_deleted = false"#,
    )
    .bind(profile)
    .fetch_optional(pool.get_ref())
    .await?;

    let (earliest, latest) = if let Some(row) = range_row {
        let e: Option<chrono::DateTime<Utc>> = row.try_get("earliest").ok().flatten();
        let l: Option<chrono::DateTime<Utc>> = row.try_get("latest").ok().flatten();
        (
            e.map(|d| d.format("%Y-%m-%d").to_string()),
            l.map(|d| d.format("%Y-%m-%d").to_string()),
        )
    } else {
        (None, None)
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "devices": devices,
            "markers": markers,
            "protocols": protocols,
            "source_types": source_types,
            "date_range": {
                "earliest": earliest,
                "latest": latest,
            }
        },
        "error": null
    })))
}
