---
number: 276
title: "fix: Dr. Alex chat blocked for Clarity user (helmut@schindlwick.com)"
labels: [fix, backend, doctor-chat, priority-critical, sprint-016, production]
milestone: health-intelligence
---

## Description

User helmut@schindlwick.com with Clarity tier license cannot start any Dr. Alex chat on production (app.sovereignhealth.io). Clarity tier should have unlimited AI credits.

## Expected Behavior

Clarity tier has unlimited AI credits -- all chat agents should be accessible without quota restrictions.

## Steps to Reproduce

1. Login as helmut@schindlwick.com on app.sovereignhealth.io
2. Go to Doctor Chat
3. Try to start any conversation
4. Chat is blocked (403 or quota error?)

## Investigation

- [ ] Check user_licenses: what tier_id is assigned?
- [ ] Check ai_credit_usage: is the pool exhausted despite unlimited tier?
- [ ] Check tier_features for clarity: are chat_* features included with NULL limit (unlimited)?
- [ ] Check if the new check_ai_credits() function correctly handles Clarity as unlimited
- [ ] Check if admin bypass removal (Sprint 014) accidentally broke something for this user
- [ ] Is the user's JWT stale with an old tier? (token may still say "glimpse" from before upgrade)

## Likely Causes

1. **Stale JWT** -- user upgraded to Clarity but JWT still has old tier. Need to re-login.
2. **tier_features missing clarity chat rows** -- the migration may not have included clarity entries for all chat features
3. **check_ai_credits pool calculation** -- if clarity chat features have NULL limit_value, the pool sum may compute as 0 instead of unlimited

## Urgency

CRITICAL -- paying customer on Clarity tier cannot use a core feature.
