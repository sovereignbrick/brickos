//! Company CRUD handlers -- org-scoped, PII encrypted.

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
pub struct CompanyResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub website: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct CompanyDetailResponse {
    #[serde(flatten)]
    pub company: CompanyResponse,
    pub member_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    #[serde(default)]
    pub domain: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCompanyRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub domain: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
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
// GET /api/v1/companies
// ---------------------------------------------------------------------------

pub async fn list_companies(
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
        "SELECT id, org_id, name, domain, website, notes, created_at, updated_at
         FROM crm_companies
         WHERE org_id = $1
         ORDER BY name ASC
         LIMIT $2 OFFSET $3",
    )
    .bind(org_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(app_pool.get_ref())
    .await?;

    let companies: Vec<CompanyResponse> = rows
        .iter()
        .map(|row| CompanyResponse {
            id: row.get("id"),
            org_id: row.get("org_id"),
            name: row.get("name"),
            domain: row.get("domain"),
            website: row.get("website"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(companies)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/companies
// ---------------------------------------------------------------------------

pub async fn create_company(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<CreateCompanyRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;

    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::Validation("Company name is required".into()));
    }

    let domain = body.domain.as_deref().map(|d| d.trim().to_lowercase());
    let website = body.website.as_deref().map(|w| w.trim().to_string());
    let encrypted_notes = encryptor.encrypt_opt(body.notes.as_deref());

    // Unique domain per org check is enforced by UNIQUE(org_id, domain) constraint
    let row = sqlx::query(
        "INSERT INTO crm_companies (org_id, name, domain, website, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, org_id, name, domain, website, notes, created_at, updated_at",
    )
    .bind(org_id)
    .bind(&name)
    .bind(&domain)
    .bind(&website)
    .bind(&encrypted_notes)
    .fetch_one(app_pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("crm_companies_org_id_domain_key") {
                return AppError::Conflict("A company with this domain already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    let company = CompanyResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        name: row.get("name"),
        domain: row.get("domain"),
        website: row.get("website"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Created().json(ApiResponse::ok(company)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/companies/{id}
// ---------------------------------------------------------------------------

pub async fn get_company(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let company_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, org_id, name, domain, website, notes, created_at, updated_at
         FROM crm_companies
         WHERE id = $1 AND org_id = $2",
    )
    .bind(company_id)
    .bind(org_id)
    .fetch_optional(app_pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let member_count: i64 =
        sqlx::query("SELECT COUNT(*) as cnt FROM crm_contact_company WHERE company_id = $1")
            .bind(company_id)
            .fetch_one(app_pool.get_ref())
            .await
            .map(|r| r.get("cnt"))
            .unwrap_or(0);

    let detail = CompanyDetailResponse {
        company: CompanyResponse {
            id: row.get("id"),
            org_id: row.get("org_id"),
            name: row.get("name"),
            domain: row.get("domain"),
            website: row.get("website"),
            notes: encryptor.decrypt_opt(row.get("notes")),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        },
        member_count,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(detail)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/companies/{id}
// ---------------------------------------------------------------------------

pub async fn update_company(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateCompanyRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let company_id = path.into_inner();

    // Fetch existing to merge partial updates
    let existing = sqlx::query(
        "SELECT id, org_id, name, domain, website, notes, created_at, updated_at
         FROM crm_companies
         WHERE id = $1 AND org_id = $2",
    )
    .bind(company_id)
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
        return Err(AppError::Validation("Company name cannot be empty".into()));
    }

    let domain: Option<String> = if body.domain.is_some() {
        body.domain.as_deref().map(|d| d.trim().to_lowercase())
    } else {
        existing.get("domain")
    };

    let website: Option<String> = if body.website.is_some() {
        body.website.as_deref().map(|w| w.trim().to_string())
    } else {
        existing.get("website")
    };

    let notes: Option<String> = if body.notes.is_some() {
        encryptor.encrypt_opt(body.notes.as_deref())
    } else {
        existing.get("notes")
    };

    let row = sqlx::query(
        "UPDATE crm_companies
         SET name = $1, domain = $2, website = $3, notes = $4, updated_at = now()
         WHERE id = $5 AND org_id = $6
         RETURNING id, org_id, name, domain, website, notes, created_at, updated_at",
    )
    .bind(&name)
    .bind(&domain)
    .bind(&website)
    .bind(&notes)
    .bind(company_id)
    .bind(org_id)
    .fetch_one(app_pool.get_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.constraint() == Some("crm_companies_org_id_domain_key") {
                return AppError::Conflict("A company with this domain already exists".into());
            }
        }
        AppError::Database(e)
    })?;

    let company = CompanyResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        name: row.get("name"),
        domain: row.get("domain"),
        website: row.get("website"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(company)))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/companies/{id}
// ---------------------------------------------------------------------------

pub async fn delete_company(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    app_pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = resolve_org_id(&req, &platform_pool).await?;
    let company_id = path.into_inner();

    // CASCADE on crm_contact_company handles junction cleanup
    let result = sqlx::query("DELETE FROM crm_companies WHERE id = $1 AND org_id = $2")
        .bind(company_id)
        .bind(org_id)
        .execute(app_pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::<()>::ok(())))
}
