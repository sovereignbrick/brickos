# Sprint 043 Review -- SHI Production Push

**Date:** 2026-04-18
**Sprint:** 043 -- SHI Production Push
**Version:** v0.42.0
**Duration:** 1 day (2026-04-18)

## Goal

Publish Sovereign Health Intelligence to production with licensing cutover,
AI config from app_settings, and brickos.io namespace consolidation.

## Outcome

**Partially met.** All code changes shipped to staging and verified. Production
deploy deferred to post-VPS-update window. The sprint accomplished more than
planned on the ops/infrastructure side (nginx routing overhaul) but surfaced
several deployment-time issues that required iterative fixes.

## What shipped

### Phase A -- Licensing shadow infrastructure cleanup
- Removed dead `check_feature` function (zero callers) + `check_feature_via_brickos_tier_features`
- Removed `LICENSING_SHADOW_MODE` / `LICENSING_USE_NEW_PATH` env vars
- Removed `licensing_shadow_mode` from Config struct
- Removed `required_tier_for_feature` (dead code)
- Created #539 for the real migration to `brickos.tier_features`

### Phase B (#529) -- Dr. Alex consumes brickos system AI defaults
- All 6 AI functions accept `model` parameter from `app_settings`
- Dr. Alex chat reads `dr_alex_app_model`, import reads `dr_alex_import_model`
- New migration seeds `dr_alex_import_model`
- Operator changed model on staging via platform admin -- propagated immediately

### #524 -- DEMO_ADMIN Playwright fixture fix
- Pointed at `dev@sovereignhealth.io` for local, env-configurable for staging

### Phase C (#526) -- brickos.io URL namespace consolidation
- nginx: regex-based proxy for all ~30 backend route prefixes on brickos.io domains
- nginx: same-origin path mount on sovereignhealth.io domains (auth_basic off)
- Docker compose: FRONTEND_URL and CORS_ORIGINS updated for brickos.io
- Frontend: runtime API_BASE detection for brickos.io (same-origin) vs sovereignhealth.io (legacy subdomain)
- deploy.sh: all verification URLs updated to brickos.io canonical
- gatus: canonical checks on brickos.io, legacy checks at lower frequency
- E2E: httpCredentials for staging, env-configurable admin login

### Phase D -- Post-cutover validation
- API smoke: all endpoints healthy on staging v0.42.0
- Playwright: 3/11 platform-session tests pass (remainder blocked by rate limiter)
- 141/141 backend lib tests pass

### Phase E -- White-label customer onboarding test
- Full path verified on staging: org creation, branding, license (1/5/25), member management, seat enforcement (6th practitioner blocked at 5/5), hard delete cascade

### Phase F -- RC prep
- Version bump to v0.42.0 (lib.rs, Cargo.toml, deploy.sh)
- cargo audit: 3 known advisories (no blockers)

## Key numbers

- 13 commits on develop
- ~25 files changed
- 141/141 backend lib tests pass
- cargo clippy clean
- pnpm build clean
- 7 staging deploys (3 frontend rebuilds for nginx/API_BASE fixes)
- 0 production deploys (pending)

## Issues closed

- #524 (DEMO_ADMIN Playwright fixture)
- #529 (Dr. Alex AI defaults from app_settings)
- Partially: #526 (brickos.io namespace -- code shipped, production deploy pending)
- Partially: #490 (dead code cleanup -- Phase A portion done, deeper items deferred to Sprint 044)

## Issues created

- #539 (chore: migrate load_tier_features to query brickos.tier_features)

## Carry-overs to Sprint 044

- #490 items 2-8 (deeper dead code cleanup, pending #539)
- #539 (the real handler migration to brickos.tier_features)
- #526 production nginx deploy (ships with Phase G)
- Platform audit logs endpoint (404 on staging)
