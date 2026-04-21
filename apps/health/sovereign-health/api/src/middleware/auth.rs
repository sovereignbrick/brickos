// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, FromRequest, HttpRequest};
use sqlx::PgPool;
use std::future::{ready, Future, Ready};
use std::pin::Pin;
use uuid::Uuid;

use crate::{
    config::Config, error::AppError, services::auth::verify_jwt_with_fallback, PlatformPool,
};

pub struct AuthenticatedUser {
    /// Effective user_id for the request. For non-impersonation requests
    /// this equals the JWT `sub`. During a valid practitioner
    /// impersonation session, `user_id` is the PATIENT's id so handlers
    /// that filter data by `user_id` return the patient's records.
    pub user_id: Uuid,
    pub role: String,
    pub tier: String,
    pub org_id: Option<Uuid>,
    pub org_role: Option<String>,
    /// Sprint 048 #048-13 Part B: when `impersonating_session_id` is
    /// Some, `original_user_id` holds the practitioner's real id. Used
    /// by audit logging so actions are attributed to the practitioner,
    /// not the swapped-in patient.
    pub original_user_id: Option<Uuid>,
    pub impersonating_session_id: Option<Uuid>,
}

impl AuthenticatedUser {
    /// The id of the actually-authenticated principal (the practitioner
    /// during impersonation; otherwise identical to user_id).
    pub fn principal_id(&self) -> Uuid {
        self.original_user_id.unwrap_or(self.user_id)
    }

    pub fn is_impersonating(&self) -> bool {
        self.impersonating_session_id.is_some()
    }
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
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        // Sprint 048 #048-13 Part B: when X-Impersonation-Token is present
        // and resolves to a valid session, swap the effective user_id to
        // the patient. Any validation miss (expired, ended, consent
        // revoked, wrong practitioner) falls back to the practitioner's
        // own user_id (no impersonation), NOT an error -- that way a stale
        // cookie doesn't 401 the whole request tree.
        let req = req.clone();
        Box::pin(async move {
            let mut user = extract_user(&req)?;

            let token_str = req
                .headers()
                .get("X-Impersonation-Token")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok());
            if let Some(session_id) = token_str {
                if let Some(pool) = req.app_data::<web::Data<PgPool>>() {
                    if let Some(patient_id) =
                        resolve_impersonation(pool.get_ref(), session_id, user.user_id).await
                    {
                        user.original_user_id = Some(user.user_id);
                        user.user_id = patient_id;
                        user.impersonating_session_id = Some(session_id);
                    }
                }
            }

            Ok(user)
        })
    }
}

/// Return Some(patient_id) if the impersonation session is valid right
/// now for this practitioner. Validity = ended_at IS NULL AND within
/// the 30-min sliding idle window AND the patient's consent to the
/// session's org is still active AND the caller matches practitioner_id.
///
/// Side effect on hit: bumps last_seen_at = NOW() so the next request
/// extends the window.
async fn resolve_impersonation(
    pool: &PgPool,
    session_id: Uuid,
    practitioner_id: Uuid,
) -> Option<Uuid> {
    use crate::handlers::impersonation::IMPERSONATION_IDLE_TIMEOUT_MINUTES;

    let row: Option<(Uuid, Uuid)> = sqlx::query_as(
        r#"
        UPDATE impersonation_sessions s
           SET last_seen_at = NOW()
          FROM patient_consents c
         WHERE s.id              = $1
           AND s.practitioner_id = $2
           AND s.ended_at IS NULL
           AND s.last_seen_at > NOW() - ($3 || ' minutes')::interval
           AND c.patient_user_id = s.patient_id
           AND c.org_id          = s.org_id
           AND c.revoked_at IS NULL
        RETURNING s.patient_id, s.org_id
        "#,
    )
    .bind(session_id)
    .bind(practitioner_id)
    .bind(IMPERSONATION_IDLE_TIMEOUT_MINUTES.to_string())
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    row.map(|(patient_id, _org_id)| patient_id)
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
        .or_else(|| {
            req.app_data::<web::Data<sqlx::PgPool>>()
                .map(|p| p.get_ref().clone())
        });
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
        original_user_id: None,
        impersonating_session_id: None,
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
                    org_role: "org_owner".to_string(),
                });
            }
            match (u.org_id, u.org_role.as_deref()) {
                // Sprint 040 #463: roles consolidated 5->3. The legacy
                // "owner" | "tech_admin" | "commercial_admin" all collapse
                // into "org_owner". The migration in 011_roles_seed.sql
                // rewrites existing rows.
                (Some(org_id), Some("org_owner")) => Ok(OrgAdmin {
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

// Sprint 044 #490 item 6: OrgTechAdmin and OrgCommercialAdmin removed.
// Both were deprecated in Sprint 040 #463 (5->3 role consolidation) and
// had zero handler callers. Use OrgAdmin instead.
