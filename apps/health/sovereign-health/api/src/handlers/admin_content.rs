// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;
use crate::services::content;

// ---------------------------------------------------------------------------
// GET /admin/content/{table}
// ---------------------------------------------------------------------------

pub async fn list_content(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let table = path.into_inner();

    let data = match table.as_str() {
        "zones" => content::admin_list_zones(pool.get_ref()).await?,
        "markers" => content::admin_list_markers(pool.get_ref()).await?,
        "tiers" => content::admin_list_tiers(pool.get_ref()).await?,
        "ui-strings" => content::admin_list_ui_strings(pool.get_ref()).await?,
        "medication-categories" => {
            content::admin_list_medication_categories(pool.get_ref()).await?
        }
        _ => {
            return Err(AppError::Validation(format!(
                "Unknown content table: {}",
                table
            )))
        }
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/content/{table}/{id}/translations/{locale}
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct TranslationPath {
    pub table: String,
    pub id: Uuid,
    pub locale: String,
}

#[derive(Deserialize)]
pub struct TranslationBody {
    pub fields: serde_json::Value,
}

pub async fn update_translation(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<TranslationPath>,
    body: web::Json<TranslationBody>,
) -> Result<HttpResponse, AppError> {
    let p = path.into_inner();

    match p.table.as_str() {
        "zones" => {
            content::update_zone_translation(pool.get_ref(), p.id, &p.locale, &body.fields).await?;
        }
        "markers" => {
            content::update_marker_translation(pool.get_ref(), p.id, &p.locale, &body.fields)
                .await?;
        }
        "tiers" => {
            content::update_tier_translation(pool.get_ref(), p.id, &p.locale, &body.fields).await?;
        }
        "ui-strings" => {
            let value = body
                .fields
                .get("value")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            content::update_ui_string_translation(pool.get_ref(), p.id, &p.locale, value).await?;
        }
        "medication-categories" => {
            content::update_medication_category_translation(
                pool.get_ref(),
                p.id,
                &p.locale,
                &body.fields,
            )
            .await?;
        }
        _ => {
            return Err(AppError::Validation(format!(
                "Unknown content table: {}",
                p.table
            )))
        }
    }

    // Audit log
    let _ = content::log_content_change(
        pool.get_ref(),
        admin.user_id,
        &p.table,
        p.id,
        Some(&p.locale),
        "update",
        Some(&body.fields),
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Translation updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /admin/content/translation-status
// ---------------------------------------------------------------------------

pub async fn translation_status(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let en = content::get_translation_completeness(pool.get_ref(), "en").await?;
    let de = content::get_translation_completeness(pool.get_ref(), "de").await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "locales": [en, de],
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/users/{id}/locale
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdateLocaleBody {
    pub locale: String,
}

pub async fn update_user_locale(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateLocaleBody>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    if !["en", "de"].contains(&body.locale.as_str()) {
        return Err(AppError::Validation("Unsupported locale".to_string()));
    }

    content::update_user_locale(pool.get_ref(), user_id, &body.locale).await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Locale updated" },
        "error": null
    })))
}
