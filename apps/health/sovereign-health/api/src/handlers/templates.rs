// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::measurement::{CreateTemplateRequest, MeasurementTemplate, UpdateTemplateRequest},
};

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let templates = sqlx::query_as::<_, MeasurementTemplate>(
        r#"SELECT id, user_id, name, marker_slugs, is_default, display_order, last_used_at, created_at, updated_at, defaults
        FROM measurement_templates
        WHERE user_id = $1
        ORDER BY display_order ASC, created_at ASC"#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": templates,
        "error": null
    })))
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateTemplateRequest>,
) -> Result<HttpResponse, AppError> {
    // Tier check: count vs max_templates
    let current_count: i32 =
        sqlx::query_scalar("SELECT COUNT(*)::int4 FROM measurement_templates WHERE user_id = $1")
            .bind(auth.user_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);
    crate::services::tier::check_count_limit(
        pool.get_ref(),
        auth.user_id,
        "templates",
        current_count,
    )
    .await?;

    // Validate name
    let name = body.name.trim();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::Validation(
            "Template name must be between 1 and 100 characters".to_string(),
        ));
    }

    // Validate marker_slugs
    if body.marker_slugs.is_empty() {
        return Err(AppError::Validation(
            "marker_slugs must contain at least one marker".to_string(),
        ));
    }

    // If is_default, unset all other defaults for this user
    if body.is_default {
        sqlx::query(
            "UPDATE measurement_templates SET is_default = false, updated_at = now() WHERE user_id = $1",
        )
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;
    }

    let template = sqlx::query_as::<_, MeasurementTemplate>(
        r#"INSERT INTO measurement_templates (user_id, name, marker_slugs, is_default, display_order, defaults, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, now())
        RETURNING id, user_id, name, marker_slugs, is_default, display_order, last_used_at, created_at, updated_at, defaults"#,
    )
    .bind(auth.user_id)
    .bind(name)
    .bind(&body.marker_slugs)
    .bind(body.is_default)
    .bind(body.display_order)
    .bind(&body.defaults)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(json!({
        "data": template,
        "error": null
    })))
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateTemplateRequest>,
) -> Result<HttpResponse, AppError> {
    let template_id = path.into_inner();

    // Verify ownership
    let existing = sqlx::query_as::<_, MeasurementTemplate>(
        r#"SELECT id, user_id, name, marker_slugs, is_default, display_order, last_used_at, created_at, updated_at, defaults
        FROM measurement_templates
        WHERE id = $1 AND user_id = $2"#,
    )
    .bind(template_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    // Validate name if provided
    if let Some(ref name) = body.name {
        let name = name.trim();
        if name.is_empty() || name.len() > 100 {
            return Err(AppError::Validation(
                "Template name must be between 1 and 100 characters".to_string(),
            ));
        }
    }

    // Validate marker_slugs if provided
    if let Some(ref slugs) = body.marker_slugs {
        if slugs.is_empty() {
            return Err(AppError::Validation(
                "marker_slugs must contain at least one marker".to_string(),
            ));
        }
    }

    // If setting is_default to true, unset all other defaults
    if body.is_default == Some(true) {
        sqlx::query(
            "UPDATE measurement_templates SET is_default = false, updated_at = now() WHERE user_id = $1 AND id != $2",
        )
        .bind(auth.user_id)
        .bind(template_id)
        .execute(pool.get_ref())
        .await?;
    }

    let new_name = body.name.as_deref().unwrap_or(&existing.name);
    let new_slugs = body.marker_slugs.as_ref().unwrap_or(&existing.marker_slugs);
    let new_is_default = body.is_default.unwrap_or(existing.is_default);
    let new_display_order = body.display_order.unwrap_or(existing.display_order);
    let new_defaults = if body.defaults.is_some() {
        &body.defaults
    } else {
        &existing.defaults
    };

    let template = sqlx::query_as::<_, MeasurementTemplate>(
        r#"UPDATE measurement_templates
        SET name = $3, marker_slugs = $4, is_default = $5, display_order = $6, defaults = $7, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, name, marker_slugs, is_default, display_order, last_used_at, created_at, updated_at, defaults"#,
    )
    .bind(template_id)
    .bind(auth.user_id)
    .bind(new_name)
    .bind(new_slugs)
    .bind(new_is_default)
    .bind(new_display_order)
    .bind(new_defaults)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": template,
        "error": null
    })))
}

pub async fn touch(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let template_id = path.into_inner();
    sqlx::query(
        "UPDATE measurement_templates SET last_used_at = now() WHERE id = $1 AND user_id = $2",
    )
    .bind(template_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "data": "ok", "error": null })))
}

pub async fn delete(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let template_id = path.into_inner();

    // Verify ownership and delete
    let result = sqlx::query(
        "DELETE FROM measurement_templates WHERE id = $1 AND user_id = $2 RETURNING id",
    )
    .bind(template_id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    use sqlx::Row;
    let deleted_id: Uuid = result.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "id": deleted_id },
        "error": null
    })))
}
