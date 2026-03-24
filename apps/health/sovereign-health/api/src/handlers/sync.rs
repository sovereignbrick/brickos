// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sync endpoints for PWA offline write + sync.
// Uses sync_version monotonic counter from migration 068.

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::{PgPool, Row};

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::sync::{
        SyncChangesQuery, SyncChangesResponse, SyncMeasurement, SyncMedication, SyncTemplate,
        SyncVersionResponse,
    },
};

/// GET /api/v1/sync/version
/// Returns the current global sync_version sequence value.
pub async fn version(
    pool: web::Data<PgPool>,
    _auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let row = sqlx::query("SELECT last_value FROM sync_version_seq")
        .fetch_one(pool.get_ref())
        .await?;
    let current_version: i64 = row.try_get("last_value").unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": SyncVersionResponse { current_version },
        "error": null
    })))
}

/// GET /api/v1/sync/changes?since_version=N&tables=measurements,measurement_templates&limit=500
/// Returns all rows with sync_version > since_version for the authenticated user.
pub async fn changes(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    auth: AuthenticatedUser,
    query: web::Query<SyncChangesQuery>,
) -> Result<HttpResponse, AppError> {
    let since = query.since_version;
    let limit = query.limit.unwrap_or(500).min(1000);
    let tables: Vec<&str> = query
        .tables
        .as_deref()
        .unwrap_or("measurements,measurement_templates,user_medications")
        .split(',')
        .map(|s| s.trim())
        .collect();

    let mut measurements = Vec::new();
    let mut templates = Vec::new();
    let mut medications = Vec::new();

    if tables.contains(&"measurements") {
        measurements = fetch_measurement_changes(pool.get_ref(), &enc, auth.user_id, since, limit).await?;
    }

    if tables.contains(&"measurement_templates") {
        templates = fetch_template_changes(pool.get_ref(), auth.user_id, since, limit).await?;
    }

    if tables.contains(&"user_medications") {
        medications = fetch_medication_changes(pool.get_ref(), auth.user_id, since, limit).await?;
    }

    // Current version
    let row = sqlx::query("SELECT last_value FROM sync_version_seq")
        .fetch_one(pool.get_ref())
        .await?;
    let current_version: i64 = row.try_get("last_value").unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": SyncChangesResponse {
            measurements,
            measurement_templates: templates,
            user_medications: medications,
            current_version,
        },
        "error": null
    })))
}

async fn fetch_measurement_changes(
    pool: &PgPool,
    enc: &crate::services::encryption::Encryptor,
    user_id: uuid::Uuid,
    since: i64,
    limit: i64,
) -> Result<Vec<SyncMeasurement>, AppError> {
    let rows = sqlx::query(
        r#"SELECT m.id, mk.marker_slug, mk.marker_name, m.timestamp,
                  m.value_canonical, mk.unit_canonical, m.status,
                  m.protocol_tag, m.fasting_protocol, m.fasting_hours,
                  m.diet_protocol, m.meal_timing_tag, m.exercise_activity,
                  m.sleep_hours, m.sleep_quality, m.stress_level,
                  m.device_id, m.client_id, m.idempotency_key,
                  m.is_deleted, m.deleted_at, m.sync_version,
                  m.created_at, m.updated_at
           FROM measurements m
           JOIN markers mk ON mk.id = m.marker_id
           WHERE m.user_id = $1 AND m.sync_version > $2
           ORDER BY m.sync_version ASC
           LIMIT $3"#,
    )
    .bind(user_id)
    .bind(since)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let encrypted_value: String = row.try_get("value_canonical").unwrap_or_default();
        let value = enc.decrypt_f64(&encrypted_value);

        result.push(SyncMeasurement {
            id: row.try_get("id").map_err(|_| AppError::Internal)?,
            marker_slug: row.try_get("marker_slug").unwrap_or_default(),
            marker_name: row.try_get("marker_name").unwrap_or_default(),
            timestamp: row.try_get("timestamp").map_err(|_| AppError::Internal)?,
            value,
            unit: row.try_get("unit_canonical").unwrap_or_default(),
            status: row.try_get("status").ok(),
            protocol_tag: row.try_get("protocol_tag").unwrap_or_default(),
            fasting_protocol: row.try_get("fasting_protocol").ok(),
            fasting_hours: row.try_get("fasting_hours").ok(),
            diet_protocol: row.try_get("diet_protocol").ok(),
            meal_timing_tag: row.try_get("meal_timing_tag").unwrap_or_default(),
            exercise_activity: row.try_get("exercise_activity").ok(),
            sleep_hours: row.try_get("sleep_hours").ok(),
            sleep_quality: row.try_get("sleep_quality").ok(),
            stress_level: row.try_get("stress_level").ok(),
            device_id: row.try_get("device_id").ok(),
            client_id: row.try_get("client_id").ok(),
            idempotency_key: row.try_get("idempotency_key").ok(),
            is_deleted: row.try_get("is_deleted").unwrap_or(false),
            deleted_at: row.try_get("deleted_at").ok(),
            sync_version: row.try_get("sync_version").unwrap_or(0),
            created_at: row.try_get("created_at").map_err(|_| AppError::Internal)?,
            updated_at: row.try_get("updated_at").map_err(|_| AppError::Internal)?,
        });
    }

    Ok(result)
}

async fn fetch_template_changes(
    pool: &PgPool,
    user_id: uuid::Uuid,
    since: i64,
    limit: i64,
) -> Result<Vec<SyncTemplate>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, name, marker_slugs, is_default, display_order,
                  client_id, idempotency_key, deleted_at, sync_version,
                  created_at, updated_at
           FROM measurement_templates
           WHERE user_id = $1 AND sync_version > $2
           ORDER BY sync_version ASC
           LIMIT $3"#,
    )
    .bind(user_id)
    .bind(since)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        result.push(SyncTemplate {
            id: row.try_get("id").map_err(|_| AppError::Internal)?,
            name: row.try_get("name").unwrap_or_default(),
            marker_slugs: row.try_get("marker_slugs").unwrap_or_default(),
            is_default: row.try_get("is_default").unwrap_or(false),
            display_order: row.try_get("display_order").unwrap_or(0),
            client_id: row.try_get("client_id").ok(),
            idempotency_key: row.try_get("idempotency_key").ok(),
            deleted_at: row.try_get("deleted_at").ok(),
            sync_version: row.try_get("sync_version").unwrap_or(0),
            created_at: row.try_get("created_at").map_err(|_| AppError::Internal)?,
            updated_at: row.try_get("updated_at").map_err(|_| AppError::Internal)?,
        });
    }

    Ok(result)
}

async fn fetch_medication_changes(
    pool: &PgPool,
    user_id: uuid::Uuid,
    since: i64,
    limit: i64,
) -> Result<Vec<SyncMedication>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, name, generic_name, dosage, frequency, is_active,
                  client_id, idempotency_key, deleted_at, sync_version,
                  created_at, updated_at
           FROM user_medications
           WHERE user_id = $1 AND sync_version > $2
           ORDER BY sync_version ASC
           LIMIT $3"#,
    )
    .bind(user_id)
    .bind(since)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        result.push(SyncMedication {
            id: row.try_get("id").map_err(|_| AppError::Internal)?,
            name: row.try_get("name").unwrap_or_default(),
            generic_name: row.try_get("generic_name").ok(),
            dosage: row.try_get("dosage").ok(),
            frequency: row.try_get("frequency").ok(),
            is_active: row.try_get("is_active").unwrap_or(true),
            client_id: row.try_get("client_id").ok(),
            idempotency_key: row.try_get("idempotency_key").ok(),
            deleted_at: row.try_get("deleted_at").ok(),
            sync_version: row.try_get("sync_version").unwrap_or(0),
            created_at: row.try_get("created_at").map_err(|_| AppError::Internal)?,
            updated_at: row.try_get("updated_at").map_err(|_| AppError::Internal)?,
        });
    }

    Ok(result)
}
