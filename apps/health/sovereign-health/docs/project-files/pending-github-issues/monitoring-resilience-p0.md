---
title: "fix: Monitoring & resilience P0 — deep health check, container watchdog, compose isolation"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

On 2026-03-22, a production outage occurred when the PostgreSQL container disappeared during a staging compose operation. Monitoring failed to detect it because:

1. `GET /health` returns 200 without checking DB/Redis — Gatus saw "up" throughout the outage
2. No container-level monitoring — the missing DB container was invisible to Gatus
3. Staging and production compose files share the service name `db` — a staging command cross-contaminated production

See: `docs/project-files/design/017-monitoring-and-resilience-strategy.md`

## Fix 1: Deep Health Endpoint

Add DB + Redis connectivity checks to the health endpoint:

- `GET /health` — always 200 (liveness, for load balancers)
- `GET /health?deep=1` — checks DB + Redis, returns 503 if either is down

Response includes `checks.database.status` and `checks.redis.status` with latency.
Update Gatus config to monitor `/health?deep=1`.

## Fix 2: Container Watchdog

Systemd timer running every 60s on the VPS that:
- Checks critical containers are running (db, backend, frontend, redis)
- Sends ntfy alert to `sh-critical` if any container is missing
- Optionally auto-restarts missing containers

## Fix 3: Compose Project Name Isolation

Add explicit `name:` field to compose files:
- `docker-compose.prod.yml` → `name: sovereign-health`
- `docker-compose.staging.yml` → `name: sh-staging`

Prevents staging operations from touching production containers.

## Acceptance Criteria

- [ ] `/health?deep=1` returns 503 when DB is unreachable
- [ ] `/health?deep=1` returns 503 when Redis is unreachable
- [ ] `/health` (without deep) still returns 200 always
- [ ] Gatus monitors `/health?deep=1` for production
- [ ] Container watchdog alerts within 60s of a container going down
- [ ] `docker compose` for staging cannot affect production containers
- [ ] All changes tested on staging before production deploy
