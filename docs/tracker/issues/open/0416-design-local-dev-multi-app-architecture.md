---
number: 416
title: "design: Local dev multi-app architecture -- shared DB, port registry, dev portal"
milestone: "infrastructure"
labels: [infrastructure, developer-experience]
created: 2026-04-09
priority: P2
---

Implement the local development architecture from Design 020 to support multiple BrickOS apps running simultaneously on localhost.

## Problem

Each new app (CRM, Voice, etc.) duplicates platform tables in its own dev PostgreSQL, uses inconsistent ports, and has no discovery mechanism. Developers hit port collisions and cross-app auth failures.

## Phases

### Phase 1: Shared dev PostgreSQL (3 hrs)
- Create `ops/dev-stack/docker-compose.yml` with single PostgreSQL
- `init-platform.sql` creates brickos schema + platform tables
- `init-apps.sql` creates per-app databases (shi, scr, sli, svo)
- All apps point to `localhost:5432` with different database names
- Replaces per-app PostgreSQL containers

### Phase 2: Platform API dev page (5 hrs)
- `/dev` endpoint on platform-api (port 9000)
- Lists all registered apps from port registry
- Health checks each app's `/health` endpoint
- Links to frontend + API for each app
- Shows running/stopped status

### Phase 3: Staging nginx for CRM (2 hrs)
- Configure `crm-api-demo.brickos.io` -> port 8085 on VPS
- SSL via existing Cloudflare wildcard cert
- Test CRM accessible from external URL

### Phase 4+: Dev portal live status, app management (future)

## References
- Design doc: docs/design/020-local-dev-multi-app-architecture.md
- Port registry: ADR-042
- Scaffold: docs/design/019-scaffold-generator-architecture.md
