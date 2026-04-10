---
number: 413
github_number: 535
title: "feat: brickos-ai crate -- AiProvider trait, Anthropic + Ollama impls, fallback manager"
milestone: "BrickOS Platform API"
labels: [platform-elevation, ai, shared-crate]
created: 2026-04-09
sprint: 036
points: 5
blocked_by: []
---

Extract AI provider logic into a shared platform crate at `crates/brickos-ai/` that any BrickOS app can import. Implements the vision from #337 and #239.

## Problem

Today SHI hardcodes `call_claude()` with Anthropic API keys. The `AiProviderManager` skeleton exists (v0.40.0, #359) but lives inside SHI and isn't wired into actual handlers. Every new app (CRM, Voice, Almanac) would need to duplicate this logic.

## Solution

A shared crate with a trait-based abstraction and built-in fallback chain.

## Crate Structure

```
crates/brickos-ai/
  src/
    lib.rs          -- public API, re-exports
    provider.rs     -- AiProvider trait + ChatRequest/ChatResponse types
    anthropic.rs    -- AnthropicProvider impl
    ollama.rs       -- OllamaProvider impl
    openai.rs       -- OpenAiProvider impl (optional, feature-gated)
    manager.rs      -- AiProviderManager with fallback logic
    config.rs       -- Load provider config from app_settings table
    usage.rs        -- AI usage logging helper (ai_usage_log INSERT)
    error.rs        -- AiError enum
  Cargo.toml
```

## AiProvider Trait

```rust
#[async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;                    // "anthropic", "ollama", "openai"
    fn model(&self) -> &str;                   // "claude-sonnet-4", "llama3.2", "gpt-4o"
    fn supports_vision(&self) -> bool;
    fn cost_per_1k_tokens(&self) -> (f64, f64); // (input_eur, output_eur)

    async fn chat(
        &self,
        system: &str,
        messages: Vec<Message>,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError>;

    async fn vision(
        &self,
        system: &str,
        image_data: &[u8],
        prompt: &str,
        config: &InferenceConfig,
    ) -> Result<ChatResponse, AiError>;
}

pub struct InferenceConfig {
    pub temperature: f32,       // default 0.7
    pub max_tokens: u32,        // default 4096
    pub stop_sequences: Vec<String>,
}

pub struct ChatResponse {
    pub content: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub model: String,
    pub provider: String,
    pub latency_ms: u64,
}
```

## AiProviderManager (Fallback Chain)

```rust
pub struct AiProviderManager {
    providers: Vec<ProviderEntry>,  // sorted by priority
    failure_tracker: DashMap<String, FailureState>,
}

struct ProviderEntry {
    priority: u32,
    provider: Arc<dyn AiProvider>,
}

struct FailureState {
    count: u32,
    first_failure: Instant,
    // Skip provider if 3+ failures within 5 minutes
}

impl AiProviderManager {
    /// Try providers in priority order. On failure, record and try next.
    pub async fn chat(...) -> Result<ChatResponse, AiError>;

    /// Same for vision requests
    pub async fn vision(...) -> Result<ChatResponse, AiError>;

    /// Check if a failed provider has recovered (call every 5min)
    pub async fn check_recovery(&self);

    /// Build from app_settings config
    pub async fn from_settings(pool: &PgPool, app_key: &str, org_id: Option<Uuid>) -> Self;
}
```

## Ollama Implementation

```rust
pub struct OllamaProvider {
    base_url: String,           // default http://localhost:11434
    model: String,              // default llama3.2
    vision_model: String,       // default llama3.2-vision:11b
    client: reqwest::Client,
}

impl OllamaProvider {
    /// Uses Ollama's OpenAI-compatible endpoint: POST /v1/chat/completions
    /// No API key needed (local)
    /// Health check: GET /api/tags (lists available models)

    pub async fn health_check(&self) -> Result<Vec<String>, AiError>;
    // Returns list of available model names
}
```

## Platform Configuration (app_settings)

```sql
-- Platform-level default (org_id IS NULL)
INSERT INTO brickos.app_settings (app_key, setting_key, setting_value)
VALUES ('_platform', 'ai_provider_config', '{
    "providers": [
        { "provider": "anthropic", "model": "claude-sonnet-4", "priority": 1,
          "api_key_ref": "ANTHROPIC_API_KEY" },
        { "provider": "openai", "model": "gpt-4o", "priority": 2,
          "api_key_ref": "OPENAI_API_KEY" },
        { "provider": "ollama", "model": "llama3.2", "priority": 3,
          "base_url": "http://localhost:11434" }
    ],
    "failover_threshold": 3,
    "failover_window_secs": 300,
    "recovery_check_secs": 300
}');

-- Org-level override (optional)
INSERT INTO brickos.app_settings (app_key, org_id, setting_key, setting_value)
VALUES ('sovereign-crm', '...org-uuid...', 'ai_provider_config', '{
    "providers": [
        { "provider": "ollama", "model": "mistral", "priority": 1,
          "base_url": "http://ollama.internal:11434" }
    ]
}');
```

## Usage Logging

```rust
/// Log AI usage to brickos.ai_usage_log (platform DB)
pub async fn log_usage(
    platform_pool: &PgPool,
    user_id: Uuid,
    app_key: &str,      // "sovereign-crm", "sovereign-health", etc.
    provider: &str,      // "anthropic", "ollama"
    model: &str,
    session_type: &str,  // "doctor_chat", "email_extraction", "meeting_summary"
    input_tokens: u32,
    output_tokens: u32,
    cost_eur: f64,
) -> Result<(), sqlx::Error>;
```

## Cargo.toml

```toml
[package]
name = "brickos-ai"
version = "0.1.0"
edition = "2021"
description = "AI provider abstraction for BrickOS -- Anthropic, Ollama, OpenAI with fallback"
license = "AGPL-3.0"

[features]
default = ["anthropic", "ollama"]
anthropic = []
ollama = []
openai = []  # opt-in

[dependencies]
reqwest = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
async-trait = "0.1"
thiserror = "2"
dashmap = "6"
uuid = { workspace = true }
chrono = { workspace = true }
sqlx = { workspace = true }  # for app_settings + usage logging
base64 = "0.22"              # for vision image encoding
```

## Acceptance Criteria

- `cargo build -p brickos-ai` compiles
- `cargo test -p brickos-ai` passes
- AnthropicProvider sends chat request and parses response
- OllamaProvider connects to local Ollama and sends chat request
- AiProviderManager tries fallback chain on failure
- `from_settings()` loads config from app_settings table
- `log_usage()` writes to ai_usage_log
- SHI can import `brickos-ai` without changing its current behavior (backward compat)

## Migration Path for SHI

Not in this sprint, but the plan:
1. Add `brickos-ai = { workspace = true }` to SHI's Cargo.toml
2. Replace `call_claude()` with `manager.chat()`
3. Replace `call_claude_vision()` with `manager.vision()`
4. Remove hardcoded Anthropic config from SHI's config.rs
5. AI provider config moves to app_settings table
