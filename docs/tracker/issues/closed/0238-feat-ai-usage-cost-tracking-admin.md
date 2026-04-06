---
github_number: 230
title: "feat: AI usage cost tracking — per-user, per-feature, with actual API costs"
labels: [enhancement, ai, admin]
milestone: ai-smart-features
---

## Description

Track how often each licensed AI feature is used and what it costs us in terms of Anthropic API usage. The admin panel already has a basic AI usage section but needs updating for the new feature structure.

### Requirements

1. **Per-user usage tracking**
   - How many Dr. Alex consultations per user per month
   - Breakdown by feature: health questions, trends, labs, nutrition, smart imports
   - Pool usage percentage (e.g., "User X used 8 of 10 credits")

2. **Cost tracking**
   - Track Anthropic API tokens consumed per request (input + output)
   - Calculate cost per request using current pricing ($3/MTok input, $15/MTok output for Sonnet)
   - Aggregate: cost per user, cost per feature, cost per tier
   - Monthly cost report for business planning

3. **Admin panel updates**
   - Dashboard widget: total AI costs this month, average cost per user
   - User detail: AI usage history with cost breakdown
   - Feature breakdown: which AI features are most used / most expensive
   - Alert: flag users with unusually high usage (abuse detection)

4. **Existing infrastructure to extend**
   - `ai_usage_log` table (already exists — stores token counts)
   - Admin AI usage handler (`handlers/admin_ai_usage.rs`)
   - Frontend admin AI tab

### Business Value
- Understand unit economics (cost per user by tier)
- Identify which features drive AI costs
- Inform pricing decisions (are Glimpse users profitable at 10 credits?)
- Detect abuse patterns early
