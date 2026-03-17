// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Re-exports core user types from brickos-db.
// UserResponse is app-specific (includes health profile fields).

// Core types from brickos-db
pub use brickos_db::models::user::{LoginRequest, RefreshRequest, SignupRequest, User};

// JWT Claims from brickos-auth
pub use brickos_auth::jwt::Claims;

// Organization types from brickos-db (for future use)
pub use brickos_db::models::organization::{DataShare, OrgMember, Organization};

// ── Health-specific user response ─────────────────────────────────────────

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// User response with health-specific profile fields.
/// Extends the platform BaseUserResponse with height, waist, weight, country.
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
    pub tier: String,
    pub created_at: DateTime<Utc>,
    // Health-specific profile fields (null if profile not yet set)
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
