# 013 - BrickOS Platform Testing Architecture

**Version:** 1.0
**Date:** 2026-04-06
**Status:** Draft
**Elevated from:** `apps/health/sovereign-health/docs/project-files/design/old-design/TESTING_ARCHITECTURE.md`

---

## 1. Problem Statement

The existing testing architecture is SHI-specific. As BrickOS grows beyond one app, we need:

1. **Platform-level tests** - DB migrations, schema integrity, cross-app integration
2. **Per-app tests** - each app owns its unit, integration, and E2E tests
3. **Shared test infrastructure** - common helpers, test users, DB setup
4. **Smoke tests that cover the whole platform** - not just SHI
5. **Missing coverage** - Sovereign Voice has zero tests, Sovereign Link has no smoke/E2E, platform crates have 7 test functions total

### Current State (Inventory)

```
TOTAL: ~9,053 lines of test code

SHI Backend (Rust)           4,395 lines   13 test files    Active
SHI Frontend Unit (Vitest)   3,038 lines   17 test files    Active
SHI Frontend E2E (Playwright) 1,110 lines  11 spec files    Active
Sovereign Link (Rust)          503 lines    2 test files     Active
Sovereign Voice (TypeScript)     0 lines    0 test files     MISSING
Platform Crates (Rust)           7 functions 1 file          MINIMAL
Platform Smoke Tests             0 files                     MISSING
Cross-App Integration            0 files                     MISSING
```

### Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No platform-level smoke test | Schema migrations could break multiple apps silently | P0 |
| No Sovereign Voice tests | NOSTR publishing untested | P1 |
| No cross-app integration tests | Sovereign Voice -> Sovereign Link API untested | P1 |
| Platform crates barely tested | brickos-auth, brickos-crypto, brickos-db have ~7 test functions | P1 |
| No Sovereign Link E2E/smoke | Standalone deployment untested end-to-end | P2 |
| Staging smoke test is SHI-only | Doesn't check Sovereign Voice, Sovereign Link, or DB schema | P2 |
| No DB migration tests | Platform migrations tested manually, not automated | P2 |

---

## 2. Target Testing Architecture

### Testing Pyramid (Platform-Level)

```
                         /\
                        /  \
                       / RC  \           <- Release candidate: full E2E + smoke
                      / Tests \             across all apps (Playwright + bash)
                     /----------\
                    / Cross-App   \      <- Service integration: Voice->Link API
                   / Integration   \        DB schema consistency checks
                  /------------------\
                 / App Integration    \  <- Per-app: HTTP endpoints, DB queries
                / & E2E Tests          \    SHI: auth, measurements, chat
               /------------------------\   SL: links CRUD, redirect, QR
              / App Unit Tests            \ <- Per-app: functions, models, validation
             /------------------------------\  SHI: 4,395 LOC. SL: 503 LOC. Voice: 0.
            / Platform Unit Tests            \<- Shared crates: crypto, auth, db models
           /----------------------------------\  Currently: 7 functions. Target: 50+.
```

### Directory Structure

```
/tests/                                     # NEW: Platform-level tests
|-- platform-smoke.sh                       # Bash: health checks all apps + DB
|-- platform-db-test.sh                     # SQL consistency checks after migration
|-- cross-app-integration.sh                # Voice->Link API, Link->SHI redirect
|
/crates/
|-- brickos-auth/src/lib.rs                 # #[cfg(test)] module: JWT, Argon2, MFA
|-- brickos-crypto/src/lib.rs               # #[cfg(test)] module: AES-256-GCM
|-- brickos-db/src/lib.rs                   # #[cfg(test)] module: model validation
|-- brickos-db/tests/                       # NEW: migration tests (needs test DB)
|   +-- migration_test.rs
|
/apps/health/sovereign-health/
|-- api/tests/                              # EXISTING: 13 test files (4,395 LOC)
|-- frontend/src/**/*.test.ts               # EXISTING: 17 test files (3,038 LOC)
|-- frontend/e2e/                           # EXISTING: 11 spec files (1,110 LOC)
|-- ops/staging-smoke-test.sh               # EXISTING: SHI-specific smoke (needs update)
|
/apps/technology/sovereign-link/
|-- tests/unit.rs                           # EXISTING: 17 tests
|-- tests/integration.rs                    # EXISTING: 18 tests
|-- tests/smoke.sh                          # NEW: standalone deployment smoke
|-- tests/e2e.sh                            # NEW: redirect, QR, API via curl
|
/apps/attention/sovereign-voice/
|-- tests/                                  # NEW: everything
|   |-- publisher.test.ts                   # Unit: event creation, tag building
|   |-- scheduler.test.ts                   # Unit: cron parsing, state management
|   |-- config.test.ts                      # Unit: config loading, validation
|   +-- integration.test.ts                 # Integration: publish to test relay
```

---

### Database-Per-App Testing (ADR-041, Design 018 v2)

With separate databases per app (brickos, shi, sli, scr, svo), tests must verify:

1. **Platform DB isolation:** Each app can read brickos DB (users, orgs) but NOT write to it
2. **App DB isolation:** Each app writes only to its own database
3. **Two-pool connectivity:** Each app connects to both platform + app database
4. **Migration independence:** Running shi migrations does not affect sli or brickos
5. **Cross-app service calls:** SHI -> SLI via service account API (encrypted HTTP, not shared DB)

**Test database setup:**
```bash
# Create test databases (mirrors production topology)
createdb brickos_test
createdb shi_test
createdb sli_test
createdb scr_test

# Run platform migrations first
psql brickos_test < crates/brickos-db/migrations/*.sql

# Run per-app migrations
SHI_DATABASE_URL=postgres://...shi_test sqlx migrate run --source apps/health/sovereign-health/api/migrations
SLI_DATABASE_URL=postgres://...sli_test sqlx migrate run --source apps/technology/sovereign-link/api/migrations/postgres
```

**New test scripts:**
```
/tests/
|-- db-isolation-test.sh              # Verify app A cannot write to app B's DB
|-- two-pool-connectivity-test.sh     # Each app reads platform + writes own DB
|-- service-account-flow-test.sh      # SHI creates affiliate link via SLI API
|-- db-migration-independence-test.sh # Run one app's migrations, verify others unaffected
```

---

## 3. Test Categories

### Level 1: Platform Unit Tests (Shared Crates)

| Crate | What to Test | Current | Target |
|-------|-------------|---------|--------|
| `brickos-auth` | JWT creation/verification, Argon2 hash/verify, MFA TOTP, API key generation/hashing | 0 | 15+ |
| `brickos-crypto` | AES-256-GCM encrypt/decrypt, key derivation, round-trip integrity | 7 | 15+ |
| `brickos-db` | Model serialization, org type validation, role hierarchy | 0 | 10+ |

```bash
# Run platform crate tests
cargo test -p brickos-auth -p brickos-crypto -p brickos-db
```

### Level 2: App Unit Tests

Each app owns its unit tests. Run independently.

| App | Framework | Command | Current | Target |
|-----|-----------|---------|---------|--------|
| SHI Backend | Rust (cargo test) | `cargo test -p sovereign-health-backend` | 4,395 LOC | Maintain |
| SHI Frontend | Vitest | `pnpm --filter sovereign-health-frontend test` | 3,038 LOC | Maintain |
| Sovereign Link | Rust (cargo test) | `cargo test -p sovereign-link --features standalone --no-default-features` | 503 LOC | 800+ |
| Sovereign Voice | Vitest | `cd apps/attention/sovereign-voice && pnpm test` | 0 LOC | 200+ |

### Level 3: App Integration Tests

HTTP-level tests against a running instance (or test server).

| App | Framework | What | Current |
|-----|-----------|------|---------|
| SHI Backend | actix-web::test | Auth flows, CRUD, tier limits, encryption | Active (13 files) |
| Sovereign Link | actix-web::test | Auth, links CRUD, redirect, QR, vanity validation | Active (18 tests) |
| Sovereign Voice | Node test runner | Publish to relay, schedule parsing, state management | MISSING |

### Level 4: Cross-App Integration Tests

NEW. Tests that verify apps work together.

| Test | What | How |
|------|------|-----|
| Voice -> Link API | Sovereign Voice creates a short link via service API | curl against staging with service account credentials |
| Link -> SHI redirect | Short link redirects to SHI app correctly | curl -I brickos.io/r/shi, verify Location header |
| Platform DB -> all apps | After schema migration, all apps still respond | Health check all endpoints |
| Auth shared | Login via SHI, JWT works in Sovereign Link | Login to SHI, use token on SL endpoint |

### Level 5: E2E Tests

| App | Framework | Scope | Current |
|-----|-----------|-------|---------|
| SHI | Playwright | 11 spec files: auth, profile, devices, measurements, import, Dr. Alex, compliance, admin | Active (30 passing) |
| Sovereign Link | Playwright or curl | Login, create link, redirect, QR code, settings | MISSING |
| Platform | Bash + curl | Cross-app smoke after deploy | MISSING |

### Level 6: RC Testing (Release Candidate)

Run before every production deploy. Combines all levels.

```bash
# RC test script (NEW: platform-level)
tests/rc-test.sh staging
```

This script runs:
1. Platform smoke (all health endpoints)
2. Platform DB consistency checks
3. SHI backend tests (against staging DB)
4. SHI E2E tests (Playwright against staging)
5. Sovereign Link integration tests (against staging)
6. Sovereign Voice health check
7. Cross-app integration (Voice->Link->SHI flow)
8. Report: pass/fail/skip counts

---

## 4. Platform Smoke Test Specification

The missing piece that should have caught issues today.

### `tests/platform-smoke.sh`

```bash
#!/usr/bin/env bash
# BrickOS Platform Smoke Test
# Run after any deployment or migration
# Usage: bash tests/platform-smoke.sh [staging|production]

ENV=${1:-staging}

# Resolve URLs per environment
if [ "$ENV" = "production" ]; then
  SHI_API="https://api.sovereignhealth.io"
  SHI_APP="https://app.sovereignhealth.io"
  SHI_WEB="https://sovereignhealth.io"
else
  SHI_API="https://api-demo.sovereignhealth.io"
  SHI_APP="https://demo.sovereignhealth.io"
  SHI_WEB="https://www-demo.sovereignhealth.io"
fi

VPS="root@72.61.154.115"
DEMO_EMAIL="demo@sovereignhealth.io"
DEMO_PASS="SovereignDemo1"

## Checks:

# 1. SHI Backend health
# 2. SHI Frontend loads (HTTP 200)
# 3. SHI Website loads (HTTP 200)
# 4. SHI Login with demo user (JWT returned)
# 5. SHI Authenticated endpoint (measurements count > 0)
# 6. Sovereign Voice systemd active
# 7. Sovereign Voice schedule list (pending count)
# 8. Platform DB: brickos schema exists
# 9. Platform DB: search_path includes brickos
# 10. Platform DB: user count > 0 via unqualified query
# 11. Platform DB: measurement count > 0
# 12. Platform DB: reserved_codes seeded
# 13. Sovereign Link redirect (if test code exists)
# 14. Sovereign Link QR code (if test code exists)
# 15. Cross-schema FK integrity (users referenced from measurements)
```

---

## 5. DB Migration Test Specification

### `tests/platform-db-test.sh`

Run after platform migrations to verify integrity.

```bash
## Checks:

# 1. brickos schema exists
# 2. Expected table count in brickos schema (47)
# 3. Expected table count in public schema (61)
# 4. search_path includes brickos
# 5. Unqualified "SELECT FROM users" works
# 6. Unqualified "SELECT FROM measurements" works
# 7. Cross-schema FK: measurements.user_id references brickos.users.id
# 8. RLS policies still active on measurements
# 9. No orphan users (users without personal org)
# 10. No orphan links (links without valid org)
# 11. Reserved codes count >= 30
# 12. license_tiers.app_key column exists and is populated
# 13. All indexes survived the schema move
```

---

## 6. Sovereign Voice Test Specification

Currently zero tests. Minimum viable:

### Unit Tests (`tests/publisher.test.ts`)
- Event creation: correct kind, tags, content
- NIP-23 long-form: title, slug, d-tag, published_at
- Hashtag tag building
- Relay result aggregation (3/5 success = success)

### Unit Tests (`tests/scheduler.test.ts`)
- Cron expression detection vs ISO timestamp
- Publish state: mark as published, skip on restart
- State file read/write (JSON persistence)
- Overdue note detection

### Unit Tests (`tests/config.test.ts`)
- .env loading
- Schedule JSON parsing
- Content file resolution (relative paths)
- Missing nsec error

### Integration Tests (`tests/integration.test.ts`)
- Publish to a local test relay (if available)
- Verify event ID returned
- State file updated after publish

---

## 7. CI/CD Pipeline (Elevated)

### Current: `ci-health.yml` (SHI only)

### Target: Multi-workflow

```yaml
# .github/workflows/ci-platform.yml (NEW)
# Triggers: changes to crates/*, tests/*, docs/design/*
name: Platform CI
on:
  push:
    paths: ['crates/**', 'tests/**']
jobs:
  platform-tests:
    - cargo test -p brickos-auth -p brickos-crypto -p brickos-db

# .github/workflows/ci-health.yml (EXISTING, unchanged)
# Triggers: changes to apps/health/**

# .github/workflows/ci-sovereign-link.yml (NEW)
# Triggers: changes to apps/technology/sovereign-link/**
name: Sovereign Link CI
on:
  push:
    paths: ['apps/technology/sovereign-link/**']
jobs:
  test:
    - cargo test -p sovereign-link --features standalone --no-default-features

# .github/workflows/ci-sovereign-voice.yml (NEW)
# Triggers: changes to apps/attention/sovereign-voice/**
name: Sovereign Voice CI
on:
  push:
    paths: ['apps/attention/sovereign-voice/**']
jobs:
  test:
    - cd apps/attention/sovereign-voice && pnpm install && pnpm test
```

### RC Test Workflow (Manual Trigger)

```yaml
# .github/workflows/rc-test.yml (NEW)
name: RC Test
on: workflow_dispatch
jobs:
  rc:
    steps:
      - Platform smoke test
      - SHI E2E (Playwright)
      - Sovereign Link integration tests
      - Report
```

---

## 8. Test Command Quick Reference

```bash
# === Platform Level ===
cargo test -p brickos-auth -p brickos-crypto -p brickos-db    # Platform crate unit tests
bash tests/platform-smoke.sh staging                           # Platform smoke (all apps)
bash tests/platform-db-test.sh staging                         # DB integrity after migration
bash tests/cross-app-integration.sh staging                    # Voice->Link->SHI flow

# === SHI ===
cargo test -p sovereign-health-backend                         # SHI backend (all)
cargo test -p sovereign-health-backend --test smoke            # SHI smoke only (fast)
pnpm --filter sovereign-health-frontend test                   # SHI frontend unit
E2E_BASE_URL=https://demo.sovereignhealth.io \
  E2E_USER_EMAIL=demo@sovereignhealth.io \
  E2E_USER_PASSWORD=SovereignDemo1 \
  pnpm --filter sovereign-health-frontend test:e2e             # SHI E2E (Playwright)
bash apps/health/sovereign-health/ops/staging-smoke-test.sh    # SHI smoke (staging)

# === Sovereign Link ===
cargo test -p sovereign-link --features standalone --no-default-features  # All SL tests
cargo test -p sovereign-link --test unit                       # Unit only
cargo test -p sovereign-link --test integration                # Integration only

# === Sovereign Voice ===
cd apps/attention/sovereign-voice && pnpm test                 # All Voice tests

# === Full RC Test ===
bash tests/rc-test.sh staging                                  # Everything
```

---

## 9. What to Implement Next (Priority Order)

| Priority | What | Effort | Impact |
|----------|------|--------|--------|
| P0 | `tests/platform-smoke.sh` - platform smoke test script | 2 pts | Catches post-migration breakage |
| P0 | `tests/platform-db-test.sh` - DB migration verification | 2 pts | Validates schema elevation |
| P1 | Sovereign Voice unit tests (publisher, scheduler, config) | 3 pts | First test coverage for Voice |
| P1 | Platform crate tests (brickos-auth, brickos-crypto) | 3 pts | Shared code is undertested |
| P1 | `tests/rc-test.sh` - unified RC test runner | 2 pts | Single command for release validation |
| P2 | Update SHI smoke test to include platform checks | 1 pt | Existing script needs expansion |
| P2 | Sovereign Link E2E (curl-based) | 2 pts | Standalone deployment validation |
| P2 | Cross-app integration tests | 3 pts | Voice->Link->SHI flow |
| P3 | CI workflows for Sovereign Link and Voice | 2 pts | Automated on push |
| P3 | DB migration test automation | 3 pts | Test migrations against a disposable DB |

---

## 10. Test Data Management

### Staging Demo User

| Field | Value |
|-------|-------|
| Email | `demo@sovereignhealth.io` |
| Password | `SovereignDemo1` |
| Role | admin |
| User ID | `00000000-0000-0000-0000-000000000001` |
| Tier | glimpse |
| Measurements | ~3,436 |

Used by: E2E tests, smoke tests, manual testing. Never delete this user.

### Test Isolation

- **Unit tests:** In-memory (SQLite `:memory:` for SL, mocks for SHI)
- **Integration tests:** Dedicated test DB per test run (Docker postgres service in CI)
- **E2E tests:** Staging environment with demo user (shared state, tests must be idempotent)
- **Smoke tests:** Read-only checks against staging/production (no writes)

---

## 11. Open Questions

- [ ] Should platform smoke test run automatically after every deploy (post-deploy hook in deploy.sh)?
- [ ] Should we add a pre-merge gate that runs SL + Voice tests when those paths change?
- [ ] Should E2E tests run against production (read-only) after production deploy?
- [ ] Do we need a dedicated test relay for Sovereign Voice integration tests?
- [ ] Should the RC test script fail the deploy if any check fails, or just report?
