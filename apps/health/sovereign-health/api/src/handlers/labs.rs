// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::lab::{CreateLabRequest, Lab, UpdateLabRequest},
};

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, name, address, postal_code, city, country, phone, notes, created_at
           FROM labs WHERE user_id = $1 ORDER BY name"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let labs: Vec<Lab> = rows
        .iter()
        .map(|r| Lab {
            id: r.try_get::<Uuid, _>("id").map(|u| u.to_string()).unwrap_or_default(),
            name: r.try_get("name").unwrap_or_default(),
            address: r.try_get("address").ok().flatten(),
            postal_code: r.try_get("postal_code").ok().flatten(),
            city: r.try_get("city").ok().flatten(),
            country: r.try_get("country").ok().flatten(),
            phone: r.try_get("phone").ok().flatten(),
            notes: r.try_get("notes").ok().flatten(),
            created_at: r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .map(|t| t.to_rfc3339()).unwrap_or_default(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": labs, "error": null })))
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateLabRequest>,
) -> Result<HttpResponse, AppError> {
    if body.name.trim().is_empty() {
        return Err(AppError::Validation("Lab name is required".to_string()));
    }

    let row = sqlx::query(
        r#"INSERT INTO labs (user_id, name, address, postal_code, city, country, phone, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, name) DO UPDATE SET
               address = COALESCE(EXCLUDED.address, labs.address),
               postal_code = COALESCE(EXCLUDED.postal_code, labs.postal_code),
               city = COALESCE(EXCLUDED.city, labs.city),
               country = COALESCE(EXCLUDED.country, labs.country),
               phone = COALESCE(EXCLUDED.phone, labs.phone),
               updated_at = NOW()
           RETURNING id"#,
    )
    .bind(auth.user_id)
    .bind(body.name.trim())
    .bind(&body.address)
    .bind(&body.postal_code)
    .bind(&body.city)
    .bind(&body.country)
    .bind(&body.phone)
    .bind(&body.notes)
    .fetch_one(pool.get_ref())
    .await?;

    let id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "id": id.to_string() },
        "error": null
    })))
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateLabRequest>,
) -> Result<HttpResponse, AppError> {
    let lab_id = path.into_inner();

    sqlx::query(
        r#"UPDATE labs SET
               name = COALESCE($1, name),
               address = COALESCE($2, address),
               postal_code = COALESCE($3, postal_code),
               city = COALESCE($4, city),
               country = COALESCE($5, country),
               phone = COALESCE($6, phone),
               notes = COALESCE($7, notes),
               updated_at = NOW()
           WHERE id = $8 AND user_id = $9"#,
    )
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.postal_code)
    .bind(&body.city)
    .bind(&body.country)
    .bind(&body.phone)
    .bind(&body.notes)
    .bind(lab_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "data": "updated", "error": null })))
}

pub async fn delete(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let lab_id = path.into_inner();

    // Unlink measurements first
    sqlx::query("UPDATE measurements SET lab_id = NULL WHERE lab_id = $1 AND user_id = $2")
        .bind(lab_id)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    sqlx::query("DELETE FROM labs WHERE id = $1 AND user_id = $2")
        .bind(lab_id)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({ "data": "deleted", "error": null })))
}

/// Find or create a lab by name for a given user (used during import)
pub async fn find_or_create(
    pool: &PgPool,
    user_id: Uuid,
    name: &str,
    address: Option<&str>,
    postal_code: Option<&str>,
    city: Option<&str>,
    country: Option<&str>,
) -> Result<Uuid, AppError> {
    let row = sqlx::query(
        r#"INSERT INTO labs (user_id, name, address, postal_code, city, country)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, name) DO UPDATE SET
               address = COALESCE(EXCLUDED.address, labs.address),
               postal_code = COALESCE(EXCLUDED.postal_code, labs.postal_code),
               city = COALESCE(EXCLUDED.city, labs.city),
               country = COALESCE(EXCLUDED.country, labs.country),
               updated_at = NOW()
           RETURNING id"#,
    )
    .bind(user_id)
    .bind(name.trim())
    .bind(address)
    .bind(postal_code)
    .bind(city)
    .bind(country)
    .fetch_one(pool)
    .await?;

    row.try_get("id").map_err(|_| AppError::Internal)
}
