//! Smart list handlers -- saved filter queries over contacts.

use std::sync::Arc;

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::handlers::contacts::ContactResponse;
use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct SmartListResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub name: String,
    pub filter_spec: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSmartListRequest {
    pub name: String,
    pub filter_spec: serde_json::Value,
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

fn row_to_smart_list(row: &sqlx::postgres::PgRow) -> SmartListResponse {
    SmartListResponse {
        id: row.get("id"),
        org_id: row.get("org_id"),
        name: row.get("name"),
        filter_spec: row.get("filter_spec"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

// ---------------------------------------------------------------------------
// GET /api/v1/smart-lists
// ---------------------------------------------------------------------------

pub async fn list_smart_lists(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let rows = sqlx::query(
        "SELECT id, org_id, name, filter_spec, created_at, updated_at \
         FROM crm_smart_lists WHERE org_id = $1 ORDER BY name ASC",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let lists: Vec<SmartListResponse> = rows.iter().map(row_to_smart_list).collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(lists)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/smart-lists
// ---------------------------------------------------------------------------

pub async fn create_smart_list(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    body: web::Json<CreateSmartListRequest>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    if body.name.trim().is_empty() {
        return Err(AppError::Validation("name is required".into()));
    }

    let row = sqlx::query(
        "INSERT INTO crm_smart_lists (org_id, name, filter_spec) \
         VALUES ($1, $2, $3) \
         RETURNING id, org_id, name, filter_spec, created_at, updated_at",
    )
    .bind(org_id)
    .bind(body.name.trim())
    .bind(&body.filter_spec)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::ok(row_to_smart_list(&row))))
}

// ---------------------------------------------------------------------------
// GET /api/v1/smart-lists/{id}
// ---------------------------------------------------------------------------

pub async fn get_smart_list(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let list_id = path.into_inner();

    let row = sqlx::query(
        "SELECT id, org_id, name, filter_spec, created_at, updated_at \
         FROM crm_smart_lists WHERE id = $1 AND org_id = $2",
    )
    .bind(list_id)
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(ApiResponse::ok(row_to_smart_list(&row))))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/smart-lists/{id}
// ---------------------------------------------------------------------------

pub async fn delete_smart_list(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let list_id = path.into_inner();

    let result = sqlx::query("DELETE FROM crm_smart_lists WHERE id = $1 AND org_id = $2")
        .bind(list_id)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::NoContent().finish())
}

// ---------------------------------------------------------------------------
// GET /api/v1/smart-lists/{id}/contacts
// ---------------------------------------------------------------------------

pub async fn execute_smart_list(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;
    let list_id = path.into_inner();

    // Fetch the smart list
    let list_row =
        sqlx::query("SELECT filter_spec FROM crm_smart_lists WHERE id = $1 AND org_id = $2")
            .bind(list_id)
            .bind(org_id)
            .fetch_optional(pool.get_ref())
            .await?
            .ok_or(AppError::NotFound)?;

    let filter_spec: serde_json::Value = list_row.get("filter_spec");

    // Build dynamic WHERE clause
    let mut conditions = vec!["c.org_id = $1".to_string()];
    let mut joins = String::new();
    let mut param_idx: u32 = 2;

    // We collect bind values as strings for dynamic binding
    let mut bind_strings: Vec<String> = Vec::new();
    let mut bind_i32: Option<i32> = None;

    // tags filter
    let tags = filter_spec
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        });

    if let Some(ref tag_list) = tags {
        if !tag_list.is_empty() {
            joins.push_str(
                " JOIN crm_taggings tg ON tg.contact_id = c.id \
                 JOIN crm_tags t ON t.id = tg.tag_id",
            );
            conditions.push(format!("t.name = ANY(${param_idx})"));
            param_idx += 1;
        }
    }

    // lead_stage filter
    let lead_stage = filter_spec
        .get("lead_stage")
        .and_then(|v| v.as_str())
        .map(String::from);

    if let Some(ref stage) = lead_stage {
        if !stage.is_empty() {
            conditions.push(format!("c.lead_stage = ${param_idx}"));
            bind_strings.push(stage.clone());
            param_idx += 1;
        }
    }

    // min_interactions filter
    let min_interactions = filter_spec
        .get("min_interactions")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    if let Some(min) = min_interactions {
        conditions.push(format!("c.interaction_count >= ${param_idx}"));
        bind_i32 = Some(min);
        param_idx += 1;
    }

    // last_contacted_before filter (e.g. "30d")
    let last_contacted_before = filter_spec
        .get("last_contacted_before")
        .and_then(|v| v.as_str())
        .map(String::from);

    if let Some(ref period) = last_contacted_before {
        // Parse "30d" -> 30 days
        if let Some(days_str) = period.strip_suffix('d') {
            if let Ok(days) = days_str.parse::<i32>() {
                conditions.push(format!("c.last_seen < NOW() - INTERVAL '{days} days'"));
            }
        }
    }

    let _ = param_idx; // suppress unused warning

    let where_clause = conditions.join(" AND ");
    let sql = format!(
        "SELECT c.id, c.org_id, c.email, c.name, c.phone, c.role, c.notes, \
         c.lead_stage, c.first_seen, c.last_seen, c.interaction_count, \
         c.created_at, c.updated_at \
         FROM crm_contacts c{joins} \
         WHERE {where_clause} \
         ORDER BY c.name ASC \
         LIMIT 500"
    );

    // Bind parameters in the order they were added
    let mut qb = sqlx::query(&sql).bind(org_id);

    if let Some(ref tag_list) = tags {
        if !tag_list.is_empty() {
            qb = qb.bind(tag_list);
        }
    }

    if let Some(ref stage) = lead_stage {
        if !stage.is_empty() {
            qb = qb.bind(stage);
        }
    }

    if let Some(min) = bind_i32 {
        qb = qb.bind(min);
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
