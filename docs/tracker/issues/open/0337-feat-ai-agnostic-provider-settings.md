---
github_number: 337
title: "feat: AI-agnostic provider settings - org and platform level configuration"
milestone: platform-extraction
labels: [feat, P2]
---

## Vision

Make the AI provider (currently Anthropic/Claude for Dr. Alex) configurable at two levels:

1. **Platform level** (BrickOS admin): Set default AI provider, model, and parameters for all organizations
2. **Organization level** (org admin): Override AI provider for their own organization

This enables:
- Testing different AI providers (OpenAI, Anthropic, local models, Ollama)
- Organizations choosing their preferred provider based on compliance, cost, or preference
- Self-hosted deployments using local LLMs
- A/B testing different models

## Requirements

### Settings Schema

```
ai_settings:
  provider: anthropic | openai | ollama | custom
  model: claude-sonnet-4 | gpt-4o | llama3 | ...
  api_key: (encrypted, per-org or platform)
  base_url: (for custom/ollama endpoints)
  temperature: 0.7
  max_tokens: 4096
  system_prompt_override: (optional, org-level)
```

### Admin UI

- BrickOS Admin > Platform Settings > AI Configuration
  - Set default provider + model for all orgs
  - Set fallback behavior if org provider fails
- Org Admin > Settings > AI Configuration
  - Override provider + model for this org
  - Test connection button
  - Usage stats (tokens, cost estimate)

### Backend

- Abstract AI provider interface (trait) in Rust
- Provider implementations: Anthropic, OpenAI, Ollama
- Settings stored in `brickos.app_settings` or new `ai_provider_config` table
- API key encryption (AES-256-GCM, same as other secrets)
- Graceful fallback: if org provider fails, fall back to platform default

### EU AI Act Compliance

- Each provider config must declare risk classification
- Transparency notice must update dynamically based on active provider
- `/health` endpoint already shows AI system info -- must reflect actual provider
