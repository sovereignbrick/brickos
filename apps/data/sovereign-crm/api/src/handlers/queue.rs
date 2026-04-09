//! Background capture processing queue management.

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
pub struct QueueItem {
    pub id: Uuid,
    pub capture_type: String,
    pub status: String,
    pub project_name: Option<String>,
    pub attempts: i32,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct QueueQuery {
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QueueActionResponse {
    pub count: i64,
    pub message: String,
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
// GET /api/v1/queue
// ---------------------------------------------------------------------------

pub async fn list_queue(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    query: web::Query<QueueQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let (sql, has_status) = if query.status.is_some() {
        (
            "SELECT c.id, c.capture_type, c.status, p.name as project_name, \
             c.attempts, c.error_message, c.created_at \
             FROM crm_captures c \
             LEFT JOIN crm_projects p ON p.id = c.project_id \
             WHERE c.org_id = $1 AND c.status = $2 \
             ORDER BY c.created_at DESC"
                .to_string(),
            true,
        )
    } else {
        (
            "SELECT c.id, c.capture_type, c.status, p.name as project_name, \
             c.attempts, c.error_message, c.created_at \
             FROM crm_captures c \
             LEFT JOIN crm_projects p ON p.id = c.project_id \
             WHERE c.org_id = $1 \
             ORDER BY c.created_at DESC"
                .to_string(),
            false,
        )
    };

    let mut qb = sqlx::query(&sql).bind(org_id);

    if has_status {
        qb = qb.bind(query.status.as_deref().unwrap_or_default());
    }

    let rows = qb.fetch_all(pool.get_ref()).await?;

    let items: Vec<QueueItem> = rows
        .iter()
        .map(|row| QueueItem {
            id: row.get("id"),
            capture_type: row.get("capture_type"),
            status: row.get("status"),
            project_name: row.get("project_name"),
            attempts: row.get("attempts"),
            error_message: row.get("error_message"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(items)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/queue/process-all
// ---------------------------------------------------------------------------

pub async fn process_all(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let result = sqlx::query(
        "UPDATE crm_captures SET status = 'processing' \
         WHERE org_id = $1 AND status = 'pending' AND attempts < 3 \
         RETURNING id",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let count = result.len() as i64;

    Ok(
        HttpResponse::Ok().json(ApiResponse::ok(QueueActionResponse {
            count,
            message: format!("Processing {count} captures..."),
        })),
    )
}

// ---------------------------------------------------------------------------
// POST /api/v1/queue/retry-failed
// ---------------------------------------------------------------------------

pub async fn retry_failed(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let result = sqlx::query(
        "UPDATE crm_captures SET status = 'pending', error_message = NULL \
         WHERE org_id = $1 AND status = 'failed' AND attempts < 3",
    )
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    let count = result.rows_affected() as i64;

    Ok(
        HttpResponse::Ok().json(ApiResponse::ok(QueueActionResponse {
            count,
            message: format!("Retried {count} failed captures"),
        })),
    )
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/queue/clear-completed
// ---------------------------------------------------------------------------

pub async fn clear_completed(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let result = sqlx::query(
        "DELETE FROM crm_captures \
         WHERE org_id = $1 AND status = 'extracted' \
         AND processed_at < NOW() - INTERVAL '30 days'",
    )
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    let count = result.rows_affected() as i64;

    Ok(
        HttpResponse::Ok().json(ApiResponse::ok(QueueActionResponse {
            count,
            message: format!("Cleared {count} completed captures"),
        })),
    )
}
