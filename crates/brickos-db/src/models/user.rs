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
    pub consent_product_updates: Option<bool>,
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
