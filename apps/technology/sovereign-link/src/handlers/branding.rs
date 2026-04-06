//! White-label branding and custom domain management (#355).
//!
//! Provides per-org branding configuration (logo, colors, footer text) and
//! custom domain mapping for white-label deployments.

#[cfg(feature = "platform")]
use actix_web::{web, HttpResponse};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OrgBranding {
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub footer_text: Option<String>,
    pub favicon_url: Option<String>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct DomainMapping {
    pub id: Uuid,
    pub org_id: Uuid,
    pub domain: String,
    pub ssl_status: String,
    pub verified_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Deserialize)]
pub struct AddDomainRequest {
    pub domain: String,
}

// ---------------------------------------------------------------------------
// Branding endpoints
// ---------------------------------------------------------------------------

/// GET /api/v1/orgs/{org_id}/branding
#[cfg(feature = "platform")]
pub async fn get_branding(
    org_id: web::Path<Uuid>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let oid = org_id.into_inner();

    let row = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT COALESCE(branding, '{}') FROM brickos.organizations WHERE id = $1",
    )
    .bind(oid)
    .fetch_optional(pool.get_ref())
    .await;

    match row {
        Ok(Some(branding)) => HttpResponse::Ok().json(branding),
        Ok(None) => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Organization not found"})),
        Err(e) => {
            tracing::error!("Failed to fetch branding for org {}: {}", oid, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// PUT /api/v1/orgs/{org_id}/branding
#[cfg(feature = "platform")]
pub async fn update_branding(
    org_id: web::Path<Uuid>,
    body: web::Json<OrgBranding>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let oid = org_id.into_inner();
    let branding_json = match serde_json::to_value(&body.into_inner()) {
        Ok(v) => v,
        Err(e) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": format!("Invalid branding data: {}", e)}));
        }
    };

    let result = sqlx::query(
        "UPDATE brickos.organizations SET branding = $2 WHERE id = $1",
    )
    .bind(oid)
    .bind(&branding_json)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Organization not found"})),
        Ok(_) => HttpResponse::Ok().json(branding_json),
        Err(e) => {
            tracing::error!("Failed to update branding for org {}: {}", oid, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// Domain mapping endpoints
// ---------------------------------------------------------------------------

/// GET /api/v1/orgs/{org_id}/domains
#[cfg(feature = "platform")]
pub async fn list_domains(
    org_id: web::Path<Uuid>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let oid = org_id.into_inner();

    let rows = sqlx::query_as::<_, DomainMapping>(
        "SELECT id, org_id, domain, ssl_status, verified_at, created_at \
         FROM brickos.domain_mappings WHERE org_id = $1 ORDER BY created_at",
    )
    .bind(oid)
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Failed to list domains for org {}: {}", oid, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /api/v1/orgs/{org_id}/domains
#[cfg(feature = "platform")]
pub async fn add_domain(
    org_id: web::Path<Uuid>,
    body: web::Json<AddDomainRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let oid = org_id.into_inner();
    let domain = &body.domain;

    let row = sqlx::query_as::<_, DomainMapping>(
        "INSERT INTO brickos.domain_mappings (org_id, domain) VALUES ($1, $2) \
         RETURNING id, org_id, domain, ssl_status, verified_at, created_at",
    )
    .bind(oid)
    .bind(domain)
    .fetch_one(pool.get_ref())
    .await;

    match row {
        Ok(mapping) => HttpResponse::Created().json(mapping),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict()
                    .json(serde_json::json!({"error": "Domain already registered"}))
            } else {
                tracing::error!("Failed to add domain for org {}: {}", oid, e);
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

/// DELETE /api/v1/orgs/{org_id}/domains/{domain_id}
#[cfg(feature = "platform")]
pub async fn remove_domain(
    path: web::Path<(Uuid, Uuid)>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let (org_id, domain_id) = path.into_inner();

    let result = sqlx::query(
        "DELETE FROM brickos.domain_mappings WHERE id = $1 AND org_id = $2",
    )
    .bind(domain_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Domain mapping not found"})),
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => {
            tracing::error!("Failed to remove domain {} for org {}: {}", domain_id, org_id, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// Internal: resolve custom domain to org_id
// ---------------------------------------------------------------------------

/// Look up which organization owns a given custom domain.
/// Only returns a match when ssl_status is 'active'.
#[cfg(feature = "platform")]
pub async fn resolve_domain(domain: &str, pool: &PgPool) -> Option<Uuid> {
    let row = sqlx::query_scalar::<_, Uuid>(
        "SELECT org_id FROM brickos.domain_mappings WHERE domain = $1 AND ssl_status = 'active'",
    )
    .bind(domain)
    .fetch_optional(pool)
    .await
    .ok()?;

    row
}
