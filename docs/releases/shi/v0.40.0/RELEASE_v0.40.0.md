# Sovereign Health Intelligence v0.40.0

**Date:** 2026-04-08
**Sprints:** 031 + 032 - Platform Auth Hardening + Organization Management
**Type:** Major feature release

## Highlights

1. **Organization Management** -- Full CRUD for organizations with type filtering, member management, and JWT license key generation for on-prem deployments.
2. **AI Provider Profiles** -- Configurable Default/Failover/Self-hosted profiles with automatic failover state machine (3 failures in 5min triggers switch).
3. **Platform GUI Phase 2 Complete** -- All 16 SHI admin tabs elevated to /platform/*, plus 6 new pages (orgs, members, AI config, compliance, branding, apps registry).
4. **Session Persistence Fixed** -- Sovereign Link API auth fix + cookie domain .brickos.io enables cross-app session sharing.
5. **Zero Vulnerabilities** -- hono/node-server overrides cleared all 6 npm audit findings.
6. **Compliance Dashboard** -- GDPR, EU AI Act, NIS2, CRA, ePrivacy status tracking.

## New Features

### Organization Management (#0350, #0352, #0363)
- GET/POST/PUT /admin/organizations -- CRUD with search, type filter, pagination
- GET/POST /admin/organizations/{id}/members -- list + add members
- PUT/DELETE /admin/organizations/{org_id}/members/{member_id} -- role change + remove
- POST /admin/organizations/{id}/license -- JWT license key generation
- Frontend: org list table, create dialog, member management, role dropdowns

### JWT Licensing (#0363)
- services/licensing.rs with LicenseInput struct
- Claims: org_id, org_name, tier, features, max_admins/editors/consumers, expires_at
- validate_license() for offline verification
- has_feature() + check_seat_limit() helpers
- 4 unit tests

### AI Provider Profiles (#0359)
- AiProviderManager with profiles + failover state machine
- Default (Anthropic), Failover (OpenAI), Self-hosted (Ollama)
- record_failure() -> auto-switch after 3 failures in 5min
- record_success() -> recovery tracking
- Frontend: /platform/ai/config with profile cards, failover rules

### Platform GUI (#0365, #0361, #0379, #0381, #0382)
- Compliance dashboard: 5 EU frameworks with status badges
- Org branding: theme presets, color pickers, logo upload, live preview
- App switcher: Platform/Health/Links/Voice nav in header
- Cookie domain: .brickos.io for cross-subdomain session sharing
- Login logo: mounted check prevents SSR hydration mismatch

### Session & Auth Fixes (#0370, #0371, #0377)
- Sovereign Link extract_user_id() fixed to parse JWT from Authorization header
- Staging rate limiter relaxed to 100 attempts/hour
- 5/5 E2E tests green for platform session persistence

## Database Migrations

| Migration | Description |
|---|---|
| 20260408000001 | Org roles update (owner, tech_admin, commercial_admin, editor, consumer) |
| 20260408000002 | Sovereign Voice service account |
| 20260408000003 | Platform tier system (app_tier_names, check_tier_limit) |

## Tests

| Suite | Result |
|---|---|
| Backend unit tests | 107/107 |
| Platform smoke | 17/17 |
| DB integrity | 23/23 |
| Cross-app integration | 8/8 |
| Domain routing | 13/13 |
| Playwright E2E | 12 tests (9 pass, 2 intermittent, 1 branding) |
| npm audit | 0 vulnerabilities |

## Issues Closed: 37 total (Sprints 031 + 032)

Sprint 031: #0370, #0371, #0372, #0373, #0374, #0375, #0376, #0377, #0379, #0380 + 15 Sprint 030 closures
Sprint 032: #0350, #0352, #0359, #0361, #0363, #0365, #0379, #0381, #0382, #0383

## Files Changed

~80 files, ~3000 insertions
