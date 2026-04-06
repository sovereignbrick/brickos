# AI Transparency -- Evidence Package

**Control:** AI usage logging, credit tracking, model identification
**Regimes:** AI Act Art. 52 (transparency for AI systems), GDPR Art. 13-14 (information provision)
**Last verified:** 2026-04-06
**Verification method:** Code audit

## Implementation

BrickOS uses Anthropic's Claude API for health data interpretation ("Doctor Chat"). Transparency is implemented at multiple levels:

1. **Usage Logging** -- Every AI interaction is logged to `ai_usage_log` with model name, token counts (input/output), session type, and calculated cost in EUR.
2. **Credit Tracking** -- AI usage is gated by a credit system managed via `tier_features` (SSoT) and `ai_credit_usage` table. Users can view their remaining credits.
3. **Model Identification** -- The model name (e.g., claude-sonnet-4-20250514) is recorded per interaction, enabling auditability of which AI model produced which output.
4. **Cost Calculation** -- Per-model pricing (Haiku/Sonnet/Opus tiers) is explicitly calculated and stored for billing transparency.
5. **Data Minimization** -- Health context sent to AI is limited to the last 360 days of measurements (200 max).

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| AI usage cost calculation | `apps/health/sovereign-health/api/src/services/ai_usage.rs` | L6-17 | Per-model pricing (Haiku, Sonnet, Opus) |
| AI usage logging | `apps/health/sovereign-health/api/src/services/ai_usage.rs` | L19-40 | INSERT into ai_usage_log with model, tokens, cost |
| Health context builder | `apps/health/sovereign-health/api/src/services/doctor_chat.rs` | L34-60 | Builds AI context from last 360 days, 200 measurements max |
| Credit system (SSoT) | `apps/health/sovereign-health/api/src/services/tier.rs` | -- | check_ai_credits(), consume_ai_credits(), get_ai_credit_status() |
| AI credit design | `apps/health/sovereign-health/docs/project-files/adr/025-unified-ai-credit-pool.md` | -- | Unified credit pool across agents |

## Test References

| Test | File | Assertion |
|---|---|---|
| Tier AI credit tests | `apps/health/sovereign-health/api/tests/tier_test.rs` | Credit consumption and limit enforcement |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-013 | Anthropic API (Dr. Alex) | Decision to use Claude for health analysis, data handling |
| ADR-025 | Unified AI Credit Pool | Credit system design, per-agent quotas |

## Automated Verification

```bash
# Verify AI usage logging
cargo test -p sovereign-health-api -- ai_usage

# Check ai_usage_log is populated (staging)
psql -c "SELECT model, COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(cost_eur) FROM ai_usage_log GROUP BY model" sovereign_health
```

## Manual Verification Steps

1. Send a Doctor Chat message -- verify `ai_usage_log` entry created with correct model name
2. Check credit balance before and after AI interaction -- verify credits consumed
3. Verify the AI response does not claim to be a doctor or provide medical diagnoses
4. Export user data (JSON) -- verify AI chat conversations are included
