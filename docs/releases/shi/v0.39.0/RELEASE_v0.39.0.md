# Sovereign Health Intelligence v0.39.0

**Date:** 2026-04-07
**Sprint:** 030 - Sovereign Link Hardening + Platform GUI Foundation
**Type:** Feature release

## Highlights

1. **BrickOS Platform Admin GUI** -- New `/platform/` routes with role-based sidebar, dashboard, service health monitor, click analytics, and users management. Accessible at app.brickos.io/platform.
2. **Unified Domain Routing** -- All BrickOS apps accessible under brickos.io: app.brickos.io, api.brickos.io, demo.brickos.io, status.brickos.io.
3. **Sovereign Link Hardening** -- Link expiration enforcement, vanity code real-time check + edit, link edit UI, click analytics dashboard with Recharts.
4. **Platform Tier System** -- Two-layer licensing: 5 platform tiers with app-specific display names (SHI, Link, Voice).
5. **Organization Roles** -- 5 org roles (owner, tech_admin, commercial_admin, editor, consumer) with JWT claims and middleware extractors.
6. **Sovereign Voice URL Shortening** -- Auto-shortens URLs in NOSTR notes via Sovereign Link service account.
7. **BrickOS Website** -- Logo animation fixed (inline SVG, no iframe), works on Brave/Chrome/Firefox.

## New Features

### Platform Admin GUI
- 28 routes across 8 sections (Overview, Manage, Commerce, Links, Content, AI, Ops, Security, Settings)
- Role-based sidebar filtering (BrickOS admin vs org admin)
- Dashboard: stat cards, tier distribution, service health matrix
- Service health monitor: polls /health endpoints, 60s cache, green/amber/red status
- Click analytics: Recharts area chart, top links, top referrers, time period selector
- Users tab elevated from SHI admin
- BrickOS cube logo, dark theme, i18n (EN + DE)

### Sovereign Link
- Link expiration: expired links 301 redirect to main domain (not 404)
- Vanity code UX: real-time debounced availability check, edit existing codes
- Link edit UI: inline edit (target URL, title, active toggle, expiry) on affiliate page
- Click analytics API: `GET /api/v1/links/{id}/analytics?days=30`
- QR code: BrickOS cube PNG embedded in center, EcLevel::H

### Platform Infrastructure
- `app_tier_names` table: maps platform tiers to app-specific names
- `org_members` role constraint: owner, tech_admin, commercial_admin, editor, consumer
- JWT claims: optional `org_id` + `org_role` fields
- 3 middleware extractors: OrgAdmin, OrgTechAdmin, OrgCommercialAdmin
- Service account for Sovereign Voice
- Admin design tokens (design-tokens.ts)

### Sovereign Voice
- URL shortening module: auto-shortens URLs before NOSTR publish
- 5s timeout, in-memory cache, graceful fallback
- Service account configured on production VPS

## Database Migrations

| Migration | Description |
|---|---|
| 20260408000001 | Org roles update (org_owner->owner, org_admin->tech_admin, org_member->consumer) |
| 20260408000002 | Sovereign Voice service account |
| 20260408000003 | Platform tier system (app_tier_names, check_tier_limit function) |

## Domain Infrastructure

| Domain | Purpose |
|---|---|
| app.brickos.io | Production platform + SHI app |
| api.brickos.io | Production API |
| demo.brickos.io | Staging (basic auth) |
| status.brickos.io | Gatus monitoring |

## Design Documents

- 014: BrickOS Platform GUI (v4) -- unified admin, roles, tiers, themes
- 015: BrickOS Unified App Routing -- path-based routing under brickos.io

## Tests

| Suite | Result |
|---|---|
| Platform smoke (staging) | 17/17 passed |
| DB integrity (staging) | 23/23 passed |
| Cross-app integration | 8/9 passed |
| Domain routing | 11/13 passed (2 skip) |
| cargo clippy | Clean |
| pnpm build | Clean |

## Known Issues (Sprint 031)

- #0370 Session persistence on brickos.io (cookie/auth context)
- #0369 Login page shows SHI branding on brickos.io
- #0376 QR cube needs white background
- #0377 Staging rate limiter too aggressive
- #0378 Affiliate page redirect loop

## Files Changed

99 files changed, 5466 insertions(+), 97 deletions(-)
