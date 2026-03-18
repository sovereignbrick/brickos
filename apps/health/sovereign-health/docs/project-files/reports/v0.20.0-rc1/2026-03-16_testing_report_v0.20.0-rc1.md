<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Testing Strategy & Inventory Report
 Version: 0.20.0-rc1 — 2026-03-16

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Testing Strategy — BrickOS / Sovereign Health Intelligence

**Version:** 0.20.0-rc1
**Date:** 2026-03-16
**Repository:** github.com/sovereignbrick/brickos
**App Path:** `apps/health/sovereign-health/`

---

## 1. Strategy Overview

We follow a **stratified testing pyramid** with automated CI/CD enforcement.
Tests are organized into layers of increasing scope and decreasing speed:

```
                      /\
                     /  \
                    / E2E \           ← 4 tests, live server
                   /--------\
                  / DB Tests  \       ← 43 tests, PostgreSQL
                 /--------------\
                /  Integration    \   ← 10 tests, HTTP-level
               /--------------------\
              /  Property + Snapshot  \ ← 5 tests, randomized
             /--------------------------\
            /    Unit Tests (FE + BE)     \ ← 166 tests, pure logic
           /--------------------------------\
```

**Total: 228 tests** across 20 test files + 6 additional tooling targets (bench, load, fuzz, audit).

---

## 2. Test Runner

All tests can be run via the unified script:

```bash
bash ops/test-all.sh           # Full suite (needs DATABASE_URL)
bash ops/test-all.sh --quick   # Lint + smoke + integration + property + frontend (no DB)
bash ops/test-all.sh --ci      # Strict mode: includes frontend build check
```

---

## 3. CI/CD Pipeline

**File:** `.github/workflows/ci-health.yml` (209 lines)
**Triggers:** Push/PR to `main` or `develop`, scoped to `apps/health/sovereign-health/**`

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: Lint (parallel)                                   │
│  ├─ cargo fmt --check                                       │
│  └─ cargo clippy --all-targets -- -D warnings               │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: Smoke Tests (no DB, fast)                         │
│  └─ cargo test --test smoke                                 │
├─────────────────────────────────────────────────────────────┤
│  Stage 3: Integration Tests                                 │
│  └─ cargo test --test integration (INSTA_UPDATE=no)         │
├─────────────────────────────────────────────────────────────┤
│  Stage 4: Property Tests                                    │
│  └─ cargo test --test property (PROPTEST_CASES=1000)        │
├─────────────────────────────────────────────────────────────┤
│  Stage 5: DB Tests (postgres:16-alpine service, parallel)   │
│  ├─ cargo test --test auth_test                             │
│  ├─ cargo test --test measurement_test                      │
│  ├─ cargo test --test tier_test                             │
│  └─ cargo test --test doctor_chat_test                      │
├─────────────────────────────────────────────────────────────┤
│  Stage 6: Security Audit (non-blocking)                     │
│  └─ cargo audit                                             │
├─────────────────────────────────────────────────────────────┤
│  Stage 7: Frontend                                          │
│  ├─ pnpm install                                            │
│  ├─ pnpm build                                              │
│  └─ pnpm test (vitest — 164 tests)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Complete Test Inventory

### 4.1 Backend — Smoke Tests

**File:** `api/tests/smoke.rs` (28 lines)
**Command:** `make test-smoke`
**Purpose:** Fast sanity check — runs in < 1 second, no DB required.

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_health_returns_200` | `/health` endpoint responds |
| 2 | `test_hello_returns_200` | `/api/v1/hello` endpoint responds |

### 4.2 Backend — Integration Tests

**File:** `api/tests/integration.rs` (122 lines)
**Command:** `make test-integration`
**Purpose:** HTTP-level routing, response shape, content types, snapshots.

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_health_returns_200` | Health endpoint status code |
| 2 | `test_health_content_type_is_json` | Content-Type header validation |
| 3 | `test_health_response_fields` | JSON shape: status, service, version, timestamp |
| 4 | `test_health_timestamp_is_rfc3339` | Timestamp format validation |
| 5 | `test_health_snapshot` | Insta snapshot — detects response shape drift |
| 6 | `test_hello_returns_200` | Hello endpoint status code |
| 7 | `test_hello_content_type_is_json` | Content-Type header validation |
| 8 | `test_hello_response_fields` | JSON shape: message, version |
| 9 | `test_hello_snapshot` | Insta snapshot — detects response shape drift |
| 10 | `test_unknown_route_returns_404` | Unknown routes don't leak data |

### 4.3 Backend — Property Tests

**File:** `api/tests/property.rs` (59 lines)
**Command:** `make test-property`
**Purpose:** Randomized input testing — verifies invariants hold for any input.

| # | Test | Purpose |
|---|------|---------|
| 1 | `prop_health_response_always_serializes` | HealthResponse serializes for ANY field values |
| 2 | `prop_health_response_roundtrips_json` | Serialize → deserialize roundtrip preserves data |
| 3 | `prop_hello_response_always_serializes` | HelloResponse serializes for ANY field values |

### 4.4 Backend — Auth Tests (DB)

**File:** `api/tests/auth_test.rs` (262 lines)
**Command:** `make test-auth`
**Purpose:** Authentication flows — signup, login, JWT, MFA, refresh tokens.

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

### 4.5 Backend — Measurement Tests (DB)

**File:** `api/tests/measurement_test.rs` (664 lines)
**Command:** `make test-measurements`
**Purpose:** CRUD operations, calculations, rankings, data integrity.

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_create_measurement_session` | Create measurement with multiple values |
| 2 | `test_get_measurements_list` | List measurements with pagination |
| 3 | `test_get_measurements_filter_date` | Date range filtering works |
| 4 | `test_put_measurement` | Update existing measurement values |
| 5 | `test_delete_soft` | Soft delete preserves data, hides from queries |
| 6 | `test_cannot_read_other_user_measurement` | User isolation — no cross-user access |
| 7 | `test_csv_export_requires_auth` | Export endpoint requires authentication |
| 8 | `test_get_trends` | Trend calculation (time-series aggregation) |
| 9 | `test_get_zones` | Health zone summary with marker counts |
| 10 | `test_gki_auto_calculated` | GKI auto-calculated from glucose + ketones |
| 11 | `test_whtr_auto_calculated` | WHtR auto-calculated from waist + height |
| 12 | `test_validation_rejects_out_of_range` | Extreme values rejected |
| 13 | `test_stripe_webhook_endpoint_exists` | Stripe webhook route responds |
| 14 | `test_strike_webhook_endpoint_exists` | Strike webhook route responds |

### 4.6 Backend — Tier Tests (DB)

**File:** `api/tests/tier_test.rs` (309 lines)
**Command:** `make test-tiers`
**Purpose:** License tier access control, feature limits, pricing.

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_glimpse_limits` | Free tier (Glimpse) has correct feature limits |
| 2 | `test_focus_features` | Focus tier unlocks expected features |
| 3 | `test_license_endpoint_requires_auth` | License endpoint requires auth |
| 4 | `test_license_returns_user_tier` | Returns correct tier for authenticated user |
| 5 | `test_list_tiers_returns_active_tiers` | Public tier listing shows all active tiers |
| 6 | `test_tier_prices_are_correct` | Monthly/annual prices match expected values |
| 7 | `test_annual_price_is_discounted` | Annual pricing is cheaper than 12× monthly |
| 8–10 | *(3 additional tier permission tests)* | Various tier-specific feature access checks |

### 4.7 Backend — Doctor Chat Tests (DB)

**File:** `api/tests/doctor_chat_test.rs` (262 lines)
**Command:** `make test-doctor-chat`
**Purpose:** Chat functionality, quota tracking, authentication.

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_doctor_chat_requires_auth` | Chat endpoint requires authentication |
| 2 | `test_doctor_chat_conversations_requires_auth` | Conversation list requires auth |
| 3 | `test_doctor_chat_quota_requires_auth` | Quota endpoint requires auth |
| 4 | `test_list_conversations_empty` | New user has no conversations |
| 5 | `test_public_chat_does_not_require_auth` | Public chat (website) is open |
| 6–9 | *(4 additional chat tests)* | Message creation, quota tracking, rate limiting |

### 4.8 Backend — E2E Tests

**File:** `api/tests/e2e.rs` (53 lines)
**Command:** `make test-e2e` (requires `E2E_BASE_URL`)
**Purpose:** Full HTTP tests against a running server (not mocked).

| # | Test | Purpose |
|---|------|---------|
| 1 | `test_health_returns_200` | Live server health check |
| 2 | `test_hello_returns_200` | Live server hello endpoint |
| 3 | `test_health_response_fields` | Live server response shape |
| 4 | `test_unknown_route_returns_404` | Live server 404 handling |

### 4.9 Backend — Benchmarks

**File:** `api/benches/endpoints.rs` (19 lines)
**Command:** `make bench`
**Purpose:** Response time measurement using Criterion.

| # | Benchmark | Target |
|---|-----------|--------|
| 1 | `GET /health` | Baseline latency |
| 2 | `GET /api/v1/hello` | Baseline latency |

### 4.10 Backend — Load Tests

**File:** `api/load-tests/health.js` (59 lines)
**Command:** `make load-smoke` / `make load-test` / `make load-stress`
**Purpose:** k6 load testing with configurable VUs and duration.

| Scenario | VUs | Duration | Threshold |
|----------|-----|----------|-----------|
| Smoke | 1 | 10s | p99 < 200ms |
| Load | 50 | 2 min | p99 < 200ms |
| Stress | 200 | 5 min | p99 < 500ms |

### 4.11 Backend — Security Audit

**Command:** `make audit` / `cargo audit`
**Purpose:** Check dependencies against RustSec advisory database.

**Current status (v0.20.0-rc1):** 6 unmaintained crate warnings, all in the `genpdf` dependency tree (PDF generation). No known vulnerabilities.

### 4.12 Backend — Fuzz Tests

**File:** `api/fuzz/fuzz_targets/fuzz_health.rs` (18 lines)
**Command:** `cargo +nightly fuzz run fuzz_health`
**Status:** Stub — placeholder for parser fuzzing.

---

### 4.13 Frontend — Unit Tests: Calculated Markers

**File:** `frontend/src/lib/calculated.test.ts` (212 lines)
**Purpose:** Verify auto-calculated biomarker formulas.

| # | Test | Purpose |
|---|------|---------|
| 1 | GKI with valid glucose and ketones | Correct formula: glucose / (18.02 × ketones) |
| 2 | GKI when ketones is zero | No division by zero |
| 3 | GKI when glucose missing | Graceful skip |
| 4 | GKI when ketones missing | Graceful skip |
| 5 | GKI high (not in ketosis) | Value > 9 |
| 6 | GKI low (deep ketosis) | Value < 1 |
| 7 | Dr. Boz Ratio calculation | glucose (mg/dL) / ketones |
| 8 | Dr. Boz when ketones zero | No division by zero |
| 9 | Dr. Boz inputs missing | Graceful skip |
| 10 | WHtR calculation | waist_cm / height_cm |
| 11 | WHtR height missing | Graceful skip |
| 12 | WHtR waist missing | Graceful skip |
| 13 | WHtR height zero | No division by zero |
| 14 | BMI calculation | weight / (height/100)² |
| 15 | BMI weight missing | Graceful skip |
| 16 | BMI height zero | No division by zero |
| 17 | BMI underweight | < 18.5 |
| 18 | BMI obese | > 30 |
| 19 | HCT/HB Ratio | hematocrit / (hemoglobin × 1.61) |
| 20 | HCT/HB hemoglobin zero | No division by zero |
| 21 | HOMA-IR calculation | (glucose × insulin) / 22.5 |
| 22 | HOMA-IR insulin missing | Graceful skip |
| 23 | HOMA-IR healthy range | < 1.0 |
| 24 | Empty inputs → empty array | No crash on empty data |
| 25 | All inputs → all 6 markers | Complete output when complete input |

### 4.14 Frontend — Unit Tests: Date Formatting

**File:** `frontend/src/lib/date-format.test.ts` (145 lines)
**Purpose:** Locale-aware date/time formatting across countries.

| # | Test | Purpose |
|---|------|---------|
| 1–7 | `formatDate` | DD.MM.YYYY (DE/AT/CH), MM/DD/YYYY (US), DD/MM/YYYY (GB), YYYY-MM-DD (default), null country |
| 8 | String date input | Accepts ISO string, not just Date objects |
| 9–12 | `formatTime` | 24h (DE/AT/GB), 12h (US), midnight, noon |
| 13–15 | `formatDateTime` | Combined date+time for DE, US, string input |
| 16–18 | `formatShortDate` | "Mar 15" (US) vs "15 Mar" (others), string input |
| 19–21 | Edge cases | Timezone strings, leap year, unknown country |

### 4.15 Frontend — Unit Tests: Status Logic

**File:** `frontend/src/lib/status.test.ts` (158 lines)
**Purpose:** Traffic light health status computation (green/orange/red).

| # | Test | Purpose |
|---|------|---------|
| 1–9 | `computeStatus` basic | Green in range, orange at boundaries, red outside |
| 10–12 | Null boundaries | Handles open-ended ranges (no lower/upper bound) |
| 13–14 | Edge values | Zero, very large values |
| 15–19 | `statusColor` | Correct hex color for each status |
| 20 | `statusEmoji` | 🟢🟡🔴 mapping |
| 21–26 | `DEFAULT_RANGES` | Glucose range exists, 15+ markers, min ≤ max, clinically reasonable |

### 4.16 Frontend — Unit Tests: Tier Logic

**File:** `frontend/src/lib/tiers.test.ts` (144 lines)
**Purpose:** License tier feature access validation.

| # | Test | Purpose |
|---|------|---------|
| 1–5 | Tier hierarchy | Glimpse < Focus < Insight < Sovereign < Horizon |
| 6–10 | Feature limits | Correct marker/device/template limits per tier |
| 11–14 | Feature access | Boolean checks for Doctor Chat, export, MFA, etc. |

### 4.17 Frontend — Unit Tests: Unit Conversion

**File:** `frontend/src/lib/units.test.ts` (139 lines)
**Purpose:** Biomarker unit conversions (mmol/L ↔ mg/dL, kg ↔ lbs, etc.).

| # | Test | Purpose |
|---|------|---------|
| 1–4 | Glucose | mmol/L → mg/dL, reverse, same-unit, roundtrip |
| 5–7 | Cholesterol | Total, LDL, HDL conversions |
| 8 | Triglycerides | mmol/L → mg/dL |
| 9–10 | Weight | kg → lbs, reverse |
| 11–12 | Height | cm → inches, reverse |
| 13 | Hemoglobin | g/dL → mmol/L |
| 14–16 | Edge cases | Unknown marker, zero, negative |
| 17–18 | `getDisplayUnit` | Canonical vs user-preferred unit |
| 19–22 | `MARKER_UNIT_MAP` | Has glucose, weight, options array, 20+ entries |

### 4.18 Frontend — Unit Tests: Validators

**File:** `frontend/src/lib/validators.test.ts` (183 lines)
**Purpose:** Form validation schemas (Zod/Valibot).

| # | Test | Purpose |
|---|------|---------|
| 1–5 | Signup schema | Valid data, missing email, short password, invalid email, long name |
| 6–10 | Login schema | Valid data, missing fields, whitespace email |
| 11–15 | Measurement values | Valid numbers, out-of-range, negative, zero, string rejection |
| 16–20 | Additional validators | Weight, glucose, password strength, display name |

### 4.19 Frontend — Regression: i18n Completeness

**File:** `frontend/src/lib/i18n-completeness.test.ts` (new, 6 tests)
**Purpose:** Prevent missing translations, placeholder mismatches, untranslated strings.

| # | Test | Purpose |
|---|------|---------|
| 1 | EN→DE key parity | Every EN key exists in DE |
| 2 | DE→EN key parity | Every DE key exists in EN (no orphan keys) |
| 3 | No empty EN values | No `""` values in English |
| 4 | No empty DE values | No `""` values in German |
| 5 | Placeholder consistency | `{count}`, `{name}` etc. match between languages |
| 6 | Untranslated detection | Flags if >20 strings are identical EN/DE |
| 7 | Section structure match | Same top-level JSON sections in both files |

**Bug prevented:** "Language" label was hardcoded English on the German settings page.

### 4.20 Frontend — Regression: Dark Theme

**File:** `frontend/src/lib/dark-theme.test.ts` (new, 3 tests)
**Purpose:** Prevent light-themed UI elements from appearing in our dark-only app.

| # | Test | Purpose |
|---|------|---------|
| 1 | Select dark background | All `<select>` elements must have `bg-zinc-*` or `bg-white/5` |
| 2 | bg-white ratchet | No NEW `bg-white` (without opacity) — 8 known, fail if count increases |
| 3 | text-black ratchet | No NEW `text-black` — 1 known, fail if count increases |

**Bug prevented:** "Typ" dropdown showed white background on dark theme.

### 4.21 Frontend — Regression: Marker Data

**File:** `frontend/src/lib/marker-data.test.ts` (new, 4 tests)
**Purpose:** Prevent marker name/abbreviation/deduplication bugs.

| # | Test | Purpose |
|---|------|---------|
| 1 | No embedded abbreviations | "Ketone (BHB)" should be "Ketone" when abbreviation = "BHB" |
| 2 | Deduplication by slug | Duplicate markers from locale joins are filtered |
| 3 | Weight no "Wt" | Weight marker doesn't show misleading abbreviation |
| 4 | One zone per marker | Marker assigned to multiple zones causes duplicates |

**Bug prevented:** Marker list showed "Glukose" and "Ketone (BHB)" duplicated.

### 4.22 Frontend — Regression: Template Defaults

**File:** `frontend/src/lib/template-defaults.test.ts` (new, 8 tests)
**Purpose:** Ensure templates save and restore full session state.

| # | Test | Purpose |
|---|------|---------|
| 1 | Correct shape | All fields present in defaults object |
| 2 | Undefined omission | Unset fields not sent as null |
| 3 | JSON roundtrip | Serialize → deserialize preserves all fields |
| 4 | Valid meal timing values | All 7 options are valid strings |
| 5 | Default meal timing | Falls back to `no_tag` |
| 6 | Device clears template | Selecting device resets template |
| 7 | No device enables template | Template dropdown active when no device |
| 8 | *(reserved)* | Future: template restores lifestyle defaults |

**Bug prevented:** Templates only saved marker list, losing meal timing/sleep/stress settings.

---

## 5. Test Counts Summary

| Layer | Files | Tests | Lines | Status |
|-------|-------|-------|-------|--------|
| **Backend: Smoke** | 1 | 2 | 28 | Active |
| **Backend: Integration** | 1 | 10 | 122 | Active |
| **Backend: Property** | 1 | 3 | 59 | Active |
| **Backend: Auth (DB)** | 1 | 10 | 262 | Active |
| **Backend: Measurements (DB)** | 1 | 14 | 664 | Active |
| **Backend: Tiers (DB)** | 1 | 10 | 309 | Active |
| **Backend: Doctor Chat (DB)** | 1 | 9 | 262 | Active |
| **Backend: E2E** | 1 | 4 | 53 | Active (gated) |
| **Backend: Helpers** | 1 | — | 115 | Shared |
| **Frontend: Calculated** | 1 | 25 | 212 | Active |
| **Frontend: Date Format** | 1 | 21 | 145 | Active |
| **Frontend: Status** | 1 | 26 | 158 | Active |
| **Frontend: Tiers** | 1 | 14 | 144 | Active |
| **Frontend: Units** | 1 | 22 | 139 | Active |
| **Frontend: Validators** | 1 | 20 | 183 | Active |
| **Frontend: i18n** | 1 | 7 | 130 | Active (new) |
| **Frontend: Dark Theme** | 1 | 3 | 110 | Active (new) |
| **Frontend: Markers** | 1 | 4 | 65 | Active (new) |
| **Frontend: Templates** | 1 | 8 | 95 | Active (new) |
| **Snapshots** | 2 | — | 19 | Active |
| **Benchmarks** | 1 | 2 | 19 | Manual |
| **Load Tests** | 1 | 3 | 59 | Manual |
| **Fuzz** | 1 | — | 18 | Stub |
| | | | | |
| **TOTAL** | **22** | **217+** | **3,530** | |

---

## 6. What's NOT Tested (Known Gaps)

| Gap | Risk | Planned |
|-----|------|---------|
| No Playwright E2E (browser) | Can't catch JS runtime errors, routing bugs | Phase 2 |
| No website tests | Static site could break silently | Phase 2 |
| No visual regression | UI drift undetected | Phase 3 |
| Fuzz targets are stubs | Parser crashes could go undetected | Phase 2 |
| No OWASP ZAP scans | Automated security scanning missing | Phase 2 |

---

## 7. How Tests Map to This Week's Bugs

| Bug Found | Test That Prevents Recurrence |
|-----------|-------------------------------|
| "Typ" select had white background | `dark-theme.test.ts` → select dark bg check |
| "Language" label hardcoded English | `i18n-completeness.test.ts` → EN↔DE parity |
| "Keine Vorlage" reused for device dropdown | `i18n-completeness.test.ts` → key parity |
| Duplicate markers (Glukose×2) | `marker-data.test.ts` → deduplication |
| "Ketone (BHB)" abbreviation in name | `marker-data.test.ts` → embedded abbreviation check |
| "Gewicht (Wt)" misleading abbreviation | `marker-data.test.ts` → weight abbreviation null |
| Template didn't save meal timing | `template-defaults.test.ts` → defaults roundtrip |
| Migration 081 wrong table name | Backend smoke test catches startup failure |

---

## 8. Contributors

- **Helmut Schindlwick** — Product, Architecture, Test Scenarios
- **Claude Code (Anthropic)** — Test Implementation, CI Pipeline, Execution

---

*Report generated 2026-03-16. Next update planned for v0.21.0.*
