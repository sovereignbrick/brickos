// BrickOS — Core user model
//
// Platform-level user struct. App-specific profile fields
// (height, waist, weight) live in the app layer, not here.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Database row struct for the users table.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub display_name: Option<String>,
    pub role: String,
    pub tier: String,
    pub created_at: DateTime<Utc>,
}

/// API request for user signup.
#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
    pub tos_accepted: Option<bool>,
    pub referred_by: Option<String>,
    pub locale: Option<String>,
    pub consent_newsletter: Option<bool>,
    pub country: Option<String>,
}

/// API request for user login.
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// API request for token refresh.
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// Base user response (platform-level, no app-specific fields).
/// Apps extend this with their own profile fields.
#[derive(Debug, Serialize, Clone)]
pub struct BaseUserResponse {
    pub id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
    pub tier: String,
    pub created_at: DateTime<Utc>,
}

impl From<User> for BaseUserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            display_name: u.display_name,
            role: u.role,
            tier: u.tier,
            created_at: u.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_user() -> User {
        User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "$argon2id$hash".to_string(),
            display_name: Some("Test User".to_string()),
            role: "user".to_string(),
            tier: "free".to_string(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn user_to_base_response_preserves_fields() {
        let user = test_user();
        let id = user.id;
        let response = BaseUserResponse::from(user);
        assert_eq!(response.id, id);
        assert_eq!(response.email, "test@example.com");
        assert_eq!(response.display_name, Some("Test User".to_string()));
        assert_eq!(response.role, "user");
        assert_eq!(response.tier, "free");
    }

    #[test]
    fn user_to_base_response_with_no_display_name() {
        let mut user = test_user();
        user.display_name = None;
        let response = BaseUserResponse::from(user);
        assert_eq!(response.display_name, None);
    }
}
