//! Universal tagging system -- polymorphic tags across contacts, companies, projects.
//! Tags are org-scoped first-class objects with usage counts.

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct TagResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub usage_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TagAssignRequest {
    pub entity_type: String,
    pub entity_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct TagUnassignRequest {
    pub entity_type: String,
    pub entity_id: Uuid,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(req: &HttpRequest, platform_pool: &PlatformPool) -> Result<Uuid, AppError> {
    let auth = extract_auth(req)?;
    if let Some(oid) = auth.org_id {
        return Ok(oid);
    }
    fetch_user_org(platform_pool, auth.user_id)
        .await
        .map_err(|e| AppError::Internal(e.into()))?
        .ok_or(AppError::Unauthorized)
}

const VALID_ENTITY_TYPES: &[&str] = &["contact", "company", "project"];

fn validate_entity_type(t: &str) -> Result<(), AppError> {
    if VALID_ENTITY_TYPES.contains(&t) {
        Ok(())
    } else {
        Err(AppError::Validation(format!(
            "Invalid entity_type '{}'. Must be one of: {}",
            t,
            VALID_ENTITY_TYPES.join(", ")
        )))
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/v1/tags -- list all tags for the org
pub async fn list_tags(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;

    let rows = sqlx::query(
        "SELECT id, org_id, name, color, usage_count, created_at
         FROM crm_tags WHERE org_id = $1 ORDER BY usage_count DESC, name ASC",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    let tags: Vec<TagResponse> = rows
        .iter()
        .map(|r| TagResponse {
            id: r.get("id"),
            org_id: r.get("org_id"),
            name: r.get("name"),
            color: r.get("color"),
            usage_count: r.get("usage_count"),
            created_at: r.get("created_at"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(tags))
}

/// POST /api/v1/tags -- create a tag (auto-lowercase, trimmed)
pub async fn create_tag(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
    body: web::Json<CreateTagRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;

    let name = body.name.trim().to_lowercase();
    if name.is_empty() {
        return Err(AppError::Validation("Tag name cannot be empty".into()));
    }

    let row = sqlx::query(
        "INSERT INTO crm_tags (org_id, name, color)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_id, name) DO NOTHING
         RETURNING id, org_id, name, color, usage_count, created_at",
    )
    .bind(org_id)
    .bind(&name)
    .bind(body.color.as_deref())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    match row {
        Some(r) => {
            let tag = TagResponse {
                id: r.get("id"),
                org_id: r.get("org_id"),
                name: r.get("name"),
                color: r.get("color"),
                usage_count: r.get("usage_count"),
                created_at: r.get("created_at"),
            };
            Ok(HttpResponse::Created().json(tag))
        }
        None => Err(AppError::Conflict(format!("Tag '{}' already exists", name))),
    }
}

/// DELETE /api/v1/tags/{id} -- delete tag (cascades taggings)
pub async fn delete_tag(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let tag_id = path.into_inner();

    let result = sqlx::query("DELETE FROM crm_tags WHERE id = $1 AND org_id = $2")
        .bind(tag_id)
        .bind(org_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| AppError::Internal(e.into()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(HttpResponse::NoContent().finish())
}

/// POST /api/v1/tags/{id}/assign -- assign tag to entity
pub async fn assign_tag(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
    path: web::Path<Uuid>,
    body: web::Json<TagAssignRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let tag_id = path.into_inner();

    validate_entity_type(&body.entity_type)?;

    // Verify tag belongs to this org
    let tag_exists = sqlx::query("SELECT 1 FROM crm_tags WHERE id = $1 AND org_id = $2")
        .bind(tag_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| AppError::Internal(e.into()))?;

    if tag_exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Insert tagging (ignore duplicate)
    sqlx::query(
        "INSERT INTO crm_taggings (tag_id, entity_type, entity_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING",
    )
    .bind(tag_id)
    .bind(&body.entity_type)
    .bind(body.entity_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    // Update usage count
    sqlx::query(
        "UPDATE crm_tags SET usage_count = (
             SELECT COUNT(*) FROM crm_taggings WHERE tag_id = $1
         ) WHERE id = $1",
    )
    .bind(tag_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({"assigned": true})))
}

/// DELETE /api/v1/tags/{id}/unassign -- remove tag from entity
pub async fn unassign_tag(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
    path: web::Path<Uuid>,
    body: web::Json<TagUnassignRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let tag_id = path.into_inner();

    validate_entity_type(&body.entity_type)?;

    // Verify tag belongs to this org
    let tag_exists = sqlx::query("SELECT 1 FROM crm_tags WHERE id = $1 AND org_id = $2")
        .bind(tag_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| AppError::Internal(e.into()))?;

    if tag_exists.is_none() {
        return Err(AppError::NotFound);
    }

    sqlx::query(
        "DELETE FROM crm_taggings
         WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3",
    )
    .bind(tag_id)
    .bind(&body.entity_type)
    .bind(body.entity_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    // Update usage count
    sqlx::query(
        "UPDATE crm_tags SET usage_count = (
             SELECT COUNT(*) FROM crm_taggings WHERE tag_id = $1
         ) WHERE id = $1",
    )
    .bind(tag_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({"unassigned": true})))
}
