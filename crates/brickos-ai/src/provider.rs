use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct InferenceConfig {
    pub temperature: f32,
    pub max_tokens: u32,
}

impl Default for InferenceConfig {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 4096,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub model: String,
    pub provider: String,
    pub latency_ms: u64,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    fn model(&self) -> &str;
    fn supports_vision(&self) -> bool;

    async fn chat(
        &self,
        system: &str,
        messages: Vec<Message>,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, crate::error::AiError>;

    async fn vision(
        &self,
        system: &str,
        image_base64: &str,
        prompt: &str,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, crate::error::AiError>;
}
