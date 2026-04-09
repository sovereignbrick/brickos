use std::time::Instant;

use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use crate::error::AiError;
use crate::provider::{AiProvider, ChatResponse, InferenceConfig, Message};

const DEFAULT_BASE_URL: &str = "http://localhost:11434";
const DEFAULT_MODEL: &str = "llama3.2";
const DEFAULT_VISION_MODEL: &str = "llama3.2-vision:11b";

pub struct OllamaProvider {
    base_url: String,
    model: String,
    vision_model: String,
    client: Client,
}

impl OllamaProvider {
    pub fn new(base_url: String, model: String) -> Self {
        let base_url = if base_url.is_empty() {
            DEFAULT_BASE_URL.to_string()
        } else {
            base_url.trim_end_matches('/').to_string()
        };
        let model = if model.is_empty() {
            DEFAULT_MODEL.to_string()
        } else {
            model
        };
        Self {
            base_url,
            vision_model: DEFAULT_VISION_MODEL.to_string(),
            model,
            client: Client::new(),
        }
    }

    /// Check which models are available on the Ollama instance.
    pub async fn health_check(&self) -> Result<Vec<String>, AiError> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = self.client.get(&url).send().await?;
        let body: serde_json::Value = resp.json().await?;

        let models = body["models"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m["name"].as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }
}

#[async_trait]
impl AiProvider for OllamaProvider {
    fn name(&self) -> &str {
        "ollama"
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
        let url = format!("{}/v1/chat/completions", self.base_url);

        let mut api_messages: Vec<serde_json::Value> = Vec::with_capacity(messages.len() + 1);
        api_messages.push(json!({
            "role": "system",
            "content": system,
        }));
        for m in &messages {
            api_messages.push(json!({
                "role": m.role,
                "content": m.content,
            }));
        }

        let body = json!({
            "model": self.model,
            "messages": api_messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        });

        let resp = self
            .client
            .post(&url)
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
            return Err(AiError::Provider(format!("Ollama API {}: {}", status, msg)));
        }

        let content = resp_body["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let input_tokens = resp_body["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = resp_body["usage"]["completion_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            provider: "ollama".to_string(),
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
        let url = format!("{}/v1/chat/completions", self.base_url);

        let body = json!({
            "model": self.vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": system,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/png;base64,{}", image_base64),
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        }
                    ]
                }
            ],
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        });

        let resp = self
            .client
            .post(&url)
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
            return Err(AiError::Provider(format!("Ollama API {}: {}", status, msg)));
        }

        let content = resp_body["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let input_tokens = resp_body["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = resp_body["usage"]["completion_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
            model: self.vision_model.clone(),
            provider: "ollama".to_string(),
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }
}
