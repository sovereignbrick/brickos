// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

/// Hash an IP address for DSGVO-compliant storage (Art. 32 pseudonymization).
/// Matches the pattern used by data_access_log.
pub fn hash_ip(ip: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(ip.as_bytes());
    hasher.update(b"sovereign-audit-salt");
    hex::encode(hasher.finalize())
}

/// Log an application event to the audit_log table.
/// IP addresses are hashed before storage for DSGVO compliance.
/// Errors are swallowed (fire-and-forget) — audit logging must never break the request.
pub async fn log(
    pool: &PgPool,
    user_id: Option<Uuid>,
    action: &str,
    resource_type: Option<&str>,
    resource_id: Option<Uuid>,
    ip_address: Option<&str>,
    metadata: Option<Value>,
) {
    let ip_hash = ip_address.map(hash_ip);
    let result = sqlx::query(
        r#"INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(ip_hash.as_deref())
    .bind(metadata)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::warn!("Failed to write audit log (action={}): {:?}", action, e);
    }
}

/// Purge audit and data access logs older than the configured retention period.
/// Call this on API startup to enforce retention automatically.
pub async fn auto_purge(pool: &PgPool) {
    // Read retention settings (default: 90 days for audit, 365 for data access)
    let audit_days: i64 = sqlx::query_scalar(
        "SELECT COALESCE((SELECT value::bigint FROM app_settings WHERE key = 'audit_retention_days'), 90)",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(90);

    let access_days: i64 = sqlx::query_scalar(
        "SELECT COALESCE((SELECT value::bigint FROM app_settings WHERE key = 'access_log_retention_days'), 365)",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(365);

    // Enforce minimum 7 days
    let audit_days = audit_days.max(7);
    let access_days = access_days.max(7);

    let audit_deleted: i64 = sqlx::query_scalar(
        "WITH deleted AS (DELETE FROM audit_log WHERE created_at < NOW() - make_interval(days => $1) RETURNING 1) SELECT COUNT(*) FROM deleted",
    )
    .bind(audit_days as i32)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let access_deleted: i64 = sqlx::query_scalar(
        "WITH deleted AS (DELETE FROM data_access_log WHERE created_at < NOW() - make_interval(days => $1) RETURNING 1) SELECT COUNT(*) FROM deleted",
    )
    .bind(access_days as i32)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    if audit_deleted > 0 || access_deleted > 0 {
        tracing::info!(
            "Auto-purge: deleted {} audit_log entries (>{} days) and {} data_access_log entries (>{} days)",
            audit_deleted, audit_days, access_deleted, access_days
        );
    }
}
