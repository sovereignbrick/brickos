// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #479/#483 -- read-only admin endpoints for the licensing
// data model. Used by the License tab feature picker (#479) and the
// tier config / feature registry / revocation list screens (#483).
//
//   GET /admin/licensing/feature-registry  -- all known features (grouped client-side)
//   GET /admin/licensing/tiers             -- all brickos.license_tiers rows
//   GET /admin/licensing/revocations       -- the org_licenses_revoked list (most recent N)

use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;
use crate::PlatformPool;

/// GET /admin/licensing/feature-registry
pub async fn list_feature_registry(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT slug, app_slug, category, name_en, name_de,
                  description_en, description_de, is_active
           FROM brickos.feature_registry
           WHERE is_active = true
           ORDER BY app_slug, category, slug"#,
    )
    .fetch_all(&platform_pool.0)
    .await?;

    let features: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
                "app_slug": r.try_get::<String, _>("app_slug").unwrap_or_default(),
                "category": r.try_get::<String, _>("category").unwrap_or_default(),
                "name_en": r.try_get::<String, _>("name_en").unwrap_or_default(),
                "name_de": r.try_get::<String, _>("name_de").unwrap_or_default(),
                "description_en": r.try_get::<Option<String>, _>("description_en").ok().flatten(),
                "description_de": r.try_get::<Option<String>, _>("description_de").ok().flatten(),
                "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": features,
        "error": null
    })))
}

/// GET /admin/licensing/tiers
///
/// Sprint 042 #530: now also returns per-tier seat-count defaults
/// (default_max_owners / default_max_practitioners / default_max_members)
/// so the License tab issue-license form can pre-fill the seat fields
/// when the operator picks a tier. -1 means unlimited (matches the
/// existing seat-enforcement check `max >= 0` in admin_orgs.rs:921).
pub async fn list_tiers(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT slug, name, description, app_key, sort_order, is_active,
                  default_max_owners, default_max_practitioners, default_max_members
           FROM brickos.license_tiers
           WHERE is_active = true
           ORDER BY app_key NULLS FIRST, sort_order, slug"#,
    )
    .fetch_all(&platform_pool.0)
    .await?;

    let tiers: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                "app_key": r.try_get::<Option<String>, _>("app_key").ok().flatten(),
                "sort_order": r.try_get::<i32, _>("sort_order").unwrap_or(0),
                "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
                "default_max_owners": r.try_get::<Option<i32>, _>("default_max_owners").ok().flatten(),
                "default_max_practitioners": r.try_get::<Option<i32>, _>("default_max_practitioners").ok().flatten(),
                "default_max_members": r.try_get::<Option<i32>, _>("default_max_members").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": tiers,
        "error": null
    })))
}

/// POST /admin/licensing/revocations/{jti}/restore
///
/// Sprint 040 #483: un-revoke a license. Clears `org_licenses.revoked_at`
/// for the row matching `jti` AND removes the matching `org_licenses_revoked`
/// row so the next 60s revocation cache reload picks up the change.
/// Audit-logged.
pub async fn restore_revoked_license(
    platform_pool: web::Data<PlatformPool>,
    admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let jti = path.into_inner();

    let mut tx = platform_pool.0.begin().await?;

    // Look up the org_id (for audit) and clear revoked_at on the matching license.
    let row: Option<(Uuid, Uuid)> = sqlx::query_as(
        r#"UPDATE brickos.org_licenses
           SET revoked_at = NULL, updated_at = NOW()
           WHERE jti = $1
           RETURNING id, org_id"#,
    )
    .bind(jti)
    .fetch_optional(&mut *tx)
    .await?;

    let (license_id, org_id) = row.ok_or(AppError::NotFound)?;

    sqlx::query("DELETE FROM brickos.org_licenses_revoked WHERE jti = $1")
        .bind(jti)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let _ = crate::services::audit_log::write(
        &platform_pool.0,
        Some(admin.user_id),
        "license.restore",
        crate::services::audit_log::targets::ORGANIZATION,
        org_id,
        json!({
            "license_id": license_id,
            "jti": jti,
        }),
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "restored": true, "license_id": license_id },
        "error": null
    })))
}

/// GET /admin/licensing/revocations
///
/// Returns the most recent 200 revocations across all orgs. Used by #483's
/// "Revocation list" screen.
pub async fn list_revocations(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT olr.jti, olr.org_id, olr.revoked_at, olr.reason, olr.original_exp,
                  o.name AS org_name, o.slug AS org_slug,
                  u.email AS revoked_by_email
           FROM brickos.org_licenses_revoked olr
           LEFT JOIN organizations o ON o.id = olr.org_id
           LEFT JOIN brickos.users u ON u.id = olr.revoked_by
           ORDER BY olr.revoked_at DESC
           LIMIT 200"#,
    )
    .fetch_all(&platform_pool.0)
    .await?;

    let revocations: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "jti": r.try_get::<Uuid, _>("jti").unwrap_or_default(),
                "org_id": r.try_get::<Uuid, _>("org_id").unwrap_or_default(),
                "org_name": r.try_get::<Option<String>, _>("org_name").ok().flatten(),
                "org_slug": r.try_get::<Option<String>, _>("org_slug").ok().flatten(),
                "revoked_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("revoked_at").ok(),
                "reason": r.try_get::<Option<String>, _>("reason").ok().flatten(),
                "original_exp": r.try_get::<chrono::DateTime<chrono::Utc>, _>("original_exp").ok(),
                "revoked_by_email": r.try_get::<Option<String>, _>("revoked_by_email").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": revocations,
        "error": null
    })))
}
