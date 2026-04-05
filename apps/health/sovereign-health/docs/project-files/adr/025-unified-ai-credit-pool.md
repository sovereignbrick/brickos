# ADR 025: Unified AI credit pool replacing per-feature quotas

**Status:** Accepted
**Date:** 2026-03-26
**Context:** Sprint 019 -- AI credit pool consolidation

## Context
The platform had 8 separate quota counters for AI features (chat_general, chat_trends, chat_labs, chat_diet, chat_supplements, chat_protocols, lab_import, med_import). Each feature had its own monthly limit per tier, tracked in `chat_agent_quota`. This created complexity in the tier matrix (8 columns), confusion for users ("Why can I chat but not import?"), and maintenance burden (every new AI feature needed a new quota column).

## Decision
Replace per-feature quotas with a single unified credit pool per user per month.

- New table `ai_credit_usage` tracks total credits used per month
- Credit costs: chat = 1, smart import = 2 (heavier compute)
- Pool ceiling = sum of all chat_* feature limits for the user's tier
- Single check function `check_ai_credits()` replaces 8 separate `check_chat_quota()` calls
- Dual-write to `chat_agent_quota` preserved for per-agent analytics
- Monthly reset via month_year partition (on-access, no cron needed)

## Alternatives Considered
- **Keep per-feature quotas:** Rejected -- too many columns, confusing UX, hard to explain to users
- **Token-based billing (actual API costs):** Rejected for now -- users don't understand tokens, credits are simpler. Cost tracking exists separately in `ai_usage_log` for admin visibility
- **Unlimited AI for all tiers:** Rejected -- need tier differentiation and cost control

## Consequences
- Simpler UX: users see one number ("12 credits remaining")
- Simpler code: one check function instead of 8
- Flexible: adding new AI features just means assigning a credit cost
- Trade-off: can't limit specific features independently (e.g., "5 imports but unlimited chat"). Mitigated by per-feature tier gating (feature can be enabled/disabled per tier independent of credits)
