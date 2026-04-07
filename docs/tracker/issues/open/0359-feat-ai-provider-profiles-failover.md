---
github_number: 359
title: "feat: AI provider profiles with automatic failover"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Configurable AI provider profiles (Default, Failover, Self-hosted) with automatic switching on failure. Org-level overrides.

## Requirements

### Profiles

- Default: Anthropic/Claude Sonnet 4 (current)
- Failover: OpenAI/GPT-4o (activates after 3 failures in 5min)
- Self-hosted: Ollama/Llama 3 (for on-prem orgs)
- Each profile: provider, model, API key (encrypted), base URL, temperature, max tokens

### Failover Logic

- Track failure count per provider (rolling 5min window)
- After 3 failures: switch to failover profile, notify ntfy + telegram
- Auto-recover: check default every 5min, switch back when healthy
- If failover also fails: queue requests (return "AI temporarily unavailable")

### Org Overrides

- Org admin (tech admin) can select which profile their org uses
- BrickOS admin can force a profile per org
- Test connection button per profile

### EU AI Act

- Transparency notice auto-updates based on active provider
- `/health` endpoint reflects current active provider

## Testing

- Failover trigger test (mock 3 consecutive failures)
- Auto-recovery test
- Org override test
- Concurrent request test during failover switch

## Blocked By

- #0346 (admin layout)
