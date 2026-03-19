# Sprint 003 — Stabilize & Strengthen

**Started:** 2026-03-20
**Completed:** ongoing
**Goal:** Harden the production deployment pipeline, fix remaining deploy tooling gaps, and shift focus toward product quality and feature depth now that v0.20.0 is live.

## Context

Sprint 002 shipped v0.20.0 to production — the first public release. During the production deploy, we discovered that the VPS compose file had stale GitLab registry image names, causing deploys to silently use old images. The retro also identified version bump coordination (7 files), missing deploy verification, and uncontrolled scope expansion as key areas to improve. Sprint 003 focuses on closing those gaps, then investing in product quality.

---

## Phase 1 — Deploy Pipeline Fixes (retro actions)

### P1-1: `bump-version.sh` — update all version files in one command (2 pts)

**Problem:** Version bumps require coordinated edits across 7 files. During Sprint 002, the VERSION constant in lib.rs wasn't bumped from rc2 → rc3, causing the production health endpoint to report the wrong version even after a successful deploy.

**Files that must stay in sync:**

| File | Format | Line |
|------|--------|------|
| `api/src/lib.rs` | `pub const VERSION: &str = "X.Y.Z";` | 38 |
| `api/Cargo.toml` | `version = "X.Y.Z"` | 3 |
| `frontend/package.json` | `"version": "X.Y.Z"` | 3 |
| `website/package.json` | `"version": "X.Y.Z"` | 3 |
| `ops/deploy.sh` | `VERSION="X.Y.Z"` | 27 |
| `api/tests/snapshots/integration__health_snapshot.snap` | `"version": "X.Y.Z"` | 8 |
| `api/tests/snapshots/integration__hello_snapshot.snap` | `"version": "X.Y.Z"` | 7 |

After editing, `cargo generate-lockfile` must run to update `Cargo.lock`.

**Deliverable:** Shell script at `ops/bump-version.sh` that takes a version argument (e.g. `bash ops/bump-version.sh 0.21.0`), updates all 7 files, regenerates `Cargo.lock`, and prints a summary. No auto-commit — the developer reviews and commits.

---

### P1-2: Version-control compose files, deploy them alongside images (2 pts)

**Problem:** The production `docker-compose.prod.yml` on the VPS had stale image names (`registry.gitlab.com/sovereign-health/core-backend:latest` from the pre-GitHub era). The deploy script builds and transfers Docker images but never updates the compose file on the VPS. Any manual VPS edit drifts silently from the repo.

**Current state:** 4 compose files exist in the repo at `ops/`:
- `docker-compose.dev.yml` — local development
- `docker-compose.staging.yml` — VPS staging (references `sovereign-health-backend:staging`)
- `docker-compose.prod.yml` — VPS production (was manually fixed to `sovereign-health-backend:latest` during Sprint 002)
- `docker-compose.selfhosted.yml` — self-hosted deployments

**Deliverable:**
1. Verify `ops/docker-compose.prod.yml` in the repo matches the corrected VPS version (local image names, not GitLab registry URLs).
2. Add an `scp` step in `deploy.sh` that copies the relevant compose file to the VPS (`$VPS_BASE/`) before running `docker compose up`. This ensures the VPS always uses the repo version.
3. Add a diff check: if the VPS compose file differs from the repo version, warn before deploying.

---

### P1-3: Post-deploy image ID verification in deploy.sh (1 pt)

**Problem:** During the Sprint 002 production deploy, `deploy.sh` reported success (HTTP 200 from `/health`) but the container was running a stale image. The version assertion caught the mismatch, but only because the VERSION constant happened to differ. If the code changed without a version bump, the deploy would silently serve old code with no warning.

**Deliverable:** After `docker compose up -d --force-recreate`, add a verification step that:
1. Gets the image ID of the just-built image: `docker inspect --format='{{.Id}}' ${IMAGE}:${TAG}`
2. Gets the image ID of the running container: `ssh $VPS "docker inspect --format='{{.Image}}' ${CONTAINER_NAME}"`
3. Compares them. If they differ, emit a `[FAIL]` and `report_add "FAIL"` instead of silently continuing.

Add this to both `deploy_backend()` and `deploy_frontend()`.

---

### P1-4: Cloudflare credentials in deploy .env path (1 pt)

**Problem:** `deploy.sh` loads CF credentials from `$APP_ROOT/api/.env` (line 78). The `.env` file exists and contains Stripe, Mailgun, Anthropic, and JWT keys, but `CF_ZONE_ID` and `CF_API_TOKEN` are missing. Every production deploy skips cache purge with a warning.

**Deliverable:**
1. Add `CF_ZONE_ID` and `CF_API_TOKEN` to `api/.env` (obtain from Cloudflare dashboard → sovereignhealth.io zone → API tokens).
2. Verify `cloudflare_purge()` works by running a test purge: `bash ops/deploy.sh` with a dry-run or by calling the function directly.
3. Document the required `.env` keys in `ops/README.md` or a comment block in `deploy.sh`.

---

### P1-5: Audit all COALESCE-based UPDATE handlers for missing INSERT (2 pts)

**Problem:** The `user_profile` UPDATE in `settings.rs` used `COALESCE($N, column)` to preserve existing values, but silently affected 0 rows if the profile row didn't exist. This caused the Kundentyp persistence bug in Sprint 002. The same pattern exists across the codebase.

**Audit results — 15 COALESCE UPDATE statements found:**

| File | Table | Guard present? | Risk |
|------|-------|---------------|------|
| `settings.rs:505` | `user_profile` | YES (added Sprint 002) | Fixed |
| `settings.rs:724` | `user_preferences` | **NO** | Data loss if row missing |
| `settings.rs:795` | `user_preferences` | **NO** | Data loss if row missing |
| `features.rs:434` | `product_features` | **NO** | Low risk (admin-only, rows always exist) |
| `import.rs:398` | `devices` | **NO** | Low risk (update of existing device) |
| `import.rs:494` | `devices` | **NO** | Low risk (array append on existing device) |
| `influence_factors.rs:365` | `influence_factors` | **NO** | Low risk (update of existing record by ID) |
| `labs.rs:57` | `labs` | YES (ON CONFLICT) | Safe |
| `labs.rs:94` | `labs` | **NO** | Low risk (update by ID) |
| `labs.rs:156` | `labs` | YES (ON CONFLICT) | Safe |
| `measurements.rs:592` | `measurements` | **NO** | Low risk (update by ID + user_id) |
| `medications.rs:210` | `user_medications` | **NO** | Low risk (update by ID) |
| `promotions.rs:468` | `promotions` | **NO** | Low risk (admin-only) |
| `user_medications.rs:238` | `user_medications` | **NO** | Low risk (update by ID) |
| `segments.rs:95` | `user_segments` | YES (ON CONFLICT) | Safe |

**Priority fixes (rows may not exist at UPDATE time):**
1. **`settings.rs:724`** — `user_preferences` UPDATE (units). Needs INSERT ON CONFLICT guard like `user_profile` got.
2. **`settings.rs:795`** — `user_preferences` UPDATE (lifestyle). Same table, same risk.

The remaining 9 unguarded handlers update records by primary key (`WHERE id = $N`), meaning the row must already exist to have an ID. These are low risk but should get guards for consistency.

**Deliverable:** Add `INSERT INTO {table} (...) VALUES (...) ON CONFLICT DO NOTHING` before all COALESCE-based UPDATEs where the row might not exist. Priority: the two `user_preferences` handlers. Best effort: the remaining 9.

---

## Phase 1b — Data Integrity Hardening (pre-live-data critical)

### P1-6: Instrument audit logging across all handlers (3 pts)

**Problem:** The audit system (`audit_log` and `data_access_log` tables) exists but only 3 locations actually write events: login success, chat errors, and purge operations. The admin audit page shows empty tables because almost nothing is instrumented. When real customers use the system, we need a complete audit trail for compliance (GDPR Art. 30), dispute resolution, and security monitoring.

**Missing audit coverage:**

| Handler | Events to log | Priority |
|---------|--------------|----------|
| `auth.rs` | `auth.signup`, `auth.logout`, `auth.password_reset`, `auth.mfa_enabled`, `auth.mfa_disabled` | Critical |
| `measurements.rs` | `measurement.created`, `measurement.updated`, `measurement.deleted` | Critical |
| `settings.rs` | `profile.updated`, `preferences.updated`, `billing_address.updated` | High |
| `billing.rs` | `subscription.created`, `subscription.canceled`, `payment.succeeded`, `payment.failed` | Critical |
| `import.rs` | `lab_import.started`, `lab_import.completed`, `lab_import.failed` | High |
| `devices.rs` | `device.created`, `device.updated`, `device.deleted` | Medium |
| `labs.rs` | `lab.created`, `lab.updated`, `lab.deleted` | Medium |
| `influence_factors.rs` | `factor.created`, `factor.updated`, `factor.deleted` | Medium |
| `export.rs` | `data.exported` (GDPR data portability) | Critical |
| `purge.rs` | `account.purge_requested`, `account.purged` | Critical |
| `admin_*.rs` | `admin.tier_override`, `admin.whitelist_change`, `admin.settings_change` | High |
| `doctor_chat.rs` | `chat.conversation_started`, `chat.message_sent` | Medium |

**Deliverable:** Add `audit::log()` calls to all handlers listed above. Each call should include:
- `user_id` (from `AuthenticatedUser`)
- `action` (e.g. `"measurement.created"`)
- `resource_type` (e.g. `"measurement"`)
- `resource_id` (the entity UUID)
- `ip_address` (from request)
- `metadata` (JSONB with relevant context, e.g. `{"marker_slug": "glucose", "value": 5.2}`)

Fire-and-forget pattern (existing `audit::log()` already swallows errors). No performance impact on the request path.

---

### P1-7: Migration — fix FK constraints and ON DELETE policies (2 pts)

**Problem:** Several tables have missing or incorrect foreign key constraints that will cause problems with live customer data:

**Issues to fix:**

| Table.Column | Current State | Fix | Why |
|---|---|---|---|
| `refunds.user_id` | NOT NULL, **no FK** | Add FK to `users(id) ON DELETE RESTRICT` | Prevents orphaned refund records; refunds must be preserved for accounting |
| `influence_factors.user_id` | FK to `users(id)`, **no ON DELETE** (defaults to RESTRICT) | Change to `ON DELETE CASCADE` | User deletion fails if they have influence factors; purge.rs handles this but direct DB ops would break |
| `measurements.lab_id` | FK to `labs(id)`, **no ON DELETE** (defaults to RESTRICT) | Change to `ON DELETE SET NULL` | Lab deletion blocked by linked measurements; SET NULL preserves measurement data |

**Migration file:** `20260320000098_fix_fk_constraints.sql`

```sql
-- Fix refunds: add missing FK
ALTER TABLE refunds
  ADD CONSTRAINT fk_refunds_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Fix influence_factors: allow user cascade delete
ALTER TABLE influence_factors
  DROP CONSTRAINT IF EXISTS influence_factors_user_id_fkey,
  ADD CONSTRAINT influence_factors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix measurements.lab_id: allow lab deletion
ALTER TABLE measurements
  DROP CONSTRAINT IF EXISTS measurements_lab_id_fkey,
  ADD CONSTRAINT measurements_lab_id_fkey
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL;
```

**Validation:** Run migration on staging, then test: delete a lab → verify linked measurements retain data with `lab_id = NULL`. Test user purge with influence factors.

---

### P1-8: Migration — standardize soft delete pattern (1 pt)

**Problem:** Soft delete is implemented inconsistently across tables. When we have live data, GDPR queries (`"show me everything about user X"`, `"when was this deleted?"`) need a uniform pattern.

| Table | Current | Fix |
|---|---|---|
| `devices` | `is_deleted BOOLEAN` only | Add `deleted_at TIMESTAMPTZ` |
| `organizations` | `is_deleted BOOLEAN` only | Add `deleted_at TIMESTAMPTZ` |
| `influence_factors` | Uses `is_active` (inverted logic) | Add `is_deleted BOOLEAN DEFAULT false` + `deleted_at TIMESTAMPTZ` |

**Migration file:** `20260320000099_standardize_soft_delete.sql`

```sql
-- devices: add deleted_at timestamp
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- organizations: add deleted_at timestamp
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- influence_factors: add standard soft delete columns
ALTER TABLE influence_factors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE influence_factors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

**Note:** `influence_factors.is_active` is kept for backwards compatibility (it has different semantics — a factor can be inactive but not deleted). The new `is_deleted`/`deleted_at` columns handle actual deletion.

**Validation:** Verify existing queries still work. Update handlers that set `is_deleted` on devices/organizations to also set `deleted_at = NOW()`.

---

### P1-9: Migration — add missing indexes for scale (1 pt)

**Problem:** Several tables lack indexes that will cause slow queries as data grows. With 100+ users and thousands of measurements, these become noticeable.

**Migration file:** `20260320000100_add_missing_indexes.sql`

```sql
-- calculated_marker_values: composite index for trend queries
-- Current: only idx_cmv_user_id on (user_id)
-- Needed: queries filter by user + marker + order by time
CREATE INDEX IF NOT EXISTS idx_cmv_user_marker_measured
  ON calculated_marker_values(user_id, calculated_marker_id, measured_at DESC);

-- audit_log: index for admin page pagination (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

-- reference_ranges: composite index for user custom ranges lookup
CREATE INDEX IF NOT EXISTS idx_reference_ranges_user_marker
  ON reference_ranges(user_id, marker_id)
  WHERE user_id IS NOT NULL;
```

**Validation:** Run `EXPLAIN ANALYZE` on staging for trend queries and audit log pagination before/after.

---

## Phase 2 — Dependabot & Hygiene

### P2-1: bump @base-ui/react 1.2.0 → 1.3.0 ([#37](https://github.com/sovereignbrick/brickos/issues/37)) (1 pt)

**Scope:** Minor version bump for the Base UI React component library. Used for unstyled accessible primitives (dropdowns, popovers, etc.).
**Risk:** Low — minor version, should be backwards compatible. Check for any API deprecation warnings.
**Validation:** `pnpm build` succeeds, no console warnings on staging.

---

### P2-2: bump @types/node 20.x → 25.x ([#36](https://github.com/sovereignbrick/brickos/issues/36)) (1 pt)

**Scope:** Dev dependency — TypeScript type definitions for Node.js. Major version jump (20 → 25).
**Risk:** Low — dev-only, affects type checking not runtime. May surface new type errors in build if Node APIs we use were changed.
**Validation:** `pnpm build` and `pnpm lint` succeed without new type errors.

---

### P2-3: bump actix-governor 0.5.0 → 0.10.0 ([#35](https://github.com/sovereignbrick/brickos/issues/35)) (2 pts)

**Scope:** Rate limiting middleware for Actix-web. Major version jump (0.5 → 0.10). Used in `src/main.rs` for API rate limiting (`AuthRateLimiters`).
**Risk:** Medium — likely has breaking API changes. The `GovernorConfigBuilder` API may have changed. Need to review changelog and update `main.rs` rate limiter setup.
**Validation:** `cargo build`, `cargo test`, and manual test of rate-limited endpoints (login, signup).

---

### P2-4: bump rand 0.8.5 → 0.9.2 ([#34](https://github.com/sovereignbrick/brickos/issues/34)) (2 pts)

**Scope:** Random number generation crate. Major version jump (0.8 → 0.9). Used in auth (token generation), crypto, and testing.
**Risk:** Medium — `rand 0.9` has API changes (e.g. `thread_rng()` → `rng()`, trait changes). Grep for all `rand::` usage and update call sites.
**Validation:** `cargo build`, `cargo test`, verify token generation still produces valid tokens.

---

### P2-5: bump criterion 0.5.1 → 0.8.2 ([#33](https://github.com/sovereignbrick/brickos/issues/33)) (1 pt)

**Scope:** Benchmarking framework. Dev/bench dependency only. Used in `benches/endpoints.rs`.
**Risk:** Low — only affects benchmark code, not production. May need benchmark function signature updates.
**Validation:** `cargo bench` runs without errors.

---

### P2-6: update thiserror 1 → 2 ([#4](https://github.com/sovereignbrick/brickos/issues/4)) (2 pts)

**Scope:** Error derive macro. Major version bump. Used extensively in `src/error.rs` (`AppError` enum) and across all handler files via `?` operator.
**Risk:** Medium — `thiserror 2` changes the `#[error(...)]` attribute syntax and may affect `#[from]` behavior. The `AppError` enum and all `From` impls need review.
**Validation:** `cargo build`, `cargo test`, verify all API error responses still return correct JSON shapes.

---

### P2-7: Clean up crash-report files (1 pt)

**Scope:** Two untracked files at repo root: `crash-report-2026-03-17.md` and `crash-report-2026-03-18.md`. These block `deploy.sh promote` and `git_push` (both check `git status --porcelain`).
**Deliverable:** Review contents, archive to `docs/incidents/` if useful, delete from repo root, and add `crash-report-*.md` to `.gitignore`.

---

## Phase 3 — Product Quality & Features

### P3-1: Extend Analysis tab with richer visualizations ([#116](https://github.com/sovereignbrick/brickos/issues/116)) (8 pts)

**Scope:** The Trends page currently shows basic line charts per marker. This task adds:
1. **Correlation heatmap** — show relationships between markers (e.g. glucose vs insulin, cholesterol vs diet protocol).
2. **Zone timeline** — horizontal bar chart showing how long a marker stayed in each zone (green/yellow/orange/red) over time.
3. **Lifestyle overlay** — layer lifestyle factors (sleep, stress, exercise, diet) onto marker trend lines to visualize impact.

**Tech:** Recharts library (already in use). Data comes from existing `/measurements` and `/influence-factors` endpoints.
**Validation:** At least 2 of the 3 visualization types implemented. Works on staging with demo data. Dark/light theme compatible. Mobile-responsive.

---

### P3-2: E2E browser tests — Playwright — critical paths (8 pts)

**Scope:** Add end-to-end browser tests for the critical user flows:
1. **Auth flow:** Register → verify email → login → dashboard loads
2. **Measurement flow:** Login → add measurement → see it in history → view on trend chart
3. **Settings flow:** Login → change profile settings → save → verify persistence across page reload
4. **Billing flow:** Login → navigate to license tab → verify plan display (Stripe checkout is mock-only)

**Tech:** Playwright (new dependency). Tests run against staging (`demo.sovereignhealth.io`) or a local Docker stack.
**Structure:** `apps/health/sovereign-health/frontend/e2e/` directory with `playwright.config.ts` and test files per flow.
**Validation:** All 4 flows pass on staging. CI integration is optional for this sprint (stretch goal).

---

### P3-3: Release notes auto-generation from conventional commits (3 pts)

**Scope:** Generate structured release notes from git history using conventional commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`).

**Deliverable:** Script at `ops/release-notes.sh` that:
1. Takes two git refs (e.g. `v0.19.0..v0.20.0` or `develop~20..develop`)
2. Parses commit messages by prefix
3. Groups into sections: Features, Bug Fixes, Documentation, Chores
4. Outputs Markdown suitable for GitHub releases or changelog

**Example output:**
```markdown
## v0.20.0 (2026-03-19)
### Features
- Admin audit log viewer with retention management (#148)
- Configurable info bar for app and homepage
- Sprint 002 Phase 2 — release automation (#122 #123 #124 #127)
### Bug Fixes
- Toast position, Kundentyp persistence, billing save UX
- License tab — tier tooltip, billing left, remove Plan-Aktionen
```

**Validation:** Running against `v0.19.0..v0.20.0` produces accurate, readable release notes.

---

## Velocity

| Metric | Value |
|---|---|
| Phase 1 (deploy fixes) | 8 pts |
| Phase 1b (data integrity) | 7 pts |
| Phase 2 (deps & hygiene) | 10 pts |
| Phase 3 (product quality) | 19 pts |
| **Total planned** | **44 pts** |
| **Unplanned buffer (20%)** | 9 pts |
| Sprint 002 velocity | ~91 pts (2 days, exceptional) |
| Sprint 001 velocity | ~44 pts (8 days) |

## Execution Order

```
Day 1 (2026-03-20):
  Phase 1: Deploy pipeline fixes
    P1-1 bump-version.sh           → 30 min, prevents version drift
    P1-2 Compose files in repo     → 30 min, prevents VPS drift
    P1-3 Post-deploy image ID      → 15 min, catches stale container
    P1-4 CF credentials            → 10 min, enables auto cache purge
    P1-5 COALESCE audit            → 1 hr, prevents silent data loss
                                     (priority: settings.rs user_preferences)

  Phase 1b: Data integrity hardening (CRITICAL — before live customers)
    P1-7 FK constraint migration   → 30 min, prevents orphaned records
    P1-8 Soft delete standardize   → 20 min, GDPR query consistency
    P1-9 Missing indexes           → 15 min, prevents slow queries at scale
    P1-6 Audit log instrumentation → 2-3 hrs, adds events to all handlers

  Phase 2: Dependabot batch
    P2-6 thiserror 1→2             → most impactful, do first
    P2-4 rand 0.8→0.9             → second most breaking
    P2-3 actix-governor 0.5→0.10  → third
    P2-5 criterion 0.5→0.8        → bench only
    P2-1 @base-ui/react           → minor, quick
    P2-2 @types/node              → dev dep, quick
    P2-7 crash-report cleanup     → 5 min
    → Full CI run after all merges

Week 1 (Phase 3):
  P3-1 Analysis tab (#116)        → major feature work
  P3-2 E2E tests (Playwright)     → critical path coverage
  P3-3 Release notes generation   → nice-to-have if time permits
```

## Definition of Done for Sprint 003

### Phase 1 — Deploy Pipeline
- [ ] `bump-version.sh` exists and updates all 7 files + Cargo.lock
- [ ] Production compose file is deployed by deploy.sh (scp before docker compose up)
- [ ] Post-deploy verification checks container image SHA
- [ ] Cloudflare cache purge works automatically on production deploy
- [ ] `user_preferences` COALESCE handlers have INSERT ON CONFLICT guards

### Phase 1b — Data Integrity (critical pre-live-data)
- [ ] Audit logging instrumented in all handlers (auth, measurements, settings, billing, import, export, purge, admin)
- [ ] Admin audit page shows events on staging after testing
- [ ] FK constraints fixed: `refunds.user_id`, `influence_factors ON DELETE CASCADE`, `measurements.lab_id ON DELETE SET NULL`
- [ ] Soft delete standardized: `deleted_at` column on devices, organizations; `is_deleted`+`deleted_at` on influence_factors
- [ ] Missing indexes added: `calculated_marker_values` composite, `audit_log.created_at`, `reference_ranges` composite

### Phase 2 — Dependencies
- [ ] All 6 Dependabot PRs merged or closed with reason
- [ ] CI green on develop after dep updates
- [ ] Crash-report files removed and pattern gitignored

### Phase 3 — Product Quality
- [ ] Analysis tab has at least 2 new visualization types
- [ ] Playwright E2E covers: login → add measurement → view trend

## Phase 4 — Production Database Cleanup (2 pts)

Production DB audit (2026-03-19) revealed stale data, demo remnants, and unused tables that should be cleaned before real customers generate significant data.

### Production DB snapshot (2026-03-19)

| Table | Total rows | Demo rows | Real rows | Notes |
|-------|-----------|-----------|-----------|-------|
| `users` | 14 | 1 | 13 | Demo user: `00000000-...-000000000001` |
| `measurements` | 1,228 | 1,222 | **6** | 99.5% is demo data |
| `calculated_marker_values` | 80 | 69 | 11 | |
| `devices` | 13 | 5 | 8 | |
| `refresh_tokens` | 85 | — | 85 | 15 expired |
| `email_verifications` | 15 | — | 15 | All 15 expired |
| `ai_usage_log` | 57 | — | 57 | No retention policy |
| `audit_log` | 1 | — | 1 | Nearly empty (instrumentation gap) |
| `data_access_log` | 0 | — | 0 | Completely empty |
| `health_check` | 0 | — | 0 | Unused table |
| `import_sessions` | 14 | — | 14 | |
| `payment_events` | 11 | — | 11 | |
| `contact_submissions` | 2 | — | 2 | |

---

### P4-1: Remove demo data from production (1 pt)

**Problem:** 99.5% of production measurements are demo data. This skews any analytics, inflates backup sizes, and could confuse real users if demo data ever leaks into queries. The demo user (`demo@sovereignhealth.io`, UUID `00000000-0000-0000-0000-000000000001`) should not exist in production — demo mode is served by staging.

**Data to remove:**
- ~1,222 demo measurements (`WHERE is_demo = true`)
- ~69 demo calculated_marker_values (`WHERE is_demo = true`)
- 5 demo devices (`WHERE user_id = '00000000-...-000000000001'`)
- Demo user profile, preferences, and user record

**Cleanup SQL (run on production after backup):**
```sql
-- Step 1: Remove demo measurement data
DELETE FROM calculated_marker_values WHERE is_demo = true;
DELETE FROM measurements WHERE is_demo = true;

-- Step 2: Remove demo devices
DELETE FROM devices WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Step 3: Remove demo user profile and preferences
DELETE FROM user_preferences WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM user_profile WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Step 4: Remove demo user (CASCADE handles remaining FKs)
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Pre-requisite:** Take a staging DB backup before running. Verify demo endpoints on staging still work (demo data is served from staging DB, not production).

---

### P4-2: Purge expired tokens and stale data, add retention policies (1 pt)

**Problem:** Several tables accumulate stale records with no automatic cleanup:

| Table | Stale records | Action |
|-------|--------------|--------|
| `refresh_tokens` | 15 expired (of 85 total) | Delete where `expires_at < now()` |
| `email_verifications` | 15 expired (all of them) | Delete where `expires_at < now()` |
| `ai_usage_log` | 57 records, no retention | Add 180-day retention |
| `data_access_log` | 0 now, will grow | Add 365-day retention (GDPR compliance) |
| `payment_events` | 11 records, no retention | Add 730-day retention (tax/accounting) |
| `health_check` | 0 rows, unused table | Drop table |

**Cleanup SQL (immediate):**
```sql
-- Purge expired tokens and verifications
DELETE FROM refresh_tokens WHERE expires_at < now();
DELETE FROM email_verifications WHERE expires_at < now();

-- Drop unused health_check table
DROP TABLE IF EXISTS health_check;
```

**Retention migration** (`20260320000101_retention_policies.sql`):
```sql
-- Add a periodic cleanup function (called by backend on startup or cron)
-- ai_usage_log: 180 days
-- data_access_log: 365 days
-- payment_events: 730 days (2 years for tax)
-- refresh_tokens: auto-purge expired
-- email_verifications: auto-purge expired

-- Store retention config in app_settings
INSERT INTO app_settings (key, value) VALUES
  ('retention_ai_usage_days', '180'),
  ('retention_data_access_days', '365'),
  ('retention_payment_events_days', '730')
ON CONFLICT (key) DO NOTHING;
```

**Deliverable:** Add a `cleanup_stale_data()` function to the backend startup (or a daily cron) that purges expired tokens, expired verifications, and records older than their retention window.

---

### Unused tables inventory (no action this sprint — document only)

These tables exist in production but are either empty or not referenced by current handler code. They belong to planned-but-not-yet-implemented features and should **not** be dropped yet:

**Future features (keep):**
| Table | Rows | Purpose |
|-------|------|---------|
| `organizations`, `org_members`, `app_roles` | 14, 14, 1 | Multi-user / team features (auto-created per user) |
| `data_shares` | 0 | Doctor-patient data sharing |
| `email_campaigns`, `email_sends` | 0, 0 | Marketing email infrastructure |
| `user_segments` | 0 | User segmentation for campaigns |
| `anonymous_cohort_stats` | 0 | Population-level health comparisons |
| `btc_payments` | 0 | Bitcoin payment support (Strike integration) |
| `customer_tax_ids` | 0 | Tax ID verification (EU VAT) |
| `payment_methods_cache` | 0 | Stripe payment method caching |
| `invoice_line_items` | 0 | Detailed invoice breakdown |
| `marker_tests` | 0 | Marker-to-lab-test mapping |
| `doctor_chat_quota` | 4 | Chat rate limiting (superseded by `chat_agent_quota`?) |

**Genuinely unused (candidates for Sprint 004 cleanup):**
| Table | Rows | Notes |
|-------|------|-------|
| `health_check` | 0 | Vestigial from initial template — safe to drop |
| `content_audit_log` | 5 | Unclear purpose, overlaps with `audit_log` |
| `ui_strings`, `ui_string_translations` | 34, ? | Not used by handlers — i18n is in frontend JSON files |

---

## Velocity

| Metric | Value |
|---|---|
| Phase 1 (deploy fixes) | 8 pts |
| Phase 1b (data integrity) | 7 pts |
| Phase 2 (deps & hygiene) | 10 pts |
| Phase 3 (product quality) | 19 pts |
| Phase 4 (DB cleanup) | 2 pts |
| **Total planned** | **46 pts** |
| **Unplanned buffer (20%)** | 9 pts |
| Sprint 002 velocity | ~91 pts (2 days, exceptional) |
| Sprint 001 velocity | ~44 pts (8 days) |

## Execution Order

```
Day 1 (2026-03-20):
  Phase 1: Deploy pipeline fixes
    P1-1 bump-version.sh           → 30 min, prevents version drift
    P1-2 Compose files in repo     → 30 min, prevents VPS drift
    P1-3 Post-deploy image ID      → 15 min, catches stale container
    P1-4 CF credentials            → 10 min, enables auto cache purge
    P1-5 COALESCE audit            → 1 hr, prevents silent data loss
                                     (priority: settings.rs user_preferences)

  Phase 1b: Data integrity hardening (CRITICAL — before live customers)
    P1-7 FK constraint migration   → 30 min, prevents orphaned records
    P1-8 Soft delete standardize   → 20 min, GDPR query consistency
    P1-9 Missing indexes           → 15 min, prevents slow queries at scale
    P1-6 Audit log instrumentation → 2-3 hrs, adds events to all handlers

  Phase 4: Production DB cleanup (run after Phase 1b deploy)
    P4-1 Remove demo data          → 15 min, clears 99.5% of measurements
    P4-2 Purge stale + retention   → 30 min, expired tokens/verifications + retention config

  Phase 2: Dependabot batch
    P2-6 thiserror 1→2             → most impactful, do first
    P2-4 rand 0.8→0.9             → second most breaking
    P2-3 actix-governor 0.5→0.10  → third
    P2-5 criterion 0.5→0.8        → bench only
    P2-1 @base-ui/react           → minor, quick
    P2-2 @types/node              → dev dep, quick
    P2-7 crash-report cleanup     → 5 min
    → Full CI run after all merges

Week 1 (Phase 3):
  P3-1 Analysis tab (#116)        → major feature work
  P3-2 E2E tests (Playwright)     → critical path coverage
  P3-3 Release notes generation   → nice-to-have if time permits
```

## Definition of Done for Sprint 003

### Phase 1 — Deploy Pipeline
- [ ] `bump-version.sh` exists and updates all 7 files + Cargo.lock
- [ ] Production compose file is deployed by deploy.sh (scp before docker compose up)
- [ ] Post-deploy verification checks container image SHA
- [ ] Cloudflare cache purge works automatically on production deploy
- [ ] `user_preferences` COALESCE handlers have INSERT ON CONFLICT guards

### Phase 1b — Data Integrity (critical pre-live-data)
- [ ] Audit logging instrumented in all handlers (auth, measurements, settings, billing, import, export, purge, admin)
- [ ] Admin audit page shows events on staging after testing
- [ ] FK constraints fixed: `refunds.user_id`, `influence_factors ON DELETE CASCADE`, `measurements.lab_id ON DELETE SET NULL`
- [ ] Soft delete standardized: `deleted_at` column on devices, organizations; `is_deleted`+`deleted_at` on influence_factors
- [ ] Missing indexes added: `calculated_marker_values` composite, `audit_log.created_at`, `reference_ranges` composite

### Phase 4 — Production DB Cleanup
- [ ] Demo user and all demo data removed from production
- [ ] Expired refresh tokens and email verifications purged
- [ ] `health_check` table dropped
- [ ] Retention policies configured for `ai_usage_log`, `data_access_log`, `payment_events`
- [ ] Stale data cleanup runs automatically (startup or cron)

### Phase 2 — Dependencies
- [ ] All 6 Dependabot PRs merged or closed with reason
- [ ] CI green on develop after dep updates
- [ ] Crash-report files removed and pattern gitignored

### Phase 3 — Product Quality
- [ ] Analysis tab has at least 2 new visualization types
- [ ] Playwright E2E covers: login → add measurement → view trend

## Backlog (Sprint 004 candidates)

| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| — | feat: data sovereignty — vendor data mirrors | 8 | Data Sovereignty |
| — | feat: OAuth / social login | 5 | Auth Modernization |
| — | feat: mobile-responsive PWA improvements | 5 | UX & Onboarding |
| — | feat: multi-language expansion (FR, ES) | 5 | Internationalization |
| — | feat: doctor-patient data sharing portal | 8 | Health Intelligence |
| — | chore: drop unused tables (`content_audit_log`, `ui_strings`, `ui_string_translations`) | 1 | Hygiene |
| — | chore: evaluate `doctor_chat_quota` vs `chat_agent_quota` overlap | 1 | Hygiene |

## Notes / Decisions

- Sprint 003 has a **20% unplanned buffer** (9 pts) based on Sprint 002 retro lesson. Issues found during the sprint consume this buffer before expanding scope.
- Phase 1 is all retro action items — non-negotiable before feature work.
- Phase 1b and Phase 4 are critical pre-live-data tasks. Must complete before marketing push.
- Phase 4 DB cleanup runs on production **after** Phase 1b migrations are deployed (the new indexes and FK constraints should be in place first).
- Demo data removal must be preceded by a production DB backup (`deploy.sh` already backs up staging; manually backup prod first).
- Dependabot PRs should be merged in dependency order: `thiserror` first (most pervasive), then `rand`, then `actix-governor`, then the rest. Full CI run after all merges.
- E2E tests (P3-2) are a stretch goal — if they don't fit, they carry to Sprint 004.
- Sprint 002 retro is at `retrospectives/2026-03-19_sprint-002-retro.md`.
