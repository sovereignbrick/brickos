# brickos-ai

Shared AI crate for BrickOS applications. Provides a unified interface to multiple AI providers with automatic failover.

## Architecture

```
AiProviderManager
    |-- AnthropicProvider (cloud)
    |-- OllamaProvider   (on-prem)
```

### AiProvider Trait

All providers implement `AiProvider` with methods for:
- Text completion
- Vision (image-to-text extraction)
- Structured extraction (JSON output)

### AiProviderManager

Manages a failover chain of providers. If the primary provider fails (rate limit, timeout, network error), the manager automatically retries with the next provider.

## Default Models

| Provider | Task | Model |
|----------|------|-------|
| Anthropic | Text + Vision | claude-sonnet-4 |
| Ollama | Text | qwen2.5:1.5b |
| Ollama | Vision | moondream |

## Usage

```rust
use brickos_ai::AiProviderManager;

// Configure from environment variables:
//   ANTHROPIC_API_KEY, OLLAMA_BASE_URL
let manager = AiProviderManager::from_env();

// Text completion
let response = manager.complete("Summarize this meeting transcript: ...").await?;

// Vision extraction (business card photo)
let contact = manager.extract_from_image(image_bytes, "Extract contact info as JSON").await?;
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Anthropic API key (enables cloud provider) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (enables on-prem provider) |

At least one provider must be configured.
