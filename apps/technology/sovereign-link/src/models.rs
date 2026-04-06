use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// -- Short Links --

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShortLink {
    pub id: Uuid,
    pub code: String,
    pub target_url: String,
    pub link_type: String,
    pub domain: String,
    pub app_key: String,
    pub owner_user_id: Option<Uuid>,
    pub owner_org_id: Option<Uuid>,
    pub affiliate_code: Option<String>,
    pub title: Option<String>,
    pub is_active: bool,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkRequest {
    pub code: Option<String>,
    pub target_url: String,
    pub link_type: Option<String>,
    pub domain: Option<String>,
    pub app_key: Option<String>,
    pub title: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLinkRequest {
    pub target_url: Option<String>,
    pub title: Option<String>,
    pub is_active: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
}

// -- Clicks --

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ShortLinkClick {
    pub id: Uuid,
    pub short_link_id: Uuid,
    pub referrer_domain: Option<String>,
    pub country_code: Option<String>,
    pub clicked_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct ClickMeta {
    pub referrer_domain: Option<String>,
    pub country_code: Option<String>,
    pub visitor_hash: Option<String>,
}

// -- App Prefixes --

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct AppPrefix {
    pub prefix: String,
    pub app_key: String,
    pub domain: String,
    pub base_url: String,
    pub signup_path: String,
    pub is_active: bool,
}

// -- Stats --

#[derive(Debug, Serialize)]
pub struct LinkStats {
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
    pub unique_visitors_7d: i64,
    pub top_countries: Vec<CountryStat>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CountryStat {
    pub country_code: String,
    pub count: i64,
}

// -- Users (standalone mode) --

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub nostr_pubkey: Option<String>,
    pub display_name: Option<String>,
    pub api_key_hash: Option<String>,
    pub is_admin: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewUser {
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub nostr_pubkey: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub display_name: Option<String>,
    pub password_hash: Option<String>,
    pub api_key_hash: Option<String>,
}

// -- Chart rendering --

/// Pre-computed bar data for SVG chart rendering in templates.
#[derive(Debug, Clone, Serialize)]
pub struct ChartBar {
    pub x: i32,
    pub y: i32,
    pub height: i32,
    pub label: String,
}

// -- Prefix constants --

/// Known 2-char app prefixes for fast-path redirect (no DB lookup).
/// Must match the `app_prefixes` table.
pub const PREFIX_LEN: usize = 2;
pub const AUTO_CODE_LEN: usize = 10; // 2-char prefix + 8-char affiliate code
