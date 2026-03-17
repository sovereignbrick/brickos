// BrickOS — Strike BTC Payment Service

use anyhow::{anyhow, Result};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

#[derive(Clone)]
pub struct StrikeService {
    api_key: String,
    webhook_secret: String,
    base_url: String,
    http: reqwest::Client,
}

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct CreateInvoiceRequest {
    #[serde(rename = "correlationId")]
    pub correlation_id: String,
    pub description: String,
    pub amount: InvoiceAmount,
    #[serde(rename = "isReusable")]
    pub is_reusable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvoiceAmount {
    pub amount: String,
    pub currency: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct StrikeInvoice {
    #[serde(rename = "invoiceId")]
    pub invoice_id: String,
    pub amount: InvoiceAmount,
    pub state: String, // UNPAID, PENDING, PAID, CANCELLED
    pub description: Option<String>,
    #[serde(rename = "correlationId")]
    pub correlation_id: Option<String>,
    #[serde(rename = "issuerId")]
    pub issuer_id: Option<String>,
    #[serde(rename = "receiverId")]
    pub receiver_id: Option<String>,
    pub created: Option<String>,
    #[serde(rename = "expirationInSec")]
    pub expiration_in_sec: Option<i64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct InvoiceQuote {
    #[serde(rename = "quoteId")]
    pub quote_id: String,
    pub description: Option<String>,
    #[serde(rename = "lnInvoice")]
    pub ln_invoice: Option<String>,
    #[serde(rename = "onchainAddress")]
    pub onchain_address: Option<String>,
    pub expiration: Option<String>,
    #[serde(rename = "expirationInSec")]
    pub expiration_in_sec: Option<i64>,
    #[serde(rename = "targetAmount")]
    pub target_amount: Option<InvoiceAmount>,
    #[serde(rename = "sourceAmount")]
    pub source_amount: Option<InvoiceAmount>,
    #[serde(rename = "conversionRate")]
    pub conversion_rate: Option<ConversionRate>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ConversionRate {
    pub amount: Option<String>,
    #[serde(rename = "sourceCurrency")]
    pub source_currency: Option<String>,
    #[serde(rename = "targetCurrency")]
    pub target_currency: Option<String>,
}

// Webhook event types
#[derive(Debug, Deserialize)]
pub struct StrikeWebhookEvent {
    pub id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    #[serde(rename = "webhookVersion")]
    pub webhook_version: Option<String>,
    pub data: serde_json::Value,
    pub created: Option<String>,
    #[serde(rename = "deliverySuccess")]
    pub delivery_success: Option<bool>,
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

impl StrikeService {
    pub fn new(api_key: String, webhook_secret: String) -> Self {
        let base_url = std::env::var("STRIKE_BASE_URL")
            .unwrap_or_else(|_| "https://api.strike.me".to_string());
        Self {
            api_key,
            webhook_secret,
            base_url,
            http: reqwest::ClientBuilder::new()
                .use_rustls_tls()
                .build()
                .expect("Failed to create HTTP client"),
        }
    }

    /// Create an invoice for a subscription payment
    pub async fn create_invoice(&self, params: CreateInvoiceRequest) -> Result<StrikeInvoice> {
        let resp = self
            .http
            .post(format!("{}/v1/invoices", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&params)
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        if !status.is_success() {
            return Err(anyhow!(
                "Strike create_invoice failed ({}): {}",
                status,
                body
            ));
        }

        serde_json::from_str(&body)
            .map_err(|e| anyhow!("Strike create_invoice parse error: {} body: {}", e, body))
    }

    /// Generate a Lightning invoice (BOLT11) + on-chain address for payment
    pub async fn create_invoice_quote(&self, invoice_id: &str) -> Result<InvoiceQuote> {
        let resp = self
            .http
            .post(format!(
                "{}/v1/invoices/{}/quote",
                self.base_url, invoice_id
            ))
            .bearer_auth(&self.api_key)
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        if !status.is_success() {
            return Err(anyhow!(
                "Strike create_invoice_quote failed ({}): {}",
                status,
                body
            ));
        }

        serde_json::from_str(&body)
            .map_err(|e| anyhow!("Strike quote parse error: {} body: {}", e, body))
    }

    /// Get invoice details / check payment status
    pub async fn get_invoice(&self, invoice_id: &str) -> Result<StrikeInvoice> {
        let resp = self
            .http
            .get(format!("{}/v1/invoices/{}", self.base_url, invoice_id))
            .bearer_auth(&self.api_key)
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        if !status.is_success() {
            return Err(anyhow!("Strike get_invoice failed ({}): {}", status, body));
        }

        serde_json::from_str(&body)
            .map_err(|e| anyhow!("Strike get_invoice parse error: {} body: {}", e, body))
    }

    /// Cancel an unpaid invoice
    pub async fn cancel_invoice(&self, invoice_id: &str) -> Result<()> {
        let resp = self
            .http
            .patch(format!(
                "{}/v1/invoices/{}/cancel",
                self.base_url, invoice_id
            ))
            .bearer_auth(&self.api_key)
            .send()
            .await?;

        if !resp.status().is_success() {
            let body = resp.text().await?;
            return Err(anyhow!("Strike cancel_invoice failed: {}", body));
        }

        Ok(())
    }

    /// Verify Strike webhook signature
    /// Strike uses HMAC-SHA256 with the webhook secret.
    /// Header: X-Webhook-Signature
    pub fn verify_webhook(
        &self,
        payload: &[u8],
        signature_header: &str,
    ) -> Result<StrikeWebhookEvent> {
        if self.webhook_secret.is_empty() {
            // If no secret configured, parse but don't verify (development mode)
            let event: StrikeWebhookEvent = serde_json::from_slice(payload)?;
            return Ok(event);
        }

        // Strike sends the signature as a hex-encoded HMAC-SHA256
        let mut mac = Hmac::<Sha256>::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|e| anyhow!("HMAC key error: {}", e))?;
        mac.update(payload);
        let expected = mac.finalize().into_bytes();
        let expected_hex = hex::encode(expected);

        // Constant-time comparison
        if !constant_time_eq(signature_header.trim(), &expected_hex) {
            return Err(anyhow!("Strike webhook signature mismatch"));
        }

        let event: StrikeWebhookEvent = serde_json::from_slice(payload)?;
        Ok(event)
    }
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.bytes()
        .zip(b.bytes())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}
