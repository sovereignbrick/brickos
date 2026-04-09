//! Contact enrichment handlers -- web profile lookup cache.

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct EnrichmentResponse {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub nostr_nip05: Option<String>,
    pub website_url: Option<String>,
    pub ai_summary: Option<String>,
    pub cached_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct EnrichRequest {
    #[serde(default)]
    pub linkedin_url: Option<String>,
    #[serde(default)]
    pub github_url: Option<String>,
    #[serde(default)]
    pub nostr_nip05: Option<String>,
    #[serde(default)]
    pub website_url: Option<String>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(
    req: &HttpRequest,
    platform_pool: &PlatformPool,
) -> Result<(Uuid, Uuid), AppError> {
    let auth = extract_auth(req)?;
    let org_id = match auth.org_id {
        Some(id) => id,
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden)?,
    };
    Ok((auth.user_id, org_id))
}

// ---------------------------------------------------------------------------
// POST /api/v1/contacts/{id}/enrich
// ---------------------------------------------------------------------------

pub async fn enrich_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<EnrichRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    // Verify contact exists and belongs to org
    sqlx::query("SELECT id FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    // Stub enrichment: in the future this will call external APIs
    // (LinkedIn, GitHub, NOSTR) to populate these fields automatically.
    // For now, accept optional manual overrides or create a placeholder entry.
    let ai_summary =
        Some("Enrichment pending -- external API integration not yet enabled.".to_string());

    let row = sqlx::query(
        "INSERT INTO crm_enrichment_cache \
             (entity_type, entity_id, linkedin_url, github_url, nostr_nip05, website_url, ai_summary) \
         VALUES ('contact', $1, $2, $3, $4, $5, $6) \
         ON CONFLICT (entity_type, entity_id) DO UPDATE SET \
             linkedin_url = COALESCE(EXCLUDED.linkedin_url, crm_enrichment_cache.linkedin_url), \
             github_url = COALESCE(EXCLUDED.github_url, crm_enrichment_cache.github_url), \
             nostr_nip05 = COALESCE(EXCLUDED.nostr_nip05, crm_enrichment_cache.nostr_nip05), \
             website_url = COALESCE(EXCLUDED.website_url, crm_enrichment_cache.website_url), \
             ai_summary = COALESCE(EXCLUDED.ai_summary, crm_enrichment_cache.ai_summary), \
             cached_at = NOW() \
         RETURNING id, entity_type, entity_id, linkedin_url, github_url, \
                   nostr_nip05, website_url, ai_summary, cached_at",
    )
    .bind(contact_id)
    .bind(body.linkedin_url.as_deref())
    .bind(body.github_url.as_deref())
    .bind(body.nostr_nip05.as_deref())
    .bind(body.website_url.as_deref())
    .bind(ai_summary.as_deref())
    .fetch_one(pool.get_ref())
    .await?;

    let enrichment = EnrichmentResponse {
        id: row.get("id"),
        entity_type: row.get("entity_type"),
        entity_id: row.get("entity_id"),
        linkedin_url: row.get("linkedin_url"),
        github_url: row.get("github_url"),
        nostr_nip05: row.get("nostr_nip05"),
        website_url: row.get("website_url"),
        ai_summary: row.get("ai_summary"),
        cached_at: row.get("cached_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(enrichment)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/{id}/enrichment
// ---------------------------------------------------------------------------

pub async fn get_enrichment(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    // Verify contact exists and belongs to org
    sqlx::query("SELECT id FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let row = sqlx::query(
        "SELECT id, entity_type, entity_id, linkedin_url, github_url, \
         nostr_nip05, website_url, ai_summary, cached_at \
         FROM crm_enrichment_cache \
         WHERE entity_type = 'contact' AND entity_id = $1",
    )
    .bind(contact_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let enrichment = EnrichmentResponse {
        id: row.get("id"),
        entity_type: row.get("entity_type"),
        entity_id: row.get("entity_id"),
        linkedin_url: row.get("linkedin_url"),
        github_url: row.get("github_url"),
        nostr_nip05: row.get("nostr_nip05"),
        website_url: row.get("website_url"),
        ai_summary: row.get("ai_summary"),
        cached_at: row.get("cached_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(enrichment)))
}
