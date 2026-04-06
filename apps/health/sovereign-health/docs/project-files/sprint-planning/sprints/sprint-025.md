# Sprint 025 - Code Quality, Testing & Security Hardening

**Started:** TBD
**Duration:** 3 days
**Status:** PLANNED
**Goal:** Strengthen code quality with comprehensive testing, consolidate the license tier system, harden security for public launch, and establish continuous compliance.

## Issue Explanations

### What is #182 Admin Settings Test Suite?
Automated tests for the admin panel settings (Settings tab in admin). Currently the admin panel has no test coverage - settings like registration toggle, infobar config, and tier overrides are manually verified. This creates a test suite that validates admin settings CRUD operations and ensures changes persist correctly.

### What is #237 License Tier SSoT Consolidation?
The app has TWO places defining tier limits: the `license_tiers` table (8 separate chat quota columns) and the `tier_features` table (the product feature matrix). They can drift out of sync. This consolidation makes `tier_features` the single source of truth and removes the redundant columns from `license_tiers`. The AI credit pool (#301, already done) was step 1; this finishes the cleanup.

### What is #291 API Fuzzing with cargo-fuzz?
Fuzz testing sends random/malformed input to API endpoints to find crashes, panics, and edge cases that normal tests miss. `cargo-fuzz` generates millions of random inputs and checks if the Rust code panics or produces undefined behavior. Critical for a health data platform - we need to ensure no malformed input can crash the server or corrupt data.

### What is #293 SBOM Generation for CRA Compliance?
SBOM = Software Bill of Materials. The EU Cyber Resilience Act (CRA) requires software products to declare all their dependencies (like a food ingredient label for software). SBOM generation creates a machine-readable list of every Rust crate and npm package in the project, their versions, and licenses. Required for EU market compliance.

## Sprint Backlog

### Phase 1: Foundation (no dependencies, do first)

| # | Title | Pts | Why First |
|---|-------|-----|-----------|
| #314 | Business logic audit + acceptance tests | 5 | Documents ALL business rules as testable scenarios. Every other testing task builds on this inventory. |
| #237 | License tier SSoT consolidation | 3 | Removes redundant tier columns. Must be done before writing tier-related tests (avoids testing obsolete code). |
| #292 | JWT secret rotation mechanism | 3 | Security primitive. Other security features depend on proper secret management. |

**#314 sub-tasks:**
- [ ] Audit all handlers in `api/src/handlers/` for business rules
- [ ] Document each rule as Given/When/Then scenarios
- [ ] Cover: measurements, imports, calculated markers, tiers, Dr. Alex, auth, GDPR, admin, notifications
- [ ] Save as `docs/testing/business-logic-acceptance-tests.md`
- [ ] Mark each scenario as PASS / FAIL / UNTESTED

**#237 sub-tasks:**
- [ ] Remove `chat_general_monthly`, `chat_trends_monthly`, etc. columns from `license_tiers`
- [ ] Update `GET /license/tiers` to read all limits from `tier_features`
- [ ] Update website pricing page to read from same source
- [ ] Verify AI credit pool still works (already reads from `tier_features`)
- [ ] Migration to drop redundant columns (keep old for 1 release, then remove)

**#292 sub-tasks:**
- [ ] Add `JWT_SECRET_PREVIOUS` env var for graceful rotation
- [ ] Token verification tries current secret first, falls back to previous
- [ ] Document rotation procedure: set new secret, move old to PREVIOUS, deploy, wait for token expiry, remove PREVIOUS
- [ ] Add rotation test to E2E suite

### Phase 2: Testing (depends on Phase 1 for business rules inventory)

| # | Title | Pts | Dependency |
|---|-------|-----|------------|
| #182 | Admin settings test suite | 3 | #314 (business rules documented) |
| #253 | K6 load testing PoC | 3 | None (independent) |
| #291 | API fuzzing with cargo-fuzz | 3 | None (independent) |

**#182 sub-tasks:**
- [ ] E2E tests for admin settings CRUD (registration toggle, infobar, tier overrides)
- [ ] Verify admin-only endpoint protection (non-admin gets 403)
- [ ] Test user management: list, search, override tier, refund

**#253 sub-tasks:**
- [ ] Install K6 locally
- [ ] Write load test scripts: login, markers list, search, health check
- [ ] Define thresholds: p95 latency < 200ms, error rate < 1%
- [ ] Run baseline against staging, save report
- [ ] Add `load-tests/` directory with scripts + README

**#291 sub-tasks:**
- [ ] Set up cargo-fuzz targets for: auth login, measurement creation, search query, import upload
- [ ] Run fuzz campaigns (10 min per target)
- [ ] Fix any panics or crashes found
- [ ] Add fuzz targets to `fuzz/` directory

### Phase 3: Security Hardening (depends on Phase 1 for JWT rotation)

| # | Title | Pts | Dependency |
|---|-------|-----|------------|
| #281/#282 | ntfy Cloudflare Tunnel (hide VPS IP) | 3 | None (independent) |
| #266 | pgAudit log forwarding to admin | 3 | None (independent) |
| #245 | Security hardening framework (Phase 1 quick wins) | 5 | #292 (JWT rotation), #314 (business rules) |

**#281/#282 sub-tasks:**
- [ ] Install cloudflared on VPS
- [ ] Create tunnel: `cloudflared tunnel create ntfy-tunnel`
- [ ] Configure routing: ntfy.brickos.io -> localhost:2586
- [ ] Set up DNS route (replaces A record)
- [ ] Remove old A record exposing VPS IP
- [ ] Install as systemd service
- [ ] Verify ntfy push + deploy pre-flight still work
- [ ] Verify `dig ntfy.brickos.io` no longer returns VPS IP

**#266 sub-tasks:**
- [ ] Configure pgAudit to log to a queryable table (Option A from issue)
- [ ] Create admin API endpoint: `GET /admin/audit/pgaudit`
- [ ] Add pgAudit viewer tab in admin panel
- [ ] Set 90-day retention policy
- [ ] Filter by: table, action, user, date range

**#245 sub-tasks (Phase 1 quick wins only):**
- [ ] Add Semgrep SAST to CI (Rust + TypeScript OWASP rules)
- [ ] Add `pnpm audit` to CI
- [ ] Add `detect-secrets` pre-commit hook + baseline
- [ ] Document incident response procedure
- [ ] AI prompt injection: add input sanitization to Dr. Alex
- [ ] AI output filtering: PII detection in AI responses

### Phase 4: Compliance (depends on Phase 3)

| # | Title | Pts | Dependency |
|---|-------|-----|------------|
| #293 | SBOM generation for CRA compliance | 2 | None (independent) |
| #294 | Professional penetration test | 2 | #245 (fix known issues before paying for pentest) |

**#293 sub-tasks:**
- [ ] Generate Rust SBOM: `cargo sbom` or `syft` on binary
- [ ] Generate npm SBOM: `npm sbom` or `syft` on node_modules
- [ ] Output in CycloneDX or SPDX format
- [ ] Add to CI: generate SBOM on every release
- [ ] Store in `docs/compliance/sbom/`

**#294 sub-tasks:**
- [ ] Research pentest providers (EU-based, health data experience)
- [ ] Define scope: API, frontend, VPS, auth, AI, data isolation
- [ ] Budget: 2,000-5,000 EUR
- [ ] Schedule for after Phase 3 fixes are deployed
- [ ] This sprint: research + scope only. Execution in future sprint.

## Dependency Graph

```
PHASE 1 (do first, no dependencies):
══════════════════════════════════════
  #314 Business logic audit ──────┐
  #237 License tier SSoT ─────────┤── Foundation for all testing
  #292 JWT secret rotation ───────┘

PHASE 2 (after Phase 1):
════════════════════════
  #182 Admin test suite ──── needs #314 (business rules)
  #253 K6 load testing ───── independent
  #291 API fuzzing ────────── independent

PHASE 3 (parallel with Phase 2):
════════════════════════════════
  #281/#282 Cloudflare Tunnel ── independent
  #266 pgAudit forwarding ────── independent
  #245 Security framework ────── needs #292 (JWT), #314 (rules)

PHASE 4 (after Phase 3):
════════════════════════
  #293 SBOM generation ───── independent
  #294 Pentest research ──── needs #245 (fix issues first)
```

## Execution Order

```
DAY 1 MORNING
══════════════
  Track A: #314 Business logic audit (largest item, start early)
  Track B: #237 License tier consolidation
  Track C: #292 JWT secret rotation

DAY 1 AFTERNOON
════════════════
  #253 K6 load testing PoC (independent)
  #281/#282 Cloudflare Tunnel for ntfy (independent)

DAY 2 MORNING
══════════════
  #182 Admin settings test suite (needs #314)
  #291 API fuzzing (independent)
  #266 pgAudit log forwarding

DAY 2 AFTERNOON
════════════════
  #245 Security hardening Phase 1 (Semgrep, detect-secrets, AI sanitization)

DAY 3 MORNING
══════════════
  #293 SBOM generation
  #294 Pentest research + scoping
  RC testing

DAY 3 AFTERNOON
════════════════
  Deploy to staging + production
```

## Total Points: 35

## Risk Assessment

- **#314 (business logic audit):** Largest item. The audit itself is documentation, but marking scenarios as PASS/FAIL requires running through each one. May take longer than estimated if many failures are found.
- **#237 (tier SSoT):** Migration to drop columns is risky if any code still reads them. Must grep ALL references before dropping.
- **#282 (Cloudflare Tunnel):** New infrastructure. If tunnel setup fails, ntfy stays on DNS-only (current state, acceptable).
- **#245 (security framework):** Scoped to Phase 1 quick wins only. Full framework is multi-sprint.
- **#294 (pentest):** Research only this sprint. Actual pentest is a future budget item.
