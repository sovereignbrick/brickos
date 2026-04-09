# ADR-045: Shared brickos-ai Crate with Ollama Fallback

**Status:** Proposed
**Date:** 2026-04-09

## Context

Sovereign Health currently hardcodes Anthropic Claude API calls in `call_claude()` and `call_claude_vision()` functions. An `AiProviderManager` skeleton was introduced in v0.40.0 (#359) but is not wired into actual handlers.

As new apps join the ecosystem (CRM needs email extraction and meeting transcription, Voice needs content generation), each would need to independently implement AI provider integration. This duplicates:

- API key management and encryption
- Provider fallback logic
- Usage tracking and cost accounting
- Ollama/self-hosted configuration

Meanwhile, the platform vision (Design 017, #337, #239) calls for AI-agnostic provider settings configurable at both platform and organization levels, with Ollama as the sovereign fallback for zero cloud dependency.

## Decision

Create a shared `brickos-ai` crate at `crates/brickos-ai/` that provides:

1. **`AiProvider` trait** -- implemented by each backend (Anthropic, OpenAI, Ollama)
2. **`AiProviderManager`** -- tries providers in priority order with automatic failover (3 failures in 5 minutes triggers skip to next provider, recovery check every 5 minutes)
3. **Platform-level configuration** -- reads provider chain from `brickos.app_settings` table
4. **Org-level override** -- organizations can select their preferred provider
5. **Usage logging** -- writes to `brickos.ai_usage_log` with provider, model, tokens, cost per request

### Default fallback chain

1. Anthropic Claude Sonnet (cloud, best quality)
2. OpenAI GPT-4o (cloud, alternative)
3. Ollama llama3.2 (local, sovereign, zero cloud dependency)

### Ollama specifics

- Connects to Ollama's OpenAI-compatible `/v1/chat/completions` endpoint
- Default base URL: `BRICKOS_OLLAMA_BASE_URL` (default `http://localhost:11434`)
- Default model: `BRICKOS_OLLAMA_MODEL` (default `llama3.2`)
- Vision support: `llama3.2-vision:11b` for image extraction
- Health check: `GET /api/tags` to verify availability
- No API key needed (local)

### Why Ollama as platform-level fallback

- **Data sovereignty:** Conversations stay on-premise when Ollama handles requests
- **EU compliance:** On-prem Ollama means no US API calls (GDPR/NIS2)
- **Cost control:** Shifts to self-hosted compute cost after cloud provider failures
- **Start9 compatibility:** Ollama runs on Start9, enabling fully sovereign AI for self-hosted users
- **Graceful degradation:** Quality may be lower than Claude but functionality is preserved

## Alternatives Considered

- **Keep AI hardcoded per app:** Each app manages its own Anthropic integration. Simple but duplicates provider management, fallback logic, and cost tracking across every app. No path to Ollama or org-level configuration.

- **AI via platform-api only:** All AI requests go through `POST /platform/api/v1/ai/chat` on the platform API (port 9000). Centralizes configuration but adds latency, creates a single point of failure for AI features, and complicates streaming responses.

- **External AI gateway (LiteLLM, etc.):** Use a third-party proxy that handles provider routing. Adds an infrastructure dependency, operational complexity, and doesn't integrate with BrickOS org/tier/billing model.

## Consequences

**Easier:**
- New apps get AI from day one: `brickos_ai::AiProviderManager::from_settings(pool, app_key)`
- SHI can migrate incrementally: replace `call_claude()` with `manager.chat()` one handler at a time
- Single place to configure Ollama for the entire platform
- Cost tracking per provider, per app, per org -- unified in one table
- Org admins can choose "Ollama only" for maximum sovereignty

**Harder:**
- New shared crate to maintain alongside 8 existing brickos-* crates
- Provider trait must be general enough for chat + vision + future modalities
- SHI migration is a separate sprint (not part of CRM foundation)
- Ollama quality for medical/health AI may not meet Dr. Alex standards (requires evaluation)
