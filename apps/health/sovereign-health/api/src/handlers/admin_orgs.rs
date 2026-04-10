// BrickOS Platform -- Organization Management (Admin)

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use crate::config::Config;
use crate::error::AppError;
use crate::middleware::auth::AdminUser;
use crate::PlatformPool;
use brickos_licensing::{generate_license, LicenseInput};

#[derive(Deserialize)]
pub struct ListOrgsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub org_type: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateOrgRequest {
    pub name: String,
    pub slug: String,
    pub org_type: String,
    pub billing_email: Option<String>,
    pub admin_email: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateOrgRequest {
    pub name: Option<String>,
    pub org_type: Option<String>,
    pub billing_email: Option<String>,
    pub is_active: Option<bool>,
}

/// GET /admin/organizations -- List all organizations
pub async fn list_organizations(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    query: web::Query<ListOrgsQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let search_pattern = query
        .search
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{}%", s.to_lowercase()));

    let type_filter = query.org_type.as_deref().filter(|s| !s.is_empty());

    let rows = sqlx::query(
        r#"SELECT o.id, o.name, o.slug, o.org_type, o.billing_email, o.is_active,
                  o.created_at, o.branding,
                  COUNT(DISTINCT om.user_id) as member_count
           FROM organizations o
           LEFT JOIN org_members om ON om.org_id = o.id
           WHERE o.is_deleted = false
             AND ($1::text IS NULL OR LOWER(o.name) LIKE $1 OR LOWER(o.slug) LIKE $1)
             AND ($2::text IS NULL OR o.org_type = $2)
           GROUP BY o.id
           ORDER BY o.created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(search_pattern.as_deref())
    .bind(type_filter)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&platform_pool.0)
    .await?;

    let total: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM organizations
           WHERE is_deleted = false
             AND ($1::text IS NULL OR LOWER(name) LIKE $1 OR LOWER(slug) LIKE $1)
             AND ($2::text IS NULL OR org_type = $2)"#,
    )
    .bind(search_pattern.as_deref())
    .bind(type_filter)
    .fetch_one(&platform_pool.0)
    .await?;

    let orgs: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
                "org_type": r.try_get::<String, _>("org_type").unwrap_or_default(),
                "billing_email": r.try_get::<Option<String>, _>("billing_email").ok().flatten(),
                "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
                "member_count": r.try_get::<i64, _>("member_count").unwrap_or(0),
                "branding": r.try_get::<serde_json::Value, _>("branding").unwrap_or(serde_json::json!({})),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": orgs,
        "meta": { "page": page, "per_page": per_page, "total": total.0 },
        "error": null
    })))
}

/// POST /admin/organizations -- Create new organization
pub async fn create_organization(
    platform_pool: web::Data<PlatformPool>,
    admin: AdminUser,
    body: web::Json<CreateOrgRequest>,
) -> Result<HttpResponse, AppError> {
    // Validate slug
    if body.slug.len() < 2 || body.slug.len() > 50 {
        return Err(AppError::Validation("Slug must be 2-50 characters".into()));
    }
    if !body.slug.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err(AppError::Validation(
            "Slug must be alphanumeric with hyphens".into(),
        ));
    }

    // Check slug uniqueness
    let exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM organizations WHERE slug = $1")
        .bind(&body.slug)
        .fetch_optional(&platform_pool.0)
        .await?;
    if exists.is_some() {
        return Err(AppError::Validation(
            "Organization slug already exists".into(),
        ));
    }

    let org_id = Uuid::new_v4();

    // Create organization
    sqlx::query(
        r#"INSERT INTO organizations (id, name, slug, org_type, billing_email, is_active)
           VALUES ($1, $2, $3, $4, $5, true)"#,
    )
    .bind(org_id)
    .bind(&body.name)
    .bind(&body.slug)
    .bind(&body.org_type)
    .bind(&body.billing_email)
    .execute(&platform_pool.0)
    .await?;

    // If admin_email provided, create the org owner membership
    if let Some(admin_email) = &body.admin_email {
        let user_id: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM users WHERE email = $1 AND is_deleted = false")
                .bind(admin_email)
                .fetch_optional(&platform_pool.0)
                .await?;

        if let Some((uid,)) = user_id {
            sqlx::query(
                r#"INSERT INTO org_members (org_id, user_id, role, invited_by)
                   VALUES ($1, $2, 'owner', $3)
                   ON CONFLICT (org_id, user_id) DO NOTHING"#,
            )
            .bind(org_id)
            .bind(uid)
            .bind(admin.user_id)
            .execute(&platform_pool.0)
            .await?;
        }
    }

    Ok(HttpResponse::Created().json(serde_json::json!({
        "data": { "id": org_id, "slug": body.slug },
        "error": null
    })))
}

/// PUT /admin/organizations/{id} -- Update organization
pub async fn update_organization(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateOrgRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(name) = &body.name {
        updates.push(format!("name = ${}", params.len() + 2));
        params.push(name.clone());
    }
    if let Some(org_type) = &body.org_type {
        updates.push(format!("org_type = ${}", params.len() + 2));
        params.push(org_type.clone());
    }
    if let Some(email) = &body.billing_email {
        updates.push(format!("billing_email = ${}", params.len() + 2));
        params.push(email.clone());
    }
    if let Some(active) = body.is_active {
        updates.push(format!(
            "is_active = {}",
            if active { "true" } else { "false" }
        ));
    }

    if updates.is_empty() {
        return Err(AppError::Validation("No fields to update".into()));
    }

    updates.push("updated_at = now()".to_string());

    let sql = format!(
        "UPDATE organizations SET {} WHERE id = $1 AND is_deleted = false",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql).bind(org_id);
    for p in &params {
        query = query.bind(p);
    }
    query.execute(&platform_pool.0).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "updated": true },
        "error": null
    })))
}

/// GET /admin/organizations/{id}/members -- List org members
pub async fn list_org_members(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT om.id, om.user_id, om.role, om.joined_at,
                  u.email, u.display_name, u.last_active_at
           FROM org_members om
           JOIN users u ON u.id = om.user_id
           WHERE om.org_id = $1
           ORDER BY om.joined_at"#,
    )
    .bind(org_id)
    .fetch_all(&platform_pool.0)
    .await?;

    let members: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
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

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": members,
        "error": null
    })))
}

/// Sprint 040 #467: switched from the legacy 5-role seat model
/// (max_admins/max_editors/max_consumers as String) to the 3-role
/// brickos-licensing seat model (max_owners/max_practitioners/max_members
/// as int). The aud array names which BrickOS apps the license grants
/// access to. The billing_model identifies which billing rail issued
/// the license.
#[derive(Deserialize)]
pub struct GenerateLicenseRequest {
    pub features: Vec<String>,
    pub aud: Option<Vec<String>>,
    pub max_owners: i32,
    pub max_practitioners: i32,
    pub max_members: i32,
    pub expires_days: i64,
    pub billing_model: Option<String>,
}

/// POST /admin/organizations/{id}/license -- Generate RS256 JWT license key
///
/// Sprint 040 #467: switched from the dead in-tree services/licensing.rs
/// (HS256 with config.jwt_secret) to the brickos-licensing crate
/// (RS256 with disk-loaded private key). Reads the signing key from the
/// path in `config.license_signing_key_path`.
///
/// Future #467 part 2: also persist to brickos.org_licenses via
/// EmbeddedProvider::issue_org_license once the provider is wired into
/// SHI app_data. For now this only generates the JWT (the persistence
/// is the missing wire that #469 will close).
pub async fn generate_org_license(
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<GenerateLicenseRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let org_row = sqlx::query(
        "SELECT name, org_type FROM organizations WHERE id = $1 AND is_deleted = false",
    )
    .bind(org_id)
    .fetch_optional(&platform_pool.0)
    .await?
    .ok_or(AppError::NotFound)?;

    let org_name: String = org_row.try_get("name").unwrap_or_default();
    let org_type: String = org_row.try_get("org_type").unwrap_or_default();

    // Load the RS256 signing key from disk. In production this is the
    // real key from 1Password Business; in dev it's the committed dev key.
    let private_key_pem = std::fs::read(&config.license_signing_key_path).map_err(|e| {
        tracing::error!(
            path = %config.license_signing_key_path,
            error = %e,
            "failed to read license signing key"
        );
        AppError::Internal
    })?;

    let aud = body
        .aud
        .clone()
        .unwrap_or_else(|| vec!["sovereign-health".to_string()]);
    let billing_model = body
        .billing_model
        .clone()
        .unwrap_or_else(|| "manual_invoice".to_string());

    let (token, jti) = generate_license(
        &LicenseInput {
            org_id: &org_id.to_string(),
            org_name: &org_name,
            tier: &org_type,
            aud,
            features: body.features.clone(),
            max_owners: body.max_owners,
            max_practitioners: body.max_practitioners,
            max_members: body.max_members,
            expires_days: body.expires_days,
            billing_model: &billing_model,
        },
        &private_key_pem,
    )
    .map_err(|e| {
        tracing::error!(error = ?e, "license generation failed");
        AppError::Internal
    })?;

    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        crate::services::audit_log::actions::ORG_LICENSE_ISSUE,
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        serde_json::json!({
            "jti": jti,
            "tier": org_type,
            "max_owners": body.max_owners,
            "max_practitioners": body.max_practitioners,
            "max_members": body.max_members,
            "features": body.features,
            "expires_days": body.expires_days,
            "billing_model": billing_model,
        }),
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "license_key": token,
            "jti": jti,
            "org_id": org_id,
            "org_name": org_name,
            "expires_days": body.expires_days,
            "features": body.features,
            "billing_model": billing_model,
        },
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct AddMemberRequest {
    pub email: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct UpdateMemberRoleRequest {
    pub role: String,
}

/// POST /admin/organizations/{id}/members -- Add member to org
///
/// Sprint 040 #469: enforces the role's seat cap from the active
/// org_licenses JWT. If the org has no active license, no seat cap is
/// enforced (the assumption is that this is a free/individual-style org
/// without a paid bundle). If the cap is reached, returns 422
/// SeatLimitExceeded with the role/current/max in the response body.
///
/// Also writes a row to brickos.admin_audit_log on success.
pub async fn add_org_member(
    platform_pool: web::Data<PlatformPool>,
    licensing: web::Data<brickos_licensing::embedded::EmbeddedProvider>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<AddMemberRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();
    // Sprint 040 #463: roles consolidated 5->3.
    // Legacy owner|tech_admin|commercial_admin -> org_owner.
    // Legacy editor -> practitioner. Legacy consumer -> member.
    let valid_roles = ["org_owner", "practitioner", "member"];
    if !valid_roles.contains(&body.role.as_str()) {
        return Err(AppError::Validation(format!("Invalid role: {}", body.role)));
    }

    // Sprint 040 #469: enforce seat cap from active org_licenses JWT.
    if let Some(org_license) = licensing
        .load_active_org_license(org_id)
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "load_active_org_license failed");
            AppError::Internal
        })?
    {
        let current = licensing
            .count_org_members_by_role(org_id, &body.role)
            .await
            .map_err(|e| {
                tracing::error!(error = ?e, "count_org_members_by_role failed");
                AppError::Internal
            })?;
        let max = match body.role.as_str() {
            "org_owner" => org_license.max_owners as i64,
            "practitioner" => org_license.max_practitioners as i64,
            "member" => org_license.max_members as i64,
            _ => i64::MAX,
        };
        // -1 = unlimited (member role only)
        if max >= 0 && current >= max {
            return Err(AppError::SeatLimitExceeded {
                role: body.role.clone(),
                current,
                max,
            });
        }
    }

    let user_row: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE email = $1 AND is_deleted = false")
            .bind(&body.email)
            .fetch_optional(&platform_pool.0)
            .await?;

    let user_id = match user_row {
        Some((uid,)) => uid,
        None => {
            return Err(AppError::Validation(format!(
                "User not found: {}",
                body.email
            )))
        }
    };

    sqlx::query(
        r#"INSERT INTO org_members (org_id, user_id, role, invited_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (org_id, user_id) DO UPDATE SET role = $3"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(&body.role)
    .bind(admin.user_id)
    .execute(&platform_pool.0)
    .await?;

    // Best-effort audit log
    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        crate::services::audit_log::actions::ORG_MEMBER_ADD,
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        serde_json::json!({
            "user_id": user_id,
            "role": body.role,
            "email": body.email,
        }),
    )
    .await;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "data": { "added": true, "user_id": user_id, "role": body.role },
        "error": null
    })))
}

/// PUT /admin/organizations/{org_id}/members/{member_id} -- Change member role
///
/// Sprint 040 #469: enforces seat cap on the NEW role. Promoting a member
/// to practitioner needs the practitioner cap. Audit-logged on success.
pub async fn update_member_role(
    platform_pool: web::Data<PlatformPool>,
    licensing: web::Data<brickos_licensing::embedded::EmbeddedProvider>,
    admin: AdminUser,
    path: web::Path<(Uuid, Uuid)>,
    body: web::Json<UpdateMemberRoleRequest>,
) -> Result<HttpResponse, AppError> {
    let (org_id, member_id) = path.into_inner();
    let valid_roles = ["org_owner", "practitioner", "member"];
    if !valid_roles.contains(&body.role.as_str()) {
        return Err(AppError::Validation(format!("Invalid role: {}", body.role)));
    }

    // Look up the member's CURRENT role so we know whether this is a
    // promotion (which needs the new role's cap) or a no-op.
    let prior: Option<(String, Uuid)> =
        sqlx::query_as("SELECT role, user_id FROM org_members WHERE id = $1 AND org_id = $2")
            .bind(member_id)
            .bind(org_id)
            .fetch_optional(&platform_pool.0)
            .await?;

    let (prior_role, user_id) = match prior {
        Some(t) => t,
        None => return Err(AppError::NotFound),
    };

    // If the new role is different and the org has an active license,
    // enforce the new role's seat cap.
    if prior_role != body.role {
        if let Some(org_license) = licensing
            .load_active_org_license(org_id)
            .await
            .map_err(|e| {
                tracing::error!(error = ?e, "load_active_org_license failed");
                AppError::Internal
            })?
        {
            let current = licensing
                .count_org_members_by_role(org_id, &body.role)
                .await
                .map_err(|e| {
                    tracing::error!(error = ?e, "count_org_members_by_role failed");
                    AppError::Internal
                })?;
            let max = match body.role.as_str() {
                "org_owner" => org_license.max_owners as i64,
                "practitioner" => org_license.max_practitioners as i64,
                "member" => org_license.max_members as i64,
                _ => i64::MAX,
            };
            if max >= 0 && current >= max {
                return Err(AppError::SeatLimitExceeded {
                    role: body.role.clone(),
                    current,
                    max,
                });
            }
        }
    }

    sqlx::query("UPDATE org_members SET role = $1 WHERE id = $2 AND org_id = $3")
        .bind(&body.role)
        .bind(member_id)
        .bind(org_id)
        .execute(&platform_pool.0)
        .await?;

    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        crate::services::audit_log::actions::ORG_MEMBER_ROLE_CHANGE,
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        serde_json::json!({
            "member_id": member_id,
            "user_id": user_id,
            "from_role": prior_role,
            "to_role": body.role,
        }),
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "updated": true },
        "error": null
    })))
}

/// DELETE /admin/organizations/{org_id}/members/{member_id} -- Remove member
///
/// Sprint 040 #469: audit-logged on success.
pub async fn remove_org_member(
    platform_pool: web::Data<PlatformPool>,
    admin: AdminUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let (org_id, member_id) = path.into_inner();

    // Capture the role + user_id for the audit payload before deletion
    let row: Option<(String, Uuid)> =
        sqlx::query_as("SELECT role, user_id FROM org_members WHERE id = $1 AND org_id = $2")
            .bind(member_id)
            .bind(org_id)
            .fetch_optional(&platform_pool.0)
            .await?;

    sqlx::query("DELETE FROM org_members WHERE id = $1 AND org_id = $2")
        .bind(member_id)
        .bind(org_id)
        .execute(&platform_pool.0)
        .await?;

    if let Some((role, user_id)) = row {
        let _ = crate::services::audit_log::write(
            &platform_pool.0,
            Some(admin.user_id),
            crate::services::audit_log::actions::ORG_MEMBER_REMOVE,
            crate::services::audit_log::targets::ORGANIZATION,
            org_id,
            serde_json::json!({
                "member_id": member_id,
                "user_id": user_id,
                "role": role,
            }),
        )
        .await;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "removed": true },
        "error": null
    })))
}
