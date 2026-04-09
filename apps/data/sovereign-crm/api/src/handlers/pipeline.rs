//! Lead pipeline Kanban -- grouped contacts by lead_stage.

use std::collections::HashMap;
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

const VALID_STAGES: &[&str] = &[
    "new",
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
];

#[derive(Debug, Serialize)]
pub struct PipelineResponse {
    pub stages: HashMap<String, Vec<PipelineContact>>,
}

#[derive(Debug, Serialize)]
pub struct PipelineContact {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub role: Option<String>,
    pub last_seen: DateTime<Utc>,
    pub interaction_count: i32,
}

#[derive(Debug, Deserialize)]
pub struct MoveRequest {
    pub contact_id: Uuid,
    pub lead_stage: String,
}

#[derive(Debug, Serialize)]
pub struct PipelineStats {
    pub stages: Vec<StageCount>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StageCount {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct PipelineQuery {
    pub project_id: Option<Uuid>,
    pub tags: Option<String>,
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
// GET /api/v1/pipeline
// ---------------------------------------------------------------------------

pub async fn get_pipeline(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<PipelineQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    // Build query based on filters
    let rows = if let Some(project_id) = query.project_id {
        sqlx::query(
            "SELECT c.id, c.name, c.email, c.role, c.lead_stage, c.last_seen, c.interaction_count \
             FROM crm_contacts c \
             JOIN crm_project_contacts pc ON pc.contact_id = c.id \
             WHERE c.org_id = $1 AND pc.project_id = $2 \
             ORDER BY c.updated_at DESC",
        )
        .bind(org_id)
        .bind(project_id)
        .fetch_all(pool.get_ref())
        .await?
    } else if let Some(ref tags_csv) = query.tags {
        let tag_names: Vec<&str> = tags_csv.split(',').map(|t| t.trim()).collect();
        let tag_count = tag_names.len() as i64;
        sqlx::query(
            "SELECT c.id, c.name, c.email, c.role, c.lead_stage, c.last_seen, c.interaction_count \
             FROM crm_contacts c \
             JOIN crm_contact_tags ct ON ct.contact_id = c.id \
             JOIN crm_tags t ON t.id = ct.tag_id \
             WHERE c.org_id = $1 AND t.name = ANY($2) \
             GROUP BY c.id, c.name, c.email, c.role, c.lead_stage, c.last_seen, c.interaction_count \
             HAVING COUNT(DISTINCT t.name) = $3 \
             ORDER BY c.updated_at DESC",
        )
        .bind(org_id)
        .bind(&tag_names)
        .bind(tag_count)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        sqlx::query(
            "SELECT id, name, email, role, lead_stage, last_seen, interaction_count \
             FROM crm_contacts \
             WHERE org_id = $1 \
             ORDER BY updated_at DESC",
        )
        .bind(org_id)
        .fetch_all(pool.get_ref())
        .await?
    };

    // Group by lead_stage
    let mut stages: HashMap<String, Vec<PipelineContact>> = HashMap::new();
    for stage in VALID_STAGES {
        stages.insert((*stage).to_string(), Vec::new());
    }

    for row in &rows {
        let stage: String = row.get("lead_stage");
        let email_enc: Option<String> = row.get("email");

        let contact = PipelineContact {
            id: row.get("id"),
            name: row.get("name"),
            email: encryptor.decrypt_opt(email_enc),
            role: row.get("role"),
            last_seen: row.get("last_seen"),
            interaction_count: row.get("interaction_count"),
        };

        stages.entry(stage.clone()).or_default().push(contact);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(PipelineResponse { stages })))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/pipeline/move
// ---------------------------------------------------------------------------

pub async fn move_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<MoveRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    if !VALID_STAGES.contains(&body.lead_stage.as_str()) {
        return Err(AppError::Validation(format!(
            "lead_stage must be one of: {}",
            VALID_STAGES.join(", ")
        )));
    }

    let row = sqlx::query(
        "UPDATE crm_contacts SET lead_stage = $1, updated_at = now() \
         WHERE id = $2 AND org_id = $3 \
         RETURNING id, name, email, role, lead_stage, last_seen, interaction_count",
    )
    .bind(&body.lead_stage)
    .bind(body.contact_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let email_enc: Option<String> = row.get("email");

    let contact = PipelineContact {
        id: row.get("id"),
        name: row.get("name"),
        email: encryptor.decrypt_opt(email_enc),
        role: row.get("role"),
        last_seen: row.get("last_seen"),
        interaction_count: row.get("interaction_count"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(contact)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/pipeline/stats
// ---------------------------------------------------------------------------

pub async fn get_stats(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let rows = sqlx::query(
        "SELECT lead_stage, COUNT(*) as count \
         FROM crm_contacts \
         WHERE org_id = $1 \
         GROUP BY lead_stage \
         ORDER BY lead_stage",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let mut total: i64 = 0;
    let mut stage_counts: Vec<StageCount> = Vec::new();

    // Initialize all valid stages with 0
    let mut count_map: HashMap<String, i64> = HashMap::new();
    for stage in VALID_STAGES {
        count_map.insert((*stage).to_string(), 0);
    }

    for row in &rows {
        let name: String = row.get("lead_stage");
        let count: i64 = row.get("count");
        count_map.insert(name, count);
        total += count;
    }

    for stage in VALID_STAGES {
        stage_counts.push(StageCount {
            name: (*stage).to_string(),
            count: *count_map.get(*stage).unwrap_or(&0),
        });
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(PipelineStats {
        stages: stage_counts,
        total,
    })))
}
