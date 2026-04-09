---
number: 411
title: "feat: CRM Docker compose + deploy.sh + staging deployment"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, ops]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [409, 410]
---

Create deployment infrastructure for Sovereign CRM and deploy to staging.

## Files

- `apps/data/sovereign-crm/ops/Dockerfile` -- multi-stage with cargo-chef
- `apps/data/sovereign-crm/ops/docker-compose.staging.yml` -- scr-staging-api (port 8085)
- `apps/data/sovereign-crm/ops/docker-compose.prod.yml` -- scr-api (port 8084)
- `apps/data/sovereign-crm/ops/deploy.sh` -- CI/CD orchestration

## Dockerfile Requirements

- Multi-stage build with cargo-chef for layer caching
- COPY lines for ALL workspace crates in planner + builder stages (per feedback)
- Runtime stage: debian-slim, ca-certificates, timezone
- Image names: `sovereignbrick/scr-api`, `sovereignbrick/scr-web`

## Docker Compose Requirements

- Explicit `name:` field (per feedback_compose_isolation)
- `scr-staging-api` container on port 8085
- Connects to existing staging PostgreSQL (no new DB container)
- Environment from `.env.staging`
- Health check endpoint

## deploy.sh Requirements

- Follow SHI deploy.sh pattern
- Pre-flight checks (version, env vars, connectivity)
- Build with `--no-cache` (per feedback_backend_deploy_nocache)
- Push, recreate containers, verify creation time (per feedback)
- Smoke test after deploy
- ntfy notification on success/failure (per feedback_ntfy_token_verification)

## Acceptance Criteria

- `bash deploy.sh staging` builds and deploys successfully
- Container responds to health check on port 8085
- API serves /api/v1/contacts endpoint
- Frontend loads at configured URL
