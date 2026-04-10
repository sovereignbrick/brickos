// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

//! HTTP client for Sovereign Link's service API (#385).
//!
//! Replaces direct SQL INSERTs into `short_links` with HTTP calls to the
//! Sovereign Link service (sli-api), which now owns that table in its own
//! database.
//!
//! Config env vars:
//! - `SLI_API_URL`  -- base URL, default `http://localhost:8083`
//! - `SLI_API_KEY`  -- service account API key (Bearer token)

use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct LinkServiceConfig {
    pub base_url: String,
    pub api_key: String,
}

impl LinkServiceConfig {
    pub fn from_env() -> Self {
        Self {
            base_url: std::env::var("SLI_API_URL")
                .unwrap_or_else(|_| "http://localhost:8083".to_string()),
            api_key: std::env::var("SLI_API_KEY").unwrap_or_default(),
        }
    }

    /// Returns true when the service account key is configured.
    pub fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
}

// ---------------------------------------------------------------------------
// Request / response types (mirror SLI service API)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct CreateLinkRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
    target_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    link_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    app_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    owner_user_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
}

/// Minimal response -- we only need the code back.
#[derive(Debug, Deserialize)]
pub struct LinkResponse {
    pub code: String,
    #[allow(dead_code)]
    pub id: Option<Uuid>,
}

/// Error body from SLI.
#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: String,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// Create an affiliate vanity short link via SLI's service API.
///
/// Returns the link code on success or an error description.
/// Callers should treat errors as non-fatal (log and continue).
pub async fn create_vanity_link(
    config: &LinkServiceConfig,
    code: &str,
    target_url: &str,
    owner_user_id: Uuid,
) -> Result<String, String> {
    if !config.is_configured() {
        return Err("SLI_API_KEY not configured".to_string());
    }

    let body = CreateLinkRequest {
        code: Some(code.to_string()),
        target_url: target_url.to_string(),
        link_type: Some("vanity".to_string()),
        domain: Some("health".to_string()),
        app_key: Some("sovereign-health".to_string()),
        owner_user_id: Some(owner_user_id),
        title: Some(code.to_string()),
    };

    call_create(config, &body).await
}

/// Create a campaign short link via SLI's service API.
///
/// Returns the link code on success or an error description.
pub async fn create_campaign_link(
    config: &LinkServiceConfig,
    code: &str,
    target_url: &str,
    title: Option<&str>,
) -> Result<String, String> {
    if !config.is_configured() {
        return Err("SLI_API_KEY not configured".to_string());
    }

    let body = CreateLinkRequest {
        code: Some(code.to_string()),
        target_url: target_url.to_string(),
        link_type: Some("campaign".to_string()),
        domain: Some("health".to_string()),
        app_key: Some("sovereign-health".to_string()),
        owner_user_id: None,
        title: title.map(|s| s.to_string()),
    };

    call_create(config, &body).await
}

/// Internal helper: POST to SLI service API.
async fn call_create(
    config: &LinkServiceConfig,
    body: &CreateLinkRequest,
) -> Result<String, String> {
    let url = format!(
        "{}/api/v1/service/links",
        config.base_url.trim_end_matches('/')
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("HTTP client build error: {e}"))?;

    let resp = client
        .post(&url)
        .bearer_auth(&config.api_key)
        .json(body)
        .send()
        .await
        .map_err(|e| format!("SLI request failed: {e}"))?;

    let status = resp.status();

    if status.is_success() {
        let link: LinkResponse = resp
            .json()
            .await
            .map_err(|e| format!("SLI response parse error: {e}"))?;
        Ok(link.code)
    } else {
        let err_text = match resp.json::<ErrorResponse>().await {
            Ok(e) => e.error,
            Err(_) => format!("HTTP {status}"),
        };
        Err(err_text)
    }
}
