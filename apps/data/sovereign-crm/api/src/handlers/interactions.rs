//! Interaction read handlers -- org-scoped, PII decrypted.

use std::sync::Arc;

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
pub struct InteractionResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub contact_id: Option<Uuid>,
    pub interaction_type: String,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub source_type: Option<String>,
    pub project_id: Option<Uuid>,
    pub ai_provider: Option<String>,
    pub interaction_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListInteractionsQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub contact_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    #[serde(rename = "type")]
    pub interaction_type: Option<String>,
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

const SELECT_FIELDS: &str = "id, org_id, contact_id, interaction_type, subject, body, \
    source_type, project_id, ai_provider, interaction_at, created_at";

fn row_to_interaction(
    row: &sqlx::postgres::PgRow,
    encryptor: &Arc<brickos_crypto::Encryptor>,
) -> InteractionResponse {
    let subject_enc: Option<String> = row.get("subject");
    let body_enc: Option<String> = row.get("body");

    InteractionResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        contact_id: row.get("contact_id"),
        interaction_type: row.get("interaction_type"),
        subject: encryptor.decrypt_opt(subject_enc),
        body: encryptor.decrypt_opt(body_enc),
        source_type: row.get("source_type"),
        project_id: row.get("project_id"),
        ai_provider: row.get("ai_provider"),
        interaction_at: row.get("interaction_at"),
        created_at: row.get("created_at"),
    }
}

// ---------------------------------------------------------------------------
// GET /api/v1/interactions
// ---------------------------------------------------------------------------

pub async fn list_interactions(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<ListInteractionsQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    // Build dynamic WHERE clauses
    let mut conditions = vec!["org_id = $1".to_string()];
    let mut param_idx: u32 = 4; // $1=org_id, $2=limit, $3=offset

    if query.contact_id.is_some() {
        conditions.push(format!("contact_id = ${param_idx}"));
        param_idx += 1;
    }
    if query.project_id.is_some() {
        conditions.push(format!("project_id = ${param_idx}"));
        param_idx += 1;
    }
    if query.interaction_type.is_some() {
        conditions.push(format!("interaction_type = ${param_idx}"));
        let _ = param_idx;
    }

    let sql = format!(
        "SELECT {SELECT_FIELDS} FROM crm_interactions \
         WHERE {} ORDER BY interaction_at DESC LIMIT $2 OFFSET $3",
        conditions.join(" AND ")
    );

    let mut qb = sqlx::query(&sql)
        .bind(org_id)
        .bind(per_page as i64)
        .bind(offset as i64);

    if let Some(contact_id) = query.contact_id {
        qb = qb.bind(contact_id);
    }
    if let Some(project_id) = query.project_id {
        qb = qb.bind(project_id);
    }
    if let Some(ref itype) = query.interaction_type {
        qb = qb.bind(itype.as_str());
    }

    let rows = qb.fetch_all(pool.get_ref()).await?;

    let interactions: Vec<InteractionResponse> = rows
        .iter()
        .map(|row| row_to_interaction(row, &encryptor))
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(interactions)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/interactions/{id}
// ---------------------------------------------------------------------------

pub async fn get_interaction(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let interaction_id = path.into_inner();

    let row = sqlx::query(&format!(
        "SELECT {SELECT_FIELDS} FROM crm_interactions WHERE id = $1 AND org_id = $2"
    ))
    .bind(interaction_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let interaction = row_to_interaction(&row, &encryptor);
    Ok(HttpResponse::Ok().json(ApiResponse::ok(interaction)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/{contact_id}/timeline
// ---------------------------------------------------------------------------

pub async fn contact_timeline(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    // Verify contact exists and belongs to org
    let contact_exists = sqlx::query("SELECT id FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?;

    if contact_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let rows = sqlx::query(&format!(
        "SELECT {SELECT_FIELDS} FROM crm_interactions \
         WHERE contact_id = $1 AND org_id = $2 \
         ORDER BY interaction_at DESC"
    ))
    .bind(contact_id)
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let interactions: Vec<InteractionResponse> = rows
        .iter()
        .map(|row| row_to_interaction(row, &encryptor))
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(interactions)))
}
