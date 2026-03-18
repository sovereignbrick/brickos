// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Log an application event to the audit_log table.
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
    let result = sqlx::query(
        r#"INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(ip_address)
    .bind(metadata)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::warn!("Failed to write audit log (action={}): {:?}", action, e);
    }
}
