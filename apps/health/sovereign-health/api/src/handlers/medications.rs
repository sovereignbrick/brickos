// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ── GET /medications/catalog ───────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CatalogQuery {
    pub search: Option<String>,
    pub category: Option<String>,
}

pub async fn catalog(
    pool: web::Data<PgPool>,
    query: web::Query<CatalogQuery>,
) -> Result<HttpResponse, AppError> {
    let mut sql = String::from(
        r#"SELECT slug, name, category, description, common_dosages, common_frequencies, affected_markers
           FROM medication_catalog WHERE 1=1"#,
    );
    let mut params: Vec<String> = vec![];

    if let Some(ref search) = query.search {
        params.push(format!("%{}%", search.to_lowercase()));
        sql.push_str(&format!(
            " AND (LOWER(name) LIKE ${0} OR LOWER(slug) LIKE ${0} OR LOWER(description) LIKE ${0})",
            params.len()
        ));
    }
    if let Some(ref category) = query.category {
        params.push(category.clone());
        sql.push_str(&format!(" AND category = ${}", params.len()));
    }
    sql.push_str(" ORDER BY name LIMIT 50");

    // Build query dynamically
    let mut q = sqlx::query(&sql);
    for p in &params {
        q = q.bind(p);
    }

    let rows = q.fetch_all(pool.get_ref()).await?;

    let medications: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| json!({
            "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "category": r.try_get::<String, _>("category").unwrap_or_default(),
            "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
            "common_dosages": r.try_get::<Vec<String>, _>("common_dosages").unwrap_or_default(),
            "common_frequencies": r.try_get::<Vec<String>, _>("common_frequencies").unwrap_or_default(),
            "affected_markers": r.try_get::<Vec<String>, _>("affected_markers").unwrap_or_default(),
        }))
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": medications,
        "error": null
    })))
}

// ── GET /medications ───────────────────────────────────────────────────────────

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT um.id, um.medication_slug, um.custom_name, um.category,
                  um.dosage, um.frequency, um.timing, um.start_date, um.end_date,
                  um.notes, um.is_active, um.created_at, um.updated_at,
                  mc.name as catalog_name, mc.description as catalog_description
           FROM user_medications um
           LEFT JOIN medication_catalog mc ON mc.slug = um.medication_slug
           WHERE um.user_id = $1 AND um.is_active = true
           ORDER BY um.created_at DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let medications: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let catalog_name: Option<String> = r.try_get("catalog_name").ok().flatten();
            let custom_name: Option<String> = r.try_get("custom_name").ok().flatten();
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "medication_slug": r.try_get::<Option<String>, _>("medication_slug").ok().flatten(),
                "name": catalog_name.or(custom_name).unwrap_or_default(),
                "category": r.try_get::<String, _>("category").unwrap_or_default(),
                "dosage": r.try_get::<Option<String>, _>("dosage").ok().flatten(),
                "frequency": r.try_get::<Option<String>, _>("frequency").ok().flatten(),
                "timing": r.try_get::<Option<String>, _>("timing").ok().flatten(),
                "start_date": r.try_get::<Option<chrono::NaiveDate>, _>("start_date").ok().flatten(),
                "end_date": r.try_get::<Option<chrono::NaiveDate>, _>("end_date").ok().flatten(),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
                "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": medications,
        "error": null
    })))
}

// ── POST /medications ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateMedication {
    pub medication_slug: Option<String>,
    pub custom_name: Option<String>,
    pub category: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub timing: Option<String>,
    pub start_date: Option<String>,
    pub notes: Option<String>,
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateMedication>,
) -> Result<HttpResponse, AppError> {
    // Tier check: count vs max_medications
    let current_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*)::int4 FROM user_medications WHERE user_id = $1 AND is_active = true",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    crate::services::tier::check_count_limit(
        pool.get_ref(),
        auth.user_id,
        "medications",
        current_count,
    )
    .await?;

    if body.medication_slug.is_none() && body.custom_name.is_none() {
        return Err(AppError::Validation(
            "Either medication_slug or custom_name is required".to_string(),
        ));
    }

    let category = body
        .category
        .clone()
        .unwrap_or_else(|| "supplement".to_string());
    let start_date: Option<chrono::NaiveDate> = body
        .start_date
        .as_ref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let row = sqlx::query(
        r#"INSERT INTO user_medications (user_id, medication_slug, custom_name, category, dosage, frequency, timing, start_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(&body.medication_slug)
    .bind(&body.custom_name)
    .bind(&category)
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.timing)
    .bind(start_date)
    .bind(&body.notes)
    .fetch_one(pool.get_ref())
    .await?;

    let id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Created().json(json!({
        "data": { "id": id },
        "error": null
    })))
}

// ── PUT /medications/{id} ──────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateMedication {
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub timing: Option<String>,
    pub notes: Option<String>,
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateMedication>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE user_medications SET
           dosage = COALESCE($1, dosage),
           frequency = COALESCE($2, frequency),
           timing = COALESCE($3, timing),
           notes = COALESCE($4, notes),
           updated_at = now()
           WHERE id = $5 AND user_id = $6"#,
    )
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.timing)
    .bind(&body.notes)
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

// ── DELETE /medications/{id} ───────────────────────────────────────────────────

pub async fn delete(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE user_medications SET
           is_active = false, end_date = CURRENT_DATE, updated_at = now()
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
        "data": { "deleted": true },
        "error": null
    })))
}

// ── GET /medications/interactions ──────────────────────────────────────────────

pub async fn interactions(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    // Get user's active medication slugs
    let med_rows = sqlx::query(
        "SELECT medication_slug FROM user_medications WHERE user_id = $1 AND is_active = true AND medication_slug IS NOT NULL",
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let slugs: Vec<String> = med_rows
        .iter()
        .filter_map(|r| {
            r.try_get::<Option<String>, _>("medication_slug")
                .ok()
                .flatten()
        })
        .collect();

    if slugs.len() < 2 {
        return Ok(HttpResponse::Ok().json(json!({
            "data": [],
            "error": null
        })));
    }

    // Find interactions between user's medications
    let rows = sqlx::query(
        r#"SELECT mi.medication_slug_a, mi.medication_slug_b, mi.severity, mi.description,
                  mc_a.name as name_a, mc_b.name as name_b
           FROM medication_interactions mi
           LEFT JOIN medication_catalog mc_a ON mc_a.slug = mi.medication_slug_a
           LEFT JOIN medication_catalog mc_b ON mc_b.slug = mi.medication_slug_b
           WHERE mi.medication_slug_a = ANY($1) AND mi.medication_slug_b = ANY($1)"#,
    )
    .bind(&slugs)
    .fetch_all(pool.get_ref())
    .await?;

    let interactions: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| json!({
            "medication_a": r.try_get::<Option<String>, _>("name_a").ok().flatten().unwrap_or_default(),
            "medication_b": r.try_get::<Option<String>, _>("name_b").ok().flatten().unwrap_or_default(),
            "severity": r.try_get::<String, _>("severity").unwrap_or_default(),
            "description": r.try_get::<String, _>("description").unwrap_or_default(),
        }))
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": interactions,
        "error": null
    })))
}

// ── GET /medications/{id}/marker-effects ───────────────────────────────────────

pub async fn marker_effects(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    // Get medication slug
    let med_row = sqlx::query(
        "SELECT medication_slug, custom_name FROM user_medications WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let slug: Option<String> = med_row.try_get("medication_slug").ok().flatten();

    let Some(slug) = slug else {
        // Custom medication with no catalog entry
        return Ok(HttpResponse::Ok().json(json!({
            "data": [],
            "error": null
        })));
    };

    let rows = sqlx::query(
        r#"SELECT mme.marker_slug, mme.effect, mme.description, mme.severity
           FROM medication_marker_effects mme
           WHERE mme.medication_slug = $1"#,
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;

    let effects: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "marker_slug": r.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "effect": r.try_get::<String, _>("effect").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "severity": r.try_get::<String, _>("severity").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": effects,
        "error": null
    })))
}
