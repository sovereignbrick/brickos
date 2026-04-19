// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 044: Org owner self-service settings endpoints.
// These mirror platform admin endpoints but scoped to the caller's org
// (org_role=org_owner required via JWT claims).
//
// Lives at /org-settings/* and is accessible from {slug}.brickos.io/org/*.

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser, PlatformPool};

/// Validate org_owner access. Returns the org_id or 403.
fn require_org_owner(auth: &AuthenticatedUser) -> Result<Uuid, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let role = auth.org_role.as_deref().unwrap_or("");
    if role == "org_owner" || auth.role == "admin" {
        Ok(org_id)
    } else {
        Err(AppError::Forbidden)
    }
}

// ── General ──────────────────────────────────────────────────────────────────

/// GET /org-settings/general -- org info (name, slug, type, contact)
pub async fn get_general(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let row = sqlx::query(
        r#"SELECT id, name, slug, org_type, billing_email, is_active, created_at,
                  branding
           FROM organizations WHERE id = $1 AND is_deleted = false"#,
    )
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let branding: Value = row.try_get("branding").unwrap_or(json!({}));

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
            "name": row.try_get::<String, _>("name").unwrap_or_default(),
            "slug": row.try_get::<String, _>("slug").unwrap_or_default(),
            "org_type": row.try_get::<String, _>("org_type").unwrap_or_default(),
            "billing_email": row.try_get::<Option<String>, _>("billing_email").ok().flatten(),
            "is_active": row.try_get::<bool, _>("is_active").unwrap_or(true),
            "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            "app_name": branding.get("app_name").and_then(|v| v.as_str()).unwrap_or(""),
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct UpdateGeneralRequest {
    pub name: Option<String>,
    pub billing_email: Option<String>,
    pub app_name: Option<String>,
}

/// PUT /org-settings/general -- update org name, billing email, app display name
pub async fn update_general(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<UpdateGeneralRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    if let Some(ref name) = body.name {
        sqlx::query("UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2")
            .bind(name)
            .bind(org_id)
            .execute(pool.get_ref())
            .await?;
    }

    if let Some(ref email) = body.billing_email {
        sqlx::query(
            "UPDATE organizations SET billing_email = $1, updated_at = NOW() WHERE id = $2",
        )
        .bind(email)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;
    }

    // app_name stored in branding JSONB
    if let Some(ref app_name) = body.app_name {
        sqlx::query(
            "UPDATE organizations SET branding = jsonb_set(COALESCE(branding, '{}'::jsonb), '{app_name}', to_jsonb($1::text)), updated_at = NOW() WHERE id = $2",
        )
        .bind(app_name)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;
    }

    Ok(HttpResponse::Ok().json(json!({ "data": { "updated": true }, "error": null })))
}

// ── Branding ─────────────────────────────────────────────────────────────────

/// GET /org-settings/branding
pub async fn get_branding(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let branding: Value = sqlx::query_scalar(
        "SELECT COALESCE(branding, '{}'::jsonb) FROM organizations WHERE id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(json!({}));

    Ok(HttpResponse::Ok().json(json!({ "data": branding, "error": null })))
}

#[derive(Deserialize)]
pub struct UpdateBrandingRequest {
    pub branding: Value,
}

/// PUT /org-settings/branding
pub async fn update_branding(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<UpdateBrandingRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    if !body.branding.is_object() {
        return Err(AppError::Validation("branding must be a JSON object".into()));
    }

    sqlx::query(
        "UPDATE organizations SET branding = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = false",
    )
    .bind(&body.branding)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "data": { "updated": true }, "error": null })))
}

// ── Members ──────────────────────────────────────────────────────────────────

/// GET /org-settings/members
pub async fn list_members(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let rows = sqlx::query(
        r#"SELECT om.id, om.user_id, om.role, om.joined_at,
                  u.email, u.display_name, u.last_active_at
           FROM org_members om
           JOIN users u ON u.id = om.user_id
           WHERE om.org_id = $1
           ORDER BY om.joined_at"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let members: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "user_id": r.try_get::<Uuid, _>("user_id").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "role": r.try_get::<String, _>("role").unwrap_or_default(),
                "joined_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("joined_at").ok(),
                "last_active_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_active_at").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({ "data": members, "error": null })))
}

#[derive(Deserialize)]
pub struct InviteMemberRequest {
    pub email: String,
    pub role: Option<String>,
}

/// POST /org-settings/members -- invite a member by email
pub async fn invite_member(
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
    body: web::Json<InviteMemberRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;
    let role = body.role.as_deref().unwrap_or("org_member");

    if !matches!(role, "org_owner" | "practitioner" | "org_member") {
        return Err(AppError::Validation("Invalid role".into()));
    }

    // Find user by email
    let user_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM users WHERE email = $1 AND is_deleted = false",
    )
    .bind(&body.email)
    .fetch_optional(&platform_pool.0)
    .await?;

    let user_id = user_id.ok_or_else(|| {
        AppError::Validation(format!("User with email {} not found", body.email))
    })?;

    // Check not already a member
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2)",
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if exists {
        return Err(AppError::Validation("User is already a member".into()));
    }

    sqlx::query(
        "INSERT INTO org_members (org_id, user_id, role, invited_by) VALUES ($1, $2, $3, $4)",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(role)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "invited": true, "user_id": user_id, "role": role },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct UpdateMemberRoleRequest {
    pub role: String,
}

/// PUT /org-settings/members/{user_id}/role
pub async fn update_member_role(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateMemberRoleRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;
    let target_user_id = path.into_inner();

    if !matches!(body.role.as_str(), "org_owner" | "practitioner" | "org_member") {
        return Err(AppError::Validation("Invalid role".into()));
    }

    let result = sqlx::query(
        "UPDATE org_members SET role = $1 WHERE org_id = $2 AND user_id = $3",
    )
    .bind(&body.role)
    .bind(org_id)
    .bind(target_user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({ "data": { "updated": true }, "error": null })))
}

/// DELETE /org-settings/members/{user_id}
pub async fn remove_member(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;
    let target_user_id = path.into_inner();

    // Cannot remove yourself
    if target_user_id == auth.user_id {
        return Err(AppError::Validation("Cannot remove yourself".into()));
    }

    let result = sqlx::query(
        "DELETE FROM org_members WHERE org_id = $1 AND user_id = $2",
    )
    .bind(org_id)
    .bind(target_user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({ "data": { "removed": true }, "error": null })))
}

// ── Domains ──────────────────────────────────────────────────────────────────

/// GET /org-settings/domains
pub async fn list_domains(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let slug: String = sqlx::query_scalar(
        "SELECT slug FROM organizations WHERE id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or_default();

    let rows = sqlx::query(
        r#"SELECT id, domain, ssl_status, verified_at, created_at
           FROM domain_mappings WHERE org_id = $1
           ORDER BY created_at"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let domains: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "domain": r.try_get::<String, _>("domain").unwrap_or_default(),
                "ssl_status": r.try_get::<String, _>("ssl_status").unwrap_or_default(),
                "verified_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("verified_at").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "subdomain": format!("{}.brickos.io", slug),
            "custom_domains": domains,
        },
        "error": null
    })))
}

// ── Analytics ────────────────────────────────────────────────────────────────

/// GET /org-settings/analytics -- org-level activity stats
pub async fn analytics(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let member_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM org_members WHERE org_id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let active_7d: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(DISTINCT om.user_id)
           FROM org_members om
           JOIN users u ON u.id = om.user_id
           WHERE om.org_id = $1 AND u.last_active_at > NOW() - INTERVAL '7 days'"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let measurement_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM measurements m
           JOIN org_members om ON om.user_id = m.user_id AND om.org_id = $1"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let measurements_7d: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM measurements m
           JOIN org_members om ON om.user_id = m.user_id AND om.org_id = $1
           WHERE m.measured_at > NOW() - INTERVAL '7 days'"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let ai_chats_30d: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM conversations c
           JOIN org_members om ON om.user_id = c.user_id AND om.org_id = $1
           WHERE c.created_at > NOW() - INTERVAL '30 days'"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "members": member_count,
            "active_7d": active_7d,
            "measurements_total": measurement_count,
            "measurements_7d": measurements_7d,
            "ai_chats_30d": ai_chats_30d,
        },
        "error": null
    })))
}

// ── Apps ──────────────────────────────────────────────────────────────────────

/// GET /org-settings/apps -- list enabled apps for this org
pub async fn list_apps(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    // For now, check which app tables have data for this org's members
    let has_shi: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(
            SELECT 1 FROM measurements m
            JOIN org_members om ON om.user_id = m.user_id AND om.org_id = $1
            LIMIT 1
        )"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    Ok(HttpResponse::Ok().json(json!({
        "data": [
            {
                "key": "shi",
                "name": "Sovereign Health Intelligence",
                "enabled": true,
                "has_data": has_shi,
                "settings_path": "/org/apps/shi",
            },
            {
                "key": "link",
                "name": "Sovereign Link",
                "enabled": false,
                "has_data": false,
                "settings_path": "/org/apps/link",
            },
        ],
        "error": null
    })))
}

// ── SHI App Settings ─────────────────────────────────────────────────────────

/// GET /org-settings/apps/shi/ai -- AI model config for this org
pub async fn get_shi_ai_config(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let branding: Value = sqlx::query_scalar(
        "SELECT COALESCE(branding, '{}'::jsonb) FROM organizations WHERE id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(json!({}));

    let system_default = crate::handlers::admin_settings::get_setting_string(
        pool.get_ref(),
        "dr_alex_app_model",
        "claude-sonnet-4-20250514",
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "ai_model_override": branding.get("ai_model_override").and_then(|v| v.as_str()),
            "system_default": system_default,
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct UpdateAiConfigRequest {
    pub ai_model_override: Option<String>,
}

/// PUT /org-settings/apps/shi/ai
pub async fn update_shi_ai_config(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<UpdateAiConfigRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let model_value = body
        .ai_model_override
        .as_deref()
        .unwrap_or("");

    sqlx::query(
        "UPDATE organizations SET branding = jsonb_set(COALESCE(branding, '{}'::jsonb), '{ai_model_override}', to_jsonb($1::text)), updated_at = NOW() WHERE id = $2",
    )
    .bind(model_value)
    .bind(org_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "data": { "updated": true }, "error": null })))
}

/// GET /org-settings/apps/shi/email -- email customization for this org
pub async fn get_shi_email_config(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let branding: Value = sqlx::query_scalar(
        "SELECT COALESCE(branding, '{}'::jsonb) FROM organizations WHERE id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(json!({}));

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "email_welcome_subject": branding.get("email_welcome_subject").and_then(|v| v.as_str()),
            "email_welcome_body": branding.get("email_welcome_body").and_then(|v| v.as_str()),
            "email_verification_subject": branding.get("email_verification_subject").and_then(|v| v.as_str()),
            "email_reset_subject": branding.get("email_reset_subject").and_then(|v| v.as_str()),
            "email_footer_text": branding.get("footer_text").and_then(|v| v.as_str()),
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct UpdateEmailConfigRequest {
    pub email_welcome_subject: Option<String>,
    pub email_welcome_body: Option<String>,
    pub email_verification_subject: Option<String>,
    pub email_reset_subject: Option<String>,
    pub email_footer_text: Option<String>,
}

/// PUT /org-settings/apps/shi/email
pub async fn update_shi_email_config(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<UpdateEmailConfigRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    // Merge each field into branding JSONB
    let fields: Vec<(&str, &str)> = [
        ("email_welcome_subject", body.email_welcome_subject.as_deref()),
        ("email_welcome_body", body.email_welcome_body.as_deref()),
        ("email_verification_subject", body.email_verification_subject.as_deref()),
        ("email_reset_subject", body.email_reset_subject.as_deref()),
        ("footer_text", body.email_footer_text.as_deref()),
    ]
    .iter()
    .filter_map(|(k, v)| v.map(|val| (*k, val)))
    .collect();

    for (key, value) in fields {
        sqlx::query(&format!(
            "UPDATE organizations SET branding = jsonb_set(COALESCE(branding, '{{}}'::jsonb), '{{{}}}', to_jsonb($1::text)), updated_at = NOW() WHERE id = $2",
            key
        ))
        .bind(value)
        .bind(org_id)
        .execute(pool.get_ref())
        .await?;
    }

    Ok(HttpResponse::Ok().json(json!({ "data": { "updated": true }, "error": null })))
}

// ── Billing (read-only) ──────────────────────────────────────────────────────

/// GET /org-settings/billing -- current license status
pub async fn get_billing(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = require_org_owner(&auth)?;

    let org_row = sqlx::query(
        r#"SELECT o.name, lt.name as tier_name, lt.slug as tier_slug
           FROM organizations o
           LEFT JOIN license_tiers lt ON lt.id = o.tier_id
           WHERE o.id = $1"#,
    )
    .bind(org_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let member_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM org_members WHERE org_id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "tier_name": org_row.as_ref().and_then(|r| r.try_get::<Option<String>, _>("tier_name").ok().flatten()),
            "tier_slug": org_row.as_ref().and_then(|r| r.try_get::<Option<String>, _>("tier_slug").ok().flatten()),
            "members": member_count,
        },
        "error": null
    })))
}
