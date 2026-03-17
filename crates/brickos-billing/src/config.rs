// BrickOS — Billing configuration types

use std::collections::HashMap;

/// Stripe configuration with price↔tier mappings.
#[derive(Debug, Clone)]
pub struct StripeConfig {
    pub secret_key: String,
    pub publishable_key: String,
    pub webhook_secret: String,
    /// Maps price_id -> (tier_slug, billing_interval)
    pub price_to_tier: HashMap<String, (String, String)>,
    /// Maps (tier_slug, billing_interval) -> price_id
    pub tier_to_price: HashMap<(String, String), String>,
}
