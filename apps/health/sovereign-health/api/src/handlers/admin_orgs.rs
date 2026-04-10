// BrickOS Platform -- Organization Management (Admin)

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use crate::config::Config;
use crate::error::AppError;
use crate::middleware::auth::AdminUser;
use crate::PlatformPool;
use brickos_licensing::LicenseInput;

#[derive(Deserialize)]
pub struct ListOrgsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub org_type: Option<String>,
    /// Sprint 040 #477: lifecycle filter -- "active" | "grace" | "expired" | "revoked"
    pub status: Option<String>,
    /// Sprint 040 #477: only orgs whose active license expires within N days
    pub expires_within: Option<i64>,
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
///
/// Sprint 040 #477: extended to include the active brickos.org_licenses
/// summary (tier_slug, max_members, expires_at, revoked, status) so the
/// admin Orgs list view can show license state without N+1 follow-ups.
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
    let status_filter = query.status.as_deref().filter(|s| !s.is_empty());
    let expires_within = query.expires_within.filter(|d| *d > 0);

    // We pull the latest non-revoked license per org via DISTINCT ON. The
    // partial unique index `idx_org_licenses_org_active` guarantees at most
    // one row, so the ORDER BY is just a tie-breaker.
    //
    // status is computed once in SQL so the WHERE filter can use it via a
    // CTE; the same expression is mirrored in the response so the frontend
    // never has to recompute it.
    let rows = sqlx::query(
        r#"WITH active_lic AS (
               SELECT DISTINCT ON (org_id)
                      org_id, tier_slug, max_members, max_owners, max_practitioners,
                      expires_at, revoked_at, stripe_invoice_id
               FROM brickos.org_licenses
               ORDER BY org_id, issued_at DESC
           ),
           org_summary AS (
               SELECT o.id, o.name, o.slug, o.org_type, o.billing_email, o.is_active,
                      o.created_at, o.branding,
                      COUNT(DISTINCT om.user_id) AS member_count,
                      al.tier_slug, al.max_members, al.max_owners, al.max_practitioners,
                      al.expires_at, al.revoked_at, al.stripe_invoice_id,
                      CASE
                          WHEN al.tier_slug IS NULL THEN 'no_license'
                          WHEN al.revoked_at IS NOT NULL THEN 'revoked'
                          WHEN al.expires_at < NOW() THEN 'expired'
                          WHEN al.expires_at < NOW() + interval '7 days' THEN 'grace'
                          ELSE 'active'
                      END AS lifecycle_status
               FROM organizations o
               LEFT JOIN org_members om ON om.org_id = o.id
               LEFT JOIN active_lic al ON al.org_id = o.id
               WHERE o.is_deleted = false
                 AND ($1::text IS NULL OR LOWER(o.name) LIKE $1 OR LOWER(o.slug) LIKE $1
                      OR LOWER(COALESCE(o.billing_email, '')) LIKE $1)
                 AND ($2::text IS NULL OR o.org_type = $2)
               GROUP BY o.id, al.tier_slug, al.max_members, al.max_owners,
                        al.max_practitioners, al.expires_at, al.revoked_at,
                        al.stripe_invoice_id
           )
           SELECT * FROM org_summary
           WHERE ($3::text IS NULL OR lifecycle_status = $3)
             AND ($4::bigint IS NULL OR (
                    expires_at IS NOT NULL
                    AND expires_at < NOW() + ($4 || ' days')::interval
                    AND revoked_at IS NULL
                 ))
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(search_pattern.as_deref())
    .bind(type_filter)
    .bind(status_filter)
    .bind(expires_within)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&platform_pool.0)
    .await?;

    let total: (i64,) = sqlx::query_as(
        r#"WITH active_lic AS (
               SELECT DISTINCT ON (org_id)
                      org_id, tier_slug, expires_at, revoked_at
               FROM brickos.org_licenses
               ORDER BY org_id, issued_at DESC
           ),
           org_summary AS (
               SELECT o.id,
                      CASE
                          WHEN al.tier_slug IS NULL THEN 'no_license'
                          WHEN al.revoked_at IS NOT NULL THEN 'revoked'
                          WHEN al.expires_at < NOW() THEN 'expired'
                          WHEN al.expires_at < NOW() + interval '7 days' THEN 'grace'
                          ELSE 'active'
                      END AS lifecycle_status,
                      al.expires_at, al.revoked_at
               FROM organizations o
               LEFT JOIN active_lic al ON al.org_id = o.id
               WHERE o.is_deleted = false
                 AND ($1::text IS NULL OR LOWER(o.name) LIKE $1 OR LOWER(o.slug) LIKE $1
                      OR LOWER(COALESCE(o.billing_email, '')) LIKE $1)
                 AND ($2::text IS NULL OR o.org_type = $2)
           )
           SELECT COUNT(*) FROM org_summary
           WHERE ($3::text IS NULL OR lifecycle_status = $3)
             AND ($4::bigint IS NULL OR (
                    expires_at IS NOT NULL
                    AND expires_at < NOW() + ($4 || ' days')::interval
                    AND revoked_at IS NULL
                 ))"#,
    )
    .bind(search_pattern.as_deref())
    .bind(type_filter)
    .bind(status_filter)
    .bind(expires_within)
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
                "tier_slug": r.try_get::<Option<String>, _>("tier_slug").ok().flatten(),
                "max_members": r.try_get::<Option<i32>, _>("max_members").ok().flatten(),
                "max_owners": r.try_get::<Option<i32>, _>("max_owners").ok().flatten(),
                "max_practitioners": r.try_get::<Option<i32>, _>("max_practitioners").ok().flatten(),
                "expires_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at").ok().flatten(),
                "revoked_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("revoked_at").ok().flatten(),
                "stripe_invoice_id": r.try_get::<Option<String>, _>("stripe_invoice_id").ok().flatten(),
                "lifecycle_status": r.try_get::<String, _>("lifecycle_status").unwrap_or_else(|_| "no_license".to_string()),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": orgs,
        "meta": { "page": page, "per_page": per_page, "total": total.0 },
        "error": null
    })))
}

/// GET /admin/organizations/{id} -- Single org detail
///
/// Sprint 040 #478: returns the org metadata + active license summary +
/// member counts by role + branding so the platform admin Org detail page
/// can render Overview without N+1 follow-ups.
pub async fn get_organization(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let row = sqlx::query(
        r#"WITH active_lic AS (
               SELECT DISTINCT ON (org_id)
                      org_id, tier_slug, features, max_owners, max_practitioners,
                      max_members, expires_at, revoked_at, jti, stripe_invoice_id,
                      issued_at
               FROM brickos.org_licenses
               WHERE org_id = $1
               ORDER BY org_id, issued_at DESC
           )
           SELECT o.id, o.name, o.slug, o.org_type, o.billing_email, o.is_active,
                  o.created_at, o.branding,
                  al.tier_slug, al.features, al.max_owners, al.max_practitioners,
                  al.max_members, al.expires_at, al.revoked_at, al.jti,
                  al.stripe_invoice_id, al.issued_at,
                  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'org_owner') AS owners_count,
                  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'practitioner') AS practitioners_count,
                  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'member') AS members_count,
                  COUNT(DISTINCT om.user_id) AS total_count
           FROM organizations o
           LEFT JOIN active_lic al ON al.org_id = o.id
           LEFT JOIN org_members om ON om.org_id = o.id
           WHERE o.id = $1 AND o.is_deleted = false
           GROUP BY o.id, al.tier_slug, al.features, al.max_owners,
                    al.max_practitioners, al.max_members, al.expires_at,
                    al.revoked_at, al.jti, al.stripe_invoice_id, al.issued_at"#,
    )
    .bind(org_id)
    .fetch_optional(&platform_pool.0)
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    let lifecycle_status = {
        let revoked: Option<chrono::DateTime<chrono::Utc>> =
            row.try_get("revoked_at").ok().flatten();
        let expires: Option<chrono::DateTime<chrono::Utc>> =
            row.try_get("expires_at").ok().flatten();
        let tier: Option<String> = row.try_get("tier_slug").ok().flatten();
        if tier.is_none() {
            "no_license"
        } else if revoked.is_some() {
            "revoked"
        } else if expires.is_some_and(|e| e < chrono::Utc::now()) {
            "expired"
        } else if expires.is_some_and(|e| e < chrono::Utc::now() + chrono::Duration::days(7)) {
            "grace"
        } else {
            "active"
        }
    };

    let detail = serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
        "name": row.try_get::<String, _>("name").unwrap_or_default(),
        "slug": row.try_get::<String, _>("slug").unwrap_or_default(),
        "org_type": row.try_get::<String, _>("org_type").unwrap_or_default(),
        "billing_email": row.try_get::<Option<String>, _>("billing_email").ok().flatten(),
        "is_active": row.try_get::<bool, _>("is_active").unwrap_or(true),
        "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        "branding": row.try_get::<serde_json::Value, _>("branding").unwrap_or(serde_json::json!({})),
        "license": {
            "tier_slug": row.try_get::<Option<String>, _>("tier_slug").ok().flatten(),
            "features": row.try_get::<Option<serde_json::Value>, _>("features").ok().flatten().unwrap_or(serde_json::json!([])),
            "max_owners": row.try_get::<Option<i32>, _>("max_owners").ok().flatten(),
            "max_practitioners": row.try_get::<Option<i32>, _>("max_practitioners").ok().flatten(),
            "max_members": row.try_get::<Option<i32>, _>("max_members").ok().flatten(),
            "expires_at": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at").ok().flatten(),
            "revoked_at": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("revoked_at").ok().flatten(),
            "issued_at": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("issued_at").ok().flatten(),
            "jti": row.try_get::<Option<Uuid>, _>("jti").ok().flatten(),
            "stripe_invoice_id": row.try_get::<Option<String>, _>("stripe_invoice_id").ok().flatten(),
            "lifecycle_status": lifecycle_status,
        },
        "seats": {
            "owners": row.try_get::<i64, _>("owners_count").unwrap_or(0),
            "practitioners": row.try_get::<i64, _>("practitioners_count").unwrap_or(0),
            "members": row.try_get::<i64, _>("members_count").unwrap_or(0),
            "total": row.try_get::<i64, _>("total_count").unwrap_or(0),
        }
    });

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": detail,
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
///
/// Sprint 040 #479: added optional `tier` (overrides org_type as the JWT
/// `tier` claim) and `notes` (free-form text persisted to brickos.org_licenses).
#[derive(Deserialize)]
pub struct GenerateLicenseRequest {
    pub features: Vec<String>,
    pub aud: Option<Vec<String>>,
    pub max_owners: i32,
    pub max_practitioners: i32,
    pub max_members: i32,
    pub expires_days: i64,
    pub billing_model: Option<String>,
    pub tier: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct RevokeLicenseRequest {
    pub reason: Option<String>,
}

/// Sprint 040 #480 -- per-org branding update payload.
#[derive(Deserialize)]
pub struct UpdateBrandingRequest {
    pub branding: serde_json::Value,
}

/// Sprint 040 #480 -- custom domain payload (creates one row in
/// domain_mappings; ssl_status starts at 'pending' until external automation
/// flips it to 'active').
#[derive(Deserialize)]
pub struct AddCustomDomainRequest {
    pub domain: String,
}

/// POST /admin/organizations/{id}/license -- Generate RS256 JWT license key
///
/// Sprint 040 #467: switched from the dead in-tree services/licensing.rs
/// (HS256 with config.jwt_secret) to the brickos-licensing crate
/// (RS256 with disk-loaded private key). Reads the signing key from the
/// path in `config.license_signing_key_path`.
///
/// Sprint 040 #479: now uses `EmbeddedProvider::issue_org_license` for
/// the full persistence path (writes to brickos.org_licenses, auto-revokes
/// the prior active license, returns the persisted row including jti).
/// The handler also accepts an optional `tier` override (otherwise the
/// org_type is used) and optional `notes`.
pub async fn generate_org_license(
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    licensing: web::Data<brickos_licensing::embedded::EmbeddedProvider>,
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
    // The tier on the JWT claim is the requested tier or the org_type fallback
    let tier_value = body.tier.clone().unwrap_or_else(|| org_type.clone());

    let row = licensing
        .issue_org_license(
            &LicenseInput {
                org_id: &org_id.to_string(),
                org_name: &org_name,
                tier: &tier_value,
                aud,
                features: body.features.clone(),
                max_owners: body.max_owners,
                max_practitioners: body.max_practitioners,
                max_members: body.max_members,
                expires_days: body.expires_days,
                billing_model: &billing_model,
            },
            &private_key_pem,
            Some(admin.user_id),
            body.notes.clone(),
            &billing_model,
        )
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "license issue failed");
            AppError::Internal
        })?;

    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        crate::services::audit_log::actions::ORG_LICENSE_ISSUE,
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        serde_json::json!({
            "jti": row.jti,
            "tier": tier_value,
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
            "id": row.id,
            "license_key": row.jwt_token,
            "jti": row.jti,
            "org_id": org_id,
            "org_name": org_name,
            "tier_slug": row.tier_slug,
            "features": row.features,
            "max_owners": row.max_owners,
            "max_practitioners": row.max_practitioners,
            "max_members": row.max_members,
            "issued_at": row.issued_at,
            "expires_at": row.expires_at,
            "billing_model": billing_model,
        },
        "error": null
    })))
}

/// POST /admin/organizations/{id}/license/revoke -- Revoke the active license
///
/// Sprint 040 #479: thin wrapper around `EmbeddedProvider::revoke_org_license`.
/// Looks up the currently-active license for the org (DISTINCT ON, partial
/// unique index guarantees at most one) and revokes it. Audit-logged.
pub async fn revoke_org_license(
    platform_pool: web::Data<PlatformPool>,
    licensing: web::Data<brickos_licensing::embedded::EmbeddedProvider>,
    admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<RevokeLicenseRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let active = licensing
        .load_active_org_license(org_id)
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "load_active_org_license failed");
            AppError::Internal
        })?
        .ok_or(AppError::NotFound)?;

    licensing
        .revoke_org_license(active.id, Some(admin.user_id), body.reason.clone())
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "revoke_org_license failed");
            AppError::Internal
        })?;

    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        crate::services::audit_log::actions::ORG_LICENSE_REVOKE,
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        serde_json::json!({
            "license_id": active.id,
            "jti": active.jti,
            "reason": body.reason,
        }),
    )
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "revoked": true, "license_id": active.id },
        "error": null
    })))
}

/// GET /admin/organizations/{id}/license/history
///
/// Sprint 040 #479: returns every license ever issued for the org, newest
/// first. The frontend renders this as a collapsible timeline below the
/// current license card.
pub async fn list_org_license_history(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT ol.id, ol.tier_slug, ol.features, ol.max_owners, ol.max_practitioners,
                  ol.max_members, ol.issued_at, ol.expires_at, ol.revoked_at,
                  ol.jti, ol.notes, ol.stripe_invoice_id,
                  u.email AS issued_by_email
           FROM brickos.org_licenses ol
           LEFT JOIN brickos.users u ON u.id = ol.issued_by
           WHERE ol.org_id = $1
           ORDER BY ol.issued_at DESC
           LIMIT 100"#,
    )
    .bind(org_id)
    .fetch_all(&platform_pool.0)
    .await?;

    let history: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "tier_slug": r.try_get::<String, _>("tier_slug").unwrap_or_default(),
                "features": r.try_get::<serde_json::Value, _>("features").unwrap_or(serde_json::json!([])),
                "max_owners": r.try_get::<i32, _>("max_owners").unwrap_or(0),
                "max_practitioners": r.try_get::<i32, _>("max_practitioners").unwrap_or(0),
                "max_members": r.try_get::<i32, _>("max_members").unwrap_or(0),
                "issued_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("issued_at").ok(),
                "expires_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at").ok(),
                "revoked_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("revoked_at").ok().flatten(),
                "jti": r.try_get::<Uuid, _>("jti").unwrap_or_default(),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
                "stripe_invoice_id": r.try_get::<Option<String>, _>("stripe_invoice_id").ok().flatten(),
                "issued_by_email": r.try_get::<Option<String>, _>("issued_by_email").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": history,
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

// ---------------------------------------------------------------------------
// Sprint 040 #480 -- branding tab endpoints
// ---------------------------------------------------------------------------

/// PUT /admin/organizations/{id}/branding
///
/// Replaces the org's `branding` JSONB column with the supplied object.
/// Validation lives client-side; the column is a free-form JSONB so the
/// server only enforces "must be an object". Audit-logged.
pub async fn update_org_branding(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateBrandingRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    if !body.branding.is_object() {
        return Err(AppError::Validation(
            "branding must be a JSON object".into(),
        ));
    }

    let result = sqlx::query(
        "UPDATE organizations SET branding = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = false",
    )
    .bind(&body.branding)
    .bind(org_id)
    .execute(&platform_pool.0)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "updated": true },
        "error": null
    })))
}

/// GET /admin/organizations/{id}/domains -- list custom domain mappings
pub async fn list_org_domains(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT id, domain, ssl_status, verified_at, created_at
           FROM domain_mappings
           WHERE org_id = $1
           ORDER BY created_at DESC"#,
    )
    .bind(org_id)
    .fetch_all(&platform_pool.0)
    .await?;

    let domains: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "domain": r.try_get::<String, _>("domain").unwrap_or_default(),
                "ssl_status": r.try_get::<String, _>("ssl_status").unwrap_or_default(),
                "verified_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("verified_at").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": domains,
        "error": null
    })))
}

/// POST /admin/organizations/{id}/domains -- add a custom domain
pub async fn add_org_domain(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<AddCustomDomainRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();
    let domain = body.domain.trim().to_lowercase();

    // Lightweight validation -- must look like a hostname.
    if domain.is_empty() || !domain.contains('.') || domain.len() > 255 {
        return Err(AppError::Validation("invalid domain".into()));
    }

    let row: (Uuid,) = sqlx::query_as(
        r#"INSERT INTO domain_mappings (org_id, domain, ssl_status)
           VALUES ($1, $2, 'pending')
           RETURNING id"#,
    )
    .bind(org_id)
    .bind(&domain)
    .fetch_one(&platform_pool.0)
    .await
    .map_err(|e| {
        // unique violation -> friendly error
        if let sqlx::Error::Database(db_err) = &e {
            if db_err.constraint() == Some("domain_mappings_domain_key") {
                return AppError::Validation(format!("domain already taken: {domain}"));
            }
        }
        AppError::from(e)
    })?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "data": { "id": row.0, "domain": domain, "ssl_status": "pending" },
        "error": null
    })))
}

/// DELETE /admin/organizations/{org_id}/domains/{domain_id}
pub async fn delete_org_domain(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let (org_id, domain_id) = path.into_inner();

    let result = sqlx::query("DELETE FROM domain_mappings WHERE id = $1 AND org_id = $2")
        .bind(domain_id)
        .bind(org_id)
        .execute(&platform_pool.0)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": { "deleted": true },
        "error": null
    })))
}
