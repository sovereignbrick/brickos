// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use uuid::Uuid;

use crate::middleware::auth::AdminUser;
use crate::models::content::{
    AdminContentStringQuery, ContentStringCreateBody, ContentStringExportQuery, ContentStringQuery,
    ContentStringUpdateBody,
};
use crate::services::content as svc;

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

pub struct ContentStringsCache {
    pub inner: Mutex<HashMap<String, (serde_json::Value, Instant)>>,
}

impl Default for ContentStringsCache {
    fn default() -> Self {
        Self::new()
    }
}

impl ContentStringsCache {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    fn get(&self, key: &str) -> Option<serde_json::Value> {
        let map = self.inner.lock().ok()?;
        let (val, ts) = map.get(key)?;
        if ts.elapsed().as_secs() < 300 {
            Some(val.clone())
        } else {
            None
        }
    }

    fn set(&self, key: String, val: serde_json::Value) {
        if let Ok(mut map) = self.inner.lock() {
            map.insert(key, (val, Instant::now()));
        }
    }

    fn invalidate_section(&self, section: &str) {
        if let Ok(mut map) = self.inner.lock() {
            map.retain(|k, _| !k.starts_with(section));
        }
    }
}

// ---------------------------------------------------------------------------
// Public: GET /v1/content/strings?section=app&lang=en
// ---------------------------------------------------------------------------

pub async fn get_strings(
    pool: web::Data<PgPool>,
    cache: web::Data<ContentStringsCache>,
    query: web::Query<ContentStringQuery>,
) -> HttpResponse {
    let section = query.section.as_deref().unwrap_or("app");
    let lang = query.lang.as_deref().unwrap_or("en");
    let cache_key = format!("{section}:{lang}");

    if let Some(cached) = cache.get(&cache_key) {
        return HttpResponse::Ok().json(json!({ "data": cached, "error": null }));
    }

    match svc::get_content_strings_flat(pool.get_ref(), section, lang).await {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|(key, value)| json!({ "key": key, "value": value }))
                .collect();
            let val = serde_json::Value::Array(data);
            cache.set(cache_key, val.clone());
            HttpResponse::Ok().json(json!({ "data": val, "error": null }))
        }
        Err(e) => {
            tracing::error!("Failed to get content strings: {e}");
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "internal_error", "message": "Failed to load content strings" }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/content-strings?section=app&search=...&page=1&per_page=25
// ---------------------------------------------------------------------------

pub async fn admin_list(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<AdminContentStringQuery>,
) -> HttpResponse {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(25).clamp(1, 100);

    match svc::admin_list_content_strings(
        pool.get_ref(),
        query.section.as_deref(),
        query.search.as_deref(),
        page,
        per_page,
    )
    .await
    {
        Ok((items, total)) => HttpResponse::Ok().json(json!({
            "data": items,
            "meta": { "page": page, "per_page": per_page, "total": total },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Failed to list content strings: {e}");
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "internal_error", "message": "Failed to list content strings" }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// Admin: PUT /admin/content-strings/{id}
// ---------------------------------------------------------------------------

pub async fn admin_update(
    pool: web::Data<PgPool>,
    cache: web::Data<ContentStringsCache>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<ContentStringUpdateBody>,
) -> HttpResponse {
    let id = path.into_inner();

    match svc::admin_update_content_string(
        pool.get_ref(),
        id,
        body.value_en.as_deref(),
        body.value_de.as_deref(),
        body.description.as_deref(),
        admin.user_id,
    )
    .await
    {
        Ok(()) => {
            // Invalidate all cache entries (we don't know which section this string belongs to)
            if let Ok(mut map) = cache.inner.lock() {
                map.clear();
            }

            // Audit log
            let _ = svc::log_content_change(
                pool.get_ref(),
                admin.user_id,
                "content_strings",
                id,
                None,
                "update",
                Some(&json!({
                    "value_en": body.value_en,
                    "value_de": body.value_de,
                })),
            )
            .await;

            HttpResponse::Ok().json(json!({
                "data": { "message": "Content string updated" },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("Failed to update content string: {e}");
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "internal_error", "message": "Failed to update content string" }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// Admin: POST /admin/content-strings
// ---------------------------------------------------------------------------

pub async fn admin_create(
    pool: web::Data<PgPool>,
    cache: web::Data<ContentStringsCache>,
    _admin: AdminUser,
    body: web::Json<ContentStringCreateBody>,
) -> HttpResponse {
    if body.section.is_empty() || body.key.is_empty() || body.value_en.is_empty() {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "validation_error", "message": "section, key, and value_en are required" }
        }));
    }

    match svc::admin_create_content_string(
        pool.get_ref(),
        &body.section,
        &body.key,
        &body.value_en,
        body.value_de.as_deref(),
        body.description.as_deref(),
    )
    .await
    {
        Ok(item) => {
            cache.invalidate_section(&body.section);
            HttpResponse::Created().json(json!({ "data": item, "error": null }))
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate key") || msg.contains("unique constraint") {
                HttpResponse::Conflict().json(json!({
                    "data": null,
                    "error": { "code": "conflict", "message": "A string with this section and key already exists" }
                }))
            } else {
                tracing::error!("Failed to create content string: {e}");
                HttpResponse::InternalServerError().json(json!({
                    "data": null,
                    "error": { "code": "internal_error", "message": "Failed to create content string" }
                }))
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/content-strings/export?section=app
// ---------------------------------------------------------------------------

pub async fn admin_export(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<ContentStringExportQuery>,
) -> HttpResponse {
    let section = query.section.as_deref().unwrap_or("app");

    match svc::get_content_strings_export(pool.get_ref(), section).await {
        Ok(items) => {
            // Build nested JSON: { "en": { nested... }, "de": { nested... } }
            let mut en_flat: HashMap<String, String> = HashMap::new();
            let mut de_flat: HashMap<String, String> = HashMap::new();
            for item in &items {
                en_flat.insert(item.key.clone(), item.value_en.clone());
                if let Some(ref de) = item.value_de {
                    de_flat.insert(item.key.clone(), de.clone());
                }
            }

            let en_nested = unflatten_keys(&en_flat);
            let de_nested = unflatten_keys(&de_flat);

            HttpResponse::Ok()
                .insert_header(("Content-Type", "application/json"))
                .insert_header((
                    "Content-Disposition",
                    format!("attachment; filename=\"content-strings-{section}.json\""),
                ))
                .json(json!({ "en": en_nested, "de": de_nested }))
        }
        Err(e) => {
            tracing::error!("Failed to export content strings: {e}");
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "internal_error", "message": "Failed to export content strings" }
            }))
        }
    }
}

fn unflatten_keys(flat: &HashMap<String, String>) -> serde_json::Value {
    let mut root = serde_json::Map::new();
    for (key, value) in flat {
        let parts: Vec<&str> = key.split('.').collect();
        set_nested(&mut root, &parts, serde_json::Value::String(value.clone()));
    }
    serde_json::Value::Object(root)
}

fn set_nested(
    map: &mut serde_json::Map<String, serde_json::Value>,
    parts: &[&str],
    value: serde_json::Value,
) {
    if parts.len() == 1 {
        map.insert(parts[0].to_string(), value);
        return;
    }
    let child = map
        .entry(parts[0].to_string())
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
    if let serde_json::Value::Object(ref mut child_map) = child {
        set_nested(child_map, &parts[1..], value);
    }
}
