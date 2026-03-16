// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// DB models
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AffiliateClick {
    pub id: Uuid,
    pub affiliate_code: String,
    pub clicked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AffiliateConversion {
    pub id: Uuid,
    pub affiliate_code: String,
    pub referred_user_id: Uuid,
    pub order_id: Option<Uuid>,
    pub status: String,
    pub commission_amount_cents: Option<i32>,
    pub commission_btc_sats: Option<i64>,
    pub btc_eur_rate: Option<f64>,
    pub rate_locked_at: Option<DateTime<Utc>>,
    pub payout_method_snapshot: Option<String>,
    pub rejection_reason: Option<String>,
    pub evaluation_ends_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AffiliatePayout {
    pub id: Uuid,
    pub affiliate_code: String,
    pub amount_cents: Option<i32>,
    pub amount_btc_sats: Option<i64>,
    pub payout_method: String,
    pub payout_reference: Option<String>,
    pub status: String,
    pub approved_at: Option<DateTime<Utc>>,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct AffiliateClickRequest {
    pub affiliate_code: String,
}

#[derive(Debug, Deserialize)]
pub struct AffiliateSettingsRequest {
    pub payout_method: String,
    pub btc_address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RejectConversionRequest {
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct MarkPaidRequest {
    pub payout_reference: String,
}

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct AffiliateStatsResponse {
    pub affiliate_code: String,
    pub referral_link: String,
    pub stats: AffiliateStats,
    pub payout_settings: Option<PayoutSettings>,
}

#[derive(Debug, Serialize)]
pub struct AffiliateStats {
    pub total_clicks: i64,
    pub total_signups: i64,
    pub paid_conversions: i64,
    pub pending_commission_cents: i64,
    pub approved_commission_cents: i64,
    pub paid_commission_cents: i64,
}

#[derive(Debug, Serialize)]
pub struct PayoutSettings {
    pub method: Option<String>,
    pub btc_address: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AffiliateConversionResponse {
    pub id: Uuid,
    pub status: String,
    pub commission_amount_cents: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct AdminAffiliateListItem {
    pub affiliate_code: String,
    pub total_conversions: i64,
    pub total_commission_cents: i64,
    pub unpaid_commission_cents: i64,
}

#[derive(Debug, Serialize)]
pub struct AdminConversionQueueItem {
    pub conversion_id: Uuid,
    pub affiliate_code: String,
    pub commission_amount_cents: Option<i32>,
    pub evaluation_ends_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
