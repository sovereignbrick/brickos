// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ── Query params ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ListQuery {
    /// "true" (default), "false", or "all"
    pub active: Option<String>,
}

// ── GET /user-medications ────────────────────────────────────────────────────

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    let active_filter = query.active.as_deref().unwrap_or("true");

    let rows = match active_filter {
        "false" => {
            sqlx::query(
                r#"SELECT id, name, generic_name, dosage, frequency, form, prescriber,
                          start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM user_medications
                   WHERE user_id = $1 AND is_active = false
                   ORDER BY name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
        "all" => {
            sqlx::query(
                r#"SELECT id, name, generic_name, dosage, frequency, form, prescriber,
                          start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM user_medications
                   WHERE user_id = $1
                   ORDER BY is_active DESC, name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
        _ => {
            // default: active only
            sqlx::query(
                r#"SELECT id, name, generic_name, dosage, frequency, form, prescriber,
                          start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM user_medications
                   WHERE user_id = $1 AND is_active = true
                   ORDER BY name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
    };

    let medications: Vec<serde_json::Value> = rows.iter().map(medication_to_json).collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": medications,
        "error": null
    })))
}

// ── GET /user-medications/{id} ───────────────────────────────────────────────

pub async fn get_one(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let row = sqlx::query(
        r#"SELECT id, name, generic_name, dosage, frequency, form, prescriber,
                  start_date, end_date, reason, notes, is_active, source,
                  original_images, ai_extracted_data, created_at, updated_at
           FROM user_medications
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": medication_to_json(&row),
        "error": null
    })))
}

// ── POST /user-medications ───────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateMedicationRequest {
    pub name: String,
    pub generic_name: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub form: Option<String>,
    pub prescriber: Option<String>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub source: Option<String>,
    pub original_images: Option<serde_json::Value>,
    pub ai_extracted_data: Option<serde_json::Value>,
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateMedicationRequest>,
) -> Result<HttpResponse, AppError> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("name is required".to_string()));
    }
    if name.len() > 200 {
        return Err(AppError::Validation(
            "name must be 200 characters or fewer".to_string(),
        ));
    }

    // Tier check: count vs max_medications
    let current_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*)::int4 FROM user_medications WHERE user_id = $1 AND is_active = true",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    crate::services::tier::check_tier_limit(
        pool.get_ref(),
        auth.user_id,
        "influence_factors",
        current_count as i64,
    )
    .await?;

    let source = body.source.as_deref().unwrap_or("manual").to_string();

    let row = sqlx::query(
        r#"INSERT INTO user_medications
           (user_id, name, generic_name, dosage, frequency, form, prescriber,
            start_date, end_date, reason, notes, source, original_images, ai_extracted_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id, created_at"#,
    )
    .bind(auth.user_id)
    .bind(name)
    .bind(&body.generic_name)
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.form)
    .bind(&body.prescriber)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.reason)
    .bind(&body.notes)
    .bind(&source)
    .bind(&body.original_images)
    .bind(&body.ai_extracted_data)
    .fetch_one(pool.get_ref())
    .await?;

    let id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let created_at: chrono::DateTime<Utc> =
        row.try_get("created_at").unwrap_or_else(|_| Utc::now());

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "id": id,
            "created_at": created_at.to_rfc3339()
        },
        "error": null
    })))
}

// ── PUT /user-medications/{id} ───────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateMedicationRequest {
    pub name: Option<String>,
    pub generic_name: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub form: Option<String>,
    pub prescriber: Option<String>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub source: Option<String>,
    pub original_images: Option<serde_json::Value>,
    pub ai_extracted_data: Option<serde_json::Value>,
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateMedicationRequest>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    if let Some(ref name) = body.name {
        let name = name.trim();
        if name.is_empty() {
            return Err(AppError::Validation("name cannot be empty".to_string()));
        }
        if name.len() > 200 {
            return Err(AppError::Validation(
                "name must be 200 characters or fewer".to_string(),
            ));
        }
    }

    let result = sqlx::query(
        r#"UPDATE user_medications SET
           name = COALESCE($1, name),
           generic_name = COALESCE($2, generic_name),
           dosage = COALESCE($3, dosage),
           frequency = COALESCE($4, frequency),
           form = COALESCE($5, form),
           prescriber = COALESCE($6, prescriber),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           reason = COALESCE($9, reason),
           notes = COALESCE($10, notes),
           source = COALESCE($11, source),
           original_images = COALESCE($12, original_images),
           ai_extracted_data = COALESCE($13, ai_extracted_data),
           updated_at = NOW()
           WHERE id = $14 AND user_id = $15"#,
    )
    .bind(&body.name)
    .bind(&body.generic_name)
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.form)
    .bind(&body.prescriber)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.reason)
    .bind(&body.notes)
    .bind(&body.source)
    .bind(&body.original_images)
    .bind(&body.ai_extracted_data)
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

// ── DELETE /user-medications/{id} (soft archive) ─────────────────────────────

pub async fn archive(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE user_medications SET
           is_active = false, updated_at = NOW()
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "archived": true },
        "error": null
    })))
}

// ── PUT /user-medications/{id}/restore ───────────────────────────────────────

pub async fn restore(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE user_medications SET
           is_active = true, updated_at = NOW()
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "restored": true },
        "error": null
    })))
}

// ── GET /user-medications/active-context ─────────────────────────────────────
// Compact list for Doctor Chat AI context

pub async fn active_context(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT name, dosage, frequency, form, reason, start_date
           FROM user_medications
           WHERE user_id = $1 AND is_active = true
           ORDER BY name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let medications: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "name": r.try_get::<Option<String>, _>("name").ok().flatten().unwrap_or_default(),
                "dosage": r.try_get::<Option<String>, _>("dosage").ok().flatten(),
                "frequency": r.try_get::<Option<String>, _>("frequency").ok().flatten(),
                "form": r.try_get::<Option<String>, _>("form").ok().flatten(),
                "reason": r.try_get::<Option<String>, _>("reason").ok().flatten(),
                "start_date": r.try_get::<Option<chrono::NaiveDate>, _>("start_date")
                    .ok().flatten().map(|d| d.to_string()),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": medications,
        "error": null
    })))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn medication_to_json(r: &sqlx::postgres::PgRow) -> serde_json::Value {
    json!({
        "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
        "name": r.try_get::<Option<String>, _>("name").ok().flatten().unwrap_or_default(),
        "generic_name": r.try_get::<Option<String>, _>("generic_name").ok().flatten(),
        "dosage": r.try_get::<Option<String>, _>("dosage").ok().flatten(),
        "frequency": r.try_get::<Option<String>, _>("frequency").ok().flatten(),
        "form": r.try_get::<Option<String>, _>("form").ok().flatten(),
        "prescriber": r.try_get::<Option<String>, _>("prescriber").ok().flatten(),
        "start_date": r.try_get::<Option<chrono::NaiveDate>, _>("start_date")
            .ok().flatten().map(|d| d.to_string()),
        "end_date": r.try_get::<Option<chrono::NaiveDate>, _>("end_date")
            .ok().flatten().map(|d| d.to_string()),
        "reason": r.try_get::<Option<String>, _>("reason").ok().flatten(),
        "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
        "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
        "source": r.try_get::<Option<String>, _>("source").ok().flatten().unwrap_or_else(|| "manual".to_string()),
        "original_images": r.try_get::<Option<serde_json::Value>, _>("original_images").ok().flatten(),
        "ai_extracted_data": r.try_get::<Option<serde_json::Value>, _>("ai_extracted_data").ok().flatten(),
        "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
            .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
        "updated_at": r.try_get::<chrono::DateTime<Utc>, _>("updated_at")
            .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
    })
}
