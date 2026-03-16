// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Gateway identifier
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GatewayId {
    Stripe,
    Strike,
}

impl GatewayId {
    pub fn as_str(&self) -> &'static str {
        match self {
            GatewayId::Stripe => "stripe",
            GatewayId::Strike => "strike",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "stripe" => Some(GatewayId::Stripe),
            "strike" => Some(GatewayId::Strike),
            _ => None,
        }
    }
}

impl std::fmt::Display for GatewayId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

// ---------------------------------------------------------------------------
// Payment currency
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PaymentCurrency {
    Fiat,
    BtcOnchain,
    Lightning,
}

// ---------------------------------------------------------------------------
// Checkout types
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub struct CheckoutRequest {
    pub user_id: Uuid,
    pub tier: String,
    pub interval: String,
    pub currency: PaymentCurrency,
    pub amount_cents: i64,
    pub success_url: String,
    pub cancel_url: String,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct CheckoutResponse {
    pub gateway: GatewayId,
    pub checkout_url: Option<String>,
    pub invoice: Option<String>,
    pub address: Option<String>,
    pub amount_sats: Option<i64>,
    pub expires_at: Option<DateTime<Utc>>,
    pub external_id: String,
}

// ---------------------------------------------------------------------------
// Webhook result
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub struct WebhookResult {
    pub gateway: GatewayId,
    pub event_type: String,
    pub external_id: String,
    pub user_id: Option<Uuid>,
    pub amount_cents: Option<i64>,
    pub metadata: serde_json::Value,
}

// ---------------------------------------------------------------------------
// Gateway trait
// ---------------------------------------------------------------------------

#[async_trait]
pub trait PaymentGateway: Send + Sync {
    fn id(&self) -> GatewayId;
    fn supports(&self, currency: &PaymentCurrency) -> bool;

    /// Test connectivity to the gateway
    async fn test_connection(&self) -> anyhow::Result<u64>;

    /// Check if gateway has valid configuration
    fn config_valid(&self) -> bool;
}

// ---------------------------------------------------------------------------
// Gateway status (for DB tracking)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct GatewayStatus {
    pub gateway_id: String,
    pub enabled: bool,
    pub is_active_fiat: bool,
    pub is_active_btc: bool,
    pub last_success_at: Option<DateTime<Utc>>,
    pub last_failure_at: Option<DateTime<Utc>>,
    pub failure_count: i32,
    pub config_valid: bool,
}
