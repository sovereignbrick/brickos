// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Data access audit log — tracks who accessed what data and when.
// GDPR Art. 15 — users can see who accessed their data.
//
// Issue: https://github.com/sovereignbrick/brickos/issues/45

use sqlx::PgPool;
use uuid::Uuid;

/// Log a data access event. Non-blocking — errors are logged but don't fail the request.
pub async fn log_access(pool: &PgPool, entry: &AccessEntry<'_>) {
    let result = sqlx::query(
        r#"INSERT INTO data_access_log (user_id, accessed_by, action, resource, resource_id, ip_hash, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
    )
    .bind(entry.user_id)
    .bind(entry.accessed_by)
    .bind(entry.action)
    .bind(entry.resource)
    .bind(entry.resource_id)
    .bind(entry.ip_hash)
    .bind(&entry.metadata)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::warn!("Failed to log data access: {e}");
    }
}

pub struct AccessEntry<'a> {
    pub user_id: Uuid,
    pub accessed_by: Uuid,
    pub action: &'a str,
    pub resource: &'a str,
    pub resource_id: Option<Uuid>,
    pub ip_hash: Option<&'a str>,
    pub metadata: Option<serde_json::Value>,
}

/// Log a self-access event (user accessing their own data).
pub async fn log_self_access(pool: &PgPool, user_id: Uuid, action: &str, resource: &str) {
    log_access(
        pool,
        &AccessEntry {
            user_id,
            accessed_by: user_id,
            action,
            resource,
            resource_id: None,
            ip_hash: None,
            metadata: None,
        },
    )
    .await;
}
