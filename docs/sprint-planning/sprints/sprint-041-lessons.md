# Sprint 041 -- Lessons Learned (Live Document)

This file is updated **continuously** during the sprint. After each phase, write a brief retro entry. At sprint end, stable lessons get promoted to `~/.claude/projects/-home-dev-comp-Projects-brickos/memory/` per the auto-memory protocol and `feedback_sprint_close_checklist.md`.

**Format:** newest entries at the top. Each entry has a date, phase, and one of: `lesson`, `decision`, `blocker`, `daily-note`, `bug-found`, `feature-request`.

---

## 2026-04-11 -- Phase B -- #491 + #522 land as PR; cold boot is now green

**Type:** decision
**Phase:** B

Three-commit PR closes #491 (cold-boot brickos schema) and #522 (silent migration skip P0). After landing:

| Item | Before | After |
|---|---|---|
| Cold-boot migrations applied | 163/177 | **177/177** |
| `_sqlx_migrations.success=false` rows | 0 (silently skipped) | **0 (real)** |
| Backend exit code on migration failure | 0, /health 200 | **1, no listener** |
| brickos-licensing embedded_runtime tests | 0/23 | **23/23** |
| Playwright sprint-040-smoke | 0/7 (6 fail, 1 skip) | **7/7** |
| cargo clippy --workspace --all-targets -D warnings | clean | clean |
| cargo fmt --check | clean | clean |
| cargo test backend --lib | 136/136 | 136/136 |

**Files changed:**
- `apps/health/sovereign-health/api/src/main.rs` -- migration runner awaits inline + `std::process::exit(1)` on failure (#522)
- `apps/health/sovereign-health/api/migrations/20260407000002_reassign_demo_profile_measurements.sql` -- defensive (DO + IF EXISTS + EXECUTE-deferred dynamic SQL)
- `apps/health/sovereign-health/api/migrations/20260408000002_sovereign_voice_service_account.sql` -- same defensive pattern
- `apps/health/sovereign-health/api/migrations/20260408000003_platform_tier_system.sql` -- inline `ALTER TABLE tier_features ADD COLUMN IF NOT EXISTS app_key` (was a long-standing broken migration masked by spawn-and-swallow)
- `apps/health/sovereign-health/api/migrations/20260408000006_org_apps.sql` -- same defensive pattern
- `apps/health/sovereign-health/api/migrations/20260408000006_add_app_source_to_newsletter_subscribers.sql` -- DELETED, was a duplicate-version collision with the org_apps file (identical to the 20260408000007 copy)
- `apps/health/sovereign-health/api/migrations/20260411000001_bootstrap_brickos_schema_for_dev.sql` -- NEW, creates 12 brickos.* tables and seeds 41 features + 156 tier_features + 6 license_tiers + 2 system orgs + 3 demo profile users + dev admin user (production-safe via `WHERE NOT EXISTS admin@schindlwick.com`)

**Why each iteration was needed (5 cold-boot cycles):**
1. First boot: confirmed #522 hard-fail works (exit 1 on first error). Surface bug: `brickos.users does not exist` at 20260407000002.
2. Second boot: my first defensive guard used `IF A AND B` -- PostgreSQL parses both halves of the AND, so the brickos.users name in B was resolved at parse time before the IF could short-circuit. Switched to nested IF + EXECUTE dynamic SQL (defers parsing to runtime).
3. Third boot: 20260407000002 passes. Next failure: 20260408000002 references brickos.service_accounts. Defended same pattern.
4. Fourth boot: 20260408000003 fails on `column "app_key" does not exist`. Discovered: this migration has been silently broken since it was added -- there's no migration that ever creates `tier_features.app_key`. The "added in 20260406000001" comment is wrong. Fixed inline.
5. Fifth boot: SQLx complains `duplicate key value violates unique constraint "_sqlx_migrations_pkey"`. Discovered: two migration files share version `20260408000006`. They are byte-identical to `20260408000007_add_app_source_to_newsletter_subscribers.sql`. Deleted the duplicate.
6. Sixth boot: clean 177/177. Playwright still fails: dev admin user `00000000-0000-0000-0000-000000000002` doesn't exist in `public.users`. Added a production-safe seed to the bootstrap migration.
7. Seventh boot: clean 177/177 + dev admin seeded + Playwright 7/7.

**Why it matters:**
1. Sprint 041 manual testing (#496-#511) is now possible from a freshly cold-booted dev DB without manual SQL surgery.
2. The migration runner has been silently swallowing failures for an unknown duration -- discovered FIVE separate broken migrations that production has been running with manual fixes around (20260407000002, 20260408000002, 20260408000003, 20260408000006 dup, 20260408000006 org_apps). All five are now repaired or hardened.
3. Future cold boots will hard-fail loudly on any new broken migration instead of accumulating tech debt invisibly.

**How to apply (memory candidates at sprint close):**
1. **Migration test pattern (already in memory)** -- enforce the 30-second new-migration test: ephemeral postgres + stub schema + apply + verify. Without this, broken migrations slip in invisibly.
2. **PL/pgSQL deferred parsing**: when guarding a SQL statement that references a possibly-missing schema, use a nested IF + `EXECUTE` dynamic SQL. PostgreSQL parses the entire `IF A AND B` expression up-front, so plain `IF EXISTS schema AND EXISTS row` does NOT defer the second reference.
3. **Duplicate migration versions** are silently lethal -- SQLx writes both to `_sqlx_migrations` and hits the unique key constraint. Add a CI check that asserts no two files share a timestamp prefix.

**Follow-up issues to file (deferred for the user to schedule):**
- True two-pool E2E env (the original #491 Option A) -- still wanted, just not in this PR. The bootstrap migration is documented as a single-DB convenience to be removed when two physical DBs land.
- Investigate whether the broken migrations 20260407000002 / 20260408000002 / 20260408000003 / 20260408000006 (duplicate) were ever applied on staging or production -- if so, the manual surgery on those DBs is now diverging from the canonical migration files and a reconciliation pass is needed before the next deploy.

---

## 2026-04-11 -- Phase A -- #493 baseline test suites against broken-schema cold-boot DB

**Type:** daily-note
**Phase:** A

Ran every test suite from #493 against the freshly cold-booted (and intentionally broken-schema) dev DB. Sprint 041 baseline:

| Suite | Result | vs Sprint 040 baseline |
|---|---|---|
| `cargo fmt --all -- --check` | clean | unchanged |
| `cargo clippy --workspace --all-targets -- -D warnings` | clean | unchanged |
| `cargo test -p sovereign-health-backend --lib` | **136/136** | unchanged |
| `cargo test -p sovereign-health-backend --test smoke` | **2/2** | unchanged |
| `cargo test -p sovereign-health-backend --test integration` | **10/10** | unchanged |
| `cargo test -p brickos-licensing --lib` | **16/16** | unchanged |
| `cargo test -p brickos-licensing --test embedded_runtime` | **0/23** | **regression -- needs brickos schema** |
| `npx tsc --noEmit` (frontend) | clean | unchanged |
| `pnpm build` (frontend) | clean | unchanged |
| Playwright `e2e/sprint-040-smoke.spec.ts` | **0/7 (6 fail, 1 skip)** | **regression from 7/7** |

**Why the regressions are not real regressions:** Both failing suites depend on the `brickos.*` schema, which is missing from cold-boot DBs because of the same migration-runner bug logged in #492 and the new P0 #522. As soon as #491 + #522 land, both suites should return to green.

Embedded runtime test #1 (`load_feature_registry_returns_seeded_features`) fails with:
```
Database(PgDatabaseError { code: "42P01", message: "relation \"brickos.feature_registry\" does not exist" })
at crates/brickos-licensing/tests/embedded_runtime.rs:54
```

Playwright failures are all 404s on `/platform/orgs`, `/platform/licensing/*`, `/platform/features`, `/platform/users/dormant` -- the SHI backend can't serve these handlers because the licensing/branding tables don't exist.

**Why it matters:** The Sprint 040 baseline of "7/7 Playwright smoke passing" was achieved against a long-running DB that had the missing migrations manually `psql`-applied. There is currently NO working green path for these suites on a freshly-booted DB. This makes #491 + #522 the **gating fix** for everything in Phase B-F that touches the brickos schema.

**How to apply:** Phase A is parked here -- do not start any other phase B-F manual or automated test that touches the brickos schema until #491 + #522 are merged. Phase A non-schema items (#494 two-pool schema verification, etc) and Phase H (security/dependabot triage) can proceed in parallel.

**Follow-up:**
- Re-run #493 immediately after #491 + #522 merge -- expected to return to 23/23 embedded_runtime + 7/7 Playwright
- Memory candidate at sprint close: "Sprint baselines must be captured against a freshly-cold-booted DB, not a long-running one, or they hide migration-path bugs"

---

## 2026-04-11 -- Phase A -- #492 cold-boot reproduces migration bug + uncovers silent-skip P0

**Type:** bug-found
**Phase:** A

Cold-booted dev stack from wiped volumes per #492. Result:

- 163 of 177 migrations applied; 14 silently skipped starting at `20260407000002_reassign_demo_profile_measurements.sql`
- `_sqlx_migrations` shows zero `success=false` rows -- nothing recorded as failure
- Backend log line 37 contains: `ERROR Migration failure: while executing migration 20260407000002: error returned from database: relation "brickos.users" does not exist`
- **Backend continues startup and serves `/health` 200 with an incomplete schema**
- Highest applied: `20260407000001`. Missing: `20260407000002`, `20260408*` (7 migs), `20260410000010/20/30/31/32`
- All of Sprint 040's licensing/branding/invoice/lifecycle migrations are absent from the cold-boot DB

**Why it matters:** The known #491 brickos-schema bug is real and reproduces deterministically. **But there's a second, more dangerous bug**: the backend swallows migration errors and serves a healthy status with a partial schema. Any monitoring relying on `/health` would not catch this. Sprint 040 close-out manually surgeried the missing migrations into a long-running DB, hiding the cold-boot break entirely -- that's why it shipped.

**How to apply:** Sprint 041 #491 must fix BOTH (a) the missing `brickos.users` dependency and (b) the silent-error-swallow in the migration runner / startup path. A failed migration must hard-fail boot.

**Follow-up:**
- File new P0 issue in Sprint 041 milestone: "backend swallows migration failures, serves /health 200 with broken schema"
- #491 acceptance must include: cold-booted backend exits non-zero on any failed migration
- Memory candidate at sprint close: "SQLx migration error visibility -- check `_sqlx_migrations.success` AND startup exit code, not just `/health`"

---

## Sprint kickoff -- 2026-04-11

**Type:** daily-note
**Phase:** pre-A

Sprint 041 planned 2026-04-10 after Sprint 040 close-out. Theme: staging quality gate driven by a realistic Life Algorithm customer walkthrough.

Critical constraints set:
- No production unless zero doubt after staging bake
- Many small issues, not a few big ones
- PR-based flow per ADR-048 (first real-code dogfood)
- Manual + automated tests interleave

Kickoff checklist complete:
- [x] Milestone file: `docs/tracker/milestones/sprint-041-staging-quality.md`
- [x] Sprint doc: `docs/sprint-planning/sprints/sprint-041.md`
- [x] Lessons doc (this file): bootstrapped
- [x] 30 issue files bootstrapped in `docs/tracker/issues/open/0492-*` through `0521-*`
- [ ] Auto-sync cron will push new issues to GitHub over next hour or two

Next: user picks the first manual test, Claude claims first automated test. Work begins Phase A.

---

## Lessons template (use this format for new entries)

```
## YYYY-MM-DD -- Phase X -- short title

**Type:** lesson | decision | blocker | daily-note | bug-found | feature-request
**Phase:** A | B | C | D | E | F | G | H | I

What happened.

**Why it matters:** ...
**How to apply:** ...
**Follow-up:** memory file to update / new memory to create / sprint doc edit / bug issue to file / feature request to file
```

---

## Promoted to memory at sprint end

(populated at close-out per `feedback_sprint_close_checklist.md`)

---

## Pre-sprint baseline (for reference)

- Main at `bed42f0` (Sprint 040 close-out hotfix + PR #547 merged)
- Branch protection: PR-based flow per ADR-048 (first sprint to enforce)
- Carry-over issues: #490 (dead code cleanup), #491 (two-pool E2E env)
- Dependabot: 6 high vulnerabilities flagged on origin/main (to triage in Phase H)
- Sprint 040 verification state: 7/7 localhost Playwright smoke passing, backend boot clean, all admin endpoints authenticated successfully
- Known pre-existing migration bug: `20260407000002_reassign_demo_profile_measurements.sql` blocks clean auto-migration on single-DB local dev -- this is exactly what Phase B (#491) fixes
