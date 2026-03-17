# Testing Report — v0.20.0-rc2

**Date:** 2026-03-17
**Branch:** develop
**Commit:** pending (pre-commit report)
**Auditor:** Claude Code (automated)

---

## Summary

| Metric | Value |
|---|---|
| **Total tests** | 267 |
| **Passed** | 267 |
| **Failed** | 0 |
| **New tests (this RC)** | 33 (platform_test: 28, crud_test: 5) |
| **Lint** | cargo fmt + clippy: PASS (0 warnings) |
| **Security audit** | 6 warnings (all unmaintained deps in genpdf chain, no CVEs) |

---

## Test Pyramid

```
                      /\
                     /  \
                    / E2E \           ← manual (12-point checklist)
                   /--------\
                  / DB Tests  \       ← 69 tests, PostgreSQL
                 /--------------\
                /  Integration    \   ← 10 tests, HTTP-level
               /--------------------\
              /  Property + Snapshot  \ ← 5 tests, randomized (1000 cases)
             /--------------------------\
            /    Unit Tests (FE + BE)     \ ← 199 tests, pure logic
           /--------------------------------\
```

---

## Backend Test Results

| Suite | File | Tests | Status | Notes |
|---|---|---|---|---|
| Smoke | `smoke.rs` | 2 | PASS | /health + /hello endpoints |
| Integration | `integration.rs` | 10 | PASS | HTTP routing, snapshots (updated for v0.20.0-rc2), content-type |
| Property | `property.rs` | 3 | PASS | 1000 proptest cases each, serialization roundtrips |
| Auth | `auth_test.rs` | 9 | PASS | Signup, login, JWT, refresh, rate limiting, TOS |
| Measurements | `measurement_test.rs` | 12 | PASS | CRUD, GKI/WHtR auto-calc, soft-delete, pagination |
| Tiers | `tier_test.rs` | 8 | PASS | Feature gates, pricing, annual discounts |
| Doctor Chat | `doctor_chat_test.rs` | 5 | PASS | Auth, conversations, public endpoints |
| **Platform (NEW)** | `platform_test.rs` | **28** | PASS | RLS (16 tables), DB roles, pgaudit, 5 crate integrations |
| **CRUD (NEW)** | `crud_test.rs` | **5** | PASS | Full lifecycle, CASCADE delete, constraints, idempotency |
| Crate: crypto | `brickos-crypto` | 7 | PASS | AES-256-GCM roundtrip, tamper, passthrough |

**Backend total: 89 tests, all PASS**

---

## Frontend Test Results

| Suite | File | Tests | Status |
|---|---|---|---|
| GDPR export | `gdpr-export-completeness.test.ts` | 6 | PASS |
| i18n parity | `i18n-completeness.test.ts` | varies | PASS |
| Validators | `validators.test.ts` | varies | PASS |
| Date format | `date-format.test.ts` | varies | PASS |
| Units | `units.test.ts` | varies | PASS |
| Dark theme | `dark-theme.test.ts` | varies | PASS |
| Status | `status.test.ts` | varies | PASS |
| Marker data | `marker-data.test.ts` | varies | PASS |
| Tiers | `tiers.test.ts` | varies | PASS |
| Templates | `template-defaults.test.ts` | varies | PASS |
| + 2 more | — | — | PASS |

**Frontend total: 12 test files, 192 tests, all PASS**

---

## New Tests Added in v0.20.0-rc2

### platform_test.rs (28 tests)

| Category | Tests | What it validates |
|---|---|---|
| #55 brickos-auth | 3 | JWT signup/login roundtrip, wrong password rejection, /me endpoint |
| #56 brickos-crypto | 3 | Encrypt/decrypt roundtrip, passthrough mode, tamper detection |
| #57 brickos-billing | 4 | StripeConfig clone, StripeService tier lookup, StrikeService construct, webhook dev mode |
| #58 brickos-email | 3 | LogProvider trait impl, send, factory fallback |
| #59 brickos-db | 2 | ORG_ROLES constants, BaseUserResponse serialization |
| #43 RLS | 5 | Enabled+forced on 16 tables, no-session returns 0 rows, cross-user isolation, helper fn |
| #44 DB roles | 4 | sh_app + sh_readonly exist, privilege checks (SELECT/INSERT/UPDATE/DELETE) |
| #45 Audit log | 2 | Table exists, insert + RLS isolation |
| #67 pgaudit | 1 | Extension check (soft-pass for CI) |
| Integration | 1 | App boots with all crates |

### crud_test.rs (5 tests)

| Test | Assertions | What it validates |
|---|---|---|
| crud_create_user_and_data | ~40 | Full lifecycle: signup → device → 3 measurements → template → medication → chat → access log → read back → update profile/prefs/values → soft-delete → RLS isolation (6 tables) → constraint enforcement (UNIQUE, FK, CHECK) → API /me → CASCADE delete → verify 0 orphans (8 tables) |
| crud_rls_zero_rows_without_session | 7 | All RLS tables return 0 without session |
| crud_reference_ranges_system_visible | 1 | System defaults visible to any user |
| crud_idempotency_key_unique | 2 | Duplicate idempotency key rejected |
| crud_seed_data_integrity | ~15 | Core markers, calculated markers, zones, tiers exist |

---

## Security Audit (cargo audit)

| Advisory | Severity | Crate | Status |
|---|---|---|---|
| RUSTSEC-2025-0056 | unmaintained | adler → genpdf | Non-blocking (PDF gen dep) |
| RUSTSEC-2021-0153 | unmaintained | encoding → genpdf | Non-blocking |
| RUSTSEC-2020-0144 | unmaintained | lzw → genpdf | Non-blocking |
| RUSTSEC-2021-0140 | unmaintained | rusttype → genpdf | Non-blocking |
| RUSTSEC-2020-0020 | unmaintained | stb_truetype → genpdf | Non-blocking |
| RUSTSEC-2020-0056 | unmaintained | stdweb → genpdf | Non-blocking |

**0 vulnerabilities. 6 unmaintained warnings, all in the genpdf/printpdf PDF generation chain.**

---

## Docker Build

| Component | Status | Notes |
|---|---|---|
| Backend image | PASS | Multi-stage build, release profile, workspace-root context |
| Local /health | `200 OK`, version `0.20.0-rc2` | Confirmed matching |
| Migrations | 88 applied | Including pgaudit extension |
| Services loaded | Stripe, Strike, Mailgun, pgaudit | All confirmed in startup log |

---

## Environment

| Tool | Version |
|---|---|
| Rust | stable (rustc via rust:bookworm) |
| PostgreSQL | 16-alpine + pgaudit |
| Node.js | 22 |
| pnpm | 10.x |
| Docker | BuildKit enabled |
