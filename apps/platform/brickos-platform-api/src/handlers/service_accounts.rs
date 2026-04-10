// BrickOS Platform API -- Service Account CRUD endpoints (#377)
//
// Manages machine-to-machine API credentials for cross-app communication.
// API keys are SHA-256 hashed before storage; plaintext is returned only once
// on creation or rotation.

use actix_web::{web, HttpResponse};
use chrono::{DateTime, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct CreateServiceAccountRequest {
    pub name: String,
    pub display_name: Option<String>,
    pub org_id: Uuid,
    pub scopes: Vec<String>,
    pub rate_limit_daily: Option<i32>,
}

#[derive(Debug, serde::Serialize)]
pub struct CreateServiceAccountResponse {
    pub id: Uuid,
    pub name: String,
    pub api_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct RotateKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub api_key: String,
    pub rotated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ServiceAccountRow {
    pub id: Uuid,
    pub name: String,
    pub display_name: Option<String>,
    pub org_id: Uuid,
    pub scopes: Vec<String>,
    pub rate_limit_daily: i32,
    pub is_active: bool,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Hash an API key with SHA-256 (matches the storage format in brickos.service_accounts).
fn hash_api_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Generate a cryptographically random 64-character hex API key.
fn generate_api_key() -> String {
    let bytes: [u8; 32] = rand::rng().random();
    hex::encode(bytes)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /platform/api/v1/service-accounts
///
/// List all service accounts. Never returns the key hash.
pub async fn list(pool: web::Data<PgPool>) -> HttpResponse {
    let result = sqlx::query_as::<_, ServiceAccountRow>(
        r#"SELECT id, name, display_name, org_id, scopes,
                  rate_limit_daily, is_active, last_used_at, created_at
           FROM brickos.service_accounts
           ORDER BY created_at DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(accounts) => HttpResponse::Ok().json(accounts),
        Err(e) => {
            tracing::error!("Failed to list service accounts: {e}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list service accounts"
            }))
        }
    }
}

/// POST /platform/api/v1/service-accounts
///
/// Create a new service account. Returns the plaintext API key exactly once.
pub async fn create(
    pool: web::Data<PgPool>,
    body: web::Json<CreateServiceAccountRequest>,
) -> HttpResponse {
    let api_key = generate_api_key();
    let key_hash = hash_api_key(&api_key);
    let rate_limit = body.rate_limit_daily.unwrap_or(100);

    let result = sqlx::query_as::<_, ServiceAccountRow>(
        r#"INSERT INTO brickos.service_accounts
               (name, display_name, org_id, api_key_hash, scopes, rate_limit_daily)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, display_name, org_id, scopes,
                     rate_limit_daily, is_active, last_used_at, created_at"#,
    )
    .bind(&body.name)
    .bind(&body.display_name)
    .bind(body.org_id)
    .bind(&key_hash)
    .bind(&body.scopes)
    .bind(rate_limit)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(account) => {
            tracing::info!(
                "Created service account '{}' (id={})",
                account.name,
                account.id
            );
            HttpResponse::Created().json(CreateServiceAccountResponse {
                id: account.id,
                name: account.name,
                api_key,
                created_at: account.created_at,
            })
        }
        Err(e) => {
            tracing::error!("Failed to create service account: {e}");
            if e.to_string().contains("duplicate key") {
                HttpResponse::Conflict().json(serde_json::json!({
                    "error": "A service account with that name already exists"
                }))
            } else {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to create service account"
                }))
            }
        }
    }
}

/// PUT /platform/api/v1/service-accounts/{id}/rotate
///
/// Rotate the API key. Old key stops working immediately.
/// Returns the new plaintext key exactly once.
pub async fn rotate_key(pool: web::Data<PgPool>, path: web::Path<Uuid>) -> HttpResponse {
    let account_id = path.into_inner();
    let new_key = generate_api_key();
    let new_hash = hash_api_key(&new_key);
    let now = Utc::now();

    let result = sqlx::query_scalar::<_, String>(
        r#"UPDATE brickos.service_accounts
           SET api_key_hash = $1, rotated_at = $2
           WHERE id = $3 AND is_active = true
           RETURNING name"#,
    )
    .bind(&new_hash)
    .bind(now)
    .bind(account_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(name)) => {
            tracing::info!("Rotated API key for service account '{name}' (id={account_id})");
            HttpResponse::Ok().json(RotateKeyResponse {
                id: account_id,
                name,
                api_key: new_key,
                rotated_at: now,
            })
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Service account not found or inactive"
        })),
        Err(e) => {
            tracing::error!("Failed to rotate key for service account {account_id}: {e}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to rotate API key"
            }))
        }
    }
}

/// DELETE /platform/api/v1/service-accounts/{id}
///
/// Soft-delete: sets is_active=false. The row is preserved for audit purposes.
pub async fn soft_delete(pool: web::Data<PgPool>, path: web::Path<Uuid>) -> HttpResponse {
    let account_id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE brickos.service_accounts
           SET is_active = false
           WHERE id = $1 AND is_active = true"#,
    )
    .bind(account_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => {
            tracing::info!("Soft-deleted service account {account_id}");
            HttpResponse::NoContent().finish()
        }
        Ok(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Service account not found or already inactive"
        })),
        Err(e) => {
            tracing::error!("Failed to soft-delete service account {account_id}: {e}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete service account"
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/platform/api/v1/service-accounts")
            .route("", web::get().to(list))
            .route("", web::post().to(create))
            .route("/{id}/rotate", web::put().to(rotate_key))
            .route("/{id}", web::delete().to(soft_delete)),
    );
}
