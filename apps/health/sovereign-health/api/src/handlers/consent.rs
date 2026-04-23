// Sovereign Health Intelligence -- AGPL-3.0
//
// Sprint 048 #048-11: patient-facing consent endpoints (Design 028 /
// ADR-051). Lets a patient grant + revoke an org's access to their
// health records from their own /settings/organization-access page.
//
// - GET  /user/organization-access     -- list every (org, consent)
// - POST /user/organization-access/{org_id}/grant   -- grant / re-grant
// - POST /user/organization-access/{org_id}/revoke  -- revoke

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

/// GET /user/organization-access
///
/// Returns every org the caller is a member of, joined with their
/// current consent state. Solo-platform users (members of only the
/// default platform org, if any) see an empty list -- the frontend
/// uses that to hide the Settings tab entirely.
pub async fn list_consents(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT o.id               AS org_id,
               o.name             AS org_name,
               o.slug             AS org_slug,
               om.role            AS member_role,
               om.joined_at       AS joined_at,
               pc.granted_at      AS granted_at,
               pc.revoked_at      AS revoked_at
        FROM org_members om
        JOIN organizations o ON o.id = om.org_id
        LEFT JOIN patient_consents pc
               ON pc.patient_user_id = om.user_id
              AND pc.org_id          = om.org_id
        WHERE om.user_id = $1
          AND o.is_deleted = false
          AND o.is_active  = true
        ORDER BY om.joined_at DESC
        "#,
    )
    .bind(auth.user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let granted_at: Option<chrono::DateTime<chrono::Utc>> =
                r.try_get("granted_at").ok().flatten();
            let revoked_at: Option<chrono::DateTime<chrono::Utc>> =
                r.try_get("revoked_at").ok().flatten();
            let is_granted = granted_at.is_some() && revoked_at.is_none();
            json!({
                "org_id":      r.try_get::<Uuid, _>("org_id").unwrap_or_default(),
                "org_name":    r.try_get::<String, _>("org_name").unwrap_or_default(),
                "org_slug":    r.try_get::<String, _>("org_slug").unwrap_or_default(),
                "member_role": r.try_get::<String, _>("member_role").unwrap_or_default(),
                "joined_at":   r.try_get::<chrono::DateTime<chrono::Utc>, _>("joined_at").ok(),
                "granted_at":  granted_at,
                "revoked_at":  revoked_at,
                "is_granted":  is_granted,
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

/// POST /user/organization-access/{org_id}/grant
///
/// Upserts an active consent row for (caller, org). Re-grant after
/// revoke resets revoked_at and bumps granted_at. 403 if the caller
/// is not a member of the org.
pub async fn grant_consent(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    // Verify membership (prevents random users consenting to arbitrary orgs).
    let is_member: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM org_members WHERE user_id = $1 AND org_id = $2)",
    )
    .bind(auth.user_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if !is_member {
        return Err(AppError::Forbidden);
    }

    sqlx::query(
        r#"
        INSERT INTO patient_consents (patient_user_id, org_id, granted_at, revoked_at)
        VALUES ($1, $2, NOW(), NULL)
        ON CONFLICT (patient_user_id, org_id)
        DO UPDATE SET granted_at = NOW(), revoked_at = NULL
        "#,
    )
    .bind(auth.user_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "org_id": org_id, "is_granted": true },
        "error": null
    })))
}

/// GET /user/data-access-log
///
/// Sprint 048 #048-43: patient-facing audit trail. Returns every
/// impersonation event where this user was the target (resource_id =
/// auth.user_id). Satisfies GDPR Art. 15 "right of access" for the
/// practitioner-review surface. Includes start/exit/read rows; blocked
/// attempts are not shown because blocked rows don't carry a resource_id
/// (middleware-level pre-auth logging).
pub async fn data_access_log(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    // Fetch up to 500 most-recent rows where the authenticated user is
    // the TARGET (resource_id) of an impersonation action. Practitioner
    // (user_id) is who performed the action.
    let rows = sqlx::query(
        r#"
        SELECT a.id, a.action, a.user_id AS actor_id, a.org_id,
               a.metadata, a.created_at,
               u.email AS actor_email, u.display_name AS actor_name,
               o.name AS org_name
          FROM audit_log a
          LEFT JOIN users u ON u.id = a.user_id
          LEFT JOIN organizations o ON o.id = a.org_id
         WHERE a.resource_id = $1
           AND a.action LIKE 'impersonation.%'
         ORDER BY a.created_at DESC
         LIMIT 500
        "#,
    )
    .bind(auth.principal_id())
    .fetch_all(pool.get_ref())
    .await?;

    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "action": r.try_get::<String, _>("action").unwrap_or_default(),
                "actor_id": r.try_get::<Option<Uuid>, _>("actor_id").ok().flatten(),
                "actor_email": r.try_get::<Option<String>, _>("actor_email").ok().flatten(),
                "actor_name": r.try_get::<Option<String>, _>("actor_name").ok().flatten(),
                "org_name": r.try_get::<Option<String>, _>("org_name").ok().flatten(),
                "metadata": r.try_get::<Option<serde_json::Value>, _>("metadata").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

/// POST /user/organization-access/{org_id}/revoke
///
/// Sets revoked_at = NOW(). Immediately invalidates any active
/// impersonation tokens for this (patient, org) pair -- this is handled
/// by the impersonation middleware re-checking consent on every
/// request, so we do not need a separate invalidation step here.
pub async fn revoke_consent(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let affected = sqlx::query(
        r#"
        UPDATE patient_consents
           SET revoked_at = NOW()
         WHERE patient_user_id = $1
           AND org_id          = $2
           AND revoked_at IS NULL
        "#,
    )
    .bind(auth.user_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?
    .rows_affected();

    // Idempotent: revoking a non-existent or already-revoked consent is
    // still a 200 ok (it's already in the desired state).
    Ok(HttpResponse::Ok().json(json!({
        "data": { "org_id": org_id, "is_granted": false, "rows_affected": affected },
        "error": null
    })))
}

// ── Sprint 049 #049-22 (Sprint 048 carry-over #048-34) ───────────────────
// Bulk consent reminder email for an org's pending patients.
//
// An org admin clicks "Email all pending patients" in the members page.
// The backend enumerates org members without a granted consent row and
// sends each a reminder email with the /settings/organization-access
// deep link. Rate-limited by the governor scope on /org-settings/*.

use brickos_email::EmailProvider;
use std::sync::Arc;

/// POST /org-settings/consent-reminders
///
/// Requires org_owner or practitioner role. Returns the number of
/// reminders dispatched. No body needed; the caller's auth determines
/// the org scope via X-Org-Domain / AuthenticatedUser.
pub async fn bulk_consent_reminder(
    pool: web::Data<PgPool>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    config: web::Data<crate::config::Config>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");
    if !matches!(org_role, "org_owner" | "practitioner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    // Pending = org_members with role='member' AND no live consent row.
    let rows = sqlx::query(
        r#"
        SELECT u.id AS user_id, u.email, u.display_name, o.name AS org_name
          FROM org_members om
          JOIN users u ON u.id = om.user_id
          JOIN organizations o ON o.id = om.org_id
         WHERE om.org_id = $1
           AND om.role = 'member'
           AND NOT EXISTS (
               SELECT 1 FROM patient_consents pc
                WHERE pc.patient_user_id = u.id
                  AND pc.org_id = om.org_id
                  AND pc.revoked_at IS NULL
           )
         LIMIT 500
        "#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let total = rows.len();
    let frontend_url = config.frontend_url.clone();
    let provider = email_provider.get_ref().clone();

    let mut sent = 0usize;
    for row in rows {
        let to_addr: String = row.try_get("email").unwrap_or_default();
        let org_name: String = row
            .try_get("org_name")
            .unwrap_or_else(|_| "your clinic".to_string());
        let settings_url = format!("{frontend_url}/settings?tab=organization-access");

        let subject = format!("Reminder: {org_name} needs your consent");
        let html = format!(
            r#"<p>Hello,</p>
            <p>{org_name} can only view your health data once you grant consent. You can enable or disable access at any time from your Settings.</p>
            <p><a href="{settings_url}">Open consent settings</a></p>"#
        );
        let text = format!(
            "Hello,\n\n{org_name} can only view your health data once you grant consent. Manage it here: {settings_url}\n"
        );

        if provider
            .send(&to_addr, &subject, &html, &text)
            .await
            .is_ok()
        {
            sent += 1;
        }
    }

    // Audit the bulk action (fire-and-forget).
    let actor_id = auth.principal_id();
    let pool_inner = pool.get_ref().clone();
    tokio::spawn(async move {
        let _ = sqlx::query(
            "INSERT INTO audit_log (user_id, org_id, action, resource_type, metadata, app_key) VALUES ($1, $2, 'org_consent.bulk_reminder', 'org', $3, 'shi')",
        )
        .bind(actor_id)
        .bind(org_id)
        .bind(serde_json::json!({ "total": total, "sent": sent }))
        .execute(&pool_inner)
        .await;
    });

    Ok(HttpResponse::Ok().json(json!({
        "data": { "org_id": org_id, "total": total, "sent": sent },
        "error": null
    })))
}
