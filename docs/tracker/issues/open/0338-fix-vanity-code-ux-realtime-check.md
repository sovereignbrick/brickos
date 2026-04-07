---
github_number: 338
title: "fix: vanity code UX - real-time availability check + edit existing code"
milestone: ux-and-onboarding
labels: [fix, P2]
---

## Problem

Three UX gaps in the vanity code flow on the affiliate page:

1. **No real-time availability check** while typing -- user submits, then gets error
2. **Cannot change existing vanity code** -- once saved, no update path
3. **Clarity tier false rejection** -- tier check may reject Clarity users incorrectly

## Requirements

1. Debounced availability check (300ms) while typing vanity code -- call `GET /api/affiliate/vanity/check?code=X` and show green/red indicator
2. Allow updating existing vanity code via `PUT /api/affiliate/me/vanity` (already supported by API, frontend doesn't expose it after first save)
3. Fix tier check: verify Clarity tier is included in allowed tiers for vanity codes

## Files

- `apps/health/sovereign-health/frontend/src/app/affiliate/page.tsx` -- vanity code input UI
- `apps/health/sovereign-health/api/src/handlers/affiliate.rs` -- `set_vanity`, `check_vanity`

## Blocked By

None (standalone fix)
