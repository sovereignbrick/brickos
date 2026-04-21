// Sovereign Health Intelligence -- AGPL-3.0
//
// Sprint 048 #048-30: invite-by-email flow.
//
// Three surfaces:
//   - org admin (authed):
//       POST   /org-settings/invites
//       GET    /org-settings/invites
//       POST   /org-settings/invites/{id}/cancel
//   - signup page (public):
//       GET    /signup/invite/{token}
//   - the token is ALSO consumed by POST /auth/signup with
//     invite_token=... -- that part lives in handlers::auth::signup.

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

#[derive(Deserialize)]
pub struct CreateInviteRequest {
    pub email: String,
    pub role: Option<String>,
}

/// POST /org-settings/invites
///
/// Org admin creates an invite row. Idempotent: if an active invite
/// for (org, email) already exists, return that one instead of a 409.
pub async fn create_invite(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateInviteRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");
    if !matches!(org_role, "org_owner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::Validation("Invalid email".into()));
    }
    let role = body.role.as_deref().unwrap_or("member");
    if !matches!(role, "org_owner" | "practitioner" | "member" | "org_member") {
        return Err(AppError::Validation(format!("Invalid role '{role}'")));
    }

    // Re-use an existing active invite if one matches.
    let existing: Option<(Uuid, Uuid)> = sqlx::query_as(
        r#"
        SELECT id, token
          FROM org_invites
         WHERE org_id = $1
           AND lower(email) = $2
           AND accepted_at IS NULL
           AND cancelled_at IS NULL
           AND expires_at > NOW()
         LIMIT 1
        "#,
    )
    .bind(org_id)
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await?;

    let (id, token) = if let Some((id, token)) = existing {
        (id, token)
    } else {
        let row: (Uuid, Uuid) = sqlx::query_as(
            r#"
            INSERT INTO org_invites (org_id, email, role, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id, token
            "#,
        )
        .bind(org_id)
        .bind(&email)
        .bind(role)
        .bind(auth.principal_id())
        .fetch_one(pool.get_ref())
        .await?;

        // Audit the creation.
        let _ = sqlx::query(
            r#"
            INSERT INTO audit_log
                (user_id, org_id, action, resource_type, resource_id, metadata, app_key)
            VALUES ($1, $2, 'org_invite.created', 'invite', $3, $4, 'shi')
            "#,
        )
        .bind(auth.principal_id())
        .bind(org_id)
        .bind(row.0)
        .bind(json!({ "email": email, "role": role }))
        .execute(pool.get_ref())
        .await;

        row
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "id": id,
            "token": token,
            "email": email,
            "role": role,
            // The frontend builds the signup URL from this path; backend
            // doesn't know the public hostname at request time.
            "signup_path": format!("/signup?invite={token}"),
        },
        "error": null
    })))
}

/// GET /org-settings/invites
pub async fn list_invites(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");
    if !matches!(org_role, "org_owner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let rows = sqlx::query(
        r#"
        SELECT id, email, role, created_at, expires_at
          FROM org_invites
         WHERE org_id = $1
           AND accepted_at IS NULL
           AND cancelled_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
        "#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "role": r.try_get::<String, _>("role").unwrap_or_default(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                "expires_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": items, "error": null })))
}

/// POST /org-settings/invites/{id}/cancel
pub async fn cancel_invite(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");
    if !matches!(org_role, "org_owner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }
    let invite_id = path.into_inner();

    let affected = sqlx::query(
        r#"
        UPDATE org_invites
           SET cancelled_at = NOW()
         WHERE id = $1
           AND org_id = $2
           AND accepted_at IS NULL
           AND cancelled_at IS NULL
        "#,
    )
    .bind(invite_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({ "data": { "cancelled": true }, "error": null })))
}

/// GET /signup/invite/{token} -- PUBLIC, no auth required.
///
/// Returns the minimum info the signup page needs to prefill: the
/// invite's email, the org name/slug, and the role it's for. Does NOT
/// leak any PII beyond what the inviter already knew.
pub async fn public_invite_info(
    pool: web::Data<PgPool>,
    _req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let token = path.into_inner();

    let row = sqlx::query(
        r#"
        SELECT i.email, i.role, i.expires_at,
               o.name AS org_name,
               o.slug AS org_slug
          FROM org_invites i
          JOIN organizations o ON o.id = i.org_id
         WHERE i.token = $1
           AND i.accepted_at IS NULL
           AND i.cancelled_at IS NULL
           AND i.expires_at > NOW()
        "#,
    )
    .bind(token)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "email": row.try_get::<String, _>("email").unwrap_or_default(),
            "role": row.try_get::<String, _>("role").unwrap_or_default(),
            "org_name": row.try_get::<String, _>("org_name").unwrap_or_default(),
            "org_slug": row.try_get::<String, _>("org_slug").unwrap_or_default(),
            "expires_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at").ok(),
        },
        "error": null
    })))
}

/// Called from handlers::auth::signup after a user is created when
/// invite_token was included in the signup payload. Joins the org,
/// marks the invite accepted, audits the action.
///
/// Returns Ok(()) on success (or if the token is stale/invalid -- a
/// bad token isn't a fatal signup failure, the user gets the account
/// without the org join). The caller decides whether to surface a
/// warning.
pub async fn accept_invite_on_signup(
    pool: &PgPool,
    token: Uuid,
    new_user_id: Uuid,
    user_email: &str,
) -> Result<(), AppError> {
    // Load + lock the invite row.
    let invite: Option<(Uuid, Uuid, String, String)> = sqlx::query_as(
        r#"
        SELECT id, org_id, email, role
          FROM org_invites
         WHERE token = $1
           AND accepted_at IS NULL
           AND cancelled_at IS NULL
           AND expires_at > NOW()
         FOR UPDATE
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;

    let Some((invite_id, org_id, invite_email, role)) = invite else {
        return Ok(()); // silently skip; user still gets the account
    };

    // Sanity: the signup email should match the invited email (case-insensitive).
    if invite_email.to_lowercase() != user_email.to_lowercase() {
        return Ok(()); // mismatched signup -- don't auto-join
    }

    // Join the org as the invited role.
    let _ = sqlx::query(
        r#"
        INSERT INTO org_members (user_id, org_id, role, invited_by)
        VALUES ($1, $2, $3,
                (SELECT created_by FROM org_invites WHERE id = $4))
        ON CONFLICT (user_id, org_id) DO NOTHING
        "#,
    )
    .bind(new_user_id)
    .bind(org_id)
    .bind(&role)
    .bind(invite_id)
    .execute(pool)
    .await;

    // Mark the invite accepted.
    let _ = sqlx::query(
        r#"
        UPDATE org_invites
           SET accepted_at = NOW(),
               accepted_user_id = $1
         WHERE id = $2
        "#,
    )
    .bind(new_user_id)
    .bind(invite_id)
    .execute(pool)
    .await;

    // Audit.
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_log
            (user_id, org_id, action, resource_type, resource_id, metadata, app_key)
        VALUES ($1, $2, 'org_invite.accepted', 'invite', $3, $4, 'shi')
        "#,
    )
    .bind(new_user_id)
    .bind(org_id)
    .bind(invite_id)
    .bind(json!({ "email": user_email, "role": role }))
    .execute(pool)
    .await;

    Ok(())
}
