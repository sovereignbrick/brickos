// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

#[derive(Debug, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
    pub tos_accepted: Option<bool>,
    pub referred_by: Option<String>,
    pub locale: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
    pub tier: String,
    pub created_at: DateTime<Utc>,
    // Profile fields (null if profile not yet set)
    pub height_cm: Option<f64>,
    pub default_waist_cm: Option<f64>,
    pub default_weight_kg: Option<f64>,
    pub country_code: Option<String>,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            display_name: u.display_name,
            role: u.role,
            tier: u.tier,
            created_at: u.created_at,
            height_cm: None,
            default_waist_cm: None,
            default_weight_kg: None,
            country_code: None,
        }
    }
}

// Re-export Claims from brickos-auth crate
pub use brickos_auth::jwt::Claims;
