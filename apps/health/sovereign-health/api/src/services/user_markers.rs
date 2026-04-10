// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #468 part 1 -- per-user marker preferences (active vs preserved).
//
// Helper functions for the user_markers table from migration
// 20260410000020_user_markers_active_preserved.sql. The table tracks the
// per-user per-marker is_active flag that backs the locked decision Q1:
// "Glimpse = 10 active markers, user picks any 10. Preserved markers are
// visible read-only and cannot accept new measurements until activated."
//
// IMPORTANT: this module ships in part 1 as a building block. It is NOT
// yet wired into tier::check_marker_access -- that integration happens in
// #468 part 2 alongside the UI picker. Part 1 is the safe schema + helpers
// foundation; part 2 is the user-visible behavior change.

use crate::error::AppError;
use sqlx::{PgPool, Row};
use uuid::Uuid;

/// Check whether a marker is currently active for a user.
///
/// Returns:
///   Ok(true)  -- user_markers row exists with is_active = true
///   Ok(false) -- no row OR row exists with is_active = false
pub async fn is_marker_active(
    pool: &PgPool,
    user_id: Uuid,
    marker_id: Uuid,
) -> Result<bool, AppError> {
    let row =
        sqlx::query("SELECT is_active FROM user_markers WHERE user_id = $1 AND marker_id = $2")
            .bind(user_id)
            .bind(marker_id)
            .fetch_optional(pool)
            .await?;
    Ok(row
        .map(|r| r.try_get("is_active").unwrap_or(false))
        .unwrap_or(false))
}

/// Convenience: check by marker slug. Resolves slug -> id via the markers
/// table, then defers to is_marker_active. Returns Ok(false) for unknown
/// slugs (rather than an error) so the gate is bug-for-bug compatible with
/// the legacy GLIMPSE_MARKERS const lookup which silently denied unknowns.
pub async fn is_marker_active_by_slug(
    pool: &PgPool,
    user_id: Uuid,
    marker_slug: &str,
) -> Result<bool, AppError> {
    let id_row = sqlx::query("SELECT id FROM markers WHERE slug = $1")
        .bind(marker_slug)
        .fetch_optional(pool)
        .await?;
    let Some(row) = id_row else {
        return Ok(false);
    };
    let marker_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    is_marker_active(pool, user_id, marker_id).await
}

/// Mark a marker as active for a user.
///
/// Upserts the user_markers row. If a row already exists with is_active = false,
/// it's flipped to true and activated_at is set to NOW(). If a row already
/// exists with is_active = true, this is a no-op (the timestamp is preserved).
///
/// **Does NOT enforce the active-marker cap**. The caller (the UI handler in
/// #468 part 2) must check `count_active(user) < tier_max_active` first and
/// reject with a "swap one out first" error if the cap is reached.
pub async fn activate_marker(
    pool: &PgPool,
    user_id: Uuid,
    marker_id: Uuid,
) -> Result<(), AppError> {
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
    .bind(user_id)
    .bind(marker_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Mark a marker as preserved (inactive) for a user.
///
/// Updates the row to is_active = false and sets deactivated_at. The
/// historical measurements for this marker stay in the measurements table
/// untouched -- the user can still SEE them, just can't enter new ones.
///
/// If no row exists, this is a no-op (the user wasn't following the marker
/// anyway).
pub async fn deactivate_marker(
    pool: &PgPool,
    user_id: Uuid,
    marker_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE user_markers
         SET is_active = false,
             deactivated_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1 AND marker_id = $2",
    )
    .bind(user_id)
    .bind(marker_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Count the number of currently active markers for a user.
/// Used by the cap-enforcement check in the UI handler (#468 part 2).
pub async fn count_active_markers(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
    let row = sqlx::query(
        "SELECT COUNT(*)::BIGINT AS c FROM user_markers
         WHERE user_id = $1 AND is_active = true",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(row.try_get("c").unwrap_or(0))
}

/// List all markers a user follows (active OR preserved).
/// Returns Vec<(marker_id, is_active, activated_at)>. Used by the markers
/// page in the frontend to render the active section + the preserved section.
pub async fn list_user_markers(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<(Uuid, bool, chrono::DateTime<chrono::Utc>)>, AppError> {
    let rows = sqlx::query(
        "SELECT marker_id, is_active, activated_at
         FROM user_markers
         WHERE user_id = $1
         ORDER BY is_active DESC, activated_at ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.try_get("marker_id").unwrap_or_default(),
                r.try_get("is_active").unwrap_or(false),
                r.try_get("activated_at").unwrap_or_default(),
            )
        })
        .collect())
}
