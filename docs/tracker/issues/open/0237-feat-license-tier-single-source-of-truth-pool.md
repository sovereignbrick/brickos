---
number: 237
title: "feat: consolidate license tier table as single source of truth + implement AI pool counting"
labels: [enhancement, licensing, ai]
milestone: infrastructure
---

## Description

The feature-details table (`product_features` + `tier_features`) is now the most complete and up-to-date source of tier information. However, the app still enforces limits from `license_tiers` columns (e.g., `chat_general_monthly`, `chat_trends_monthly`). These two systems need consolidation.

### Part 1: Single Source of Truth
- `product_features` + `tier_features` tables should be THE source for both website display AND app enforcement
- Remove redundant per-chat-type columns from `license_tiers` (8 separate columns)
- App reads limits from `tier_features` instead of `license_tiers` columns
- Website and app always show the same numbers

### Part 2: AI Pool Counting
Implement the Dr. Alex consultation pool as defined in Sprint 013:
- Glimpse: 10/month, Focus: 25/month, Insight: 50/month, Clarity: 100/month, Horizon: unlimited
- Every AI interaction (chat, trend analysis, lab explanation, nutrition, smart import) subtracts 1 from the pool
- Pool resets on the 1st of each month (cron job or lazy reset on first use)
- Show remaining credits in Dr. Alex UI: "You have 7 of 10 consultations remaining this month"
- Toast warning at 80% usage: "You have 2 consultations remaining"

### Implementation
1. Add `ai_credits_monthly` to `license_tiers` (or read from `tier_features`)
2. Add `ai_credits_used` + `ai_credits_reset_at` to `users` table
3. Replace 8 `check_chat_quota()` calls with single `check_ai_credit(pool, user)`
4. Add credit display to Dr. Alex chat header
5. Cron or lazy reset: if `ai_credits_reset_at < start_of_month`, reset counter

### Files
- `api/src/services/tier.rs` — pool check logic
- `api/src/handlers/doctor_chat.rs` — use pool
- `api/src/handlers/import.rs` — use pool for smart imports
- `frontend/src/components/doctor-chat/` — show credits remaining
- Migration: add pool columns
