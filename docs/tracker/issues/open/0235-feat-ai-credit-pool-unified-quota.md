---
github_number: 233
title: "feat: unified AI credit pool instead of per-feature chat limits"
labels: [enhancement, ai, dr-alex]
milestone: ai-smart-features
---

## Problem

Currently, AI usage is tracked per chat type:
- `chat_general_monthly` (Ask Dr. Alex)
- `chat_trends_monthly` (Analyze My Trends)
- `chat_labs_monthly` (Explain My Lab Results)
- `chat_diet_monthly` (Diet & Nutrition)
- `chat_supplements_monthly` (Supplement Review)
- `chat_protocols_monthly` (Compare Protocols)
- `chat_lab_import_monthly` (Smart Import: Lab)
- `chat_med_import_monthly` (Smart Import: Medication)

This creates 8 separate counters per user per month. Users get confused: "I have 5 general chats left but 0 diet chats — why can't I ask about food?"

## Proposed: Unified AI Credit Pool

Replace 8 counters with a single pool:

| Tier | Monthly AI Credits |
|------|-------------------|
| Glimpse | 5 |
| Focus | 20 |
| Insight | 60 |
| Clarity | Unlimited |
| Horizon | Unlimited |

Each action consumes credits:
- Chat message (any type): 1 credit
- Smart Import (lab/med/table): 2 credits
- Trend analysis: 1 credit

### Benefits
- Simpler for users to understand
- Simpler pricing page (1 row instead of 8)
- Users choose how to spend their credits
- Easier to add new AI features without new columns

### Implementation
1. Add `ai_credits_monthly` column to `license_tiers`
2. Add `ai_credits_used` counter to `users` (reset monthly by cron)
3. Replace 8 `check_chat_quota()` calls with single `check_ai_credit()`
4. Update website feature table — collapse AI section to 1 pool row + feature list
5. Show credits remaining in Dr. Alex UI

### Migration Path
- Keep per-feature columns for backwards compatibility during transition
- New `ai_credits_monthly` takes precedence when set
- Remove old columns in a later sprint

## Files
- `api/src/services/tier.rs` — add credit pool check
- `api/src/handlers/doctor_chat.rs` — use pool instead of per-type
- `api/migrations/` — add ai_credits columns
- `frontend/src/components/doctor-chat/` — show credits
- Website content — simplify AI section
