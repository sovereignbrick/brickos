---
number: 492
title: "test: [automated] dev stack cold boot + migration pass"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-a, automated]
created: 2026-04-11
priority: P1
sprint: 041
phase: A
estimate: 0.25d
---

Prove the SHI dev stack boots from a cold docker compose on a freshly reset DB without manual SQL surgery.

## Scope

- [ ] `docker compose -f apps/health/sovereign-health/ops/docker-compose.dev.yml down -v` (wipe volumes)
- [ ] `docker compose -f apps/health/sovereign-health/ops/docker-compose.dev.yml up -d postgres redis`
- [ ] Wait for postgres health
- [ ] `cargo run --bin sovereign-health-backend` with `DEV_CORS=true DATABASE_URL=postgres://...` and the JWT_SECRET from .env
- [ ] All 177 migrations apply cleanly (baseline: Sprint 040 close-out had 1 pre-existing failure on migration 20260407000002 blocking downstream)
- [ ] `curl http://localhost:8080/health` returns 200

## Who

Claude (automated).

## Verification

- Backend boots without migration failure
- `SELECT COUNT(*) FROM _sqlx_migrations WHERE success = true` matches count of `.sql` files in migrations dir
- Health endpoint green

## Blocks

- #493 (existing test suite run)
- All subsequent phase A-F issues that need a working dev DB
