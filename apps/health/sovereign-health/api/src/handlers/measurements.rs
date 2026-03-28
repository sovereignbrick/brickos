// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::measurement::{
        CreateMeasurementRequest, MeasurementResponse, UpdateMeasurementRequest,
    },
    services::{
        calculated::{
            compute_calculated_markers, enrich_with_latest_values, resolve_protocol_context,
        },
        measurement::validate_marker_value,
        reference::calculate_status,
    },
};

#[derive(serde::Deserialize)]
pub struct ListQuery {
    pub from: Option<chrono::DateTime<Utc>>,
    pub to: Option<chrono::DateTime<Utc>>,
    pub marker_slug: Option<String>,
    pub marker: Option<String>,
    pub protocol_tag: Option<String>,
    pub device_id: Option<String>,
    pub source_type: Option<String>,
    pub diet_protocol: Option<String>,
    pub fasting_protocol: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    body: web::Json<CreateMeasurementRequest>,
) -> Result<HttpResponse, AppError> {
    // Validate protocol_tag
    if let Some(ref pt) = body.protocol_tag {
        if pt != "standard" && pt != "fasting" {
            return Err(AppError::Validation(
                "protocol_tag must be 'standard' or 'fasting'".to_string(),
            ));
        }
    }

    // Validate stress_level
    if let Some(sl) = body.stress_level {
        if !(1..=10).contains(&sl) {
            return Err(AppError::Validation(
                "stress_level must be between 1 and 10".to_string(),
            ));
        }
    }

    // Validate lifestyle_note length
    if let Some(ref note) = body.lifestyle_note {
        if note.len() > 300 {
            return Err(AppError::Validation(
                "lifestyle_note must be 300 characters or fewer".to_string(),
            ));
        }
    }

    let protocol_tag = body
        .protocol_tag
        .clone()
        .unwrap_or_else(|| "standard".to_string());
    let meal_timing_tag = body
        .meal_timing_tag
        .clone()
        .unwrap_or_else(|| "unspecified".to_string());

    // Resolve protocol context for reference range lookup
    let protocol_context = resolve_protocol_context(
        &protocol_tag,
        body.fasting_protocol.as_deref(),
        body.diet_protocol.as_deref(),
    );

    // Compute fasting_hours
    let fasting_hours: Option<i32> = if let Some(start) = body.fast_start_datetime {
        let duration = body.measured_at - start;
        Some(duration.num_hours() as i32)
    } else {
        None
    };

    // Tier: enforce measurement cap via SSoT (exclude demo data from count)
    let measurement_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM measurements WHERE user_id = $1 AND is_deleted = false AND is_demo = false",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    crate::services::tier::check_tier_limit(
        pool.get_ref(),
        auth.user_id,
        "measurements",
        measurement_count,
    )
    .await?;

    // Validate all marker values first
    for mv in &body.values {
        validate_marker_value(&mv.marker_slug, mv.value).map_err(AppError::Validation)?;
    }

    let mut created_measurements: Vec<MeasurementResponse> = vec![];
    let mut values_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();

    // Insert each measurement
    for mv in &body.values {
        // Look up marker
        let marker_row =
            sqlx::query("SELECT id, unit_canonical FROM markers WHERE marker_slug = $1")
                .bind(&mv.marker_slug)
                .fetch_optional(pool.get_ref())
                .await?;

        let marker_row = marker_row.ok_or_else(|| {
            AppError::Validation(format!("Unknown marker slug: {}", mv.marker_slug))
        })?;

        use sqlx::Row;
        let marker_id: Uuid = marker_row.try_get("id").map_err(|_| AppError::Internal)?;
        let unit_canonical: String = marker_row
            .try_get("unit_canonical")
            .map_err(|_| AppError::Internal)?;

        // Calculate status
        let status = calculate_status(
            pool.get_ref(),
            marker_id,
            auth.user_id,
            mv.value,
            &protocol_context,
        )
        .await?;

        // Insert measurement (with idempotency support for PWA offline sync)
        let insert_row = sqlx::query(
            r#"INSERT INTO measurements (
                user_id, marker_id, timestamp, value_canonical, unit_canonical, status,
                protocol_tag, diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
                meal_timing_tag, exercise_activity, sleep_hours, sleep_quality, stress_level, lifestyle_note,
                device_id, client_id, idempotency_key
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17,
                $18, $19, $20
            )
            ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
            RETURNING id"#,
        )
        .bind(auth.user_id)
        .bind(marker_id)
        .bind(body.measured_at)
        .bind(enc.encrypt_f64(mv.value))
        .bind(&unit_canonical)
        .bind(&status)
        .bind(&protocol_tag)
        .bind(&body.diet_protocol)
        .bind(&body.fasting_protocol)
        .bind(body.fast_start_datetime)
        .bind(fasting_hours)
        .bind(&meal_timing_tag)
        .bind(&body.exercise_activity)
        .bind(body.sleep_hours)
        .bind(&body.sleep_quality)
        .bind(body.stress_level)
        .bind(enc.encrypt_opt(body.lifestyle_note.as_deref()))
        .bind(body.device_id)
        .bind(&body.client_id)
        .bind(&body.idempotency_key)
        .fetch_optional(pool.get_ref())
        .await?;

        // If ON CONFLICT hit (idempotent replay), fetch existing row
        let measurement_id: Uuid = if let Some(row) = insert_row {
            row.try_get("id").map_err(|_| AppError::Internal)?
        } else if let Some(ref key) = body.idempotency_key {
            let existing = sqlx::query(
                "SELECT id FROM measurements WHERE idempotency_key = $1 AND user_id = $2",
            )
            .bind(key)
            .bind(auth.user_id)
            .fetch_one(pool.get_ref())
            .await?;
            existing.try_get("id").map_err(|_| AppError::Internal)?
        } else {
            return Err(AppError::Internal);
        };

        values_map.insert(mv.marker_slug.clone(), mv.value);

        // Fetch marker_name for response
        let name_row = sqlx::query("SELECT marker_name FROM markers WHERE id = $1")
            .bind(marker_id)
            .fetch_one(pool.get_ref())
            .await?;
        let marker_name: String = name_row
            .try_get("marker_name")
            .map_err(|_| AppError::Internal)?;

        created_measurements.push(MeasurementResponse {
            id: measurement_id,
            marker_slug: mv.marker_slug.clone(),
            marker_name,
            timestamp: body.measured_at,
            value: mv.value,
            unit: unit_canonical,
            status,
            protocol_tag: protocol_tag.clone(),
            fasting_protocol: body.fasting_protocol.clone(),
            fasting_hours,
            diet_protocol: body.diet_protocol.clone(),
            meal_timing_tag: meal_timing_tag.clone(),
            exercise_activity: body.exercise_activity.clone(),
            sleep_hours: body.sleep_hours,
            sleep_quality: body.sleep_quality.clone(),
            stress_level: body.stress_level,
            lifestyle_note: body.lifestyle_note.clone(),
            device_id: body.device_id,
            device_name: None,
            created_at: Utc::now(),
        });
    }

    // Fetch user height for calculated markers
    let height_row = sqlx::query("SELECT height_cm FROM user_profile WHERE user_id = $1")
        .bind(auth.user_id)
        .fetch_optional(pool.get_ref())
        .await?;

    let height_cm: Option<f64> = if let Some(row) = height_row {
        use sqlx::Row;
        row.try_get::<Option<String>, _>("height_cm")
            .ok()
            .flatten()
            .map(|v| enc.decrypt_f64(&v))
    } else {
        None
    };

    // Enrich values_map with latest measurements for calculated marker inputs
    // that weren't in this submission (e.g. glucose entered today, ketones yesterday)
    enrich_with_latest_values(pool.get_ref(), auth.user_id, &mut values_map, enc.get_ref())
        .await
        .ok(); // non-fatal: calculated markers are best-effort

    // Compute calculated markers
    let computed = compute_calculated_markers(
        pool.get_ref(),
        auth.user_id,
        &values_map,
        height_cm,
        &protocol_tag,
        body.fasting_protocol.as_deref(),
        body.diet_protocol.as_deref(),
        body.measured_at,
    )
    .await?;

    // Upsert calculated marker values (idempotent, prevents duplicates)
    for (cm_id, value, status) in &computed {
        sqlx::query(
            r#"INSERT INTO calculated_marker_values (
                user_id, calculated_marker_id, value, status, protocol_tag, fasting_protocol, measured_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, calculated_marker_id, measured_at) WHERE is_deleted = false
            DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status,
                         protocol_tag = EXCLUDED.protocol_tag, fasting_protocol = EXCLUDED.fasting_protocol"#,
        )
        .bind(auth.user_id)
        .bind(cm_id)
        .bind(value)
        .bind(status)
        .bind(&protocol_tag)
        .bind(&body.fasting_protocol)
        .bind(body.measured_at)
        .execute(pool.get_ref())
        .await?;
    }

    // Build calculated marker response
    let mut calculated_responses = vec![];
    for (cm_id, value, status) in &computed {
        let cm_row =
            sqlx::query("SELECT marker_slug, marker_name FROM calculated_markers WHERE id = $1")
                .bind(cm_id)
                .fetch_optional(pool.get_ref())
                .await?;

        if let Some(row) = cm_row {
            use sqlx::Row;
            let marker_slug: String = row.try_get("marker_slug").unwrap_or_default();
            let marker_name: String = row.try_get("marker_name").unwrap_or_default();
            calculated_responses.push(json!({
                "marker_slug": marker_slug,
                "marker_name": marker_name,
                "value": value,
                "status": status,
            }));
        }
    }

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "measurements": created_measurements,
            "calculated_markers": calculated_responses,
        },
        "error": null
    })))
}

pub async fn list(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    // Tier: enforce history limit for Glimpse
    let history_limit =
        crate::services::tier::get_history_days_limit(pool.get_ref(), auth.user_id).await?;
    let effective_from = match (query.from, history_limit) {
        (Some(f), Some(days)) => {
            let cutoff = Utc::now() - chrono::Duration::days(days as i64);
            Some(if f < cutoff { cutoff } else { f })
        }
        (None, Some(days)) => Some(Utc::now() - chrono::Duration::days(days as i64)),
        (from, None) => from,
    };

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 200);
    let offset = (page - 1) * per_page;

    // Parse comma-separated marker slugs
    let marker_slugs: Option<Vec<String>> = query
        .marker
        .as_ref()
        .or(query.marker_slug.as_ref())
        .map(|m| {
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
            mk.marker_slug, mk.marker_name,
            d.device_name,
            COUNT(*) OVER() as total_count
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.user_id = $1 AND m.is_deleted = false"#,
    );

    let mut bind_idx = 2u32;

    if effective_from.is_some() {
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
    let device_ids: Option<Vec<Uuid>> = query.device_id.as_ref().and_then(|s| {
        let ids: Vec<Uuid> = s
            .split(',')
            .filter_map(|id| id.trim().parse().ok())
            .collect();
        if ids.is_empty() {
            None
        } else {
            Some(ids)
        }
    });
    if let Some(ref ids) = device_ids {
        let placeholders: Vec<String> = ids
            .iter()
            .enumerate()
            .map(|(i, _)| format!("${}", bind_idx + i as u32))
            .collect();
        sql.push_str(&format!(" AND m.device_id IN ({})", placeholders.join(",")));
        bind_idx += ids.len() as u32;
    }
    if query.source_type.is_some() {
        sql.push_str(&format!(" AND mk.source_type = ${}", bind_idx));
        bind_idx += 1;
    }
    if query.protocol_tag.is_some() {
        sql.push_str(&format!(" AND m.protocol_tag = ${}", bind_idx));
        bind_idx += 1;
    }
    let diet_protocols: Option<Vec<String>> = query.diet_protocol.as_ref().map(|s| {
        s.split(',')
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .collect()
    });
    if let Some(ref protos) = diet_protocols {
        if !protos.is_empty() {
            let placeholders: Vec<String> = protos
                .iter()
                .enumerate()
                .map(|(i, _)| format!("${}", bind_idx + i as u32))
                .collect();
            sql.push_str(&format!(
                " AND m.diet_protocol IN ({})",
                placeholders.join(",")
            ));
            bind_idx += protos.len() as u32;
        }
    }
    let fasting_protocols: Option<Vec<String>> = query.fasting_protocol.as_ref().map(|s| {
        s.split(',')
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .collect()
    });
    if let Some(ref protos) = fasting_protocols {
        if !protos.is_empty() {
            let placeholders: Vec<String> = protos
                .iter()
                .enumerate()
                .map(|(i, _)| format!("${}", bind_idx + i as u32))
                .collect();
            sql.push_str(&format!(
                " AND m.fasting_protocol IN ({})",
                placeholders.join(",")
            ));
            bind_idx += protos.len() as u32;
        }
    }

    sql.push_str(&format!(
        " ORDER BY m.timestamp DESC LIMIT ${} OFFSET ${}",
        bind_idx,
        bind_idx + 1
    ));

    let mut q = sqlx::query(&sql).bind(auth.user_id);

    if let Some(from) = effective_from {
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
    if let Some(ref ids) = device_ids {
        for id in ids {
            q = q.bind(*id);
        }
    }
    if let Some(ref source_type) = query.source_type {
        q = q.bind(source_type.clone());
    }
    if let Some(ref protocol_tag) = query.protocol_tag {
        q = q.bind(protocol_tag.clone());
    }
    if let Some(ref protos) = diet_protocols {
        for p in protos {
            q = q.bind(p.clone());
        }
    }
    if let Some(ref protos) = fasting_protocols {
        for p in protos {
            q = q.bind(p.clone());
        }
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
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total_count
        },
        "error": null
    })))
}

pub async fn get_one(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let measurement_id = path.into_inner();

    let row = sqlx::query(
        r#"SELECT m.id, m.user_id, m.marker_id, m.timestamp,
               m.value_canonical, m.unit_canonical, m.status,
               m.protocol_tag, m.diet_protocol, m.fasting_protocol, m.fast_start_datetime,
               m.fasting_hours, m.meal_timing_tag, m.exercise_activity, m.sleep_hours,
               m.sleep_quality, m.stress_level, m.lifestyle_note, m.is_deleted, m.created_at,
               mk.marker_slug, mk.marker_name, m.device_id, d.device_name
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.id = $1 AND m.user_id = $2 AND m.is_deleted = false"#,
    )
    .bind(measurement_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let measurement = MeasurementResponse {
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
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": measurement,
        "error": null
    })))
}

pub async fn update(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateMeasurementRequest>,
) -> Result<HttpResponse, AppError> {
    let measurement_id = path.into_inner();

    // Validate stress_level if provided
    if let Some(sl) = body.stress_level {
        if !(1..=10).contains(&sl) {
            return Err(AppError::Validation(
                "stress_level must be between 1 and 10".to_string(),
            ));
        }
    }

    // Validate lifestyle_note length
    if let Some(ref note) = body.lifestyle_note {
        if note.len() > 300 {
            return Err(AppError::Validation(
                "lifestyle_note must be 300 characters or fewer".to_string(),
            ));
        }
    }

    // First, fetch the current row to get marker_id + current values
    let current_row = sqlx::query(
        r#"SELECT marker_id, value_canonical, protocol_tag, fasting_protocol, diet_protocol
        FROM measurements
        WHERE id = $1 AND user_id = $2 AND is_deleted = false"#,
    )
    .bind(measurement_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let marker_id: Uuid = current_row
        .try_get("marker_id")
        .map_err(|_| AppError::Internal)?;
    let encrypted_current: String = current_row.try_get("value_canonical").unwrap_or_default();
    let current_value: f64 = enc.decrypt_f64(&encrypted_current);
    let current_protocol_tag: String = current_row
        .try_get("protocol_tag")
        .unwrap_or_else(|_| "standard".to_string());
    let current_fasting_protocol: Option<String> =
        current_row.try_get("fasting_protocol").ok().flatten();
    let current_diet_protocol: Option<String> = current_row.try_get("diet_protocol").ok().flatten();

    // Determine new values
    let new_value = body.value.unwrap_or(current_value);
    let new_protocol_tag = body.protocol_tag.clone().unwrap_or(current_protocol_tag);
    let new_fasting_protocol = body.fasting_protocol.clone().or(current_fasting_protocol);
    let new_diet_protocol = body.diet_protocol.clone().or(current_diet_protocol);

    // Recalculate status
    let protocol_context = resolve_protocol_context(
        &new_protocol_tag,
        new_fasting_protocol.as_deref(),
        new_diet_protocol.as_deref(),
    );
    let new_status = calculate_status(
        pool.get_ref(),
        marker_id,
        auth.user_id,
        new_value,
        &protocol_context,
    )
    .await?;

    // Validate value if provided
    if let Some(v) = body.value {
        // Get marker slug for validation
        let slug_row = sqlx::query("SELECT marker_slug FROM markers WHERE id = $1")
            .bind(marker_id)
            .fetch_optional(pool.get_ref())
            .await?;
        if let Some(slug_row) = slug_row {
            let slug: String = slug_row.try_get("marker_slug").unwrap_or_default();
            validate_marker_value(&slug, v).map_err(AppError::Validation)?;
        }
    }

    // Update the measurement
    let updated_row = sqlx::query(
        r#"UPDATE measurements SET
            value_canonical = $3,
            status = $4,
            protocol_tag = COALESCE($5, protocol_tag),
            fasting_protocol = COALESCE($6, fasting_protocol),
            fast_start_datetime = COALESCE($7, fast_start_datetime),
            diet_protocol = COALESCE($8, diet_protocol),
            meal_timing_tag = COALESCE($9, meal_timing_tag),
            exercise_activity = COALESCE($10, exercise_activity),
            sleep_hours = COALESCE($11, sleep_hours),
            sleep_quality = COALESCE($12, sleep_quality),
            stress_level = COALESCE($13, stress_level),
            lifestyle_note = COALESCE($14, lifestyle_note),
            timestamp = COALESCE($15, timestamp),
            updated_at = now()
        WHERE id = $1 AND user_id = $2 AND is_deleted = false
        RETURNING id"#,
    )
    .bind(measurement_id)
    .bind(auth.user_id)
    .bind(enc.encrypt_f64(new_value))
    .bind(&new_status)
    .bind(&body.protocol_tag)
    .bind(&body.fasting_protocol)
    .bind(body.fast_start_datetime)
    .bind(&body.diet_protocol)
    .bind(&body.meal_timing_tag)
    .bind(&body.exercise_activity)
    .bind(body.sleep_hours)
    .bind(&body.sleep_quality)
    .bind(body.stress_level)
    .bind(enc.encrypt_opt(body.lifestyle_note.as_deref()))
    .bind(body.measured_at)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let _updated_id: Uuid = updated_row.try_get("id").map_err(|_| AppError::Internal)?;

    // Fetch and return the updated measurement
    let row = sqlx::query(
        r#"SELECT m.id, m.user_id, m.marker_id, m.timestamp,
               m.value_canonical, m.unit_canonical, m.status,
               m.protocol_tag, m.diet_protocol, m.fasting_protocol, m.fast_start_datetime,
               m.fasting_hours, m.meal_timing_tag, m.exercise_activity, m.sleep_hours,
               m.sleep_quality, m.stress_level, m.lifestyle_note, m.is_deleted, m.created_at,
               mk.marker_slug, mk.marker_name, m.device_id, d.device_name
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        LEFT JOIN devices d ON d.id = m.device_id
        WHERE m.id = $1 AND m.user_id = $2 AND m.is_deleted = false"#,
    )
    .bind(measurement_id)
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await?;

    let measurement = MeasurementResponse {
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
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": measurement,
        "error": null
    })))
}

pub async fn delete(
    pool: web::Data<PgPool>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let measurement_id = path.into_inner();

    let row = sqlx::query(
        "UPDATE measurements SET is_deleted = true, deleted_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2 AND is_deleted = false
         RETURNING id",
    )
    .bind(measurement_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let deleted_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "id": deleted_id },
        "error": null
    })))
}

pub async fn filters(
    pool: web::Data<PgPool>,
    _enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Get devices used by this user
    let device_rows = sqlx::query(
        r#"SELECT d.id, d.device_name, d.device_type
        FROM devices d
        WHERE d.user_id = $1 AND d.is_deleted = false AND d.status = 'active'
        ORDER BY d.device_type, d.device_name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let devices: Vec<serde_json::Value> = device_rows
        .iter()
        .map(|row| {
            let dt: String = row
                .try_get("device_type")
                .unwrap_or_else(|_| "home".to_string());
            json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "name": row.try_get::<String, _>("device_name").unwrap_or_default(),
                "device_type": dt,
            })
        })
        .collect();

    // Get markers with measurement counts
    let marker_rows = sqlx::query(
        r#"SELECT mk.marker_slug, mk.marker_name, COUNT(*) as count
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        WHERE m.user_id = $1 AND m.is_deleted = false
        GROUP BY mk.marker_slug, mk.marker_name
        ORDER BY mk.marker_name"#,
    )
    .bind(auth.user_id)
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

    // Get distinct protocol tags
    let protocol_rows = sqlx::query(
        r#"SELECT DISTINCT protocol_tag
        FROM measurements
        WHERE user_id = $1 AND is_deleted = false AND protocol_tag IS NOT NULL
        ORDER BY protocol_tag"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let protocols: Vec<String> = protocol_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("protocol_tag").ok())
        .collect();

    // Get distinct source types
    let source_rows = sqlx::query(
        r#"SELECT DISTINCT mk.source_type
        FROM measurements m
        JOIN markers mk ON mk.id = m.marker_id
        WHERE m.user_id = $1 AND m.is_deleted = false
        ORDER BY mk.source_type"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let source_types: Vec<String> = source_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("source_type").ok())
        .collect();

    // Get date range
    let range_row = sqlx::query(
        r#"SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest
        FROM measurements
        WHERE user_id = $1 AND is_deleted = false"#,
    )
    .bind(auth.user_id)
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
