<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Testing Architecture — BrickOS Monorepo

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Sovereign Health — Testing Architecture

## Overview

Stratified testing approach across backend (Rust), frontend (Next.js), and website (static).
All paths relative to `apps/health/sovereign-health/`.

---

## Testing Pyramid

```
                    /\
                   /  \
                  / E2E \          <- Few, slow, high confidence
                 /--------\
                /Integration\      <- Medium count, medium speed
               /--------------\
              /   Unit Tests    \  <- Many, fast, focused
             /--------------------\
```

---

## Test Inventory

### Backend (`api/`)

| Type | File | Lines | Command | Status |
|------|------|-------|---------|--------|
| Smoke | `tests/smoke.rs` | 28 | `make test-smoke` | Active |
| Integration | `tests/integration.rs` | 122 | `make test-integration` | Active |
| Property | `tests/property.rs` | 59 | `make test-property` | Active |
| Auth (DB) | `tests/auth_test.rs` | 262 | `make test-auth` | Active |
| Measurements (DB) | `tests/measurement_test.rs` | 664 | `make test-measurements` | Active |
| Tiers (DB) | `tests/tier_test.rs` | 309 | `make test-tiers` | Active |
| Doctor Chat (DB) | `tests/doctor_chat_test.rs` | 262 | `make test-doctor-chat` | Active |
| E2E | `tests/e2e.rs` | 53 | `make test-e2e` | Active (needs `E2E_BASE_URL`) |
| Snapshots | `tests/snapshots/*.snap` | 19 | `make snapshot-review` | Active (insta) |
| Benchmarks | `benches/endpoints.rs` | 19 | `make bench` | Manual only |
| Load (smoke) | `load-tests/health.js` | 59 | `make load-smoke` | Manual (k6) |
| Load (full) | `load-tests/health.js` | — | `make load-test` | Manual (k6) |
| Load (stress) | `load-tests/health.js` | — | `make load-stress` | Manual (k6) |
| Fuzz | `fuzz/fuzz_targets/fuzz_health.rs` | 18 | `cargo +nightly fuzz run` | Stub |
| Shared helpers | `tests/common/mod.rs` | 115 | — | Critical |
| **Total** | | **1,874** | | |

**Dev-dependencies:** proptest, insta (JSON), criterion, reqwest (rustls-tls)

### Frontend (`frontend/`)

| Type | File | Lines | Command | Status |
|------|------|-------|---------|--------|
| Calculated markers | `src/lib/calculated.test.ts` | 212 | `pnpm test` | Active |
| Date formatting | `src/lib/date-format.test.ts` | 145 | `pnpm test` | Active |
| Status logic | `src/lib/status.test.ts` | 158 | `pnpm test` | Active |
| Tier access | `src/lib/tiers.test.ts` | 144 | `pnpm test` | Active |
| Unit conversion | `src/lib/units.test.ts` | 139 | `pnpm test` | Active |
| Validators | `src/lib/validators.test.ts` | 183 | `pnpm test` | Active |
| Browser checklist | `src/__tests__/BROWSER_TEST_CHECKLIST.md` | 49 | Manual | Active |
| **Total** | | **981** | | |

**Config:** `vitest.config.ts` — environment: node, globals: true, alias: `@/` -> `src/`

### Website (`website/`)

| Type | Status |
|------|--------|
| No tests | Not yet implemented |

### CI/CD (`.github/workflows/ci-health.yml`)

Pipeline stages (209 lines):
1. **Lint** — `cargo fmt` + `cargo clippy` (parallel)
2. **Smoke** — `cargo test --test smoke` (no DB)
3. **Integration** — `cargo test --test integration` (INSTA_UPDATE=no)
4. **Property** — `cargo test --test property` (1000 cases)
5. **DB Tests** — auth, measurements, tiers, doctor_chat (postgres:16 service, parallel)
6. **Security** — `cargo audit` (non-blocking)
7. **Frontend** — `pnpm install` + `pnpm build` + `pnpm test`

Triggers: push/PR to `main`/`develop`, paths: `apps/health/sovereign-health/**`

---

## Critical: Test Helpers

### `tests/common/mod.rs` — `build_test_app()`

Every integration test MUST use `build_test_app()`. Route handlers extract `web::Data<T>` for Config, Encryptor, EmailProvider, AuthRateLimiters, etc. Missing any causes a silent 500.

```rust
// CORRECT
let app = build_test_app(&pool).await;

// WRONG — will get 500 on any handler that needs Config/Encryptor/etc.
let app = test::init_service(
    App::new().app_data(pool.clone()).configure(configure_routes)
).await;
```

### `test_get()` / `test_post()` — Peer Address

All rate-limited routes (auth, chat) require `peer_addr`. Use the helpers:
```rust
let req = test_get("/health");   // Pre-sets peer_addr
let req = test_post("/auth/login", &body);
```

---

## Quick Reference: Running Tests

### Backend
```bash
cd apps/health/sovereign-health/api

make test              # smoke + integration + property (standard dev loop)
make test-smoke        # fast: 2 tests, no DB
make test-integration  # HTTP-level: routing, snapshots, content-type
make test-property     # proptest: 1000 random cases
make test-db           # all DB tests (needs DATABASE_URL)
make test-auth         # auth flows: signup, login, MFA, refresh
make test-measurements # CRUD, rankings, calculations
make test-tiers        # tier permissions, feature limits
make test-doctor-chat  # chat messages, quota tracking
make test-e2e          # E2E against live server (needs E2E_BASE_URL)
make lint              # fmt + clippy -D warnings
make audit             # cargo audit (security advisories)
make bench             # criterion benchmarks
make load-smoke        # k6: 1 VU, 10s
make load-test         # k6: 50 VUs, 2 min
make load-stress       # k6: 200 VUs, 5 min
make snapshot-review   # review changed insta snapshots
```

### Frontend
```bash
cd apps/health/sovereign-health/frontend

pnpm test              # run all vitest tests
pnpm test:watch        # watch mode
pnpm test:coverage     # with v8 coverage report
```

### Full Suite (from repo root)
```bash
# Run everything
cd apps/health/sovereign-health
bash ops/test-all.sh
```

---

## Responsibility Split

| Role | Responsibilities |
|------|-----------------|
| **Helmut (swickDoctor)** | Write test scenarios, review test code, analyze results, acceptance criteria |
| **Claude Code** | Write all test code, run locally, fix failures, set up infrastructure, CI pipelines |
| **GitHub Actions** | Automated: unit + integration + property + DB tests + security audit + frontend tests |

---

## What's Implemented vs Planned

### Active (Phase 1)
- [x] Backend: smoke, integration, property, DB tests (1,874 lines)
- [x] Backend: snapshot tests (insta)
- [x] Backend: E2E tests (reqwest)
- [x] Backend: benchmarks (criterion)
- [x] Backend: load tests (k6)
- [x] Backend: fuzz stubs (cargo-fuzz)
- [x] Backend: security audit (cargo audit)
- [x] Frontend: unit tests (vitest, 981 lines)
- [x] Frontend: coverage reporting (v8)
- [x] CI/CD: full pipeline (GitHub Actions)
- [x] Shared test helpers (build_test_app, peer_addr)

### Planned (Phase 2)
- [ ] Frontend: E2E tests (Playwright)
- [ ] Frontend: component snapshot tests
- [ ] Website: basic smoke tests
- [ ] Nightly: full fuzz + extended property tests
- [ ] OWASP ZAP security scans
- [ ] Coverage tracking over time

### Future (Phase 3)
- [ ] Visual regression (Playwright screenshots)
- [ ] Performance budgets in CI (fail if p95 > 200ms)
- [ ] Chaos testing (container failure recovery)
- [ ] Formal penetration testing
