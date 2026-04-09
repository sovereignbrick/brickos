use std::time::Instant;

use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use crate::error::AiError;
use crate::provider::{AiProvider, ChatResponse, InferenceConfig, Message};

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL: &str = "claude-sonnet-4-20250514";

pub struct AnthropicProvider {
    api_key: String,
    model: String,
    client: Client,
}

impl AnthropicProvider {
    pub fn new(api_key: String, model: String) -> Self {
        let model = if model.is_empty() {
            DEFAULT_MODEL.to_string()
        } else {
            model
        };
        Self {
            api_key,
            model,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AiProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }

    fn model(&self) -> &str {
        &self.model
    }

    fn supports_vision(&self) -> bool {
        true
    }

    async fn chat(
        &self,
        system: &str,
        messages: Vec<Message>,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError> {
        let start = Instant::now();

        let api_messages: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                json!({
                    "role": m.role,
                    "content": m.content,
                })
            })
            .collect();

        let body = json!({
            "model": self.model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "system": system,
            "messages": api_messages,
        });

        let resp = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        let resp_body: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let msg = resp_body["error"]["message"]
                .as_str()
                .unwrap_or("unknown error");
            return Err(AiError::Provider(format!(
                "Anthropic API {}: {}",
                status, msg
            )));
        }

        let content = resp_body["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let input_tokens = resp_body["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = resp_body["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            provider: "anthropic".to_string(),
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }

    async fn vision(
        &self,
        system: &str,
        image_base64: &str,
        prompt: &str,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError> {
        let start = Instant::now();

        // Detect media type from base64 header bytes
        let media_type = if image_base64.starts_with("/9j/") {
            "image/jpeg"
        } else if image_base64.starts_with("iVBOR") {
            "image/png"
        } else if image_base64.starts_with("UklGR") {
            "image/webp"
        } else {
            "image/jpeg" // default to JPEG (most common from cameras)
        };

        let body = json!({
            "model": self.model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "system": system,
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    }
                ]
            }],
        });

        let resp = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        let resp_body: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let msg = resp_body["error"]["message"]
                .as_str()
                .unwrap_or("unknown error");
            return Err(AiError::Provider(format!(
                "Anthropic API {}: {}",
                status, msg
            )));
        }

        let content = resp_body["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let input_tokens = resp_body["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = resp_body["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            provider: "anthropic".to_string(),
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }
}
