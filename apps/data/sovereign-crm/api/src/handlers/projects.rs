//! Project CRUD + contact assignment handlers -- org-scoped, PII encrypted.

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
pub struct ProjectResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ProjectDetailResponse {
    #[serde(flatten)]
    pub project: ProjectResponse,
    pub contact_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssignContactRequest {
    pub contact_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(req: &HttpRequest, platform_pool: &PlatformPool) -> Result<Uuid, AppError> {
    let auth = extract_auth(req)?;
    match auth.org_id {
        Some(org_id) => Ok(org_id),
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden),
    }
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects
// ---------------------------------------------------------------------------

pub async fn list_projects(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query(
        "SELECT id, org_id, name, description, color, notes, created_at, updated_at
         FROM crm_projects
         WHERE org_id = $1
         ORDER BY name ASC
         LIMIT $2 OFFSET $3",
    )
    .bind(org_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(app_pool.get_ref())
    .await?;

    let projects: Vec<ProjectResponse> = rows
        .iter()
        .map(|row| ProjectResponse {
            id: row.get("id"),
            org_id: row.get("org_id"),
            name: row.get("name"),
            description: row.get("description"),
            color: row.get("color"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(projects)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/projects
// ---------------------------------------------------------------------------

pub async fn create_project(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<CreateProjectRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;

    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::Validation("Project name is required".into()));
    }

    let description = body.description.as_deref().map(|d| d.trim().to_string());
    let color = body
        .color
        .as_deref()
        .map(|c| c.trim().to_string())
        .unwrap_or_else(|| "#6366f1".to_string());
    let encrypted_notes = encryptor.encrypt_opt(body.notes.as_deref());

    let row = sqlx::query(
        "INSERT INTO crm_projects (org_id, name, description, color, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, org_id, name, description, color, notes, created_at, updated_at",
    )
    .bind(org_id)
    .bind(&name)
    .bind(&description)
    .bind(&color)
    .bind(&encrypted_notes)
    .fetch_one(app_pool.get_ref())
    .await?;

    let project = ProjectResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        name: row.get("name"),
        description: row.get("description"),
        color: row.get("color"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Created().json(ApiResponse::ok(project)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects/{id}
// ---------------------------------------------------------------------------

pub async fn get_project(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let project_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, org_id, name, description, color, notes, created_at, updated_at
         FROM crm_projects
         WHERE id = $1 AND org_id = $2",
    )
    .bind(project_id)
    .bind(org_id)
    .fetch_optional(app_pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let contact_count: i64 =
        sqlx::query("SELECT COUNT(*) as cnt FROM crm_contact_project WHERE project_id = $1")
            .bind(project_id)
            .fetch_one(app_pool.get_ref())
            .await
            .map(|r| r.get("cnt"))
            .unwrap_or(0);

    let detail = ProjectDetailResponse {
        project: ProjectResponse {
            id: row.get("id"),
            org_id: row.get("org_id"),
            name: row.get("name"),
            description: row.get("description"),
            color: row.get("color"),
            notes: encryptor.decrypt_opt(row.get("notes")),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        },
        contact_count,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(detail)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/{id}
// ---------------------------------------------------------------------------

pub async fn update_project(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateProjectRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let project_id = path.into_inner();

    // Fetch existing to merge partial updates
    let existing = sqlx::query(
        "SELECT id, org_id, name, description, color, notes, created_at, updated_at
         FROM crm_projects
         WHERE id = $1 AND org_id = $2",
    )
    .bind(project_id)
    .bind(org_id)
    .fetch_optional(app_pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let name = body
        .name
        .as_deref()
        .map(|n| n.trim().to_string())
        .unwrap_or_else(|| existing.get("name"));

    if name.is_empty() {
        return Err(AppError::Validation("Project name cannot be empty".into()));
    }

    let description: Option<String> = if body.description.is_some() {
        body.description.as_deref().map(|d| d.trim().to_string())
    } else {
        existing.get("description")
    };

    let color: String = body
        .color
        .as_deref()
        .map(|c| c.trim().to_string())
        .unwrap_or_else(|| existing.get("color"));

    let notes: Option<String> = if body.notes.is_some() {
        encryptor.encrypt_opt(body.notes.as_deref())
    } else {
        existing.get("notes")
    };

    let row = sqlx::query(
        "UPDATE crm_projects
         SET name = $1, description = $2, color = $3, notes = $4, updated_at = now()
         WHERE id = $5 AND org_id = $6
         RETURNING id, org_id, name, description, color, notes, created_at, updated_at",
    )
    .bind(&name)
    .bind(&description)
    .bind(&color)
    .bind(&notes)
    .bind(project_id)
    .bind(org_id)
    .fetch_one(app_pool.get_ref())
    .await?;

    let project = ProjectResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        name: row.get("name"),
        description: row.get("description"),
        color: row.get("color"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(project)))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/{id}
// ---------------------------------------------------------------------------

pub async fn delete_project(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let project_id = path.into_inner();

    // CASCADE on crm_contact_project handles junction cleanup
    let result = sqlx::query("DELETE FROM crm_projects WHERE id = $1 AND org_id = $2")
        .bind(project_id)
        .bind(org_id)
        .execute(app_pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::<()>::ok(())))
}

// ---------------------------------------------------------------------------
// POST /api/v1/projects/{id}/contacts
// ---------------------------------------------------------------------------

pub async fn assign_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<AssignContactRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let project_id = path.into_inner();

    // Verify project belongs to org
    let project_exists =
        sqlx::query("SELECT 1 as x FROM crm_projects WHERE id = $1 AND org_id = $2")
            .bind(project_id)
            .bind(org_id)
            .fetch_optional(app_pool.get_ref())
            .await?;

    if project_exists.is_none() {
        return Err(AppError::NotFound);
    }

    // Verify contact belongs to same org
    let contact_exists =
        sqlx::query("SELECT 1 as x FROM crm_contacts WHERE id = $1 AND org_id = $2")
            .bind(body.contact_id)
            .bind(org_id)
            .fetch_optional(app_pool.get_ref())
            .await?;

    if contact_exists.is_none() {
        return Err(AppError::Validation(
            "Contact not found in this organization".into(),
        ));
    }

    sqlx::query(
        "INSERT INTO crm_contact_project (contact_id, project_id)
         VALUES ($1, $2)
         ON CONFLICT (contact_id, project_id) DO NOTHING",
    )
    .bind(body.contact_id)
    .bind(project_id)
    .execute(app_pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::<()>::ok(())))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/{id}/contacts/{contact_id}
// ---------------------------------------------------------------------------

pub async fn unassign_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let (project_id, contact_id) = path.into_inner();

    // Verify project belongs to org
    let project_exists =
        sqlx::query("SELECT 1 as x FROM crm_projects WHERE id = $1 AND org_id = $2")
            .bind(project_id)
            .bind(org_id)
            .fetch_optional(app_pool.get_ref())
            .await?;

    if project_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let result =
        sqlx::query("DELETE FROM crm_contact_project WHERE contact_id = $1 AND project_id = $2")
            .bind(contact_id)
            .bind(project_id)
            .execute(app_pool.get_ref())
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::<()>::ok(())))
}
