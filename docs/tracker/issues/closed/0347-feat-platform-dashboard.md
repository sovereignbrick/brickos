---
github_number: 347
title: "feat: platform dashboard home page"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

The admin landing page showing platform-wide or org-scoped metrics at a glance.

## BrickOS Admin View

- Stat cards: Total users, verified, active (7d/30d), signups (7d), measurements, orgs, MRR
- Platform license tier distribution bar chart
- Service health matrix (prod + staging, response time, uptime %)
- Translation status bars (EN, DE)
- Recent activity feed (deploys, signups, NOSTR publishes)

## Org Admin View (filtered)

- Stat cards: Members, active (7d), links, clicks
- Enabled apps list with stats per app
- Recent member activity feed

## Technical

- API: `GET /admin/dashboard` (existing, extend with org scope)
- Recharts for tier distribution + mini charts
- Auto-refresh every 60s (SWR revalidation)

## Error Handling

- Service health: graceful degradation if a health endpoint is unreachable (show "unknown" not error)
- API timeout: show stale data with "last updated X ago" indicator

## Testing

- Snapshot tests for both admin views
- Mock API responses for unit tests

## Blocked By

- #0346 (admin layout)
