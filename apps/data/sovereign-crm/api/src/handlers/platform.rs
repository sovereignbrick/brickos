//! Platform integration handlers -- CRM stats, NOSTR export, Lightning, short links.

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
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
pub struct PlatformStats {
    pub contact_count: i64,
    pub company_count: i64,
    pub project_count: i64,
    pub meeting_count: i64,
    pub interaction_count: i64,
    pub capture_count_pending: i64,
    pub capture_count_extracted: i64,
    pub tag_count: i64,
    pub active_users: i64,
}

#[derive(Debug, Serialize)]
pub struct NostrContact {
    pub petname: String,
    pub relay: String,
    pub pubkey: String,
}

#[derive(Debug, Serialize)]
pub struct NostrExport {
    pub contacts: Vec<NostrContact>,
    pub format: String,
    pub exported_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SetLightningRequest {
    pub lightning_address: String,
}

#[derive(Debug, Serialize)]
pub struct LightningResponse {
    pub lightning_address: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShortLinkResponse {
    pub short_url: String,
    pub note: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Resolve the org_id from the JWT or fall back to a platform DB lookup.
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
// GET /api/v1/platform/stats
// ---------------------------------------------------------------------------

pub async fn get_stats(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let contact_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm_contacts WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await?;

    let company_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm_companies WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await?;

    let project_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm_projects WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await?;

    let meeting_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm_meetings WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await?;

    let interaction_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm_interactions WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await?;

    let capture_count_pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm_captures WHERE org_id = $1 AND status = 'pending'",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let capture_count_extracted: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm_captures WHERE org_id = $1 AND status = 'extracted'",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let tag_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM crm_tags WHERE org_id = $1")
        .bind(org_id)
        .fetch_one(pool.get_ref())
        .await?;

    let active_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT user_id) FROM crm_captures \
         WHERE org_id = $1 AND created_at > NOW() - INTERVAL '30 days'",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let stats = PlatformStats {
        contact_count,
        company_count,
        project_count,
        meeting_count,
        interaction_count,
        capture_count_pending,
        capture_count_extracted,
        tag_count,
        active_users,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(stats)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/export/nostr
// ---------------------------------------------------------------------------

pub async fn export_nostr_nip02(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    // Stub: export all contacts as NIP-02 petnames (no pubkey storage yet)
    let rows = sqlx::query("SELECT name FROM crm_contacts WHERE org_id = $1 ORDER BY name ASC")
        .bind(org_id)
        .fetch_all(pool.get_ref())
        .await?;

    let contacts: Vec<NostrContact> = rows
        .iter()
        .map(|row| {
            let name: String = row.get("name");
            NostrContact {
                petname: name,
                relay: String::new(),
                pubkey: String::new(),
            }
        })
        .collect();

    let export = NostrExport {
        contacts,
        format: "nip-02".to_string(),
        exported_at: Utc::now().to_rfc3339(),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(export)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/{id}/lightning
// ---------------------------------------------------------------------------

pub async fn get_lightning(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    let row =
        sqlx::query("SELECT lightning_address FROM crm_contacts WHERE id = $1 AND org_id = $2")
            .bind(contact_id)
            .bind(org_id)
            .fetch_optional(pool.get_ref())
            .await?
            .ok_or(AppError::NotFound)?;

    let lightning_address: Option<String> = row.get("lightning_address");

    Ok(HttpResponse::Ok().json(ApiResponse::ok(LightningResponse { lightning_address })))
}

// ---------------------------------------------------------------------------
// POST /api/v1/contacts/{id}/lightning
// ---------------------------------------------------------------------------

pub async fn set_lightning(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<SetLightningRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    if body.lightning_address.trim().is_empty() {
        return Err(AppError::Validation("lightning_address is required".into()));
    }

    let result = sqlx::query(
        "UPDATE crm_contacts SET lightning_address = $1 \
         WHERE id = $2 AND org_id = $3",
    )
    .bind(body.lightning_address.trim())
    .bind(contact_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(LightningResponse {
        lightning_address: Some(body.lightning_address.trim().to_string()),
    })))
}

// ---------------------------------------------------------------------------
// POST /api/v1/contacts/{id}/short-link
// ---------------------------------------------------------------------------

pub async fn create_short_link(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    // Verify contact exists and belongs to org
    let _row = sqlx::query("SELECT id FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    // Stub: generate a placeholder short code from the contact ID
    let code = &contact_id.to_string()[..8];

    Ok(HttpResponse::Ok().json(ApiResponse::ok(ShortLinkResponse {
        short_url: format!("https://link.brickos.io/{code}"),
        note: "Sovereign Link integration pending".to_string(),
    })))
}
