---
github_number: 332
title: "fix: user-facing /api/v1/links endpoint missing click counts"
milestone: infrastructure
labels: [fix, P2]
---

## Problem

The admin API endpoint (`/admin/links` in affiliate.rs) correctly JOINs `short_link_clicks` to return `total_clicks`, `clicks_7d`, and `clicks_30d`. However, the user-facing Sovereign Link API (`list_by_owner()` in `sovereign-link/src/db/postgres.rs:98-112`) only selects from `short_links` without joining click data.

The `ShortLink` model (`sovereign-link/src/models.rs:7-23`) also lacks click count fields, even though `LinkStats` exists separately.

## Impact

Users see 0 clicks for all their links when using the non-admin link management UI. Click data IS being recorded (verified: 2 clicks in `short_link_clicks` on staging), but it's not returned in the list response.

## Fix

Option A: Add a LATERAL JOIN in `list_by_owner()` (same pattern as `admin_list_links`), add click fields to `ShortLink` or create a `ShortLinkWithStats` response type.

Option B: Have the handler call `get_stats()` per link and merge into the response.

## Files

- `apps/technology/sovereign-link/src/db/postgres.rs` - `list_by_owner()` (line 98)
- `apps/technology/sovereign-link/src/models.rs` - `ShortLink` struct (line 7)
- Reference: `apps/health/sovereign-health/api/src/handlers/affiliate.rs` - working pattern (line 968)
