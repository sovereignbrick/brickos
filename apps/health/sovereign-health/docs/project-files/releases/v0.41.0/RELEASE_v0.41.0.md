<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes v0.41.0 -- Sprint 033
 Version: 0.41.0 -- 2026-04-08

 https://sovereignhealth.io/
 AGPL-3.0 -- https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release v0.41.0 -- Sprint 033: Platform Data Scoping

**Date:** 2026-04-08
**Branch:** develop
**Previous:** v0.40.0 (Sprint 030-032)

---

## Summary

This release implements full platform data scoping across the BrickOS admin GUI.
Every scopeable admin page now respects the App and Org filter dropdowns in the
platform header. Org admins are automatically locked to their organization's data.
Three UI bugs (sidebar icons, Gatus background, login logo) were also fixed.

---

## Key Changes

### Features

- **Platform filter dropdowns** -- App (All/SHI/Link/Voice) and Org selectors in
  the platform header, persisted in React context across page navigation
- **Data scoping on Links page** -- admin.links() accepts ?app_key and ?org_id,
  frontend re-fetches on filter change
- **Data scoping on Audit page** -- access-logs and events endpoints accept
  ?app_key and ?org_id with SQL filtering on new columns
- **Data scoping on AI Usage page** -- ?app_key filter on all 4 AI usage queries
  (totals, by_user, by_model, by_type)
- **Data scoping on Newsletter page** -- ?app_key filters subscribers by source
- **Data scoping on Users page** -- ?org_id filters users via org_members join
- **Data scoping on Analytics page** -- switched from user links to admin links
  endpoint with filter support
- **Members page context sync** -- auto-selects org from platform filter dropdown
- **Branding page context** -- shows selected org name with guidance text
- **Org admin auto-scoping** -- non-platform admins with org membership have their
  org filter locked automatically; dropdown replaced with static label

### Fixes

- **Sidebar icons** -- replaced generic squares with meaningful Unicode symbols
  for each nav item (#0390)
- **Gatus dark background** -- aggressive CSS overrides with !important on all
  bg-gray classes via nginx sub_filter (#0391)
- **Login logo** -- sync script in <head> reads brand_context cookie and adds
  .brand-brickos class before React hydration (#0392)
- **Migration table name** -- fixed access_log -> data_access_log in migration
- **Users org_id bind positions** -- fixed $4::uuid -> $3::uuid in no-search branch

### Backend

- `admin_audit.rs` -- access_logs() and event_logs() filter on app_key + org_id
- `admin_ai_usage.rs` -- AiUsageQuery accepts app_key, all SQL queries filter
- `newsletter.rs` -- SubscriberQuery accepts app_key, counts + list filtered
- `admin.rs` -- UserListQuery accepts org_id, conditional INNER JOIN org_members
- `affiliate.rs` -- AdminLinksQuery accepts app_key + org_id (prior sprint)

### Testing

- New E2E suite 14: 12 Playwright tests covering all data scoping endpoints
- RC test checklist v0.41.0 with 13 layers
- Insta snapshots updated for v0.40.0 -> v0.41.0

---

## Database Migrations

| Migration | Description |
|-----------|-------------|
| 20260408000004 | Add app_key (TEXT) + org_id (UUID) to data_access_log and audit_log with partial indexes |
| 20260408000005 | Add app_key (TEXT DEFAULT 'shi') to ai_usage_log with index |

---

## Issues

### Closed
- #0390 -- fix: sidebar collapsed icons show generic squares instead of meaningful symbols
- #0391 -- fix: Gatus status page blue background persists on brickos.io
- #0392 -- fix: login page shows SHI logo instead of BrickOS on brickos.io domain

---

## Pre-deployment Audit

| Check | Result |
|-------|--------|
| cargo clippy -- -D warnings | PASS (0 warnings) |
| cargo test (smoke + integration + property) | PASS (15/15) |
| pnpm build | PASS |
| pnpm test (unit) | 254/262 (8 pre-existing: timezone + i18n threshold) |
| E2E Suite 14 (staging) | 11/12 (UI test needs deployed frontend) |
| E2E Suite 10 (regression) | 5/8 (3 rate-limit false failures) |

---

## Files Changed

11 commits, ~30 files changed across backend handlers, frontend components,
API client, platform context, migrations, E2E tests, and RC checklist.

---

## Contributors

- Helmut Schindlwick -- Product, Architecture, Development
- Claude Code (Anthropic) -- AI pair programming
