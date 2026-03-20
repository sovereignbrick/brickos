<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Testing Report
 Version: 0.22.0 — 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Testing Report — v0.22.0 (Sprint 004: Polish & Precision)

**Date:** 2026-03-20
**Environment:** localhost (dev)
**Previous version:** v0.21.0
**Branch:** develop
**Tester:** Claude Code (automated) + manual review

---

## Summary

| Metric | Value |
|--------|-------|
| Backend test suites | 3 passed, 0 failed, 1 skipped (DB) |
| Backend tests | 15 passed |
| Frontend test files | 12 passed |
| Frontend tests | 192 passed |
| Lint checks | 2 passed (fmt + clippy) |
| Theme violations | 0 |
| Security advisories | 0 vulnerabilities, 6 unmaintained warnings |
| **Overall** | **PASS** |

---

## Test Pyramid

```
                    ┌─────────┐
                    │  E2E    │  ← Requires running server (staging)
                   ─┤ (manual)├─
                  / └─────────┘ \
                 /                \
                ┌──────────────────┐
                │   Integration    │  10 tests — HTTP-level via actix_web::test
               ─┤   + Snapshots   ├─
              / └──────────────────┘ \
             /                        \
            ┌──────────────────────────┐
            │   Property-based (100)   │  3 tests × 100 cases — serialization invariants
           ─┤   + Smoke (fast)        ├─
          / └──────────────────────────┘ \
         /                                \
        ┌──────────────────────────────────┐
        │   Frontend Unit (vitest)         │  192 tests, 12 files — validators, hooks, utils
        └──────────────────────────────────┘
```

---

## Backend Test Results

### Lint

| Check | Command | Result | Duration |
|-------|---------|--------|----------|
| Formatting | `cargo fmt --check -p sovereign-health-backend` | ✅ PASS | <1s |
| Clippy | `cargo clippy -p sovereign-health-backend --all-targets -- -D warnings` | ✅ PASS | 13.1s |

### Smoke Tests

| Test | Result |
|------|--------|
| `smoke_health_endpoint_responds` | ✅ PASS |
| `smoke_hello_endpoint_responds` | ✅ PASS |

**Suite:** 2 passed, 0 failed — 0.14s

### Integration Tests

| Test | Result |
|------|--------|
| `test_health_returns_200` | ✅ PASS |
| `test_health_content_type_is_json` | ✅ PASS |
| `test_health_response_fields` | ✅ PASS |
| `test_health_timestamp_is_rfc3339` | ✅ PASS |
| `test_health_snapshot` | ✅ PASS |
| `test_hello_returns_200` | ✅ PASS |
| `test_hello_content_type_is_json` | ✅ PASS |
| `test_hello_response_fields` | ✅ PASS |
| `test_hello_snapshot` | ✅ PASS |
| `test_unknown_route_returns_404` | ✅ PASS |

**Suite:** 10 passed, 0 failed — 0.34s
**Snapshot validation:** `INSTA_UPDATE=no` — no unreviewed snapshot changes

### Property-Based Tests

| Test | Cases | Result |
|------|-------|--------|
| `prop_health_response_roundtrips_json` | 100 | ✅ PASS |
| `prop_hello_response_always_serializes` | 100 | ✅ PASS |
| `prop_health_response_always_serializes` | 100 | ✅ PASS |

**Suite:** 3 passed (300 total cases), 0 failed — 0.02s

### Database Tests (skipped)

| Test Suite | Result | Reason |
|------------|--------|--------|
| `auth_test` | ⏭️ SKIP | `DATABASE_URL` not set (no local DB) |
| `measurement_test` | ⏭️ SKIP | `DATABASE_URL` not set |
| `tier_test` | ⏭️ SKIP | `DATABASE_URL` not set |
| `doctor_chat_test` | ⏭️ SKIP | `DATABASE_URL` not set |
| `crud_test` | ⏭️ SKIP | `DATABASE_URL` not set |
| `platform_test` | ⏭️ SKIP | `DATABASE_URL` not set |

**Note:** DB tests require a running PostgreSQL instance. These will be exercised implicitly during staging manual testing.

---

## Frontend Test Results

| File | Tests | Result |
|------|-------|--------|
| 12 test files | 192 tests total | ✅ ALL PASS |

**Runner:** vitest v4.1.0
**Duration:** 731ms (transform 868ms, setup 0ms, import 1.20s, tests 195ms)

---

## Theme Color Audit

| Check | Result |
|-------|--------|
| Critical violations (hardcoded dark backgrounds/borders) | 0 |
| Warnings (opacity-based dark patterns) | 0 |
| text-white audit | 0 (no false positives) |

**Result:** ✅ PASS — No theme violations found

---

## Security Audit

**Tool:** `cargo audit` (RustSec advisory database, 958 advisories)
**Vulnerabilities:** 0
**Warnings:** 6 (all unmaintained transitive dependencies)

| Crate | Version | Advisory | Severity | Source |
|-------|---------|----------|----------|--------|
| `adler` | 1.0.2 | RUSTSEC-2025-0056 | Unmaintained | `genpdf` → `printpdf` → `image` → `tiff` |
| `encoding` | 0.2.33 | RUSTSEC-2021-0153 | Unmaintained | `genpdf` → `printpdf` → `lopdf` |
| `lzw` | 0.10.0 | RUSTSEC-2020-0144 | Unmaintained | `genpdf` → `printpdf` → `lopdf` |
| `rusttype` | 0.8.3 | RUSTSEC-2021-0140 | Unmaintained | `genpdf` → `printpdf` |
| `stb_truetype` | 0.3.1 | RUSTSEC-2020-0020 | Unmaintained | `genpdf` → `printpdf` → `rusttype` |
| `stdweb` | 0.4.20 | RUSTSEC-2020-0056 | Unmaintained | `genpdf` → `printpdf` → `lopdf` → `time` |

**Assessment:** All 6 warnings are unmaintained transitive dependencies pulled in by `genpdf`/`printpdf` (PDF invoice generation). No known security vulnerabilities. The root cause is `genpdf` using older versions of `printpdf` and `lopdf`. Upgrading `genpdf` to a newer version (if available) would resolve these. Low risk — these crates are only used for PDF rendering, not for security-sensitive operations.

---

## Build Verification

| Check | Result |
|-------|--------|
| `cargo check -p sovereign-health-backend` | ✅ PASS (2.57s) |
| `cargo clippy -p sovereign-health-backend -- -D warnings` | ✅ PASS (13.1s) |
| Notification service compiles | ✅ PASS |
| New migration (103) syntax valid | ✅ PASS |

---

## Sprint 004 Change Coverage

| Change | Automated Test | Manual Test Required |
|--------|---------------|---------------------|
| P1-1: MFA TOTP issuer | — | A1: Scan QR code, verify issuer name |
| P1-2: Exercise dropdown | — | A2: Verify new options in dropdown |
| P1-3: Light theme tooltip | Theme audit ✅ | A3: Visual tooltip check |
| P1-4: Dr. Alex banner removal | — | A4: Verify banner gone |
| P1-5: Powder dosage form | — | A5: Verify dropdown option |
| P1-6: Supplement toast link | — | A6: Verify toast link |
| P2-1: Locale decimals | — | A7: Input both `,` and `.` |
| P2-3: Security two-column | — | A8: Visual layout check |
| P2-4: Privacy two-column | — | A9: Visual layout check |
| P2-5: Influence factors text | — | A10: Verify explanation text |
| P2-6: Edit layout | — | A11: Verify column labels |
| P3-1: Search ranking | — | A12: Search "muscle" |
| P3-2: Photo validation | — | A13: Try >3 photos |
| P3-3: Dr. Alex results | — | A14: Brand + inline editing |
| Notify service | Clippy + build ✅ | A15: Check startup log |
| Migration 103 | Build ✅ | A16: Verify tables dropped |
| Notification hooks (17) | Clippy + build ✅ | A15: Trigger events |

**Note:** Most Sprint 004 changes are frontend UX improvements that require manual visual verification on staging. The automated suite validates that no regressions were introduced to the backend API contract (health, hello, routing, serialization).

---

## Environment

| Component | Version |
|-----------|---------|
| Rust | 1.83+ |
| Cargo | 1.83+ |
| Node | 22.x |
| pnpm | 9.x |
| vitest | 4.1.0 |
| OS | Linux 6.18.7 |
| Platform | x86_64 |

---

## Next Steps

1. Version bump to 0.22.0 (`bash ops/bump-version.sh 0.22.0`)
2. Deploy to staging (`bash ops/deploy.sh staging`)
3. Run manual testing checklist (v0.22.0, 100+ items)
4. Promote to production after staging verification
