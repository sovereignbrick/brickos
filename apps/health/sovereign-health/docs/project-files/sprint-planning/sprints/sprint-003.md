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
| Phase 2 (deps & hygiene) | 10 pts |
| Phase 3 (product quality) | 19 pts |
| **Total planned** | **37 pts** |
| **Unplanned buffer (20%)** | 7 pts |
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

- [ ] `bump-version.sh` exists and updates all 7 files + Cargo.lock
- [ ] Production compose file is deployed by deploy.sh (scp before docker compose up)
- [ ] Post-deploy verification checks container image SHA
- [ ] Cloudflare cache purge works automatically on production deploy
- [ ] `user_preferences` COALESCE handlers have INSERT ON CONFLICT guards
- [ ] All 6 Dependabot PRs merged or closed with reason
- [ ] CI green on develop after dep updates
- [ ] Crash-report files removed and pattern gitignored
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

## Notes / Decisions

- Sprint 003 has a **20% unplanned buffer** (7 pts) based on Sprint 002 retro lesson. Issues found during the sprint consume this buffer before expanding scope.
- Phase 1 is all retro action items — non-negotiable before feature work.
- Dependabot PRs should be merged in dependency order: `thiserror` first (most pervasive), then `rand`, then `actix-governor`, then the rest. Full CI run after all merges.
- E2E tests (P3-2) are a stretch goal — if they don't fit, they carry to Sprint 004.
- Sprint 002 retro is at `retrospectives/2026-03-19_sprint-002-retro.md`.
