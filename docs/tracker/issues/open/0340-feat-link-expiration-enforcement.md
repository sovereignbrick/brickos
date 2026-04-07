---
github_number: 340
title: "feat: link expiration enforcement with redirect to main domain"
milestone: infrastructure
labels: [feat, P2]
---

## Problem

The `short_links` table has an `expires_at` column but there is no enforcement:
- Expired links still redirect to the target URL
- No cleanup job to deactivate expired links
- No user feedback that a link has expired

## Requirements

### Redirect Behavior
1. When a redirect request hits an expired link, return **301 redirect to the org's main domain** (or brickos.io for platform links)
2. Show no error page -- seamless redirect to the org/platform home

### Enforcement
1. **Hot path check**: In `redirect.rs`, after looking up the link, check `expires_at < now()` and redirect to main domain instead of target
2. **Cleanup cron**: Optional background job that sets `is_active = false` on expired links (optimization for the fast-path prefix lookup)

### Admin UI
1. Show expiration status in link list (expired badge)
2. Allow setting/changing expiration date when creating/editing links

## Files

- `apps/technology/sovereign-link/src/handlers/redirect.rs` -- add expiration check
- `apps/technology/sovereign-link/src/db/postgres.rs` -- add expiration filter to queries
- `apps/technology/sovereign-link/src/handlers/org_admin.rs` -- expired badge in admin

## Blocked By

None
