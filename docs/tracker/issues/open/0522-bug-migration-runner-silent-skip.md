---
number: 522
title: "bug: [P0] backend swallows migration failures, serves /health 200 with broken schema"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [bug, sprint-041, phase-b, p0]
created: 2026-04-11
priority: P0
sprint: 041
phase: B
estimate: 0.5d
discovered_by: 492
related: [491]
---

## Summary

When a SQLx migration fails during backend startup, the failure is logged at ERROR level but the backend **continues startup and reports `/health` 200**. The DB is left in a partial state with all subsequent migrations silently skipped, and `_sqlx_migrations` records zero `success=false` rows.

## Reproduction (from #492 cold boot, 2026-04-11)

1. `docker compose -f apps/health/sovereign-health/ops/docker-compose.dev.yml down -v`
2. `docker compose -f apps/health/sovereign-health/ops/docker-compose.dev.yml up -d postgres redis`
3. `cargo run --bin sovereign-health-backend` with dev env vars
4. Backend boots, log line 37 contains:
   ```
   ERROR Migration failure: while executing migration 20260407000002:
   error returned from database: relation "brickos.users" does not exist
   ```
5. `curl http://localhost:8080/health` returns 200
6. `SELECT COUNT(*) FROM _sqlx_migrations WHERE success = true` returns **163**
7. `ls migrations/*.sql | wc -l` returns **177**
8. `SELECT version FROM _sqlx_migrations WHERE success = false` returns **0 rows**
9. 14 migrations missing (the entire `20260408*` and Sprint 040 series), including all licensing/branding/invoice schema

## Why this is P0

- `/health` is the primary signal monitoring uses to gate deploys -- it currently lies on partial-schema boots
- Sprint 040 shipped because the missing migrations were manually `psql`-applied to a long-running DB, masking the cold-boot break entirely
- Any future deploy that recreates the DB volume (DR test, fresh staging spin-up, new dev onboarding) would silently boot a half-applied schema

## Acceptance criteria

- [ ] Backend startup MUST exit non-zero if any migration in the `migrations/` dir fails to apply
- [ ] `/health` MUST return non-200 (or fail to bind) until migrations are fully applied
- [ ] Failed migration MUST be recorded in `_sqlx_migrations` with `success = false` (or the runner aborts before that row exists -- whichever SQLx supports)
- [ ] After fix, repro steps 1-4 above produce a process exit code != 0 and no `/health` listener
- [ ] Add a regression test in `tests/smoke/` that asserts startup fails when a deliberately-broken migration is staged

## Related work

- #491 fixes the underlying `brickos.users does not exist` cause -- but this issue is independent: the runner must hard-fail regardless of which migration breaks
- #492 is the test that surfaced this -- it should be re-run after both #491 and #522 land

## Who

Claude (automated implementation), user (review).
