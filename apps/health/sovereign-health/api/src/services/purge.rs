// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Hard purge service: permanently removes user data after the 30-day grace period.
// Soft-deleted users (is_deleted=true) are purged once deleted_at + 30 days < now().
//
// Tables with CASCADE FK are automatically cleaned. Tables with NO ACTION FK
// must be explicitly deleted here before the user row can be removed.
//
// GDPR Art. 17 — Right to Erasure
// Issue: https://github.com/sovereignbrick/brickos/issues/39

use sqlx::PgPool;

const GRACE_PERIOD_DAYS: i32 = 30;

/// Run once daily. Finds users past grace period and permanently deletes all their data.
pub async fn cron_hard_purge(pool: &PgPool) {
    let result = sqlx::query_scalar::<_, uuid::Uuid>(
        r#"SELECT id FROM users
        WHERE is_deleted = true
          AND deleted_at IS NOT NULL
          AND deleted_at < NOW() - ($1 || ' days')::interval"#,
    )
    .bind(GRACE_PERIOD_DAYS)
    .fetch_all(pool)
    .await;

    let user_ids = match result {
        Ok(ids) => ids,
        Err(e) => {
            tracing::warn!("Hard purge: failed to query expired users: {e}");
            return;
        }
    };

    if user_ids.is_empty() {
        tracing::debug!("Hard purge: no users past grace period");
        return;
    }

    tracing::info!(
        "Hard purge: {} user(s) past {}-day grace period",
        user_ids.len(),
        GRACE_PERIOD_DAYS
    );

    for user_id in &user_ids {
        match purge_user(pool, *user_id).await {
            Ok(()) => tracing::info!("Hard purge: user {} permanently deleted", user_id),
            Err(e) => tracing::error!("Hard purge: failed to purge user {}: {e}", user_id),
        }
    }
}

/// Permanently delete all data for a single user.
/// Order matters: delete from NO ACTION FK tables first, then CASCADE tables handle themselves.
async fn purge_user(pool: &PgPool, user_id: uuid::Uuid) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    // --- NO ACTION FK tables (must delete explicitly) ---

    // Measurement templates (has deleted_at soft delete)
    sqlx::query("DELETE FROM measurement_templates WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // User medications (has deleted_at soft delete)
    sqlx::query("DELETE FROM user_medications WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Influence factors
    sqlx::query("DELETE FROM influence_factors WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // User licenses
    sqlx::query("DELETE FROM user_licenses WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // AI usage log (audit — retained for billing disputes, but purge after grace)
    sqlx::query("DELETE FROM ai_usage_log WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // License events (audit)
    sqlx::query("DELETE FROM license_events WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Chat agent quota
    sqlx::query("DELETE FROM chat_agent_quota WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // App roles
    sqlx::query("DELETE FROM app_roles WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Org members
    sqlx::query("DELETE FROM org_members WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Data shares (both directions)
    sqlx::query("DELETE FROM data_shares WHERE owner_user_id = $1 OR granted_to_user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // BTC payments
    sqlx::query("DELETE FROM btc_payments WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Promotion redemptions
    sqlx::query("DELETE FROM promotion_redemptions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Audit log (keep IP hash but remove user reference)
    sqlx::query("UPDATE audit_log SET user_id = NULL WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Email sends (SET NULL — keep delivery log without PII)
    sqlx::query("UPDATE email_sends SET user_id = NULL, email = '[purged]' WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Payment events (SET NULL — keep for accounting)
    sqlx::query("UPDATE payment_events SET user_id = NULL WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // --- Now delete the user (CASCADE handles remaining tables) ---
    // CASCADE tables: measurements, devices, doctor_chat_*, calculated_marker_values,
    // reference_ranges, refresh_tokens, user_mfa, user_preferences, user_profile,
    // user_segments, subscriptions, email_verifications, import_*, report_*

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(())
}
