use actix_web::{web, HttpRequest};
use uuid::Uuid;

use crate::Config;
use crate::PlatformPool;

/// Authenticated user context extracted from JWT.
#[derive(Clone, Debug)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub role: String,
    pub tier: String,
    pub org_id: Option<Uuid>,
    pub org_role: Option<String>,
}

/// Extract and verify JWT from Authorization header.
/// Returns AuthContext on success, AppError::Unauthorized on failure.
pub fn extract_auth(req: &HttpRequest) -> Result<AuthContext, crate::AppError> {
    let config = req
        .app_data::<web::Data<Config>>()
        .expect("Config not registered");

    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(crate::AppError::Unauthorized)?;

    let claims = brickos_auth::jwt::verify_jwt(token, &config.jwt_secret)
        .map_err(|_| crate::AppError::Unauthorized)?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| crate::AppError::Unauthorized)?;

    Ok(AuthContext {
        user_id,
        role: claims.role,
        tier: claims.tier,
        org_id: claims.org_id.and_then(|s| Uuid::parse_str(&s).ok()),
        org_role: claims.org_role,
    })
}

/// Fetch the org_id for a user from the platform database.
pub async fn fetch_user_org(
    platform_pool: &PlatformPool,
    user_id: Uuid,
) -> Result<Option<Uuid>, sqlx::Error> {
    let row: Option<(Uuid,)> =
        sqlx::query_as("SELECT org_id FROM brickos.org_members WHERE user_id = $1 LIMIT 1")
            .bind(user_id)
            .fetch_optional(&platform_pool.0)
            .await?;

    Ok(row.map(|r| r.0))
}
