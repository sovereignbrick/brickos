// Sovereign Health Intelligence -- AGPL-3.0
//
// Sprint 048 #048-13/14/15: practitioner impersonation session
// management + scope classification (Design 028 / ADR-051).
//
// The practitioner calls POST /practitioner/impersonate/start with a
// patient_user_id. The backend:
//   - verifies the caller is a practitioner / org_owner of the org
//   - verifies the patient's consent is active
//   - inserts a row in impersonation_sessions and returns the id as
//     the X-Impersonation-Token (plus expires_at = now + 30 min)
//
// The frontend stores the token in a session cookie and includes it
// as a header on every request. The auth middleware (see
// middleware/auth.rs) loads the session, validates it, bumps
// last_seen_at, and stores the patient's user_id on the
// AuthenticatedUser struct as the "effective" user for that request.
//
// Classification of endpoints into {Allowed, BlockedWrite,
// HardExcluded, Other} lives here too so route-table changes stay
// co-located with the enforcement logic.

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

/// How long an impersonation session can be idle before it auto-ends.
/// Enforced by the middleware (not a DB trigger) via last_seen_at.
pub const IMPERSONATION_IDLE_TIMEOUT_MINUTES: i64 = 30;

#[derive(Deserialize)]
pub struct StartImpersonationRequest {
    pub patient_user_id: Uuid,
}

#[derive(Serialize)]
pub struct StartImpersonationResponse {
    pub session_id: Uuid,
    pub patient_user_id: Uuid,
    pub expires_at: chrono::DateTime<Utc>,
}

/// POST /practitioner/impersonate/start
pub async fn start(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<StartImpersonationRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");

    if !matches!(org_role, "org_owner" | "practitioner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let patient_id = body.patient_user_id;

    // Verify: (a) patient is an org_member of the same org AND (b)
    // consent is active. The single query below returns at most one row
    // only if both conditions hold.
    let eligible: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM org_members om
            JOIN patient_consents pc
                 ON pc.patient_user_id = om.user_id
                AND pc.org_id          = om.org_id
                AND pc.revoked_at IS NULL
            WHERE om.user_id = $1
              AND om.org_id  = $2
        )
        "#,
    )
    .bind(patient_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if !eligible {
        // 404 not 403 -- the practitioner shouldn't learn whether this
        // specific user_id exists, just that they can't impersonate it.
        return Err(AppError::NotFound);
    }

    // Insert a fresh session row.
    let session_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO impersonation_sessions (practitioner_id, patient_id, org_id)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(auth.user_id)
    .bind(patient_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await?;

    let expires_at = Utc::now() + chrono::Duration::minutes(IMPERSONATION_IDLE_TIMEOUT_MINUTES);

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": StartImpersonationResponse {
            session_id,
            patient_user_id: patient_id,
            expires_at,
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct ExitImpersonationRequest {
    pub session_id: Uuid,
}

/// POST /practitioner/impersonate/exit
pub async fn exit(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<ExitImpersonationRequest>,
) -> Result<HttpResponse, AppError> {
    // End the session (idempotent -- sets ended_at only if NULL).
    sqlx::query(
        r#"
        UPDATE impersonation_sessions
           SET ended_at   = NOW(),
               end_reason = 'exit'
         WHERE id              = $1
           AND practitioner_id = $2
           AND ended_at IS NULL
        "#,
    )
    .bind(body.session_id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "session_id": body.session_id, "ended": true },
        "error": null
    })))
}

// ── Scope classification (#048-15) ───────────────────────────────────────────

/// Outcome of classifying one request during an impersonation session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImpersonationScope {
    /// The path is an allowed read during impersonation. Proceed with
    /// the effective user swapped to the patient.
    Allowed,
    /// The path IS allowed for reading but this is a write -- block.
    BlockedWrite,
    /// The path is never exposed to impersonation (Doctor Chat,
    /// billing, licensing). Block regardless of method.
    HardExcluded,
    /// The path has no impersonation relevance (auth, public endpoints,
    /// health probes). Let it through as the practitioner.
    Other,
}

/// Prefixes that are READABLE during impersonation. Any non-GET method
/// on these paths is a BlockedWrite. New /sovereign-health/* endpoints
/// default to Other -- add them here explicitly.
const ALLOWED_READ_PREFIXES: &[&str] = &[
    "/zones",
    "/markers",
    "/user-markers",
    "/measurements",
    "/trends",
    "/sync/changes",
    "/v1/content/",
    "/auth/me", // reading the patient's profile IS part of the read scope
];

/// Prefixes that are HARD-EXCLUDED during impersonation. Any method
/// on these paths blocks with `impersonation_out_of_scope`.
const HARD_EXCLUDED_PREFIXES: &[&str] = &[
    "/doctor-chat",
    "/billing",
    "/license",
    "/org-settings", // org config is an admin surface, not a clinical read
    "/admin",
    "/practitioner", // the impersonation endpoints themselves re-enter here
    "/platform",
];

/// Classify a request path+method. Called by the impersonation
/// middleware when X-Impersonation-Token is present and valid.
pub fn classify(path: &str, method: &actix_web::http::Method) -> ImpersonationScope {
    // Normalise: strip query string.
    let path = path.split('?').next().unwrap_or(path);

    for hard in HARD_EXCLUDED_PREFIXES {
        if path == *hard || path.starts_with(&format!("{hard}/")) {
            return ImpersonationScope::HardExcluded;
        }
    }

    let is_allowed_prefix = ALLOWED_READ_PREFIXES
        .iter()
        .any(|p| path == *p || path.starts_with(p));
    if is_allowed_prefix {
        if method == actix_web::http::Method::GET {
            return ImpersonationScope::Allowed;
        }
        return ImpersonationScope::BlockedWrite;
    }

    ImpersonationScope::Other
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::http::Method;

    #[test]
    fn classify_reads() {
        assert_eq!(
            classify("/zones", &Method::GET),
            ImpersonationScope::Allowed
        );
        assert_eq!(
            classify("/measurements/abc", &Method::GET),
            ImpersonationScope::Allowed
        );
        assert_eq!(
            classify("/trends/iron?days=60", &Method::GET),
            ImpersonationScope::Allowed
        );
    }

    #[test]
    fn classify_writes_blocked() {
        assert_eq!(
            classify("/measurements", &Method::POST),
            ImpersonationScope::BlockedWrite
        );
        assert_eq!(
            classify("/user-markers/iron", &Method::PUT),
            ImpersonationScope::BlockedWrite
        );
    }

    #[test]
    fn classify_hard_excluded() {
        assert_eq!(
            classify("/doctor-chat", &Method::GET),
            ImpersonationScope::HardExcluded
        );
        assert_eq!(
            classify("/doctor-chat/quota", &Method::GET),
            ImpersonationScope::HardExcluded
        );
        assert_eq!(
            classify("/billing/subscription", &Method::GET),
            ImpersonationScope::HardExcluded
        );
        assert_eq!(
            classify("/license", &Method::GET),
            ImpersonationScope::HardExcluded
        );
        assert_eq!(
            classify("/practitioner/members", &Method::GET),
            ImpersonationScope::HardExcluded
        );
    }

    #[test]
    fn classify_other() {
        assert_eq!(classify("/health", &Method::GET), ImpersonationScope::Other);
        assert_eq!(
            classify("/auth/login", &Method::POST),
            ImpersonationScope::Other
        );
    }
}
