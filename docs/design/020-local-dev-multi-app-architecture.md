# 020 -- Local Development Multi-App Architecture

**Status:** Draft v1
**Author:** Helmut / Claude
**Date:** 2026-04-09
**Related:** 018-platform-service-elevation, 019-scaffold-generator-architecture, 014-brickos-platform-gui, ADR-042 (3-char prefix)

---

## 1. Problem Statement

BrickOS is growing from a single app (SHI on port 8080/3000) to a multi-app ecosystem. During Sprint 036, deploying Sovereign CRM locally exposed fundamental issues:

1. **Port collisions**: CRM frontend defaulted to SHI's port 8080, login calls went to the wrong API
2. **No port registry**: Developers must manually remember which port belongs to which app
3. **No shared dev database**: Each app needs platform tables (users, orgs, auth), but they all run separate PostgreSQL containers with duplicated init scripts
4. **No dev portal**: No single page to see which apps are running, their health, and their URLs
5. **Frontend API_URL hardcoded**: Every frontend had `localhost:8080` baked in -- required manual override per app
6. **Workspace dependency issues**: `@brickos/ui` as `workspace:*` breaks standalone `npm install` outside pnpm workspace

### What Happened

```
Developer runs CRM frontend -> login form calls localhost:8080 (SHI) instead of 8084 (CRM)
-> SHI doesn't know about the CRM user -> "not authorized"
-> Developer wastes 30 minutes debugging a port misconfiguration
```

This will get worse as more apps are added (Voice, Exchange, Almanac, Identity).

---

## 2. Port Registry (ADR-042 Extension)

### Assigned Ports

Each app gets a deterministic port block. API ports are even numbers starting from 8080, staging is +1, frontend dev ports mirror at 3000+.

| App | Prefix | API (prod) | API (staging) | Frontend (dev) | Dev DB |
|-----|--------|-----------|---------------|----------------|--------|
| Platform API | - | 9000 | 9001 | 3010 | 5432 |
| Sovereign Health (SHI) | shi | 8080 | 8081 | 3000 | 5432 |
| Sovereign Link (SLI) | sli | 8082 | 8083 | 3002 | 5433 |
| **Sovereign CRM (SCR)** | scr | **8084** | **8085** | **3004** | **5434** |
| Sovereign Voice (SVO) | svo | 8086 | 8087 | 3006 | 5435 |
| Sovereign Exchange (SEX) | sex | 8088 | 8089 | 3008 | 5436 |
| Sovereign Identity (SID) | sid | 8090 | 8091 | 3012 | 5437 |
| Sovereign Almanac (SAL) | sal | 8092 | 8093 | 3014 | 5438 |

### Formula (implemented in scaffold-app.sh v2)

```bash
FRONTEND_PORT = 3000 + (PROD_PORT - 8080) / 2 * 2
DEV_DB_PORT   = 5432 + (PROD_PORT - 8080) / 2
STAGING_PORT  = PROD_PORT + 1
```

### Single Source of Truth

The port assignment is derived from the API production port (the 4th argument to `scaffold-app.sh`). No lookup table needed -- the formula is deterministic.

---

## 3. Current Architecture (One DB Per App)

Today each app runs its own PostgreSQL container for local dev:

```
┌────────────────────────────────┐
│  SHI Dev                       │
│  PostgreSQL :5432              │
│  ├── sovereign_health (app)    │
│  └── brickos schema (platform) │
└────────────────────────────────┘

┌────────────────────────────────┐
│  CRM Dev                       │
│  PostgreSQL :5434              │
│  ├── scr (app)                 │
│  └── brickos schema (platform) │  <-- DUPLICATED
└────────────────────────────────┘
```

**Problem:** Each app duplicates the entire platform schema (users, orgs, auth tables). A user registered in SHI's dev DB doesn't exist in CRM's dev DB. No cross-app login.

---

## 4. Proposed Architecture: Shared Dev PostgreSQL

### Option A: Shared Dev Database (Recommended)

One PostgreSQL container for all local development, matching production architecture:

```
┌──────────────────────────────────────────────┐
│  BrickOS Dev PostgreSQL :5432                 │
│                                               │
│  ├── brickos       (platform: users, orgs)    │
│  ├── shi           (SHI app tables)           │
│  ├── scr           (CRM app tables)           │
│  ├── sli           (Link app tables)          │
│  └── svo           (Voice app tables)         │
│                                               │
│  brickos schema in "brickos" database:        │
│    users, refresh_tokens, email_verifications, │
│    user_mfa, user_profile, organizations,      │
│    org_members, service_accounts, ...          │
└──────────────────────────────────────────────┘
```

**Implementation:** `ops/dev-stack/docker-compose.yml`

```yaml
name: brickos-dev

services:
  db:
    image: postgres:16-alpine
    container_name: brickos-dev-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: brickos
      POSTGRES_PASSWORD: brickos
      POSTGRES_DB: brickos
    volumes:
      - brickos-dev-data:/var/lib/postgresql/data
      - ./init-platform.sql:/docker-entrypoint-initdb.d/01-platform.sql
      - ./init-apps.sql:/docker-entrypoint-initdb.d/02-apps.sql

volumes:
  brickos-dev-data:
```

`init-platform.sql` creates the brickos schema + platform tables (single source, not duplicated per app).
`init-apps.sql` creates per-app databases: `CREATE DATABASE shi; CREATE DATABASE scr; ...`

**Benefits:**
- Register once, log in everywhere (shared users table)
- Cross-app features work locally (service accounts, org_apps)
- Matches production architecture exactly
- One container instead of N

**Per-app .env then uses:**
```
SCR_DATABASE_URL=postgres://brickos:brickos@localhost:5432/scr
SCR_PLATFORM_DATABASE_URL=postgres://brickos:brickos@localhost:5432/brickos
```

### Option B: Keep Separate DBs (Current)

Each app scaffold includes its own `docker-compose.dev.yml` with a PostgreSQL container on a unique port. Simple but duplicates platform schema and prevents cross-app testing.

**Recommendation:** Start with Option A for new development. The per-app `docker-compose.dev.yml` from the scaffold serves as fallback for isolated development.

---

## 5. BrickOS Dev Portal (localhost:9000)

### Concept

A lightweight web page served by `brickos-platform-api` (port 9000) that acts as a local developer hub:

```
┌──────────────────────────────────────────────────┐
│  BrickOS Dev Portal          http://localhost:9000 │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Platform Services                            │ │
│  │  [DB] PostgreSQL :5432    [Running]           │ │
│  │  [API] Platform API :9000 [Running]           │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ SHI      │  │ CRM      │  │ SLI      │        │
│  │ :8080 API│  │ :8084 API│  │ :8082 API│        │
│  │ :3000 Web│  │ :3004 Web│  │ :3002 Web│        │
│  │ [Running]│  │ [Running]│  │ [Stopped]│        │
│  │          │  │          │  │          │        │
│  │ [Open]   │  │ [Open]   │  │ [Start]  │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                    │
│  Quick Actions:                                    │
│  [Create New App]  [Reset DB]  [View Logs]         │
└──────────────────────────────────────────────────┘
```

### Implementation Phases

**Phase 1 -- Static health page (minimal):**
- Platform API serves `/dev` page
- Lists all known apps (from port registry or `org_apps` table)
- Checks each app's `/health` endpoint
- Links to each app's frontend and API
- No app management, just discovery

**Phase 2 -- Live status + logs:**
- WebSocket connection to each app's health endpoint
- Container status via Docker API (if running locally)
- Log tailing from each container
- Database status (connected, migration count)

**Phase 3 -- App management:**
- "Create New App" button runs scaffold-app.sh via API
- "Start/Stop" buttons for individual apps
- "Reset DB" drops and recreates per-app database
- Integrated with platform-api's app registry

---

## 6. Developer Workflow (Target State)

### First-Time Setup

```bash
# 1. Start shared dev database + platform API
docker compose -f ops/dev-stack/docker-compose.yml up -d

# 2. Open dev portal
open http://localhost:9000/dev

# 3. Start the app you're working on
cd apps/data/sovereign-crm/api && cargo run    # API on :8084
cd apps/data/sovereign-crm/frontend && npm run dev  # Frontend on :3004
```

### Daily Development

```bash
# Dev portal shows all apps, their status, and links
# Click "Open" next to CRM -> opens http://localhost:3004
# All apps share the same users -- log in once, token works everywhere
```

### Adding a New App

```bash
bash ops/scaffold-app.sh sovereign-voice svo attention 8086
# -> Scaffold creates app with correct ports
# -> Shared dev DB already has the brickos platform schema
# -> Just create the app database: CREATE DATABASE svo;
# -> cargo run starts on :8086, frontend on :3006
# -> Dev portal auto-discovers it via health check
```

---

## 7. Staging Architecture (Aligned)

Staging should mirror the local port layout. Today all apps share one VPS at 72.61.154.115 with one PostgreSQL container:

```
VPS:  sh-staging-db (PostgreSQL)
      ├── brickos_staging    (platform)
      ├── shi_staging        (SHI)
      ├── sli_staging        (SLI)
      └── scr_staging        (CRM)

      sh-staging-backend     :8081  (SHI API)
      scr-staging-api        :8085  (CRM API)
```

**External access** (via nginx):
- `api-demo.sovereignhealth.io` -> :8081
- `crm-api-demo.brickos.io` -> :8085 (to be configured)

This matches the local dev pattern: shared DB, separate API ports per app.

---

## 8. Scaffold Changes (Already Done in v2.1)

The scaffold generator was updated in Sprint 036 to support this architecture:

| Feature | Status |
|---------|--------|
| Port-aware `api-config.ts.tmpl` (single source for API_URL) | Done |
| `FRONTEND_PORT` derived from API port | Done |
| `DEV_DB_PORT` derived from API port | Done |
| `docker-compose.dev.yml` generated per app | Done |
| `init-dev-db.sql` with platform tables | Done |
| `.env` auto-generated with correct ports | Done |
| `@brickos/ui` removed (breaks standalone install) | Done |
| `tw-animate-css` removed (Turbopack can't resolve) | Done |
| Quick-start instructions with port map | Done |

---

## 9. Open Questions

1. **Shared dev DB vs per-app DB?** Option A (shared) is recommended but requires a separate `ops/dev-stack/` setup. Per-app fallback already works via scaffold.

2. **Dev portal scope?** Phase 1 (static health page) is a few hours of work. Phase 2-3 add significant complexity. Worth it?

3. **Cross-app auth in dev?** If all apps share the same JWT secret in local dev, a token from SHI works in CRM. The scaffold already uses a common dev JWT secret. Should this be enforced?

4. **Frontend port convention?** Current formula works but produces non-obvious ports (3004 for CRM). Alternative: use port 3000 always, only one frontend runs at a time. Tradeoff: can't run multiple frontends simultaneously.

5. **Hot reload across apps?** When editing a shared crate (brickos-auth), all running API servers need to restart. Should the dev portal detect this?

---

## 10. Implementation Roadmap

| Phase | Scope | Effort | Sprint |
|-------|-------|--------|--------|
| **Phase 0** (done) | Port-aware scaffold, per-app docker-compose.dev | 2 hrs | 036 |
| **Phase 1** | Shared dev PostgreSQL (`ops/dev-stack/`) | 3 hrs | 037 |
| **Phase 2** | Platform API `/dev` health page | 5 hrs | 037 |
| **Phase 3** | nginx config for staging CRM subdomain | 2 hrs | 037 |
| **Phase 4** | Dev portal live status + log tailing | 8 hrs | 038+ |
| **Phase 5** | Dev portal app management (create, start, stop) | 13 hrs | 039+ |

---

## 11. Lessons Learned (Sprint 036)

These findings from the CRM localhost deployment drove this design:

1. **Never hardcode ports** -- every frontend file that referenced `localhost:8080` was a bug waiting to happen. Single source: `api-config.ts`
2. **`workspace:*` deps break standalone install** -- npm can't resolve them outside pnpm workspace. Remove or conditionally replace.
3. **Turbopack CSS resolution differs from webpack** -- `@import "package-name"` doesn't resolve npm packages the same way. Use explicit paths or remove optional CSS packages.
4. **Platform tables must be pre-created for dev** -- auth handlers write to `brickos.users`, `brickos.refresh_tokens`, etc. Without `init-dev-db.sql`, signup fails immediately.
5. **Column names drift between code and reality** -- auth handlers assumed `used` (bool) but actual column is `used_at` (timestamptz). Schema-first development catches this earlier.
6. **Test on the actual target port before shipping** -- the scaffold-test caught Rust compilation issues but not frontend port misconfiguration. Need frontend smoke test in scaffold.
