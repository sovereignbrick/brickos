// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ---------------------------------------------------------------------------
// GET /devices
// ---------------------------------------------------------------------------

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"SELECT d.id, d.device_name, d.manufacturer, d.model, d.device_type,
                  d.markers_measured, d.status, d.is_default, d.notes,
                  d.measurement_location, d.calibration_notes, d.known_bias,
                  d.validation_date, d.validation_notes, d.validation_status,
                  d.lab_address, d.lab_postal_code, d.lab_city, d.lab_country,
                  d.created_at, d.updated_at,
                  COALESCE(mc.cnt, 0) as measurement_count,
                  mc.last_used
           FROM devices d
           LEFT JOIN (
               SELECT device_id, COUNT(*) as cnt, MAX(timestamp) as last_used
               FROM measurements
               WHERE is_deleted = false
               GROUP BY device_id
           ) mc ON mc.device_id = d.id
           WHERE d.user_id = $1 AND d.is_deleted = false AND d.status = 'active'
           ORDER BY d.is_default DESC, d.created_at ASC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let devices: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            let markers: Vec<String> = row
                .try_get::<Vec<String>, _>("markers_measured")
                .unwrap_or_default();
            json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "device_name": row.try_get::<String, _>("device_name").unwrap_or_default(),
                "name": row.try_get::<String, _>("device_name").unwrap_or_default(),
                "manufacturer": row.try_get::<Option<String>, _>("manufacturer").ok().flatten(),
                "model": row.try_get::<Option<String>, _>("model").ok().flatten(),
                "device_type": row.try_get::<String, _>("device_type").unwrap_or_default(),
                "markers_measured": markers,
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "is_default": row.try_get::<bool, _>("is_default").unwrap_or(false),
                "notes": row.try_get::<Option<String>, _>("notes").ok().flatten(),
                "measurement_location": row.try_get::<Option<String>, _>("measurement_location").ok().flatten(),
                "calibration_notes": row.try_get::<Option<String>, _>("calibration_notes").ok().flatten(),
                "known_bias": row.try_get::<Option<String>, _>("known_bias").ok().flatten(),
                "measurement_count": row.try_get::<i64, _>("measurement_count").unwrap_or(0),
                "last_used": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_used")
                    .ok().flatten().map(|dt| dt.to_rfc3339()),
                "validation_date": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("validation_date")
                    .ok().flatten().map(|dt| dt.to_rfc3339()),
                "validation_notes": row.try_get::<Option<String>, _>("validation_notes").ok().flatten(),
                "validation_status": row.try_get::<Option<String>, _>("validation_status").ok().flatten(),
                "lab_address": row.try_get::<Option<String>, _>("lab_address").ok().flatten(),
                "lab_postal_code": row.try_get::<Option<String>, _>("lab_postal_code").ok().flatten(),
                "lab_city": row.try_get::<Option<String>, _>("lab_city").ok().flatten(),
                "lab_country": row.try_get::<Option<String>, _>("lab_country").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": devices,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /devices
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct CreateDeviceRequest {
    pub name: String,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub device_type: String,
    pub markers: Option<Vec<String>>,
    pub is_default: Option<bool>,
    pub notes: Option<String>,
    pub lab_address: Option<String>,
    pub lab_postal_code: Option<String>,
    pub lab_city: Option<String>,
    pub lab_country: Option<String>,
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateDeviceRequest>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let valid_types = ["home", "lab", "wearable", "scale", "other"];
    if !valid_types.contains(&body.device_type.as_str()) {
        return Err(AppError::Validation(format!(
            "device_type must be one of: {}",
            valid_types.join(", ")
        )));
    }

    if body.name.trim().is_empty() {
        return Err(AppError::Validation("Device name is required".to_string()));
    }

    let set_default = body.is_default.unwrap_or(false);
    let markers = body.markers.clone().unwrap_or_default();

    // If setting as default, unset existing defaults
    if set_default {
        sqlx::query(
            "UPDATE devices SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND is_default = true",
        )
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;
    }

    let row = sqlx::query(
        r#"INSERT INTO devices (user_id, device_name, manufacturer, model, device_type, markers_measured, is_default, notes, status,
                                lab_address, lab_postal_code, lab_city, lab_country)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12)
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(body.name.trim())
    .bind(&body.manufacturer)
    .bind(&body.model)
    .bind(&body.device_type)
    .bind(&markers)
    .bind(set_default)
    .bind(&body.notes)
    .bind(&body.lab_address)
    .bind(&body.lab_postal_code)
    .bind(&body.lab_city)
    .bind(&body.lab_country)
    .fetch_one(pool.get_ref())
    .await?;

    let id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "id": id,
            "name": body.name.trim(),
            "manufacturer": body.manufacturer,
            "model": body.model,
            "device_type": body.device_type,
            "markers_measured": markers,
            "is_default": set_default,
            "notes": body.notes,
            "measurement_count": 0,
            "last_used": null,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /devices/{id}
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdateDeviceRequest {
    pub name: Option<String>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub device_type: Option<String>,
    pub markers: Option<Vec<String>>,
    pub is_default: Option<bool>,
    pub notes: Option<String>,
    pub validation_date: Option<String>,
    pub validation_notes: Option<String>,
    pub validation_status: Option<String>,
    pub lab_address: Option<String>,
    pub lab_postal_code: Option<String>,
    pub lab_city: Option<String>,
    pub lab_country: Option<String>,
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateDeviceRequest>,
) -> Result<HttpResponse, AppError> {
    let device_id = path.into_inner();

    // Verify ownership
    let exists: Option<i64> = sqlx::query_scalar(
        "SELECT 1::bigint FROM devices WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(device_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    if let Some(ref dt) = body.device_type {
        let valid_types = ["home", "lab", "wearable", "scale", "other"];
        if !valid_types.contains(&dt.as_str()) {
            return Err(AppError::Validation(format!(
                "device_type must be one of: {}",
                valid_types.join(", ")
            )));
        }
    }

    if let Some(ref vs) = body.validation_status {
        let valid = ["validated", "pending", "deviation_noted"];
        if !valid.contains(&vs.as_str()) {
            return Err(AppError::Validation(
                "validation_status must be validated, pending, or deviation_noted".to_string(),
            ));
        }
    }

    // If setting as default, unset existing defaults
    if body.is_default == Some(true) {
        sqlx::query(
            "UPDATE devices SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND is_default = true AND id != $2",
        )
        .bind(auth.user_id)
        .bind(device_id)
        .execute(pool.get_ref())
        .await?;
    }

    // Build dynamic update
    let mut sets: Vec<String> = vec!["updated_at = NOW()".to_string()];
    let mut bind_idx = 3u32; // $1 = device_id, $2 = user_id

    macro_rules! maybe_set {
        ($field:expr, $col:expr) => {
            if $field.is_some() {
                sets.push(format!("{} = ${}", $col, bind_idx));
                bind_idx += 1;
            }
        };
    }

    maybe_set!(body.name, "device_name");
    maybe_set!(body.manufacturer, "manufacturer");
    maybe_set!(body.model, "model");
    maybe_set!(body.device_type, "device_type");
    maybe_set!(body.markers, "markers_measured");
    maybe_set!(body.is_default, "is_default");
    maybe_set!(body.notes, "notes");
    maybe_set!(body.validation_notes, "validation_notes");
    maybe_set!(body.validation_status, "validation_status");
    maybe_set!(body.lab_address, "lab_address");
    maybe_set!(body.lab_postal_code, "lab_postal_code");
    maybe_set!(body.lab_city, "lab_city");
    maybe_set!(body.lab_country, "lab_country");

    // Handle validation_date separately (needs parsing)
    let parsed_validation_date: Option<chrono::DateTime<chrono::Utc>> =
        if let Some(ref vd) = body.validation_date {
            if vd.is_empty() {
                None
            } else {
                Some(
                    chrono::DateTime::parse_from_rfc3339(vd)
                        .map(|d| d.with_timezone(&chrono::Utc))
                        .map_err(|_| {
                            AppError::Validation("Invalid validation_date format".to_string())
                        })?,
                )
            }
        } else {
            None
        };

    if body.validation_date.is_some() {
        sets.push(format!("validation_date = ${}", bind_idx));
        bind_idx += 1;
    }
    let _ = bind_idx; // suppress unused warning

    let sql = format!(
        "UPDATE devices SET {} WHERE id = $1 AND user_id = $2 AND is_deleted = false",
        sets.join(", ")
    );

    let mut q = sqlx::query(&sql).bind(device_id).bind(auth.user_id);

    if let Some(ref name) = body.name {
        q = q.bind(name.trim());
    }
    if let Some(ref v) = body.manufacturer {
        q = q.bind(v);
    }
    if let Some(ref v) = body.model {
        q = q.bind(v);
    }
    if let Some(ref v) = body.device_type {
        q = q.bind(v);
    }
    if let Some(ref v) = body.markers {
        q = q.bind(v);
    }
    if let Some(v) = body.is_default {
        q = q.bind(v);
    }
    if let Some(ref v) = body.notes {
        q = q.bind(v);
    }
    if let Some(ref v) = body.validation_notes {
        q = q.bind(v);
    }
    if let Some(ref v) = body.validation_status {
        q = q.bind(v);
    }
    if body.validation_date.is_some() {
        q = q.bind(parsed_validation_date);
    }
    if let Some(ref v) = body.lab_address {
        q = q.bind(v);
    }
    if let Some(ref v) = body.lab_postal_code {
        q = q.bind(v);
    }
    if let Some(ref v) = body.lab_city {
        q = q.bind(v);
    }
    if let Some(ref v) = body.lab_country {
        q = q.bind(v);
    }

    q.execute(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Device updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// DELETE /devices/{id}
// ---------------------------------------------------------------------------

pub async fn delete(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let device_id = path.into_inner();

    // Soft delete - measurements keep their device_id reference
    let result = sqlx::query(
        "UPDATE devices SET is_deleted = true, status = 'archived', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(device_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Device deleted" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /devices/{id}/default
// ---------------------------------------------------------------------------

pub async fn set_default(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let device_id = path.into_inner();

    // Verify ownership
    let exists: Option<i64> = sqlx::query_scalar(
        "SELECT 1::bigint FROM devices WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(device_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Unset all defaults
    sqlx::query(
        "UPDATE devices SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND is_default = true",
    )
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    // Set new default
    sqlx::query(
        "UPDATE devices SET is_default = true, updated_at = NOW() WHERE id = $1 AND user_id = $2",
    )
    .bind(device_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Default device updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /devices/{id}/history
// ---------------------------------------------------------------------------

pub async fn history(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let device_id = path.into_inner();

    // Verify ownership
    let exists: Option<i64> = sqlx::query_scalar(
        "SELECT 1::bigint FROM devices WHERE id = $1 AND user_id = $2 AND is_deleted = false",
    )
    .bind(device_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    if exists.is_none() {
        return Err(AppError::NotFound);
    }

    let rows = sqlx::query(
        r#"SELECT TO_CHAR(timestamp, 'YYYY-MM') as month, COUNT(*) as count
           FROM measurements
           WHERE device_id = $1 AND user_id = $2 AND is_deleted = false
           GROUP BY TO_CHAR(timestamp, 'YYYY-MM')
           ORDER BY month DESC
           LIMIT 24"#,
    )
    .bind(device_id)
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let history: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            json!({
                "month": row.try_get::<String, _>("month").unwrap_or_default(),
                "count": row.try_get::<i64, _>("count").unwrap_or(0),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": history,
        "error": null
    })))
}
