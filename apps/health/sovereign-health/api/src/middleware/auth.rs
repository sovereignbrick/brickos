// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, FromRequest, HttpRequest};
use std::future::{ready, Ready};
use uuid::Uuid;

use crate::{config::Config, error::AppError, services::auth::verify_jwt_with_fallback};

pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub role: String,
    pub tier: String,
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
    if let Some(pool) = req.app_data::<web::Data<sqlx::PgPool>>() {
        let pool = pool.get_ref().clone();
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

    Ok(AuthenticatedUser {
        user_id,
        role: claims.role,
        tier: claims.tier,
    })
}
