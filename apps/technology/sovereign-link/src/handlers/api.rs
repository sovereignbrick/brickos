use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use std::sync::Arc;
use uuid::Uuid;

use crate::db::LinkStore;
use crate::models::*;

/// GET /api/v1/links — List links owned by the authenticated user.
pub async fn list_links(req: HttpRequest, store: web::Data<Arc<dyn LinkStore>>) -> HttpResponse {
    let user_id = match extract_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };

    match store.list_by_owner(user_id).await {
        Ok(links) => HttpResponse::Ok().json(links),
        Err(e) => {
            tracing::error!("Failed to list links: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /api/v1/links — Create a new short link.
pub async fn create_link(
    req: HttpRequest,
    body: web::Json<CreateLinkRequest>,
    store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user_id = match extract_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };

    // Validate vanity code if provided
    if let Some(ref code) = body.code {
        if let Err(reason) = validate_vanity_code(code) {
            return HttpResponse::BadRequest().json(serde_json::json!({"error": reason}));
        }
    }

    match store.create_link(body.into_inner(), Some(user_id)).await {
        Ok(link) => HttpResponse::Created().json(link),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict().json(serde_json::json!({"error": "Code already taken"}))
            } else {
                tracing::error!("Failed to create link: {}", e);
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

/// PUT /api/v1/links/{id} — Update a link.
pub async fn update_link(
    req: HttpRequest,
    id: web::Path<Uuid>,
    body: web::Json<UpdateLinkRequest>,
    store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user_id = match extract_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };

    match store.update_link(*id, user_id, body.into_inner()).await {
        Ok(Some(link)) => HttpResponse::Ok().json(link),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({"error": "Link not found"})),
        Err(e) => {
            tracing::error!("Failed to update link: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// DELETE /api/v1/links/{id} — Deactivate a link.
pub async fn delete_link(
    req: HttpRequest,
    id: web::Path<Uuid>,
    store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user_id = match extract_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };

    match store.deactivate_link(*id, user_id).await {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({"status": "deactivated"})),
        Ok(false) => HttpResponse::NotFound().json(serde_json::json!({"error": "Link not found"})),
        Err(e) => {
            tracing::error!("Failed to deactivate link: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// GET /api/v1/links/{id}/stats — Click analytics for a link.
pub async fn link_stats(
    req: HttpRequest,
    id: web::Path<Uuid>,
    store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let _user_id = match extract_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };

    match store.get_stats(*id).await {
        Ok(stats) => HttpResponse::Ok().json(stats),
        Err(e) => {
            tracing::error!("Failed to get link stats: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// Extract user_id from the request extensions (set by auth middleware).
fn extract_user_id(req: &HttpRequest) -> Option<Uuid> {
    // The host API's auth middleware stores the user_id in request extensions.
    // Try the common patterns:
    req.extensions().get::<Uuid>().copied()
}

/// Validate a vanity code.
pub fn validate_vanity_code(code: &str) -> Result<(), &'static str> {
    if code.len() < 3 {
        return Err("Code must be at least 3 characters");
    }
    if code.len() > 30 {
        return Err("Code must be at most 30 characters");
    }
    if !code
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err("Code must be lowercase alphanumeric or hyphens");
    }
    if code.starts_with('-') || code.ends_with('-') {
        return Err("Code must not start or end with a hyphen");
    }

    // Reserved words
    let reserved = [
        "api", "admin", "health", "finance", "app", "docs", "status", "new", "discover", "export",
        "import", "settings", "login", "signup",
    ];
    if reserved.contains(&code) {
        return Err("This code is reserved");
    }

    // Prevent collision with auto-generated codes (2-char prefix + 8 hex chars)
    if code.len() == 10 && code[..2].chars().all(|c| c.is_ascii_lowercase()) {
        let tail = &code[2..];
        if tail.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err("This code format is reserved for auto-generated affiliate codes");
        }
    }

    Ok(())
}
