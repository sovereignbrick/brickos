---
number: 491
github_number: 488
title: "ops: build two-pool E2E env so #471 licensing journey suite can actually run"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, ops, e2e, follow-up]
created: 2026-04-10
priority: P2
sprint: 040
phase: B
design: 022
estimate: 0.5d
blocked_by: [471]
---

#471 ships the Playwright suite skeleton (`apps/health/sovereign-health/frontend/e2e/suite-licensing-journeys.spec.ts`)
and a brickos schema bootstrap fixture
(`apps/health/sovereign-health/frontend/e2e/fixtures/brickos_schema_bootstrap.sql`)
for the 4 licensing journeys. Journeys 3 and 4 are coded but **skipped**
until a true two-pool E2E env exists (`E2E_TWO_POOL_READY=1` flips them on).

This issue tracks the ops work to build that env so the journey suite
can actually run.

## Why two pools

In production, the brickos.* schema lives in a SEPARATE physical postgres
database from the SHI app data (the two-pool architecture from sprint 030).
SHI's PgPool reads markers/measurements from the SHI DB; SHI's PlatformPool
reads users/organizations/billing/licensing from the brickos DB. The
brickos-licensing crate's runtime queries always target `brickos.*`
explicitly.

The local-dev `docker-compose.dev.yml` uses ONE postgres container with one
database (`sovereign_health`), and SHI auto-applies its migrations to that
DB on startup. The migrations create everything in `public` schema. The
brickos-db migrations (which would move things to `brickos` schema) are NOT
auto-applied by SHI -- they're owned by the (not-yet-running)
brickos-platform-api binary.

Result: in local dev today, the brickos schema doesn't exist, so any
brickos-licensing query fails with `relation "brickos.foo" does not exist`.

## What broke during sprint 040 #471

Attempted single-DB workarounds and hit the following:

1. **Migration 005 of brickos-db** (`split_user_profile`) has a pre-existing
   `column "age" type integer but expression is of type text` bug when
   applied against the SHI app schema. Survivable but blocks subsequent
   migrations from running cleanly.

2. **Migration 004 of brickos-db** moves SHI's sprint 011
   `public.tier_features` (columns `tier_key` + `feature_id`) to
   `brickos.tier_features`. This collides with sprint 040 #460's new
   `brickos.tier_features` (columns `tier_slug` + `feature_slug`) -- the
   `CREATE TABLE IF NOT EXISTS` becomes a no-op against the moved table,
   then the seed in #463/migration 011 fails because `tier_slug` doesn't
   exist as a column.

3. **SHI auto-migration 20260407000002** expects `brickos.users` to exist
   (a "platform elevation" migration), which requires brickos-db migration
   001 to have run first. The local-dev startup order doesn't guarantee
   this.

4. **Search path mismatch**: SHI's `auth.rs` signup INSERTs into unqualified
   `users`. The search_path needs to fall through public → brickos OR
   brickos → public depending on which schema the tables are in. A single
   ALTER DATABASE search_path approach works for one direction but breaks
   the other.

5. **Schema-prefix inconsistency**: SHI's `admin_orgs.rs::create_organization`
   writes to unqualified `organizations` (resolves to `public.organizations`
   today), but brickos-licensing's `count_org_members_by_role` queries
   explicit `brickos.org_members`. The two queries hit different tables
   even when wired by the same handler call.

## What this issue should ship

### Option A: True two-DB E2E setup (production-aligned)

1. Add a `docker-compose.e2e.yml` with TWO postgres services:
   - `e2e-app-db` for SHI app data
   - `e2e-platform-db` for brickos schema
2. Add an `e2e-init.sh` script that:
   - Starts both DB containers
   - Runs SHI auto-migration against `e2e-app-db`
   - Applies the brickos bootstrap to `e2e-platform-db`
   - Creates the admin user via API + promotes via SQL
3. Update SHI's startup env to point each pool at the right DB
4. Ensure search_path is set per-pool so unqualified queries resolve
   correctly
5. Document the run command

### Option B: Single-DB with migration cleanup

1. Fix brickos-db migration 005 (the age column bug)
2. Make brickos-db migration 004 idempotent / collision-tolerant with
   sprint 040 #460's new brickos.tier_features schema (rename one of them)
3. Document the migration order: start postgres -> apply brickos-db 001-008
   -> start SHI api (auto-migration runs) -> apply brickos-db 009/010/011
4. Set ALTER DATABASE search_path TO brickos, public so all queries
   fall through correctly

Option A is cleaner and matches production. Option B is faster but
accumulates technical debt.

**Recommendation: Option A.**

## Acceptance criteria

- [ ] `E2E_TWO_POOL_READY=1 npx playwright test
       e2e/suite-licensing-journeys.spec.ts` runs to completion
- [ ] Journey 3 (admin override) green
- [ ] Journey 4 (org member seat enforcement) green
- [ ] CI workflow (or at minimum a documented script) that operators
      can run to validate the licensing platform end-to-end
- [ ] Setup steps in `apps/health/sovereign-health/frontend/e2e/README.md`

## Out of scope

- Journey 1 (Stripe payment): needs Stripe test mode setup AND a webhook
  tunneling solution. Belongs in a separate issue tied to design 021's
  org-level Stripe billing work.
- Journey 2 (downgrade with preserved markers): needs Stripe webhook
  simulation OR a direct DB manipulation helper. Belongs in the same
  Stripe-tied follow-up.

## References

- design 022 §13.5 M12 (the four journey definitions)
- Sprint 040 #471 (this is the follow-up to that issue)
- `apps/health/sovereign-health/frontend/e2e/suite-licensing-journeys.spec.ts`
- `apps/health/sovereign-health/frontend/e2e/fixtures/brickos_schema_bootstrap.sql`
- crates/brickos-db/migrations/004_add_app_key_columns.sql (the collision)
- crates/brickos-db/migrations/005_split_user_profile.sql (the age bug)
- Sprint 040 lessons doc -- entry for #471 setup challenges
