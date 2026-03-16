// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::error::AppError;
use crate::models::content::ContentQuery;
use crate::services::content;

/// Extract locale from query param, then Accept-Language header, then default "en"
fn extract_locale(req: &HttpRequest, query: &ContentQuery) -> String {
    let accept_lang = req
        .headers()
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok());
    content::resolve_locale(query.locale.as_deref(), accept_lang)
}

// ---------------------------------------------------------------------------
// GET /v1/content/zones
// ---------------------------------------------------------------------------

pub async fn zones(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_zones(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/markers
// ---------------------------------------------------------------------------

pub async fn markers(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_markers(pool.get_ref(), &locale, query.zone.as_deref()).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/markers/{slug}
// ---------------------------------------------------------------------------

pub async fn marker_by_slug(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let slug = path.into_inner();
    let data = content::get_marker_by_slug(pool.get_ref(), &locale, &slug).await?;

    match data {
        Some(marker) => Ok(HttpResponse::Ok().json(json!({
            "data": marker,
            "locale": locale,
            "error": null
        }))),
        None => Err(AppError::NotFound),
    }
}

// ---------------------------------------------------------------------------
// GET /v1/content/tiers
// ---------------------------------------------------------------------------

pub async fn tiers(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_tiers(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/diet-protocols
// ---------------------------------------------------------------------------

pub async fn diet_protocols(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_diet_protocols(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/eating-patterns
// ---------------------------------------------------------------------------

pub async fn eating_patterns(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_eating_patterns(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/food-categories
// ---------------------------------------------------------------------------

pub async fn food_categories(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_food_categories(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/medication-categories
// ---------------------------------------------------------------------------

pub async fn medication_categories(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_medication_categories(pool.get_ref(), &locale).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/ui-strings
// ---------------------------------------------------------------------------

pub async fn ui_strings(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let data = content::get_ui_strings(pool.get_ref(), &locale, query.context.as_deref()).await?;
    Ok(HttpResponse::Ok().json(json!({
        "data": data,
        "locale": locale,
        "total": data.len(),
        "error": null
    })))
}
