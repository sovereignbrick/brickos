<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Testing Strategy & Inventory Report
 Version: 0.24.0-rc1 (Sprint 006)
 Date: 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Testing Strategy — BrickOS / Sovereign Health Intelligence

**Version:** 0.24.0-rc1
**Date:** 2026-03-21
**Repository:** github.com/sovereignbrick/brickos
**App Path:** `apps/health/sovereign-health/`
**Shared Packages:** `packages/ui/` (@brickos/ui)

---

## 1. Strategy Overview

We follow a **stratified testing pyramid** with automated CI/CD enforcement,
extended in Sprint 006 to cover the shared component layer (`packages/ui`).

```
                        /\
                       /  \
                      / RC  \           <- manual checklist (100 items)
                     /--------\
                    /   E2E    \        <- 4 tests, live server
                   /--------------\
                  /  DB Tests      \    <- 50+ tests, PostgreSQL
                 /--------------------\
                / Integration + Snap   \ <- 10 tests, HTTP-level
               /--------------------------\
              /  Property + Marker Match   \ <- 9 tests, randomized + alias
             /--------------------------------\
            /   Unit Tests (FE + BE + pkg)      \ <- 237 tests, pure logic
           /--------------------------------------\
```

**Total: 324 automated tests** across 22 test files + 100-item manual RC checklist.

### What Changed in Sprint 006

| Area | Change | Testing Impact |
|------|--------|----------------|
| @brickos/ui | New shared package (MultiSelect) | Verify workspace resolution, Docker build, transpile |
| Dr. Alex routing | `/doctor-chat` vs `/doctor-chat/[id]` | URL-level navigation testing |
| Marker matcher | 22 new German BP aliases, min alias 3->4 | 2 new unit tests |
| Import pipeline | Multi-sheet ODS, protocol overrides | Manual test: ODS with 4 sheets |
| Newsletter | Signup + settings sync to newsletter_subscribers | Manual test: admin panel |
| Deploy script | Auto-increment build, image verification | Infrastructure-level verification |
| Hydration | DatePicker SSR guard | Console error regression |

---

## 2. Test Runner

```bash
# Full suite (needs DATABASE_URL)
bash ops/test-all.sh

# Quick: lint + smoke + integration + property + frontend (no DB)
bash ops/test-all.sh --quick

# CI strict: includes frontend build check
bash ops/test-all.sh --ci

# Individual targets
cargo test -p sovereign-health-backend --lib    # 14 lib unit tests
cargo test -p sovereign-health-backend          # 101 total backend tests
cd frontend && pnpm test                        # 223 frontend tests
```

---

## 3. CI/CD Pipeline

**File:** `.github/workflows/ci-health.yml`
**Triggers:** Push/PR to `main` or `develop`, scoped to `apps/health/sovereign-health/**`

```
+-----------------------------------------------------------------+
|  Stage 1: Lint (parallel)                                       |
|  +- cargo fmt --check                                           |
|  +- cargo clippy --all-targets -- -D warnings                   |
+-----------------------------------------------------------------+
|  Stage 2: Smoke Tests (no DB, fast)                             |
|  +- cargo test --test smoke                                     |
+-----------------------------------------------------------------+
|  Stage 3: Integration Tests                                     |
|  +- cargo test --test integration (INSTA_UPDATE=no)             |
+-----------------------------------------------------------------+
|  Stage 4: Property Tests                                        |
|  +- cargo test --test property (PROPTEST_CASES=1000)            |
+-----------------------------------------------------------------+
|  Stage 5: DB Tests (postgres:16-alpine service, parallel)       |
|  +- cargo test --test auth_test                                 |
|  +- cargo test --test measurement_test                          |
|  +- cargo test --test tier_test                                 |
|  +- cargo test --test doctor_chat_test                          |
|  +- cargo test --test crud_test (platform: RLS, roles, crypto)  |
+-----------------------------------------------------------------+
|  Stage 6: Security Audit (non-blocking)                         |
|  +- cargo audit                                                 |
+-----------------------------------------------------------------+
|  Stage 7: Frontend                                              |
|  +- pnpm install (resolves @brickos/ui workspace dep)           |
|  +- pnpm build (includes transpilePackages: ["@brickos/ui"])    |
|  +- pnpm test (vitest - 223 tests)                              |
+-----------------------------------------------------------------+
```

---

## 4. Complete Test Inventory

### 4.1 Backend - Smoke Tests

**File:** `api/tests/smoke.rs`
**Command:** `cargo test --test smoke`

| # | Test | Purpose |
|---|------|---------|
| 1 | `smoke_health_endpoint_responds` | `/health` endpoint responds |
| 2 | `smoke_hello_endpoint_responds` | `/api/v1/hello` endpoint responds |

### 4.2 Backend - Integration Tests

**File:** `api/tests/integration.rs`
**Command:** `cargo test --test integration`

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_health_returns_200` | Health endpoint status code |
| 2 | `test_health_content_type_is_json` | Content-Type header validation |
| 3 | `test_health_response_fields` | JSON shape: status, service, version, timestamp |
| 4 | `test_health_timestamp_is_rfc3339` | Timestamp format validation |
| 5 | `test_health_snapshot` | Insta snapshot - detects response shape drift |
| 6 | `test_hello_returns_200` | Hello endpoint status code |
| 7 | `test_hello_content_type_is_json` | Content-Type header validation |
| 8 | `test_hello_response_fields` | JSON shape: message, version |
| 9 | `test_hello_snapshot` | Insta snapshot - detects response shape drift |
| 10 | `test_unknown_route_returns_404` | Unknown routes don't leak data |

### 4.3 Backend - Property Tests

**File:** `api/tests/property.rs`
**Command:** `cargo test --test property`

| # | Test | Purpose |
|---|------|---------|
| 1 | `prop_health_response_always_serializes` | HealthResponse serializes for ANY field values |
| 2 | `prop_health_response_roundtrips_json` | Serialize -> deserialize roundtrip preserves data |
| 3 | `prop_hello_response_always_serializes` | HelloResponse serializes for ANY field values |

### 4.4 Backend - Marker Matcher Unit Tests -- **UPDATED Sprint 006**

**File:** `api/src/services/marker_matcher.rs` (inline #[cfg(test)])
**Command:** `cargo test -p sovereign-health-backend --lib -- services::marker_matcher`

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_match_exact` | Exact alias match (Glucose, HbA1c, Total Cholesterol) |
| 2 | `test_match_german` | German alias match (Blutzucker, Harnsaure, Cholesterin gesamt) |
| 3 | `test_abbreviation_priority` | BG -> glucose (not shbg), TCH -> total_cholesterol |
| 4 | `test_match_blood_pressure_german` | **NEW** Blutdruck syst./diast., RR syst./diast. |
| 5 | `test_no_false_positive_ast_in_diast` | **NEW** "Blutdruck diast." must NOT match AST |
| 6 | `test_convert_glucose` | mg/dL -> mmol/L conversion |

### 4.5 Backend - Auth Tests (DB)

**File:** `api/tests/auth_test.rs`
**Command:** `cargo test --test auth_test`

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_signup_returns_jwt` | New user gets valid JWT on signup |
| 2 | `test_signup_duplicate_email` | Duplicate email rejected (409) |
| 3 | `test_signup_weak_password` | Weak password rejected (validation) |
| 4 | `test_login_correct_password` | Valid credentials return JWT |
| 5 | `test_login_wrong_password` | Invalid credentials rejected (401) |
| 6 | `test_me_with_valid_jwt` | `/me` returns user profile with valid token |
| 7 | `test_me_with_invalid_jwt` | `/me` rejects invalid/expired tokens |
| 8 | `test_no_auth_returns_401` | Protected routes reject unauthenticated requests |
| 9 | `test_refresh_token` | Refresh token flow works |
| 10 | `test_rate_limit` | Login rate limiting prevents brute force |

### 4.6 Backend - Measurement Tests (DB)

**File:** `api/tests/measurement_test.rs`

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_create_measurement_session` | Create measurement with multiple values |
| 2 | `test_get_measurements_list` | List measurements with pagination |
| 3 | `test_get_measurements_filter_date` | Date range filtering works |
| 4 | `test_put_measurement` | Update existing measurement values |
| 5 | `test_delete_soft` | Soft delete preserves data, hides from queries |
| 6 | `test_cannot_read_other_user_measurement` | User isolation - no cross-user access |
| 7 | `test_csv_export_requires_auth` | Export endpoint requires authentication |
| 8 | `test_get_trends` | Trend calculation (time-series aggregation) |
| 9 | `test_get_zones` | Health zone summary with marker counts |
| 10 | `test_gki_auto_calculated` | GKI auto-calculated from glucose + ketones |
| 11 | `test_whtr_auto_calculated` | WHtR auto-calculated from waist + height |
| 12 | `test_validation_rejects_out_of_range` | Extreme values rejected |
| 13 | `test_stripe_webhook_endpoint_exists` | Stripe webhook route responds |
| 14 | `test_strike_webhook_endpoint_exists` | Strike webhook route responds |

### 4.7 Backend - Tier Tests (DB)

**File:** `api/tests/tier_test.rs`

| # | Test | Purpose |
|---|------|---------|
| 1-10 | Tier hierarchy, feature limits, pricing, annual discount | License tier access control |

### 4.8 Backend - Doctor Chat Tests (DB)

**File:** `api/tests/doctor_chat_test.rs`

| # | Test | Purpose |
|---|------|---------|
| 1-9 | Auth required, empty conversations, public chat, quota | Chat functionality |

**Gap:** No test yet for DELETE /conversations/:id (added in Sprint 006).

### 4.9 Backend - Platform / CRUD Tests (DB)

**File:** `api/tests/crud_test.rs`

| # | Test | Purpose |
|---|------|---------|
| 1 | `crud_create_user_and_data` | Full user creation flow with profile, preferences |
| 2 | `crud_idempotency_key_unique` | Idempotency keys prevent duplicate inserts |
| 3 | `crud_reference_ranges_system_visible` | System reference ranges accessible |
| 4 | `crud_rls_zero_rows_without_session` | RLS returns 0 rows without user session |
| 5 | `crud_seed_data_integrity` | Seed data (markers, zones, tiers) complete |
| 6-20 | `platform_*` tests | Auth, billing, crypto, email, RLS, pgaudit, DB roles |

### 4.10 Backend - E2E Tests

**File:** `api/tests/e2e.rs` (gated on `E2E_BASE_URL`)

| # | Test | Purpose |
|---|------|---------|
| 1-4 | Health, hello, response fields, 404 | Live server validation |

### 4.11 Backend - Benchmarks & Load Tests

| Target | Command | Purpose |
|--------|---------|---------|
| Benchmarks | `make bench` | Criterion latency for /health, /hello |
| Load Smoke | `make load-smoke` | 1 VU, 10s, p99 < 200ms |
| Load Test | `make load-test` | 50 VUs, 2 min, p99 < 200ms |
| Load Stress | `make load-stress` | 200 VUs, 5 min, p99 < 500ms |

---

### 4.12 Frontend - Unit Tests (223 tests, 14 files)

| File | Tests | Purpose |
|------|-------|---------|
| `calculated.test.ts` | 25 | GKI, BMI, WHtR, HOMA-IR, Dr. Boz, HCT/HB formulas |
| `date-format.test.ts` | 21 | Locale-aware formatting (DE/US/GB), edge cases |
| `status.test.ts` | 26 | Traffic light logic, colors, emojis, default ranges |
| `tiers.test.ts` | 14 | Tier hierarchy, feature limits, boolean access |
| `units.test.ts` | 22 | Unit conversions (mmol/L, mg/dL, kg/lbs, etc.) |
| `validators.test.ts` | 20 | Signup, login, measurement Zod schemas |
| `i18n-completeness.test.ts` | 7 | EN/DE key parity, no empty values, placeholder match |
| `dark-theme.test.ts` | 3 | No white backgrounds, ratchet counters |
| `marker-data.test.ts` | 4 | No duplicate markers, no embedded abbreviations |
| `template-defaults.test.ts` | 8 | Template save/restore, JSON roundtrip |
| `tier-matrix.test.ts` | * | Tier feature matrix consistency |
| `api-contract.test.ts` | * | API contract types |
| `import-review.test.ts` | * | Import flow validation |
| `measurement-filters.test.ts` | * | Filter logic |

---

## 5. Shared Package Testing (@brickos/ui) -- **NEW in Sprint 006**

### Current Components

| Component | Consumers | Test Strategy |
|-----------|-----------|---------------|
| `MultiSelect` | measurements page (filter bar) | Tested via consumer: frontend unit + manual RC |

### Testing Approach for Shared Packages

1. **No isolated unit tests yet** - components are simple, tested through consumers
2. **Build verification** - `pnpm build` in frontend verifies transpile works
3. **Docker verification** - Dockerfile resolves workspace dep via `file:` protocol
4. **Manual RC** - Layer 15 in checklist covers @brickos/ui specific checks

### Future: When to Add Package-Level Tests

Add dedicated tests in `packages/ui/` when:
- A component has 3+ consumers across different apps
- A component has complex internal logic (not just UI composition)
- A regression is found that consumer tests didn't catch

---

## 6. Deploy Pipeline Testing -- **UPDATED Sprint 006**

### Pre-Deploy Checks (automated in deploy.sh)

| Check | What | Fails Deploy? |
|-------|------|---------------|
| PROJECT_ROOT validation | Git repo exists at expected path | Yes |
| Git root match | Resolved path matches `git rev-parse --show-toplevel` | Yes |
| Disk space | Local >= 2G free, VPS >= 2G free | Yes |
| VPS reachable | SSH connection test | Yes |
| Frontend lockfile | pnpm-lock.yaml in sync (workspace deps stripped) | Yes |
| Branch check | staging=develop, production=main | Yes |

### Build & Transfer Verification

| Check | What | Fails Deploy? |
|-------|------|---------------|
| **Staging build number** | Auto-increments VERSION in lib.rs (0.23.0 -> 0.23.0-b1 -> b2...) | N/A |
| **Image size match** | Local vs remote Docker image size after transfer | Warning |
| **API version assertion** | curl /health, compare version to expected | Warning |
| **Endpoint checks** | curl API, App, Website URLs for 200 | Warning |

### Post-Deploy Verification

| Check | What |
|-------|------|
| API health | Returns correct version string |
| Container creation time | New container, not stale (verify manually) |
| Cloudflare purge | Production only - purges CDN cache |
| Notification | ntfy + Telegram alert with deploy result |

---

## 7. Test Counts Summary

| Layer | Files | Tests | Status |
|-------|-------|-------|--------|
| **Backend: Smoke** | 1 | 2 | Active |
| **Backend: Integration** | 1 | 10 | Active |
| **Backend: Property** | 1 | 3 | Active |
| **Backend: Marker Matcher** | 1 | 6 | Active (2 new) |
| **Backend: Auth (DB)** | 1 | 10 | Active |
| **Backend: Measurements (DB)** | 1 | 14 | Active |
| **Backend: Tiers (DB)** | 1 | 10 | Active |
| **Backend: Doctor Chat (DB)** | 1 | 9 | Active |
| **Backend: Platform/CRUD (DB)** | 1 | 20+ | Active |
| **Backend: E2E** | 1 | 4 | Active (gated) |
| **Frontend: 14 test files** | 14 | 223 | Active |
| **Manual RC Checklist** | 1 | 100 | Per-release |
| | | | |
| **TOTAL AUTOMATED** | **24** | **324** | |
| **TOTAL WITH MANUAL** | | **424** | |

### Growth Since v0.20.0-rc1

| Metric | v0.20.0-rc1 | v0.24.0-rc1 | Delta |
|--------|-------------|-------------|-------|
| Backend tests | 62 | 101 | +39 (+63%) |
| Frontend tests | 166 | 223 | +57 (+34%) |
| Total automated | 228 | 324 | +96 (+42%) |
| Manual RC items | ~60 | 100 | +40 (+67%) |
| Test files | 22 | 24 | +2 |
| Shared packages | 0 | 1 | +1 |

---

## 8. What's NOT Tested (Known Gaps)

| Gap | Risk | Planned |
|-----|------|---------|
| No Playwright E2E (browser) | Can't catch JS runtime errors, routing bugs | Phase 2 |
| No @brickos/ui isolated tests | Shared component regressions caught late | When 3+ consumers |
| No website tests | Static site could break silently | Phase 2 |
| No visual regression | UI drift undetected | Phase 3 |
| Fuzz targets are stubs | Parser crashes could go undetected | Phase 2 |
| No OWASP ZAP scans | Automated security scanning missing | Phase 2 |
| No DELETE conversation test | New endpoint not covered by DB tests | Sprint 007 |
| No import pipeline DB tests | ODS/CSV extraction not unit tested | Sprint 007 |
| No newsletter sync test | Signup->newsletter_subscribers not verified | Sprint 007 |

---

## 9. Sprint 006 Bugs and Their Test Coverage

| Bug Found | Root Cause | Prevention |
|-----------|-----------|------------|
| "Blutdruck diast." matched AST | 3-char "ast" substring matched inside "diast" | `test_no_false_positive_ast_in_diast` (new) |
| "Blutdruck syst." unmatched | No German BP aliases in marker_matcher | `test_match_blood_pressure_german` (new) |
| Wrong ODS sheet imported | Multi-sheet CSV picked alphabetically first | Manual RC section 9b |
| Protocol tags showed English in DE | Missing i18n for fasting/postprandial/standard | Manual RC section 9d + 14 |
| Language switch didn't update zones | Missing `locale` in useEffect deps | Manual RC layer 2 |
| React hydration error #418 | react-datepicker renders differently SSR vs client | Manual RC layer 11 |
| Newsletter subscribers empty | Signup didn't insert into newsletter_subscribers | Manual RC layer 10e + 12 |
| Dr. Alex no way back to landing | Same URL for landing and conversation | URL routing: `/doctor-chat` vs `/doctor-chat/[id]` |
| Deploy built from wrong path | Lowercase `projects/` symlink, stale Docker cache | Pre-deploy sanity check in deploy.sh |

---

## 10. Contributors

- **Helmut Schindlwick** - Product, Architecture, Test Scenarios, Manual Testing
- **Claude Code (Anthropic)** - Test Implementation, CI Pipeline, Bug Fixes

---

*Report generated 2026-03-21. Covers Sprint 006 (DX Hardening & UX Polish).*
*Previous report: v0.20.0-rc1 (2026-03-16).*
