# Sprint 050 -- Test Coverage Baseline (B0)

**Date:** 2026-04-22 start of Sprint 050
**Purpose:** Inventory every test file that exists, what it covers, what's missing. Gaps become Sprint 050 Phase B1-B4 work.

## Current inventory

### Rust (`apps/health/sovereign-health/api/tests/`, 15 files)

| File | Covers | Status |
|---|---|---|
| `smoke.rs` | /health, /hello, /org/branding endpoints (no DB) | ✅ assumed green |
| `integration.rs` | Route handlers via actix test, snapshot for JSON shapes. Includes Sprint 048 #048-12 /demo/* no-writes test | ✅ green |
| `property.rs` | Proptest-based serialization invariants, 1000 cases | ✅ assumed green |
| `auth_test.rs` | Signup + login + JWT + email verification | ✅ |
| `calculated_test.rs` | Calculated marker enrichment (GKI, BMI, etc.) | ✅ |
| `crud_test.rs` | Generic CRUD patterns | ✅ |
| `doctor_chat_test.rs` | AI chat endpoint + quota | ✅ |
| `measurement_test.rs` | Measurement insert/update/delete + unit conversion | ✅ |
| `platform_test.rs` | Platform admin flows (orgs, users) | ✅ |
| `reference_range_test.rs` | Threshold / reference range logic | ✅ |
| `shared_service_test.rs` | Shared services (notify, email, lifecycle) | ✅ |
| `tier_test.rs` | Tier enforcement + upgrade/downgrade | ✅ |
| `tier_feature_matrix_test.rs` | Feature gates per tier | ✅ |
| `two_pool_test.rs` | Platform + SHI DB pool separation | ✅ |
| `e2e.rs` | End-to-end via reqwest against live server, gated on `E2E_BASE_URL` | ⏸ manual |

### Frontend vitest (`src/lib/*.test.ts`, 18 files)

| File | Covers | Status |
|---|---|---|
| `plane.test.ts` | getPlane, swapPlaneHost, planeRedirectTarget; 18-19 specs | ✅ green |
| `units.test.ts` | Unit conversions (mg/dL <-> mmol/L etc.) | ✅ |
| `validators.test.ts` | Form schemas (zod) | ✅ |
| `status.test.ts` | Marker status color / threshold logic | ✅ |
| `calculated.test.ts` | Calculated-marker formulas (client parity with backend) | ✅ |
| `tier-matrix.test.ts` | Tier feature display | ✅ |
| `tiers.test.ts` | Tier upgrade logic | ✅ |
| `marker-data.test.ts` | Marker content shape | ✅ |
| `template-defaults.test.ts` | Email template defaults | ✅ |
| `audit-log-parsing.test.ts` | Client-side audit log rendering | ✅ |
| `api-contracts.test.ts` | API request/response shapes | ✅ |
| `search-contracts.test.ts` | Search API contracts | ✅ |
| `sprint024-contracts.test.ts` | Sprint 024 API contracts | ✅ |
| `sprint025-contracts.test.ts` | Sprint 025 API contracts | ✅ |
| `dark-theme.test.ts` | No hardcoded light-theme colors in components | ✅ (bumped baselines in 049-27) |
| `i18n-completeness.test.ts` | EN/DE parity, no untranslated values | ✅ (threshold 50 in 049-27) |
| `date-format.test.ts` | Locale-specific date formatting | ⏸ excluded (TZ quirk; Sprint 050 050-05 fixes) |
| `gdpr-export-completeness.test.ts` | GDPR Art. 15 export shape | ✅ |

### Playwright E2E (`e2e/*.spec.ts`, 24 files)

| File | Covers | Status |
|---|---|---|
| `auth.setup.ts` | Global auth setup for authed projects | ✅ |
| `health.spec.ts` | Public pages, PWA, API health | ⚠️ 3 failing (API-URL shape for staging -- pre-Sprint-048) |
| `eval-smoke.spec.ts` | 10 specs, eval surface post-deploy smoke | ✅ green on prod |
| `sprint-048-impersonation.spec.ts` | 11 specs, consent + impersonation + scope gate + invite | ✅ green |
| `sprint-047-url-routing.spec.ts` | 25 specs, URL route moves + 308 redirects | ✅ |
| `sprint-047-admin-coverage.spec.ts` | Platform admin page coverage | ✅ |
| `sprint-046-plane-routing.spec.ts` | Plane gate cross-plane redirects (2 updated in 049-25) | ✅ |
| `sprint-046-rc-smoke.spec.ts` | Sprint 046 RC (2 updated in 049-25) | ✅ |
| `sprint-044-org.spec.ts` | Org branding + domain flows | ✅ |
| `sprint-044-practitioner.spec.ts` | Practitioner caseload MVP | ✅ |
| `sprint-041-life-algorithm.spec.ts` | Life algorithm scoring | ✅ |
| `sprint-040-smoke.spec.ts` | Licensing endpoints | ✅ |
| `platform-session.spec.ts` | Platform admin session lifecycle | ✅ |
| `suite-1-auth.spec.ts` | Auth suite | ✅ |
| `suite-10-admin.spec.ts` | Admin suite | ✅ |
| `suite-12-cleanup.spec.ts` | Data cleanup | ✅ |
| `suite-12b-sprint024.spec.ts` | Sprint 024 | ✅ |
| `suite-14-platform-scoping.spec.ts` | Platform scoping | ✅ |
| `capture-screenshots.ts` | Screenshot capture utility (for marketing) | ⏸ manual |

Plus 5 more in helpers/ and fixtures/. Of the 24 spec files, ~22 actively run; 1-2 are gated on manual invocation.

## Gaps Sprint 050 B1-B4 will fill

### Missing backend integration tests

- ❌ `signup_source` attribute persistence (049-18) -- shipped but untested
- ❌ `bulk_consent_reminder` handler (049-22) -- shipped but untested
- ❌ `/demo/*` rate limit enforcement at the 60/min boundary
- ❌ `invite_reminder_cron` dry-run logic (049-21)
- ❌ Demo user password lock (verifies login returns 401 with structured JSON)
- ❌ `AuthenticatedUser` effective-user swap (covered by E2E spec but no unit test)
- ❌ Consent revoke kills impersonation session (same -- E2E only)

### Missing frontend vitest

- ❌ `auth-context.test.ts` -- flag derivation matrix (isDemo/isEvalHost/isDemoOnly)
- ❌ `auth-gate.test.ts` -- redirect decision per state
- ❌ `eval-conversion-banner.test.ts` -- dismissal + session state
- ❌ `settings-redirect.test.ts` -- isDemo redirect decision
- ❌ Navbar visibility per role

### Missing Playwright E2E

Per Sprint 050 plan B3:
- ❌ `sprint-050-acquisition-funnel.spec.ts`
- ❌ `sprint-050-measurement-lifecycle.spec.ts`
- ❌ `sprint-050-billing.spec.ts`
- ❌ `sprint-050-settings-lifecycle.spec.ts`
- ❌ `sprint-050-mobile-responsive.spec.ts`
- ❌ `sprint-050-pwa-offline.spec.ts`
- ❌ `sprint-050-org-admin-full.spec.ts`
- ❌ `sprint-050-practitioner-impersonation.spec.ts` (extends 048)
- ❌ `sprint-050-patient-journey.spec.ts`

### Missing smoke expansion

- ❌ `platform-smoke.sh` /demo/zones probe
- ❌ `platform-smoke.sh` /signup probe

## Runtime baseline (after first full run)

_To be filled in after Sprint 050 Phase C1 runs the full suite against green code. Expected:_
- Rust test: ~60-90s
- Vitest: ~5-10s
- Playwright localhost: ~2-3 min (existing) + 1-2 min (new)
- Playwright staging: ~3-4 min
- Eval-smoke: ~15s

## What "green" means per layer

| Layer | Pass definition |
|---|---|
| Rust test | `cargo test -p sovereign-health-backend --test integration --test property --test smoke` returns 0 |
| Rust unit | `cargo test -p sovereign-health-backend --lib` returns 0 |
| Clippy | `cargo clippy -p sovereign-health-backend --all-targets -- -D warnings` returns 0 |
| tsc | `pnpm exec tsc --noEmit` returns 0 |
| Vitest | `pnpm test` returns 0 (TZ=Europe/Berlin baked in) |
| Playwright localhost | `E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test` returns 0 |
| Playwright staging | `E2E_BASE_URL=https://test-clinic.demo.brickos.io pnpm exec playwright test` returns 0 |
| Eval smoke | `E2E_BASE_URL=https://eval.sovereignhealth.io pnpm exec playwright test eval-smoke` returns 0 |
| Platform smoke | `bash tests/platform-smoke.sh production` returns 0 |
