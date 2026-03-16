// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;
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
// GET /v1/content/web/{page_slug}?locale=en
// ---------------------------------------------------------------------------

pub async fn get_web_page_content(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);
    let page_slug = path.into_inner();

    let rows = sqlx::query_as::<_, WebContentRow>(
        r#"SELECT wcs.key, COALESCE(wct.value, wcte.value) AS value
           FROM web_content_sections wcs
           JOIN web_pages wp ON wp.id = wcs.page_id
           LEFT JOIN web_content_translations wct ON wct.section_id = wcs.id AND wct.locale = $1
           LEFT JOIN web_content_translations wcte ON wcte.section_id = wcs.id AND wcte.locale = 'en'
           WHERE wp.slug = $2 AND wp.is_active = TRUE AND wcs.is_active = TRUE
           ORDER BY wcs.sort_order"#,
    )
    .bind(&locale)
    .bind(&page_slug)
    .fetch_all(pool.get_ref())
    .await?;

    if rows.is_empty() {
        // Check if the page exists at all
        let page_exists =
            sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM web_pages WHERE slug = $1)")
                .bind(&page_slug)
                .fetch_one(pool.get_ref())
                .await?;

        if !page_exists {
            return Err(AppError::NotFound);
        }
    }

    let sections: HashMap<String, String> = rows
        .into_iter()
        .filter_map(|r| r.value.map(|v| (r.key, v)))
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "page": page_slug,
            "locale": locale,
            "sections": sections
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/content/web?locale=en
// ---------------------------------------------------------------------------

pub async fn get_all_web_content(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    query: web::Query<ContentQuery>,
) -> Result<HttpResponse, AppError> {
    let locale = extract_locale(&req, &query);

    let rows = sqlx::query_as::<_, WebContentWithPage>(
        r#"SELECT wp.slug AS page_slug, wcs.key, COALESCE(wct.value, wcte.value) AS value
           FROM web_content_sections wcs
           JOIN web_pages wp ON wp.id = wcs.page_id
           LEFT JOIN web_content_translations wct ON wct.section_id = wcs.id AND wct.locale = $1
           LEFT JOIN web_content_translations wcte ON wcte.section_id = wcs.id AND wcte.locale = 'en'
           WHERE wp.is_active = TRUE AND wcs.is_active = TRUE
           ORDER BY wp.sort_order, wcs.sort_order"#,
    )
    .bind(&locale)
    .fetch_all(pool.get_ref())
    .await?;

    // Group by page
    let mut pages: Vec<serde_json::Value> = Vec::new();
    let mut current_page: Option<String> = None;
    let mut current_sections: HashMap<String, String> = HashMap::new();

    for row in rows {
        if current_page.as_deref() != Some(&row.page_slug) {
            if let Some(ref page) = current_page {
                pages.push(json!({
                    "page": page,
                    "sections": current_sections
                }));
                current_sections = HashMap::new();
            }
            current_page = Some(row.page_slug.clone());
        }
        if let Some(value) = row.value {
            current_sections.insert(row.key, value);
        }
    }

    // Push last page
    if let Some(ref page) = current_page {
        pages.push(json!({
            "page": page,
            "sections": current_sections
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": pages,
        "locale": locale,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /admin/content/web-pages
// ---------------------------------------------------------------------------

pub async fn admin_list_web_pages(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    // Fetch all pages
    let pages = sqlx::query_as::<_, WebPageRow>(
        r#"SELECT id, slug, title, sort_order, is_active
           FROM web_pages
           ORDER BY sort_order"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    // Fetch all sections with translations
    let sections = sqlx::query_as::<_, WebSectionWithTranslation>(
        r#"SELECT wcs.id, wcs.page_id, wcs.key, wcs.section_type, wcs.sort_order, wcs.is_active,
                  wct.locale, wct.value
           FROM web_content_sections wcs
           LEFT JOIN web_content_translations wct ON wct.section_id = wcs.id
           ORDER BY wcs.sort_order, wct.locale"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    // Group sections by page, then translations by section
    let mut result: Vec<serde_json::Value> = Vec::new();

    for page in &pages {
        let page_sections: Vec<&WebSectionWithTranslation> =
            sections.iter().filter(|s| s.page_id == page.id).collect();

        // Group by section id
        let mut seen_sections: Vec<serde_json::Value> = Vec::new();
        let mut current_section_id: Option<Uuid> = None;
        let mut current_translations: HashMap<String, String> = HashMap::new();
        let mut current_key = String::new();
        let mut current_type = String::new();
        let mut current_sort = 0i32;
        let mut current_id = Uuid::nil();

        for s in &page_sections {
            if current_section_id != Some(s.id) {
                if current_section_id.is_some() {
                    seen_sections.push(json!({
                        "id": current_id,
                        "key": current_key,
                        "section_type": current_type,
                        "sort_order": current_sort,
                        "translations": current_translations
                    }));
                    current_translations = HashMap::new();
                }
                current_section_id = Some(s.id);
                current_id = s.id;
                current_key = s.key.clone();
                current_type = s.section_type.clone();
                current_sort = s.sort_order;
            }
            if let (Some(ref locale), Some(ref value)) = (&s.locale, &s.value) {
                current_translations.insert(locale.clone(), value.clone());
            }
        }

        // Push last section
        if current_section_id.is_some() {
            seen_sections.push(json!({
                "id": current_id,
                "key": current_key,
                "section_type": current_type,
                "sort_order": current_sort,
                "translations": current_translations
            }));
        }

        result.push(json!({
            "id": page.id,
            "slug": page.slug,
            "title": page.title,
            "sort_order": page.sort_order,
            "sections": seen_sections
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": result,
        "total": result.len(),
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/content/web-sections/{section_id}/translations/{locale}
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct WebTranslationPath {
    pub section_id: Uuid,
    pub locale: String,
}

#[derive(Deserialize)]
pub struct WebTranslationBody {
    pub value: String,
}

pub async fn admin_update_translation(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<WebTranslationPath>,
    body: web::Json<WebTranslationBody>,
) -> Result<HttpResponse, AppError> {
    let p = path.into_inner();

    if !["en", "de"].contains(&p.locale.as_str()) {
        return Err(AppError::Validation("Unsupported locale".to_string()));
    }

    // Verify section exists
    let section_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM web_content_sections WHERE id = $1)",
    )
    .bind(p.section_id)
    .fetch_one(pool.get_ref())
    .await?;

    if !section_exists {
        return Err(AppError::NotFound);
    }

    // Upsert translation
    sqlx::query(
        r#"INSERT INTO web_content_translations (section_id, locale, value, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (section_id, locale)
           DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"#,
    )
    .bind(p.section_id)
    .bind(&p.locale)
    .bind(&body.value)
    .execute(pool.get_ref())
    .await?;

    // Audit log
    let _ = content::log_content_change(
        pool.get_ref(),
        admin.user_id,
        "web_content_translations",
        p.section_id,
        Some(&p.locale),
        "update",
        Some(&json!({ "value": body.value })),
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Translation updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /admin/content/web-pages/{page_id}/sections
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct AddSectionBody {
    pub key: String,
    #[serde(default = "default_section_type")]
    pub section_type: String,
}

fn default_section_type() -> String {
    "text".to_string()
}

pub async fn admin_add_section(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<AddSectionBody>,
) -> Result<HttpResponse, AppError> {
    let page_id = path.into_inner();

    // Verify page exists
    let page_exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM web_pages WHERE id = $1)")
            .bind(page_id)
            .fetch_one(pool.get_ref())
            .await?;

    if !page_exists {
        return Err(AppError::NotFound);
    }

    if body.key.is_empty() || body.key.len() > 100 {
        return Err(AppError::Validation(
            "Key must be 1-100 characters".to_string(),
        ));
    }

    // Get next sort_order
    let max_sort: Option<i32> =
        sqlx::query_scalar("SELECT MAX(sort_order) FROM web_content_sections WHERE page_id = $1")
            .bind(page_id)
            .fetch_one(pool.get_ref())
            .await?;

    let sort_order = max_sort.unwrap_or(0) + 1;

    let section_id = sqlx::query_scalar::<_, Uuid>(
        r#"INSERT INTO web_content_sections (page_id, key, section_type, sort_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id"#,
    )
    .bind(page_id)
    .bind(&body.key)
    .bind(&body.section_type)
    .bind(sort_order)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.constraint().is_some() => AppError::Validation(
            format!("Section key '{}' already exists on this page", body.key),
        ),
        _ => AppError::Internal,
    })?;

    // Audit log
    let _ = content::log_content_change(
        pool.get_ref(),
        admin.user_id,
        "web_content_sections",
        section_id,
        None,
        "create",
        Some(&json!({ "key": body.key, "section_type": body.section_type })),
    )
    .await;

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "id": section_id,
            "key": body.key,
            "section_type": body.section_type,
            "sort_order": sort_order
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// DELETE /admin/content/web-sections/{section_id}
// ---------------------------------------------------------------------------

pub async fn admin_delete_section(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let section_id = path.into_inner();

    let result = sqlx::query("DELETE FROM web_content_sections WHERE id = $1")
        .bind(section_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Audit log
    let _ = content::log_content_change(
        pool.get_ref(),
        admin.user_id,
        "web_content_sections",
        section_id,
        None,
        "delete",
        None,
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Section deleted" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct WebContentRow {
    key: String,
    value: Option<String>,
}

#[derive(sqlx::FromRow)]
struct WebContentWithPage {
    page_slug: String,
    key: String,
    value: Option<String>,
}

#[derive(sqlx::FromRow)]
struct WebPageRow {
    id: Uuid,
    slug: String,
    title: String,
    sort_order: i32,
    #[allow(dead_code)]
    is_active: bool,
}

#[derive(sqlx::FromRow)]
struct WebSectionWithTranslation {
    id: Uuid,
    page_id: Uuid,
    key: String,
    section_type: String,
    sort_order: i32,
    #[allow(dead_code)]
    is_active: bool,
    locale: Option<String>,
    value: Option<String>,
}
