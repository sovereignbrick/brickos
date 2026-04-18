# Release v0.42.0 -- Sprint 043: SHI Production Push

**Date:** 2026-04-18
**Sprint:** 043
**Previous:** v0.41.0 (Sprint 042)

## Summary

Licensing shadow infrastructure cleanup, AI model configuration from platform
admin settings, and brickos.io URL namespace consolidation. All AI model
selections are now operator-configurable -- zero hardcoded model strings remain.

## Changes

### Licensing (Phase A)
- Removed dead `check_feature` shadow gate (zero callers since Sprint 040)
- Removed `LICENSING_SHADOW_MODE` / `LICENSING_USE_NEW_PATH` env vars
- Removed `licensing_shadow_mode` from Config struct
- Created #539 for future migration of `load_tier_features` to `brickos.tier_features`

### AI Configuration (#529)
- Dr. Alex chat reads `dr_alex_app_model` from `app_settings` table
- Smart Import reads `dr_alex_import_model` from `app_settings` table
- All 6 AI functions accept `model` parameter -- zero hardcoded model strings
- New migration: `20260418000001_app_settings_import_model.sql`
- Operator can change AI model from `/platform/settings` without redeploy

### URL Namespace (#526)
- nginx: regex-based proxy for all backend route prefixes on `*.brickos.io`
- nginx: same-origin API path mount on `*.sovereignhealth.io` with `auth_basic off`
- Frontend: runtime API_BASE detection (brickos.io = same-origin, sovereignhealth.io = legacy subdomain)
- Docker compose: FRONTEND_URL and CORS_ORIGINS updated for brickos.io
- deploy.sh: verification URLs updated to brickos.io canonical
- gatus: monitoring checks on brickos.io canonical URLs

### Testing (#524)
- Playwright DEMO_ADMIN fixture env-configurable via E2E_ADMIN_EMAIL/PASSWORD
- Playwright config: httpCredentials for both staging domains
- Default: `dev@sovereignhealth.io` (local), override for staging

## Migration notes

- New migration `20260418000001` seeds `dr_alex_import_model` in `app_settings`
- No schema-breaking changes
- No data migration required
- nginx config must be deployed alongside the Docker images

## Verification

- cargo check: clean
- cargo clippy -D warnings: clean
- 141/141 lib tests: pass
- cargo audit: 3 known advisories (no blockers)
- pnpm build: clean
- Staging verified: login, dashboard, health zones, Dr. Alex, Smart Import,
  platform admin (settings, orgs, users, branding, licensing, compliance)
- White-label E2E: org creation, branding, license (1/5/25), seat enforcement
