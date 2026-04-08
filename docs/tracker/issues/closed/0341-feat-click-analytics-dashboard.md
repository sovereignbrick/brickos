---
github_number: 341
title: "feat: click analytics dashboard for org admin and platform admin"
milestone: infrastructure
labels: [feat, P1]
---

## Overview

Add visual click analytics dashboards at two levels:
1. **Org admin**: See click stats for all links in their organization
2. **BrickOS platform admin**: See cross-org click analytics, top links, geographic distribution

Currently the admin API returns raw numbers (total_clicks, clicks_7d, clicks_30d) but there's no chart visualization or geographic breakdown.

## Requirements

### Org Admin Dashboard (`/org/{slug}/analytics`)
1. **Time-series chart**: Clicks per day for the last 30/90/365 days
2. **Top links table**: Ranked by clicks, with 7d/30d/total columns
3. **Geographic breakdown**: Top countries by click count (requires CF-IPCountry)
4. **Top referrers**: Which domains send the most traffic
5. **Filter by**: Date range, link type (affiliate/vanity/campaign), specific link

### Platform Admin Dashboard (`/admin/analytics`)
1. Everything from org admin, plus:
2. **Cross-org comparison**: Clicks by organization
3. **Cross-app comparison**: Clicks by source app (SHI, Voice, etc.)
4. **Platform totals**: Total links, total clicks, unique visitors (daily)
5. **Anomaly detection**: Spike alerts (>3x normal traffic on a link)

### API Endpoints Needed
- `GET /api/v1/orgs/{org_id}/analytics?days=30` -- time-series + geo + referrer
- `GET /api/v1/admin/analytics?days=30` -- platform-wide time-series
- `GET /api/v1/admin/analytics/by-org` -- per-org breakdown
- `GET /api/v1/links/{id}/analytics` -- single link deep-dive

### Frontend
- Recharts for time-series (same as SHI trend charts)
- Dark theme, consistent with BrickOS design system

## Blocked By

- #0333 (Cloudflare needed for geographic data) -- partial; charts work without geo data
- #0332 (click counts in API) -- DONE

## Files

- New: `apps/technology/sovereign-link/src/handlers/analytics.rs`
- New: frontend components for charts (or server-rendered SVG charts for org admin)
- Reference: `apps/health/sovereign-health/api/src/handlers/affiliate.rs` -- existing admin stats pattern
