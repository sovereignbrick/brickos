use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tracing::{info, warn};

use crate::anthropic::AnthropicProvider;
use crate::error::AiError;
use crate::ollama::OllamaProvider;
use crate::provider::{AiProvider, ChatResponse, InferenceConfig, Message};

const MAX_FAILURES: u32 = 3;
const FAILURE_WINDOW: Duration = Duration::from_secs(300);

pub struct AiProviderManager {
    providers: Vec<Box<dyn AiProvider>>,
    failures: Mutex<HashMap<String, (u32, Instant)>>,
}

impl AiProviderManager {
    pub fn new(providers: Vec<Box<dyn AiProvider>>) -> Self {
        Self {
            providers,
            failures: Mutex::new(HashMap::new()),
        }
    }

    /// Build a manager from environment variables.
    ///
    /// - `ANTHROPIC_API_KEY` -- adds Anthropic as a provider
    /// - `BRICKOS_OLLAMA_BASE_URL` -- adds Ollama as a provider (defaults to localhost)
    pub fn from_env() -> Self {
        let mut providers: Vec<Box<dyn AiProvider>> = Vec::new();

        if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
            if !api_key.is_empty() {
                let model = std::env::var("ANTHROPIC_MODEL").unwrap_or_default();
                info!("AI provider configured: anthropic");
                providers.push(Box::new(AnthropicProvider::new(api_key, model)));
            }
        }

        let ollama_url = std::env::var("BRICKOS_OLLAMA_BASE_URL").unwrap_or_default();
        if !ollama_url.is_empty() {
            let model = std::env::var("BRICKOS_OLLAMA_MODEL").unwrap_or_default();
            info!("AI provider configured: ollama at {}", ollama_url);
            providers.push(Box::new(OllamaProvider::new(ollama_url, model)));
        }

        Self::new(providers)
    }

    fn is_provider_available(&self, name: &str) -> bool {
        let failures = self.failures.lock().unwrap();
        if let Some((count, first_failure)) = failures.get(name) {
            if *count >= MAX_FAILURES && first_failure.elapsed() < FAILURE_WINDOW {
                return false;
            }
        }
        true
    }

    fn record_failure(&self, name: &str) {
        let mut failures = self.failures.lock().unwrap();
        let entry = failures
            .entry(name.to_string())
            .or_insert((0, Instant::now()));

        // Reset window if expired
        if entry.1.elapsed() >= FAILURE_WINDOW {
            *entry = (1, Instant::now());
        } else {
            entry.0 += 1;
        }
    }

    fn record_success(&self, name: &str) {
        let mut failures = self.failures.lock().unwrap();
        failures.remove(name);
    }

    pub async fn chat(
        &self,
        system: &str,
        messages: Vec<Message>,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError> {
        let mut last_error = None;

        for provider in &self.providers {
            if !self.is_provider_available(provider.name()) {
                warn!(
                    "Skipping provider {} (circuit breaker open)",
                    provider.name()
                );
                continue;
            }

            match provider.chat(system, messages.clone(), config).await {
                Ok(response) => {
                    self.record_success(provider.name());
                    return Ok(response);
                }
                Err(e) => {
                    warn!("Provider {} failed: {}", provider.name(), e);
                    self.record_failure(provider.name());
                    last_error = Some(e);
                }
            }
        }

        Err(last_error.unwrap_or(AiError::AllProvidersFailed))
    }

    pub async fn vision(
        &self,
        system: &str,
        image_base64: &str,
        prompt: &str,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError> {
        let mut last_error = None;

        for provider in &self.providers {
            if !self.is_provider_available(provider.name()) {
                warn!(
                    "Skipping provider {} (circuit breaker open)",
                    provider.name()
                );
                continue;
            }

            if !provider.supports_vision() {
                continue;
            }

            match provider.vision(system, image_base64, prompt, config).await {
                Ok(response) => {
                    self.record_success(provider.name());
                    return Ok(response);
                }
                Err(e) => {
                    warn!("Provider {} vision failed: {}", provider.name(), e);
                    self.record_failure(provider.name());
                    last_error = Some(e);
                }
            }
        }

        Err(last_error.unwrap_or(AiError::AllProvidersFailed))
    }
}
