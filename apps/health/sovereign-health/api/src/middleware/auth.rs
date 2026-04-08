// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, FromRequest, HttpRequest};
use std::future::{ready, Ready};
use uuid::Uuid;

use crate::{config::Config, error::AppError, services::auth::verify_jwt_with_fallback, PlatformPool};

pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub role: String,
    pub tier: String,
    pub org_id: Option<Uuid>,
    pub org_role: Option<String>,
}

impl AuthenticatedUser {
    /// Set the RLS session variable on a pool connection.
    /// Uses set_config with is_local=false to set for the full session/connection.
    /// The connection pool resets state between uses.
    ///
    /// Call this at the start of handlers that query RLS-protected tables.
    /// Handlers that DON'T call this will get 0 rows from RLS tables
    /// (defense-in-depth: data is hidden, not exposed).
    pub async fn set_rls(&self, pool: &sqlx::PgPool) -> Result<(), AppError> {
        sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
            .bind(self.user_id.to_string())
            .execute(pool)
            .await
            .map_err(|_| AppError::Internal)?;
        Ok(())
    }
}

impl FromRequest for AuthenticatedUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let result = extract_user(req);
        ready(result)
    }
}

/// Extractor that requires admin role.
pub struct AdminUser {
    pub user_id: Uuid,
}

impl FromRequest for AdminUser {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let result = extract_user(req).and_then(|u| {
            if u.role == "admin" {
                Ok(AdminUser { user_id: u.user_id })
            } else {
                Err(AppError::Forbidden)
            }
        });
        ready(result)
    }
}

fn extract_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    let config = req
        .app_data::<web::Data<Config>>()
        .ok_or(AppError::Internal)?;

    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let claims = verify_jwt_with_fallback(
        token,
        &config.jwt_secret,
        config.jwt_secret_previous.as_deref(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

    // Update last_active_at (throttled: only if >5 min since last update)
    // Prefer PlatformPool (users table lives in platform DB), fall back to app pool
    let platform_pool_clone = req
        .app_data::<web::Data<PlatformPool>>()
        .map(|p| p.0.clone())
        .or_else(|| req.app_data::<web::Data<sqlx::PgPool>>().map(|p| p.get_ref().clone()));
    if let Some(pool) = platform_pool_clone {
        let uid = user_id;
        tokio::spawn(async move {
            let _ = sqlx::query(
                "UPDATE users SET last_active_at = NOW() \
                 WHERE id = $1 AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '5 minutes')",
            )
            .bind(uid)
            .execute(&pool)
            .await;
        });
    }

    let org_id = claims
        .org_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());

    Ok(AuthenticatedUser {
        user_id,
        role: claims.role,
        tier: claims.tier,
        org_id,
        org_role: claims.org_role,
    })
}

/// Extractor for org owner or any org admin (tech or commercial).
pub struct OrgAdmin {
    pub user_id: Uuid,
    pub org_id: Uuid,
    pub org_role: String,
}

impl FromRequest for OrgAdmin {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let result = extract_user(req).and_then(|u| {
            // Platform admin can act as org admin for any org
            if u.role == "admin" {
                return Ok(OrgAdmin {
                    user_id: u.user_id,
                    org_id: u.org_id.unwrap_or_default(),
                    org_role: "owner".to_string(),
                });
            }
            match (u.org_id, u.org_role.as_deref()) {
                (Some(org_id), Some("owner" | "tech_admin" | "commercial_admin")) => Ok(OrgAdmin {
                    user_id: u.user_id,
                    org_id,
                    org_role: u.org_role.unwrap_or_default(),
                }),
                _ => Err(AppError::Forbidden),
            }
        });
        ready(result)
    }
}

/// Extractor for org tech admin (or owner). No commercial access.
pub struct OrgTechAdmin {
    pub user_id: Uuid,
    pub org_id: Uuid,
}

impl FromRequest for OrgTechAdmin {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let result = extract_user(req).and_then(|u| {
            if u.role == "admin" {
                return Ok(OrgTechAdmin {
                    user_id: u.user_id,
                    org_id: u.org_id.unwrap_or_default(),
                });
            }
            match (u.org_id, u.org_role.as_deref()) {
                (Some(org_id), Some("owner" | "tech_admin")) => Ok(OrgTechAdmin {
                    user_id: u.user_id,
                    org_id,
                }),
                _ => Err(AppError::Forbidden),
            }
        });
        ready(result)
    }
}

/// Extractor for org commercial admin (or owner). No tech access.
pub struct OrgCommercialAdmin {
    pub user_id: Uuid,
    pub org_id: Uuid,
}

impl FromRequest for OrgCommercialAdmin {
    type Error = AppError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let result = extract_user(req).and_then(|u| {
            if u.role == "admin" {
                return Ok(OrgCommercialAdmin {
                    user_id: u.user_id,
                    org_id: u.org_id.unwrap_or_default(),
                });
            }
            match (u.org_id, u.org_role.as_deref()) {
                (Some(org_id), Some("owner" | "commercial_admin")) => Ok(OrgCommercialAdmin {
                    user_id: u.user_id,
                    org_id,
                }),
                _ => Err(AppError::Forbidden),
            }
        });
        ready(result)
    }
}
