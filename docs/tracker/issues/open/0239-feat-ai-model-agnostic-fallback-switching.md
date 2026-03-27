---
github_number: 229
title: "feat: AI model agnostic — fallback models, easy switching, reduce vendor dependency"
labels: [enhancement, ai, infrastructure]
milestone: ai-smart-features
---

## Description

The platform currently depends entirely on Anthropic Claude API for all AI features (Dr. Alex, Smart Import, lab analysis). This creates a single vendor dependency. We need model-agnostic architecture with fallback support.

### Requirements

1. **Model abstraction layer**
   - Define an `AiProvider` trait/interface that wraps chat completion
   - Current: `AnthropicProvider` (Claude Sonnet/Haiku)
   - Future: `OpenAIProvider`, `OllamaProvider` (local), `MistralProvider`
   - Configuration: select provider + model per feature (e.g., Smart Import uses Haiku, Dr. Alex uses Sonnet)

2. **Fallback chain**
   - Primary: Anthropic Claude Sonnet 4 (current)
   - Fallback 1: Anthropic Claude Haiku (cheaper, faster, for simple queries)
   - Fallback 2: OpenAI GPT-4o (if Anthropic is down)
   - Fallback 3: Local Ollama (for self-hosted/Start9 — no cloud dependency)
   - Auto-fallback on API errors (429 rate limit, 500 server error, timeout)

3. **Admin panel controls**
   - Select AI provider per feature (Dr. Alex, Smart Import, Lab Analysis)
   - Set fallback order
   - View provider health status
   - Cost comparison between providers

4. **Cost optimization**
   - Route simple queries (yes/no, status checks) to Haiku
   - Route complex analysis (trends, lab explanation) to Sonnet
   - Smart routing based on query complexity

### Architecture
```rust
pub trait AiProvider: Send + Sync {
    async fn chat(&self, messages: Vec<Message>, config: AiConfig) -> Result<String>;
    fn name(&self) -> &str;
    fn cost_per_1k_tokens(&self) -> (f64, f64); // (input, output)
}
```

### Files
- `api/src/services/doctor_chat.rs` — extract provider trait
- `api/src/services/ai/mod.rs` — NEW: provider abstraction
- `api/src/services/ai/anthropic.rs` — current Anthropic implementation
- `api/src/services/ai/openai.rs` — future OpenAI implementation
- `api/src/services/ai/ollama.rs` — future local model
- Admin panel: provider management UI
