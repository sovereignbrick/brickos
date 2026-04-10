// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #469 -- audit log writer for licensing-related admin mutations.
//
// Writes rows to brickos.admin_audit_log (created in migration 009). The
// table tracks every admin action that mutates licensing state -- license
// issuance, revocation, admin tier override, org member add/remove/role-change,
// dormant account flag, etc.
//
// This is the audit trail required for compliance + internal abuse detection
// per design 022 §13.5 + §2.6 ("audit log table + writes from all admin
// tier mutations").

use crate::error::AppError;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Action codes (stable strings) for the admin_audit_log.action column.
/// Use these constants instead of bare strings so a typo at the call site
/// is a compile error, not a silent SQL row.
pub mod actions {
    pub const ORG_LICENSE_ISSUE: &str = "org.license.issue";
    pub const ORG_LICENSE_REVOKE: &str = "org.license.revoke";
    pub const ORG_MEMBER_ADD: &str = "org.member.add";
    pub const ORG_MEMBER_REMOVE: &str = "org.member.remove";
    pub const ORG_MEMBER_ROLE_CHANGE: &str = "org.member.role_change";
    pub const TIER_ADMIN_OVERRIDE_SET: &str = "tier.admin_override.set";
    pub const TIER_ADMIN_OVERRIDE_CLEAR: &str = "tier.admin_override.clear";
    pub const USER_DORMANT_FLAG: &str = "user.lifecycle.dormant_flagged";
}

/// Target type discriminator for the admin_audit_log.target_type column.
pub mod targets {
    pub const ORGANIZATION: &str = "organization";
    pub const USER: &str = "user";
    pub const LICENSE: &str = "license";
}

/// Write a row to brickos.admin_audit_log. Best-effort: errors are logged
/// via tracing but never propagated to the caller (so a write failure
/// doesn't fail the underlying admin action).
///
/// Why best-effort: the audit log is a backstop, not the source of truth.
/// If the audit row write fails (network blip, FK constraint hiccup, etc.)
/// we still want the admin action to succeed and the operator to see it.
/// Failures are logged + metered for ops awareness.
pub async fn write(
    platform_pool: &PgPool,
    actor_user_id: Option<Uuid>,
    action: &str,
    target_type: &str,
    target_id: Uuid,
    payload: Value,
) -> Result<(), AppError> {
    let result = sqlx::query(
        r#"INSERT INTO brickos.admin_audit_log
             (actor_user_id, action, target_type, target_id, payload)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(actor_user_id)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(&payload)
    .execute(platform_pool)
    .await;

    if let Err(e) = result {
        tracing::error!(
            actor = ?actor_user_id,
            action = %action,
            target_type = %target_type,
            target_id = %target_id,
            error = ?e,
            "audit log write failed -- admin action still proceeded"
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_constants_are_stable() {
        // The audit_log.action column is an analytics anchor; renaming a
        // value here is a breaking change for downstream queries. Lock the
        // canonical strings with this trip-wire.
        assert_eq!(actions::ORG_LICENSE_ISSUE, "org.license.issue");
        assert_eq!(actions::ORG_LICENSE_REVOKE, "org.license.revoke");
        assert_eq!(actions::ORG_MEMBER_ADD, "org.member.add");
        assert_eq!(actions::ORG_MEMBER_REMOVE, "org.member.remove");
        assert_eq!(actions::ORG_MEMBER_ROLE_CHANGE, "org.member.role_change");
        assert_eq!(actions::TIER_ADMIN_OVERRIDE_SET, "tier.admin_override.set");
        assert_eq!(
            actions::TIER_ADMIN_OVERRIDE_CLEAR,
            "tier.admin_override.clear"
        );
    }

    #[test]
    fn target_constants_are_stable() {
        assert_eq!(targets::ORGANIZATION, "organization");
        assert_eq!(targets::USER, "user");
        assert_eq!(targets::LICENSE, "license");
    }
}
