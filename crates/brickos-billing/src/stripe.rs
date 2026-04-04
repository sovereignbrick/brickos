// BrickOS — Stripe Payment Service

use anyhow::{anyhow, Result};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use uuid::Uuid;

use crate::config::StripeConfig;

const STRIPE_API: &str = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECS: i64 = 300; // 5 minutes

#[derive(Clone)]
pub struct StripeService {
    secret_key: String,
    webhook_secret: String,
    http: reqwest::Client,
    pub config: StripeConfig,
}

impl StripeService {
    pub fn new(config: &StripeConfig) -> Self {
        Self {
            secret_key: config.secret_key.clone(),
            webhook_secret: config.webhook_secret.clone(),
            http: reqwest::ClientBuilder::new()
                .timeout(std::time::Duration::from_secs(10))
                .connect_timeout(std::time::Duration::from_secs(5))
                .use_rustls_tls()
                .build()
                .expect("Failed to create Stripe HTTP client"),
            config: config.clone(),
        }
    }

    /// Create a Stripe customer
    pub async fn create_customer(
        &self,
        email: &str,
        name: Option<&str>,
        user_id: Uuid,
        country: Option<&str>,
    ) -> Result<String> {
        let mut params = vec![
            ("email".to_string(), email.to_string()),
            ("metadata[user_id]".to_string(), user_id.to_string()),
        ];
        if let Some(n) = name {
            params.push(("name".to_string(), n.to_string()));
        }
        if let Some(c) = country {
            params.push(("address[country]".to_string(), c.to_string()));
        }

        let res = self
            .http
            .post(format!("{}/customers", STRIPE_API))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(&params)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        body["id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("Stripe create_customer: no id in response: {}", body))
    }

    /// Update a Stripe customer (e.g., when country changes)
    pub async fn update_customer(
        &self,
        customer_id: &str,
        params: &[(String, String)],
    ) -> Result<()> {
        let res = self
            .http
            .post(format!("{}/customers/{}", STRIPE_API, customer_id))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(params)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let body: serde_json::Value = res.json().await?;
            return Err(anyhow!("Stripe update_customer: {}", body));
        }
        Ok(())
    }

    /// Create a Checkout Session, returns the session URL
    pub async fn create_checkout_session(
        &self,
        customer_id: &str,
        price_id: &str,
        success_url: &str,
        cancel_url: &str,
        metadata: &HashMap<String, String>,
    ) -> Result<String> {
        self.create_checkout_session_with_promo(
            customer_id,
            price_id,
            success_url,
            cancel_url,
            metadata,
            None,
        )
        .await
    }

    /// Create a Checkout Session with optional promo code, returns the session URL
    pub async fn create_checkout_session_with_promo(
        &self,
        customer_id: &str,
        price_id: &str,
        success_url: &str,
        cancel_url: &str,
        metadata: &HashMap<String, String>,
        promotion_code_id: Option<&str>,
    ) -> Result<String> {
        let mut params = vec![
            ("mode", "subscription".to_string()),
            ("customer", customer_id.to_string()),
            ("line_items[0][price]", price_id.to_string()),
            ("line_items[0][quantity]", "1".to_string()),
            ("success_url", success_url.to_string()),
            ("cancel_url", cancel_url.to_string()),
            ("payment_method_types[0]", "card".to_string()),
            ("billing_address_collection", "auto".to_string()),
            ("automatic_tax[enabled]", "true".to_string()),
            ("customer_update[name]", "auto".to_string()),
            ("customer_update[address]", "auto".to_string()),
        ];

        // If a specific promo code is provided, use discounts[] instead of allow_promotion_codes
        if let Some(promo_id) = promotion_code_id {
            params.push(("discounts[0][promotion_code]", promo_id.to_string()));
        } else {
            params.push(("allow_promotion_codes", "true".to_string()));
        }

        for (k, v) in metadata {
            params.push((
                &*Box::leak(format!("metadata[{}]", k).into_boxed_str()),
                v.clone(),
            ));
        }

        let res = self
            .http
            .post(format!("{}/checkout/sessions", STRIPE_API))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(&params)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        body["url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("Stripe checkout: no url in response: {}", body))
    }

    /// Create a Billing Portal session, returns the portal URL
    pub async fn create_billing_portal_session(
        &self,
        customer_id: &str,
        return_url: &str,
    ) -> Result<String> {
        let params = [("customer", customer_id), ("return_url", return_url)];

        let res = self
            .http
            .post(format!("{}/billing_portal/sessions", STRIPE_API))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(&params)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        body["url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("Stripe portal: no url in response: {}", body))
    }

    /// Cancel a subscription (at period end or immediately)
    pub async fn cancel_subscription(
        &self,
        subscription_id: &str,
        at_period_end: bool,
    ) -> Result<()> {
        if at_period_end {
            let params = [("cancel_at_period_end", "true")];
            let res = self
                .http
                .post(format!("{}/subscriptions/{}", STRIPE_API, subscription_id))
                .basic_auth(&self.secret_key, Option::<&str>::None)
                .form(&params)
                .send()
                .await?;
            let status = res.status();
            if !status.is_success() {
                let body: serde_json::Value = res.json().await?;
                return Err(anyhow!("Stripe cancel: {}", body));
            }
        } else {
            let res = self
                .http
                .delete(format!("{}/subscriptions/{}", STRIPE_API, subscription_id))
                .basic_auth(&self.secret_key, Option::<&str>::None)
                .send()
                .await?;
            let status = res.status();
            if !status.is_success() {
                let body: serde_json::Value = res.json().await?;
                return Err(anyhow!("Stripe cancel: {}", body));
            }
        }
        Ok(())
    }

    /// Update subscription to a new price
    pub async fn update_subscription(
        &self,
        subscription_id: &str,
        new_price_id: &str,
        prorate: bool,
    ) -> Result<()> {
        // First get current subscription to find the item id
        let sub = self.get_subscription(subscription_id).await?;
        let item_id = sub["items"]["data"][0]["id"]
            .as_str()
            .ok_or_else(|| anyhow!("No subscription item found"))?;

        let proration = if prorate { "create_prorations" } else { "none" };

        let params = [
            ("items[0][id]", item_id),
            ("items[0][price]", new_price_id),
            ("proration_behavior", proration),
        ];

        let res = self
            .http
            .post(format!("{}/subscriptions/{}", STRIPE_API, subscription_id))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(&params)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let body: serde_json::Value = res.json().await?;
            return Err(anyhow!("Stripe update subscription: {}", body));
        }
        Ok(())
    }

    /// Reactivate a subscription that was set to cancel at period end
    pub async fn reactivate_subscription(&self, subscription_id: &str) -> Result<()> {
        let params = [("cancel_at_period_end", "false")];
        let res = self
            .http
            .post(format!("{}/subscriptions/{}", STRIPE_API, subscription_id))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(&params)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let body: serde_json::Value = res.json().await?;
            return Err(anyhow!("Stripe reactivate: {}", body));
        }
        Ok(())
    }

    /// Get subscription details
    pub async fn get_subscription(&self, subscription_id: &str) -> Result<serde_json::Value> {
        let res = self
            .http
            .get(format!("{}/subscriptions/{}", STRIPE_API, subscription_id))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        if body.get("error").is_some() {
            return Err(anyhow!("Stripe get_subscription: {}", body));
        }
        Ok(body)
    }

    /// Verify webhook signature and return parsed event
    pub fn verify_webhook(
        &self,
        payload: &[u8],
        signature_header: &str,
    ) -> Result<serde_json::Value> {
        // Parse Stripe-Signature header: t=timestamp,v1=signature
        let mut timestamp: Option<i64> = None;
        let mut signatures: Vec<String> = Vec::new();

        for part in signature_header.split(',') {
            let part = part.trim();
            if let Some(t) = part.strip_prefix("t=") {
                timestamp = t.parse().ok();
            } else if let Some(v) = part.strip_prefix("v1=") {
                signatures.push(v.to_string());
            }
        }

        let ts = timestamp.ok_or_else(|| anyhow!("No timestamp in Stripe signature"))?;
        if signatures.is_empty() {
            return Err(anyhow!("No v1 signature in Stripe-Signature header"));
        }

        // Check timestamp tolerance
        let now = chrono::Utc::now().timestamp();
        if (now - ts).abs() > WEBHOOK_TOLERANCE_SECS {
            return Err(anyhow!("Webhook timestamp too old"));
        }

        // Compute expected signature
        let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(payload));
        let mut mac = Hmac::<Sha256>::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|e| anyhow!("HMAC init: {}", e))?;
        mac.update(signed_payload.as_bytes());
        let expected = hex::encode(mac.finalize().into_bytes());

        // Constant-time compare against any provided v1 signature
        let valid = signatures.iter().any(|sig| {
            if sig.len() != expected.len() {
                return false;
            }
            let mut result = 0u8;
            for (a, b) in sig.bytes().zip(expected.bytes()) {
                result |= a ^ b;
            }
            result == 0
        });

        if !valid {
            return Err(anyhow!("Invalid webhook signature"));
        }

        serde_json::from_slice(payload).map_err(|e| anyhow!("Parse webhook body: {}", e))
    }

    /// Map price_id to (tier_slug, billing_interval)
    pub fn tier_from_price_id(&self, price_id: &str) -> Option<(String, String)> {
        self.config.price_to_tier.get(price_id).cloned()
    }

    /// Generic POST to Stripe API (for coupons, promotion codes, etc.)
    pub async fn raw_post(
        &self,
        path: &str,
        params: &[(String, String)],
    ) -> Result<serde_json::Value> {
        let res = self
            .http
            .post(format!("{}/{}", STRIPE_API, path))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .form(params)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        if let Some(err) = body.get("error") {
            return Err(anyhow!(
                "Stripe API error: {}",
                err.get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown")
            ));
        }
        Ok(body)
    }

    /// Generic GET from Stripe API
    pub async fn raw_get(&self, path: &str) -> Result<serde_json::Value> {
        let res = self
            .http
            .get(format!("{}/{}", STRIPE_API, path))
            .basic_auth(&self.secret_key, Option::<&str>::None)
            .send()
            .await?;

        let body: serde_json::Value = res.json().await?;
        if let Some(err) = body.get("error") {
            return Err(anyhow!(
                "Stripe API error: {}",
                err.get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown")
            ));
        }
        Ok(body)
    }

    /// Create a refund for a payment intent or charge
    pub async fn create_refund(
        &self,
        charge_id: &str,
        reason: Option<&str>,
    ) -> Result<serde_json::Value> {
        let mut params = vec![("charge".to_string(), charge_id.to_string())];
        if let Some(r) = reason {
            params.push(("reason".to_string(), "requested_by_customer".to_string()));
            params.push(("metadata[internal_reason]".to_string(), r.to_string()));
        }
        self.raw_post("refunds", &params).await
    }

    /// Get the latest charge for a subscription
    pub async fn get_latest_charge(&self, customer_id: &str) -> Result<Option<String>> {
        let res = self
            .raw_get(&format!("charges?customer={}&limit=1", customer_id))
            .await?;
        Ok(res["data"][0]["id"].as_str().map(|s| s.to_string()))
    }

    /// Get invoice details
    pub async fn get_invoice(&self, invoice_id: &str) -> Result<serde_json::Value> {
        self.raw_get(&format!("invoices/{}", invoice_id)).await
    }

    /// List payment methods for a customer
    pub async fn list_payment_methods(&self, customer_id: &str) -> Result<serde_json::Value> {
        self.raw_get(&format!(
            "payment_methods?customer={}&type=card&limit=5",
            customer_id
        ))
        .await
    }

    /// List invoices for a customer from Stripe
    pub async fn list_customer_invoices(
        &self,
        customer_id: &str,
        limit: u32,
    ) -> Result<serde_json::Value> {
        self.raw_get(&format!(
            "invoices?customer={}&limit={}&status=paid",
            customer_id, limit
        ))
        .await
    }

    /// List active subscriptions for a customer
    pub async fn list_customer_subscriptions(
        &self,
        customer_id: &str,
    ) -> Result<serde_json::Value> {
        self.raw_get(&format!(
            "subscriptions?customer={}&status=active&limit=1",
            customer_id
        ))
        .await
    }

    /// Map (tier_slug, interval) to price_id
    pub fn price_id_for_tier(&self, tier_slug: &str, interval: &str) -> Option<String> {
        self.config
            .tier_to_price
            .get(&(tier_slug.to_string(), interval.to_string()))
            .cloned()
    }
}
