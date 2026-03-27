<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD - BIOMARKERS - INSIGHT

 Deployment & CI/CD Documentation
 Last updated: 2026-03-24

 https://sovereignhealth.io/
 AGPL-3.0 - https://github.com/sovereignbrick/brickos
============================================================================
-->

# Deployment & CI/CD - Sovereign Health Intelligence

This document describes the full deployment pipeline for Sovereign Health Intelligence. There is no external CI/CD service - builds happen on the developer's machine and are transferred to the VPS via SSH. This is intentional: the platform is privacy-first, self-sovereign, and does not depend on third-party CI/CD providers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Infrastructure](#2-infrastructure)
3. [Environments](#3-environments)
4. [Docker Compose Stacks](#4-docker-compose-stacks)
5. [Deployment Pipeline](#5-deployment-pipeline)
6. [Version Management](#6-version-management)
7. [Release Workflow](#7-release-workflow)
8. [Rollback Procedure](#8-rollback-procedure)
9. [Monitoring & Notifications](#9-monitoring--notifications)
10. [Database Operations](#10-database-operations)
11. [Scripts Reference](#11-scripts-reference)
12. [Secrets & Configuration](#12-secrets--configuration)
13. [Troubleshooting](#13-troubleshooting)
14. [Critical Rules](#14-critical-rules)

---

## 1. Architecture Overview

```
Developer Machine (localhost)
  |
  +-- cargo build  -> Rust backend Docker image
  +-- pnpm build   -> Next.js frontend Docker image
  +-- pnpm build   -> Static website (rsync)
          |
          |  docker save | ssh docker load
          v
VPS (72.61.154.115)
  |
  +-- nginx (reverse proxy + TLS)
  |     +-- sovereignhealth.io        -> static files (/opt/sovereign-health/homepage)
  |     +-- app.sovereignhealth.io    -> frontend container (:3000)
  |     +-- api.sovereignhealth.io    -> backend container (:8080)
  |     +-- demo.sovereignhealth.io   -> staging frontend (:3001)
  |     +-- api-demo.sovereignhealth.io -> staging backend (:8081)
  |     +-- ntfy.brickos.io          -> ntfy container (:2586)
  |     +-- status.sovereignhealth.io -> gatus container (:8082)
  |
  +-- Docker Compose (production)
  |     +-- backend    (sovereign-health-backend:latest)     :8080
  |     +-- frontend   (sovereign-health-frontend:latest)    :3000
  |     +-- db         (sovereign-health-postgres:latest)    internal
  |     +-- redis      (redis:7-alpine)                      internal
  |
  +-- Docker Compose (staging)
  |     +-- backend    (sovereign-health-backend:staging)    :8081
  |     +-- frontend   (sovereign-health-frontend:staging)   :3001
  |     +-- db         (sh-staging-db)                       internal
  |     +-- redis      (sh-staging-redis)                    internal
  |
  +-- Docker Compose (monitoring)
        +-- ntfy       (binwiederhier/ntfy)                  :2586
        +-- gatus      (twinproduction/gatus)                :8082
```

**Key design decisions:**
- No Docker registry - images are built locally and transferred via `docker save | ssh docker load`
- No external CI/CD - all builds run on the developer machine
- Staging and production share the same VPS but are fully isolated (separate DB, Redis, ports, env vars)
- Cloudflare sits in front for CDN/DDoS protection (production only)
- Let's Encrypt for TLS via certbot

---

## 2. Infrastructure

| Resource | Value |
|----------|-------|
| **VPS** | `root@72.61.154.115` |
| **OS** | Debian/Ubuntu |
| **Reverse proxy** | nginx with Let's Encrypt TLS |
| **CDN** | Cloudflare (production domains) |
| **DNS** | Cloudflare |
| **Container runtime** | Docker + Docker Compose |
| **Database** | PostgreSQL 16 with pgaudit extension |
| **Cache** | Redis 7 (Alpine) |
| **Monitoring** | Gatus (uptime) + ntfy (notifications) |
| **Email** | Mailgun (EU region) - staging: log-only (no MAILGUN_API_KEY set) |
| **Payments** | Stripe (TEST keys on staging, LIVE on production) |

---

## 3. Environments

### Production

| Component | URL | Container | Port |
|-----------|-----|-----------|------|
| Website | `sovereignhealth.io` | static files (nginx) | - |
| App | `app.sovereignhealth.io` | `sovereign-health-frontend-1` | 3000 |
| API | `api.sovereignhealth.io` | `sovereign-health-backend-1` | 8080 |
| DB | internal | `sovereign-health-db-1` | 5432 |

- Branch: `main`
- Compose: `docker-compose.prod.yml`
- Log level: `warn`
- Stripe: LIVE keys

### Staging

| Component | URL | Container | Port |
|-----------|-----|-----------|------|
| Website | `www-demo.sovereignhealth.io` | static files (nginx) | - |
| App | `demo.sovereignhealth.io` | `sh-staging-frontend` | 3001 |
| API | `api-demo.sovereignhealth.io` | `sh-staging-backend` | 8081 |
| DB | internal | `sh-staging-db` | 5432 |

- Branch: `develop`
- Compose: `docker-compose.staging.yml` + `.env.staging`
- Log level: `info`
- Stripe: TEST keys
- Protected by nginx basic auth
- Demo user: `demo@sovereignhealth.io` / `SovereignDemo1!`

### Local Development

- Compose: `docker-compose.dev.yml`
- Backend: `localhost:8080`
- Frontend: `localhost:3000`
- DB: `localhost:5432` (sovereign_health)
- Dev user: `dev@sovereignhealth.io` / `SovereignDev1`

---

## 4. Docker Compose Stacks

| File | Purpose | Project name |
|------|---------|--------------|
| `docker-compose.prod.yml` | Production services | default |
| `docker-compose.staging.yml` | Staging services (isolated) | `sh-staging` |
| `docker-compose.monitoring.yml` | ntfy + Gatus | default |
| `docker-compose.dev.yml` | Local development | - |
| `docker-compose.selfhosted.yml` | OSS self-hosted deployment | - |

---

## 5. Deployment Pipeline

The deploy script (`ops/deploy.sh`) handles the entire pipeline:

```
Local: pre-flight checks
  -> Local: docker build --no-cache (backend with code changes)
  -> Local: docker save | ssh docker load (transfer to VPS)
  -> VPS: staging DB backup (staging only)
  -> VPS: docker compose up -d --force-recreate
  -> VPS: migrations run automatically on backend startup
  -> VPS: rsync website static files
  -> VPS: docker image prune (cleanup)
  -> VPS/Cloudflare: cache purge (production only)
  -> VPS: verification (health check, version assertion)
  -> Local/ntfy/Telegram: deployment report + notification
```

### Pre-flight Checks

Run automatically before every deploy:

1. **Branch check** - production requires `main`, staging requires `develop`
2. **Local disk space** - need 2GB+ free for Docker build cache
3. **VPS disk space** - warns if < 2GB free
4. **SSH connectivity** - fail fast if VPS unreachable
5. **Frontend lockfile sync** - runs `pnpm install --frozen-lockfile` to catch stale `pnpm-lock.yaml`

### Build Process

**Backend (Rust):**
```bash
# CRITICAL: Use --no-cache when code has changed to avoid stale binaries
docker build --no-cache -f apps/health/sovereign-health/api/Dockerfile \
  -t sovereign-health-backend:${tag} .
```
- Multi-stage build: `rust:bookworm` -> `debian:bookworm-slim`
- Uses `runtime-tokio-rustls` (no libssl-dev required)
- Runtime includes `libreoffice-calc` for spreadsheet conversion
- Migrations embedded via `sqlx::migrate!()` - run on startup

**Frontend (Next.js):**
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${api_url}" \
  --build-arg NEXT_PUBLIC_ENVIRONMENT="${env}" \
  -t sovereign-health-frontend:${tag} .
```
- `NEXT_PUBLIC_API_URL` is baked at build time - separate images for staging vs production
- Standalone output mode for minimal image size

**Website (static):**
```bash
cd website && pnpm build
rsync -avz --delete out/ VPS:/opt/sovereign-health/homepage/
```

### Transfer & Restart

```bash
# CRITICAL: Remove old tag on VPS first to ensure new image is loaded
ssh root@VPS "docker rmi sovereign-health-backend:staging 2>/dev/null"

# Transfer image (no registry needed)
docker save image:tag | ssh root@VPS "docker load"

# Verify image ID matches local
LOCAL_ID=$(docker images image:tag --format '{{.ID}}')
REMOTE_ID=$(ssh root@VPS "docker images image:tag --format '{{.ID}}'")
[ "$LOCAL_ID" = "$REMOTE_ID" ] || echo "WARNING: Image ID mismatch!"

# Restart container
ssh root@VPS "cd /opt/sovereign-health && \
  docker compose -f ${compose_file} up -d --force-recreate ${service}"
```

### Post-deploy Verification (MANDATORY)

```bash
# 1. Wait for container to start
sleep 5

# 2. Check version matches expected (staging port 8081, production port 8080)
ssh root@VPS "curl -s http://localhost:8081/health"
# Must show: {"version": "X.Y.Z"}

# 3. Verify container was actually recreated
ssh root@VPS "docker ps --format '{{.Names}}\t{{.CreatedAt}}' | grep backend"
# Creation time must be AFTER the deploy timestamp

# 4. Check for migration errors
ssh root@VPS "docker logs sh-staging-backend 2>&1 | grep -i 'error\|modified'"
# Watch for: "was previously applied but has been modified" -> FATAL
# Watch for: only ONE db container exists

# 5. Verify only one DB container
ssh root@VPS "docker ps | grep staging-db"
# Must show exactly ONE container
```

---

## 6. Version Management

### Places where VERSION must be updated

| File | Field | Example |
|------|-------|---------|
| `api/src/lib.rs` | `pub const VERSION` | `"0.23.0"` |
| `api/Cargo.toml` | `version` | `"0.23.0"` |
| `ops/deploy.sh` | `VERSION` | `"0.23.0"` |
| `api/tests/snapshots/integration__health_snapshot.snap` | `"version"` | `"0.23.0"` |
| `api/tests/snapshots/integration__hello_snapshot.snap` | `"version"` | `"0.23.0"` |
| `Cargo.lock` | auto-regenerated | - |

### Bump script

```bash
bash ops/bump-version.sh 0.23.0
```

Updates all files listed above automatically.

### Versioning strategy

- **Minor bump** (0.22.0 -> 0.23.0): sprint releases with new features, migrations, or significant changes
- **Patch bump** (0.23.0 -> 0.23.1): bug fixes, small improvements, dependency updates
- **Staging build numbers:** During RC testing, use v0.23.0-b1, v0.23.0-b2... so version changes are visible in the UI footer

---

## 7. Release Workflow

### Phase 1: Pre-deployment checks (localhost)

```bash
cargo fmt --check && cargo clippy -- -D warnings   # Backend lint
cargo test -p sovereign-health-backend              # Backend tests
pnpm --filter sovereign-health-frontend build       # Frontend build (catches TS errors)
pnpm --filter sovereign-health-frontend lint        # Frontend lint
```

### Phase 2: Version bump (localhost)

```bash
bash ops/bump-version.sh X.Y.Z
```

### Phase 3: Generate release artifacts & commit (localhost)

**MANDATORY:** Release notes must be created BEFORE production deploy. This was missed in Sprint 014.

All artifacts go into `docs/project-files/releases/vX.Y.Z/`:

| File | Purpose | Required |
|------|---------|----------|
| `RELEASE_vX.Y.Z.md` | Release notes (highlights, changes, migrations, breaking) | **Yes** |
| `YYYY-MM-DD_manual-testing-checklist_vX.Y.Z.md` | Manual test checklist | Yes |
| `YYYY-MM-DD_testing-report_vX.Y.Z.md` | Test results | Recommended |

Release notes checklist:
- [ ] Highlights section (top 5-7 changes)
- [ ] Architecture changes (if any)
- [ ] New migrations listed
- [ ] Bug fixes listed
- [ ] Frontend changes listed
- [ ] Breaking changes (bold, at bottom)
- [ ] Upgrade notes

```bash
git add <files>
git commit -m "release: vX.Y.Z - summary"
```

### Phase 3b: Sprint retrospective (before production deploy)

Run a retrospective after every sprint (per project convention). Document in:
`docs/project-files/sprint-planning/retrospectives/YYYY-MM-DD_sprint-NNN-retro.md`

### Phase 3c: UI changes -- sketch before implementing

Sprint 014 lesson: settings tab restructure went through 4 iterations. For any UI change that affects layout, tab structure, or navigation:
1. Describe the change in text (what moves where)
2. Get user confirmation before writing code
3. One commit per iteration (not 4 fix-up commits)

### Phase 4: Deploy to staging

```bash
# Backend: ALWAYS use --no-cache for code changes
docker build --no-cache -f apps/health/sovereign-health/api/Dockerfile \
  -t sovereign-health-backend:staging .

# Remove old image on VPS, transfer new one
ssh root@VPS "docker rmi sovereign-health-backend:staging 2>/dev/null"
docker save sovereign-health-backend:staging | ssh root@VPS 'docker load'

# Deploy via script
bash ops/deploy.sh staging backend
bash ops/deploy.sh staging frontend
```

### Phase 5: Post-deploy verification (staging)

1. API health: `curl https://api-demo.sovereignhealth.io/health` -> version matches
2. Frontend loads: `https://demo.sovereignhealth.io/`
3. Container creation times are fresh: `docker ps --format '{{.Names}}\t{{.CreatedAt}}'`
4. Only ONE DB container exists: `docker ps | grep staging-db` (must be exactly 1)
5. No migration errors: `docker logs sh-staging-backend 2>&1 | grep "modified"`
6. Backend logs clean: `docker logs sh-staging-backend 2>&1 | grep -i error`

### Phase 6: Manual testing (staging)

Walk through the manual testing checklist. Latest checklist:
`docs/project-files/releases/v0.23.0-rc1/2026-03-21_manual-testing-checklist_v0.23.0-rc1.md`

### Phase 7: Promote to production

```bash
# 1. Merge develop -> main
bash ops/deploy.sh promote

# 2. Switch to main branch (REQUIRED for production deploy)
git checkout main

# 3. Deploy to production
bash ops/deploy.sh production --confirm

# 4. Push both branches
git push origin main
git checkout develop

# 5. Push git repos
bash ops/deploy.sh git

# 6. Tag release
git tag -a vX.Y.Z -m "Sovereign Health Intelligence vX.Y.Z"
git push origin --tags

# 7. Purge Cloudflare cache
# (automatic if CF_ZONE_ID and CF_API_TOKEN are set, otherwise manual)
```

---

## 8. Rollback Procedure

Before each deploy, the script saves the current image as `image:env-rollback`.

```bash
# Rollback staging
bash ops/deploy.sh rollback staging              # All services
bash ops/deploy.sh rollback staging backend      # Backend only

# Rollback production
bash ops/deploy.sh rollback production --confirm
```

This restores the previous Docker image tag and restarts containers. Database migrations are NOT rolled back automatically - if a migration needs reversal, write a new migration.

---

## 9. Monitoring & Notifications

### Gatus (uptime monitoring)

- Config: `ops/gatus-config.yaml`
- Status page: `https://status.sovereignhealth.io`
- Checks: API health, frontend, website (production + staging)
- Alerts via ntfy + Telegram on failure

### Notification Channels (ntfy + Telegram dual-dispatch)

Notifications are sent from two places:
1. **Deploy script** (`ops/deploy.sh`) - deploy start/finish, failures, verification results
2. **API runtime** (`services/notify.rs`) - auth events, billing events, security alerts

| Channel | ntfy topic | Purpose |
|---------|-----------|---------|
| Critical | `sh-critical` | MFA brute force, security breaches |
| Errors | `sh-errors` | Deploy failures, API errors |
| Billing | `sh-billing` | Subscriptions, payments, refunds |
| Users | `sh-users` | Signups, account changes, MFA events |
| Info | `sh-info` | Deploys, general status |
| Status | `sh-status` | Gatus uptime alerts |

---

## 10. Database Operations

### Migrations

- Location: `api/migrations/` (numbered SQL files)
- Applied automatically on backend startup via `sqlx::migrate!()`
- Convention: `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for idempotency

### Migration Rules

1. **NEVER modify an already-applied migration file** - SQLx tracks checksums. If a previously applied migration is modified, SQLx will refuse to run ALL subsequent migrations silently. Always create a NEW migration to fix data.
2. **Always test migrations locally** before deploying to staging
3. **Check backend logs** after deploy for: `"was previously applied but has been modified"` - this is FATAL

### Staging DB backup

Automatic before every staging deploy:
```bash
# Runs inside deploy.sh
docker exec sh-staging-db pg_dump -U sovereign_health sovereign_health_staging | gzip > backup.sql.gz
```
- Stored on VPS: `/opt/sovereign-health/backups/`
- Keeps last 5 backups, older ones auto-deleted

### Staging DB reset

```bash
bash ops/deploy.sh staging-reset-db
```
Drops and recreates the staging database. Backend re-runs all migrations on next start.

---

## 11. Scripts Reference

| Script | Purpose |
|--------|---------|
| `ops/deploy.sh staging` | Full staging deploy |
| `ops/deploy.sh staging backend` | Staging backend only |
| `ops/deploy.sh staging frontend` | Staging frontend only |
| `ops/deploy.sh staging website` | Staging website only |
| `ops/deploy.sh staging postgres` | Build & transfer pgaudit postgres image |
| `ops/deploy.sh production --confirm` | Full production deploy (must be on main branch) |
| `ops/deploy.sh promote` | Merge develop -> main (no deploy) |
| `ops/deploy.sh git` | Push to GitHub |
| `ops/deploy.sh status` | Show VPS container status |
| `ops/deploy.sh rollback <env> [component]` | Restore previous images |
| `ops/deploy.sh staging-reset-db` | Reset staging database |
| `ops/bump-version.sh X.Y.Z` | Bump version across all files |
| `ops/preflight.sh` | Pre-deploy verification checks |

---

## 12. Secrets & Configuration

### Environment files (gitignored)

| File | Location | Purpose |
|------|----------|---------|
| `api/.env` | Local dev | DB, JWT, Mailgun, Stripe, Cloudflare, ntfy, Telegram |
| `.env.staging` | VPS `/opt/sovereign-health/` | Staging-specific secrets |
| `.env` | VPS `/opt/sovereign-health/` | Production secrets |
| `.env.monitoring` | VPS `/opt/sovereign-health/` | ntfy + Telegram tokens |

### Key environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key |
| `ENCRYPTION_KEY` | At-rest encryption for sensitive fields |
| `ANTHROPIC_API_KEY` | Claude API for Dr. Alex |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `MAILGUN_API_KEY` | Transactional email (not set on staging = log-only) |
| `NTFY_BASE_URL` / `NTFY_TOKEN` | Push notifications |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram alerts |
| `CF_ZONE_ID` / `CF_API_TOKEN` | Cloudflare cache purge |

---

## 13. Troubleshooting

### Backend still running old version after deploy

**Root cause:** Docker build cache serves stale binary, or image transfer doesn't replace old tag.

```bash
# 1. Build without cache
docker build --no-cache -f apps/health/sovereign-health/api/Dockerfile \
  -t sovereign-health-backend:staging .

# 2. Remove old image on VPS BEFORE transferring
ssh root@VPS "docker rmi sovereign-health-backend:staging 2>/dev/null"

# 3. Transfer
docker save sovereign-health-backend:staging | ssh root@VPS 'docker load'

# 4. Verify image IDs match
docker images sovereign-health-backend:staging --format '{{.ID}}'
ssh root@VPS "docker images sovereign-health-backend:staging --format '{{.ID}}'"

# 5. Deploy and verify version
bash ops/deploy.sh staging backend
ssh root@VPS "curl -s http://localhost:8081/health"  # staging
ssh root@VPS "curl -s http://localhost:8080/health"  # production
```

### Orphan DB containers

**Root cause:** Manual `docker compose up` creates a second DB container.

```bash
# Check for duplicates
ssh root@VPS "docker ps -a | grep staging-db"

# If multiple, stop the orphan (the one with the longer name)
ssh root@VPS "docker stop <orphan_name> && docker rm <orphan_name>"

# RULE: Never use raw docker compose commands on VPS. Always use ops/deploy.sh
```

### Migration checksum mismatch

**Root cause:** An already-applied migration file was modified.

```bash
# Check logs
ssh root@VPS "docker logs sh-staging-backend 2>&1 | grep 'modified'"
# Output: "migration 20260321000002 was previously applied but has been modified"

# Fix: Create a NEW corrective migration, never modify the original
# If critical: reset staging DB
bash ops/deploy.sh staging-reset-db
```

### Container not recreated after deploy

```bash
# Check creation time
ssh root@VPS "docker ps --format '{{.Names}}\t{{.CreatedAt}}' | grep backend"

# If creation time is BEFORE the deploy, force recreate
ssh root@VPS "docker stop sh-staging-backend && docker rm sh-staging-backend"
bash ops/deploy.sh staging backend
```

### Frontend lockfile out of sync

```bash
cd apps/health/sovereign-health/frontend
pnpm install --ignore-workspace
git add pnpm-lock.yaml
```

### Stale content after deploy (Cloudflare cache)

```bash
# Auto-purged for production deploys, or manually:
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### SSH $-variable escaping issues

Never inline strings containing `$` through SSH. Always pipe via stdin:
```bash
# BAD:  ssh VPS "echo $HOME"
# GOOD: printf 'value' | ssh VPS 'cat'
```

### Docker build fails with libssl-dev

The project uses `rustls` everywhere. Never add `native-tls` or `openssl` as a dependency. Ensure sqlx uses `runtime-tokio-rustls` and reqwest uses `rustls-tls`.

### LibreOffice conversion issues

The backend Docker image includes `libreoffice-calc` for spreadsheet (ODS/XLSX) to CSV conversion.

```bash
# Verify installed
ssh root@VPS "docker exec sh-staging-backend which libreoffice"

# Check conversion logs
ssh root@VPS "docker logs sh-staging-backend 2>&1 | grep -i libre"

# Common issues:
# - Multi-sheet files: output is UUID-SheetName.csv (not UUID.csv)
# - Encoding: UTF-8 charset flag set, Latin-1 fallback for legacy files
# - Timeout: Claude API extraction timeout is 120s
```

---

## 14. Critical Rules

These rules were learned from production incidents. Violating them causes silent failures.

| Rule | Why | Incident |
|------|-----|----------|
| Always `--no-cache` for backend builds with code changes | Docker cache can serve stale binary from unchanged layers | v0.23.0 RC: 5 deploys showed v0.22.0 |
| Remove old image tag on VPS before `docker load` | `docker load` is a no-op if tag already exists with same layers | v0.23.0 RC: image transfer appeared successful but old image remained |
| Verify version via `curl localhost:PORT/health` after EVERY deploy | Deploy script may report success while old container runs | v0.23.0 RC: script said OK but API was v0.22.0 |
| NEVER modify applied migrations | SQLx silently skips ALL subsequent migrations on checksum mismatch | v0.23.0 RC: em-dash fix migration never applied |
| NEVER use manual `docker compose` on VPS | Can create orphan DB containers; backend connects to empty DB | v0.23.0 RC: second DB created, all data missing |
| NEVER deploy to production while testing staging | Shared VPS; wrong commands affect production | v0.23.0 RC: Gatus 502 alert on production |
| Use staging build numbers (v0.23.0-b1, b2...) | Same version string across deploys makes verification impossible | v0.23.0 RC: couldn't tell if new code was running |
| Check for only ONE DB container after any docker operation | Orphan DBs cause empty data and long migration replays | v0.23.0 RC: 3-minute migration replay on empty DB |
| Never replace sovereign-health-postgres with standard postgres | pgaudit extension is required for audit logging | Historical |
| `pnpm build` locally before committing frontend changes | Catches TypeScript errors before deploy | Historical |
| Staging website must build with `NEXT_PUBLIC_API_URL=staging` | Website defaults to production API; feature-details page shows wrong data | Sprint 013 |
| Never run `docker compose up` directly on VPS | Compose uses `${VAR}` interpolation; without `.env` sourced, secrets are empty → crash-loop | Sprint 013 (3 outages) |
| nginx basic auth blocks PWA files (manifest.json, sw.js, /offline, icons) | Service worker can't authenticate; iOS can't fetch icons | Sprint 011 |
| nginx basic auth on staging API blocks CORS preflight | OPTIONS requests don't carry basic auth → 401 → no CORS headers → browser blocks everything | Sprint 011 |
| Staging API needs CORS + WEBSITE_URL for staging website domain | `www-demo.sovereignhealth.io` must be in CORS_ORIGINS | Sprint 013 |
| Use `curl -X GET` not `curl -sI` (HEAD) for redirect testing | Sovereign Link handler only matches GET; HEAD returns 404 | Sprint 012 |
| `next build --webpack` required for @serwist/next (PWA) | Turbopack doesn't support @serwist/next yet | Sprint 011 |
| After version bump, update insta snapshots with `INSTA_UPDATE=always cargo test --test integration` | Snapshots contain VERSION string; stale snapshots fail CI | Every release |

---

## 15. New Components (Sprint 011-013)

### PWA (Service Worker)
- Built by `@serwist/next` during `pnpm build` (requires `--webpack` flag)
- Generated files: `public/sw.js`, `public/serwist-worker-*.js` (gitignored)
- nginx must exempt from basic auth: `/manifest.json`, `/sw.js`, `/offline`, icon files

### Sovereign Link (brickos.io)
- URL shortener routes: `brickos.io/r/{code}` → health API port 8080
- nginx config: `ops/nginx-brickos.conf` on VPS at `/etc/nginx/sites-enabled/brickos.io`
- Cloudflare Origin Certificate for `brickos.io` at `/etc/ssl/cloudflare/`

### Staging Smoke Test
```bash
bash ops/staging-smoke-test.sh
```
30+ automated checks: API health, auth, PWA, cache headers, sync, push, Sovereign Link, idempotency, accessibility.

### Playwright E2E Tests
```bash
# Public tests (no auth needed)
pnpm test:e2e

# Full suite with auth
E2E_USER_EMAIL=demo@sovereignhealth.io E2E_USER_PASSWORD='SovereignDemo1!' pnpm test:e2e
```
15 tests: public pages, PWA, API, auth flow, demo mode, Sovereign Link, accessibility.

---

## 16. Known Issues & Workarounds (Sprint 013)

### Compose env var crash-loop (#234)
**Problem:** `docker compose up` on VPS creates containers with empty `ENCRYPTION_KEY` because `${VAR}` references aren't sourced.
**Workaround:** Only use `deploy.sh` to manage containers. Never run `docker compose` directly.
**Permanent fix:** Issue #234 — switch to `env_file:` directive in compose.

### Staging website → production API
**Problem:** Website built without `NEXT_PUBLIC_API_URL` defaults to production API.
**Fix applied:** `deploy.sh` now sets `NEXT_PUBLIC_API_URL=api-demo.sovereignhealth.io` for staging builds.

### Rate limiting during E2E tests
**Problem:** Multiple login attempts trigger rate limiter, failing auth tests.
**Workaround:** Restart backend to clear in-memory limits: `docker restart sh-staging-backend`
**Fix:** E2E tests share single login across auth tests.
