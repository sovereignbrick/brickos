---
github_number: 301
title: "feat: Unified AI credit pool (replace per-feature counters)"
milestone: ai-smart-features
labels: [enhancement, sprint-023, app:health, ai, backend]
points: 5
---

## Description
Replace 8 separate `check_chat_quota()` calls with a single unified AI credit pool per tier.

## Sub-tasks
- [ ] Migration: add `ai_credits_monthly` to license_tiers, `ai_credits_used` to tracking
- [ ] Replace 8 `check_chat_quota()` calls with single `check_ai_credit(cost)`
- [ ] Credit costs: chat = 1, smart import = 2, trend analysis = 1
- [ ] Show credits remaining in Dr. Alex UI
- [ ] Monthly reset (cron or on-access check)
- [ ] Update website feature table
- [ ] Keep old columns during transition

## Blocks
- #302 AI cost tracking
- #303 Dr. Alex document analysis design
