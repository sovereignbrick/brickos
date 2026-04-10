// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #468 part 2a -- handlers for active vs preserved marker
// management. The frontend marker picker (#468 part 2b) calls these.
//
// Routes (registered in lib.rs):
//   GET    /api/v1/user-markers              -- list user's markers (active + preserved)
//   PUT    /api/v1/user-markers/{slug}/activate
//                                            -- activate a marker (cap-enforced)
//   PUT    /api/v1/user-markers/{slug}/deactivate
//                                            -- move marker to preserved
//   POST   /api/v1/user-markers/swap         -- atomic deactivate + activate

use crate::error::AppError;
use crate::middleware::auth::AuthenticatedUser;
use crate::services::{tier, user_markers};
use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::{PgPool, Row};
use uuid::Uuid;

// ============================================================================
// GET /api/v1/user-markers
// ============================================================================

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let rows = user_markers::list_user_markers(pool.get_ref(), auth.user_id).await?;

    // Resolve marker_id -> slug + display_name in one query for the response
    let marker_ids: Vec<Uuid> = rows.iter().map(|(id, _, _)| *id).collect();
    let mut by_id: std::collections::HashMap<Uuid, (String, String)> =
        std::collections::HashMap::new();
    if !marker_ids.is_empty() {
        let detail_rows =
            sqlx::query("SELECT id, slug, COALESCE(display_name, slug) AS display_name FROM markers WHERE id = ANY($1)")
                .bind(&marker_ids)
                .fetch_all(pool.get_ref())
                .await?;
        for r in detail_rows {
            let id: Uuid = r.try_get("id").unwrap_or_default();
            let slug: String = r.try_get("slug").unwrap_or_default();
            let display_name: String = r.try_get("display_name").unwrap_or_default();
            by_id.insert(id, (slug, display_name));
        }
    }

    let active_count: i64 = rows.iter().filter(|(_, is_active, _)| *is_active).count() as i64;

    let items: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(id, is_active, activated_at)| {
            let (slug, display_name) = by_id
                .get(&id)
                .cloned()
                .unwrap_or_else(|| (String::new(), String::new()));
            serde_json::json!({
                "marker_id": id,
                "slug": slug,
                "display_name": display_name,
                "is_active": is_active,
                "activated_at": activated_at,
            })
        })
        .collect();

    // Surface the user's tier max so the frontend knows the cap
    let tier_limits = tier::get_user_tier(pool.get_ref(), auth.user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "markers": items,
            "active_count": active_count,
            "max_active": tier_limits.max_markers,
            "tier_slug": tier_limits.tier_slug,
        },
        "error": null
    })))
}

// ============================================================================
// PUT /api/v1/user-markers/{slug}/activate
// ============================================================================

pub async fn activate(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();

    // Resolve slug -> id
    let marker_id = lookup_marker_id(pool.get_ref(), &marker_slug).await?;

    // Cap enforcement: if the user is on a tier with max_markers set, check
    // count_active_markers(user) < max BEFORE the upsert. Tiers with
    // max_markers = NULL (Focus and above) are unlimited and skip the check.
    let tier_limits = tier::get_user_tier(pool.get_ref(), auth.user_id).await?;
    if let Some(max_active) = tier_limits.max_markers {
        // Allow re-activation of an already-active marker (no-op) without
        // counting against the cap
        let already_active =
            user_markers::is_marker_active(pool.get_ref(), auth.user_id, marker_id).await?;
        if !already_active {
            let current = user_markers::count_active_markers(pool.get_ref(), auth.user_id).await?;
            if current >= max_active as i64 {
                return Err(AppError::UpgradeRequired(Box::new(
                    crate::services::tier::TierError::upgrade_required(
                        "active_marker_cap",
                        &tier_limits.tier_slug,
                        "focus",
                        "You're at your active marker limit. Deactivate one to swap, or upgrade to Focus for unlimited markers.",
                    ),
                )));
            }
        }
    }

    user_markers::activate_marker(pool.get_ref(), auth.user_id, marker_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "marker_id": marker_id,
            "slug": marker_slug,
            "is_active": true,
        },
        "error": null
    })))
}

// ============================================================================
// PUT /api/v1/user-markers/{slug}/deactivate
// ============================================================================

pub async fn deactivate(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let marker_slug = path.into_inner();
    let marker_id = lookup_marker_id(pool.get_ref(), &marker_slug).await?;

    user_markers::deactivate_marker(pool.get_ref(), auth.user_id, marker_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "marker_id": marker_id,
            "slug": marker_slug,
            "is_active": false,
        },
        "error": null
    })))
}

// ============================================================================
// POST /api/v1/user-markers/swap
// ============================================================================

#[derive(Deserialize)]
pub struct SwapRequest {
    pub deactivate_slug: String,
    pub activate_slug: String,
}

/// Atomic swap: deactivate one marker, activate another. Used by the UI
/// picker when the user is at the cap and wants to trade an active slot
/// for a different marker without going through the "deactivate first,
/// then activate" two-step (which has a window where another tab might
/// race the activate).
pub async fn swap(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<SwapRequest>,
) -> Result<HttpResponse, AppError> {
    if body.deactivate_slug == body.activate_slug {
        return Err(AppError::Validation(
            "deactivate_slug and activate_slug must be different".into(),
        ));
    }

    let deactivate_id = lookup_marker_id(pool.get_ref(), &body.deactivate_slug).await?;
    let activate_id = lookup_marker_id(pool.get_ref(), &body.activate_slug).await?;

    // Verify the user is currently following the deactivate target
    let is_active =
        user_markers::is_marker_active(pool.get_ref(), auth.user_id, deactivate_id).await?;
    if !is_active {
        return Err(AppError::Validation(format!(
            "marker '{}' is not currently active for this user",
            body.deactivate_slug
        )));
    }

    // Atomic: deactivate then activate. Wrapping in a transaction means a
    // race with another tab can never leave the user at cap+1.
    let mut tx = pool.get_ref().begin().await?;
    sqlx::query(
        "UPDATE user_markers SET is_active = false, deactivated_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND marker_id = $2",
    )
    .bind(auth.user_id)
    .bind(deactivate_id)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        r#"INSERT INTO user_markers (user_id, marker_id, is_active, activated_at)
           VALUES ($1, $2, true, NOW())
           ON CONFLICT (user_id, marker_id) DO UPDATE
             SET is_active      = true,
                 activated_at   = CASE WHEN user_markers.is_active = false
                                       THEN NOW()
                                       ELSE user_markers.activated_at
                                  END,
                 deactivated_at = NULL,
                 updated_at     = NOW()"#,
    )
    .bind(auth.user_id)
    .bind(activate_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "deactivated": body.deactivate_slug,
            "activated": body.activate_slug,
        },
        "error": null
    })))
}

// ============================================================================
// Helpers
// ============================================================================

async fn lookup_marker_id(pool: &PgPool, slug: &str) -> Result<Uuid, AppError> {
    let row = sqlx::query("SELECT id FROM markers WHERE slug = $1")
        .bind(slug)
        .fetch_optional(pool)
        .await?;
    let row = row.ok_or_else(|| AppError::Validation(format!("Unknown marker: {slug}")))?;
    row.try_get("id").map_err(|_| AppError::Internal)
}
