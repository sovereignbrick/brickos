use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub email: Option<String>,
    pub name: String,
    pub phone: Option<String>,
    pub role: Option<String>,
    pub notes: Option<String>,
    pub lead_stage: String,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub interaction_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContactRequest {
    pub email: Option<String>,
    pub name: String,
    pub phone: Option<String>,
    pub role: Option<String>,
    pub notes: Option<String>,
    pub lead_stage: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactRequest {
    pub email: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub role: Option<String>,
    pub notes: Option<String>,
    pub lead_stage: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub sort: Option<String>,
    pub q: Option<String>,
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
// GET /api/v1/contacts
// ---------------------------------------------------------------------------

pub async fn list_contacts(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let order_clause = match query.sort.as_deref() {
        Some("name") => "name ASC",
        Some("last_seen") => "last_seen DESC",
        Some("interaction_count") => "interaction_count DESC",
        _ => "updated_at DESC",
    };

    // Build query with optional search filter
    let (sql, has_search) = if query.q.is_some() {
        (
            format!(
                "SELECT id, org_id, email, name, phone, role, notes, lead_stage, \
                 first_seen, last_seen, interaction_count, created_at, updated_at \
                 FROM crm_contacts \
                 WHERE org_id = $1 AND (name ILIKE $4 OR lead_stage ILIKE $4) \
                 ORDER BY {order_clause} LIMIT $2 OFFSET $3"
            ),
            true,
        )
    } else {
        (
            format!(
                "SELECT id, org_id, email, name, phone, role, notes, lead_stage, \
                 first_seen, last_seen, interaction_count, created_at, updated_at \
                 FROM crm_contacts \
                 WHERE org_id = $1 \
                 ORDER BY {order_clause} LIMIT $2 OFFSET $3"
            ),
            false,
        )
    };

    let mut qb = sqlx::query(&sql)
        .bind(org_id)
        .bind(per_page as i64)
        .bind(offset as i64);

    if has_search {
        let pattern = format!("%{}%", query.q.as_deref().unwrap_or_default());
        qb = qb.bind(pattern);
    }

    let rows = qb.fetch_all(pool.get_ref()).await?;

    let contacts: Vec<ContactResponse> = rows
        .iter()
        .map(|row| {
            let email_enc: Option<String> = row.get("email");
            let phone_enc: Option<String> = row.get("phone");
            let notes_enc: Option<String> = row.get("notes");

            ContactResponse {
                id: row.get("id"),
                org_id: row.get("org_id"),
                email: encryptor.decrypt_opt(email_enc),
                name: row.get("name"),
                phone: encryptor.decrypt_opt(phone_enc),
                role: row.get("role"),
                notes: encryptor.decrypt_opt(notes_enc),
                lead_stage: row.get("lead_stage"),
                first_seen: row.get("first_seen"),
                last_seen: row.get("last_seen"),
                interaction_count: row.get("interaction_count"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(contacts)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/contacts
// ---------------------------------------------------------------------------

pub async fn create_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    body: web::Json<CreateContactRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    if body.name.trim().is_empty() {
        return Err(AppError::Validation("name is required".into()));
    }

    let email_enc = encryptor.encrypt_opt(body.email.as_deref());
    let phone_enc = encryptor.encrypt_opt(body.phone.as_deref());
    let notes_enc = encryptor.encrypt_opt(body.notes.as_deref());
    let lead_stage = body.lead_stage.as_deref().unwrap_or("new");

    let row = sqlx::query(
        "INSERT INTO crm_contacts (org_id, email, name, phone, role, notes, lead_stage) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) \
         RETURNING id, org_id, email, name, phone, role, notes, lead_stage, \
                   first_seen, last_seen, interaction_count, created_at, updated_at",
    )
    .bind(org_id)
    .bind(&email_enc)
    .bind(body.name.trim())
    .bind(&phone_enc)
    .bind(body.role.as_deref())
    .bind(&notes_enc)
    .bind(lead_stage)
    .fetch_one(pool.get_ref())
    .await?;

    let contact = ContactResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        email: encryptor.decrypt_opt(row.get("email")),
        name: row.get("name"),
        phone: encryptor.decrypt_opt(row.get("phone")),
        role: row.get("role"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        lead_stage: row.get("lead_stage"),
        first_seen: row.get("first_seen"),
        last_seen: row.get("last_seen"),
        interaction_count: row.get("interaction_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Created().json(ApiResponse::ok(contact)))
}

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/{id}
// ---------------------------------------------------------------------------

pub async fn get_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, org_id, email, name, phone, role, notes, lead_stage, \
         first_seen, last_seen, interaction_count, created_at, updated_at \
         FROM crm_contacts WHERE id = $1 AND org_id = $2",
    )
    .bind(contact_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let contact = ContactResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        email: encryptor.decrypt_opt(row.get("email")),
        name: row.get("name"),
        phone: encryptor.decrypt_opt(row.get("phone")),
        role: row.get("role"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        lead_stage: row.get("lead_stage"),
        first_seen: row.get("first_seen"),
        last_seen: row.get("last_seen"),
        interaction_count: row.get("interaction_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(contact)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/contacts/{id}
// ---------------------------------------------------------------------------

pub async fn update_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateContactRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    // Verify existence and org ownership
    let existing = sqlx::query("SELECT id FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let _existing_id: Uuid = existing.get("id");

    // Build dynamic UPDATE
    let mut set_clauses = Vec::new();
    let mut param_idx: u32 = 3; // $1 = contact_id, $2 = org_id

    // We collect boxed params to bind dynamically
    // Since sqlx doesn't support truly dynamic params easily, use individual columns
    // with COALESCE to keep existing values when not provided.
    let email_enc = body
        .email
        .as_ref()
        .map(|e| encryptor.encrypt_opt(Some(e.as_str())));
    let phone_enc = body
        .phone
        .as_ref()
        .map(|p| encryptor.encrypt_opt(Some(p.as_str())));
    let notes_enc = body
        .notes
        .as_ref()
        .map(|n| encryptor.encrypt_opt(Some(n.as_str())));

    if body.email.is_some() {
        set_clauses.push(format!("email = ${param_idx}"));
        param_idx += 1;
    }
    if body.name.is_some() {
        set_clauses.push(format!("name = ${param_idx}"));
        param_idx += 1;
    }
    if body.phone.is_some() {
        set_clauses.push(format!("phone = ${param_idx}"));
        param_idx += 1;
    }
    if body.role.is_some() {
        set_clauses.push(format!("role = ${param_idx}"));
        param_idx += 1;
    }
    if body.notes.is_some() {
        set_clauses.push(format!("notes = ${param_idx}"));
        param_idx += 1;
    }
    if body.lead_stage.is_some() {
        set_clauses.push(format!("lead_stage = ${param_idx}"));
        param_idx += 1;
    }

    if set_clauses.is_empty() {
        return Err(AppError::Validation(
            "at least one field must be provided".into(),
        ));
    }

    // Always update updated_at
    set_clauses.push(format!("updated_at = ${param_idx}"));
    let _ = param_idx;

    let sql = format!(
        "UPDATE crm_contacts SET {} \
         WHERE id = $1 AND org_id = $2 \
         RETURNING id, org_id, email, name, phone, role, notes, lead_stage, \
                   first_seen, last_seen, interaction_count, created_at, updated_at",
        set_clauses.join(", ")
    );

    let now = Utc::now();
    let mut qb = sqlx::query(&sql).bind(contact_id).bind(org_id);

    // Bind in the same order as set_clauses
    if let Some(ref enc) = email_enc {
        qb = qb.bind(enc.clone());
    }
    if let Some(ref name) = body.name {
        qb = qb.bind(name.trim());
    }
    if let Some(ref enc) = phone_enc {
        qb = qb.bind(enc.clone());
    }
    if let Some(ref role) = body.role {
        qb = qb.bind(role.as_str());
    }
    if let Some(ref enc) = notes_enc {
        qb = qb.bind(enc.clone());
    }
    if let Some(ref lead_stage) = body.lead_stage {
        qb = qb.bind(lead_stage.as_str());
    }
    qb = qb.bind(now);

    let row = qb.fetch_one(pool.get_ref()).await?;

    let contact = ContactResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        email: encryptor.decrypt_opt(row.get("email")),
        name: row.get("name"),
        phone: encryptor.decrypt_opt(row.get("phone")),
        role: row.get("role"),
        notes: encryptor.decrypt_opt(row.get("notes")),
        lead_stage: row.get("lead_stage"),
        first_seen: row.get("first_seen"),
        last_seen: row.get("last_seen"),
        interaction_count: row.get("interaction_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(contact)))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/contacts/{id}
// ---------------------------------------------------------------------------

pub async fn delete_contact(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let contact_id = path.into_inner();

    let result = sqlx::query("DELETE FROM crm_contacts WHERE id = $1 AND org_id = $2")
        .bind(contact_id)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::NoContent().finish())
}
