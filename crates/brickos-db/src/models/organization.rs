// BrickOS — Organization and role models
//
// These types represent the multi-tenancy model.
// Currently inactive — prepared for clinic/practice support.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Database row struct for the organizations table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Organization {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub org_type: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// Organization member with role.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrgMember {
    pub id: Uuid,
    pub org_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

/// Data sharing grant between users (patient → practitioner).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DataShare {
    pub id: Uuid,
    pub owner_user_id: Uuid,
    pub granted_to_user_id: Uuid,
    pub org_id: Option<Uuid>,
    pub scope: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Supported organization roles.
pub const ORG_ROLES: &[&str] = &[
    "owner",
    "practitioner",
    "assistant",
    "billing_admin",
    "patient",
];

/// Supported data share scopes.
pub const SHARE_SCOPES: &[&str] = &[
    "all",
    "measurements",
    "measurements_readonly",
    "trends",
    "summary",
    "doctor_chat",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn org_roles_contains_owner() {
        assert!(ORG_ROLES.contains(&"owner"));
    }

    #[test]
    fn org_roles_contains_expected_values() {
        let expected = [
            "owner",
            "practitioner",
            "assistant",
            "billing_admin",
            "patient",
        ];
        for role in &expected {
            assert!(ORG_ROLES.contains(role), "Missing role: {}", role);
        }
    }

    #[test]
    fn share_scopes_are_valid() {
        assert!(SHARE_SCOPES.contains(&"all"));
        assert!(SHARE_SCOPES.contains(&"measurements"));
        assert!(SHARE_SCOPES.contains(&"measurements_readonly"));
        assert!(SHARE_SCOPES.contains(&"trends"));
        assert!(SHARE_SCOPES.contains(&"summary"));
        assert!(SHARE_SCOPES.contains(&"doctor_chat"));
    }

    #[test]
    fn org_roles_are_non_empty_strings() {
        for role in ORG_ROLES {
            assert!(!role.is_empty());
            assert!(role.chars().all(|c| c.is_ascii_lowercase() || c == '_'));
        }
    }
}
