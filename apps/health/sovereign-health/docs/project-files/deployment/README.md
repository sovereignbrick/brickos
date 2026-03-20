<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Deployment & CI/CD Documentation
 Last updated: 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Deployment & CI/CD — Sovereign Health Intelligence

This document describes the full deployment pipeline for Sovereign Health Intelligence. There is no external CI/CD service — builds happen on the developer's machine and are transferred to the VPS via SSH. This is intentional: the platform is privacy-first, self-sovereign, and does not depend on third-party CI/CD providers.

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

---

## 1. Architecture Overview

```
Developer Machine (localhost)
  │
  ├── cargo build  → Rust backend Docker image
  ├── pnpm build   → Next.js frontend Docker image
  └── pnpm build   → Static website (rsync)
          │
          │  docker save | ssh docker load
          ▼
VPS (72.61.154.115)
  │
  ├── nginx (reverse proxy + TLS)
  │     ├── sovereignhealth.io        → static files (/opt/sovereign-health/homepage)
  │     ├── app.sovereignhealth.io    → frontend container (:3000)
  │     ├── api.sovereignhealth.io    → backend container (:8080)
  │     ├── demo.sovereignhealth.io   → staging frontend (:3001)
  │     ├── api-demo.sovereignhealth.io → staging backend (:8081)
  │     ├── ntfy.brickos.io          → ntfy container (:2586)
  │     └── status.sovereignhealth.io → gatus container (:8082)
  │
  ├── Docker Compose (production)
  │     ├── backend    (sovereign-health-backend:latest)     :8080
  │     ├── frontend   (sovereign-health-frontend:latest)    :3000
  │     ├── db         (sovereign-health-postgres:latest)    internal
  │     └── redis      (redis:7-alpine)                      internal
  │
  ├── Docker Compose (staging)
  │     ├── backend    (sovereign-health-backend:staging)    :8081
  │     ├── frontend   (sovereign-health-frontend:staging)   :3001
  │     ├── db         (sh-staging-db)                       internal
  │     └── redis      (sh-staging-redis)                    internal
  │
  └── Docker Compose (monitoring)
        ├── ntfy       (binwiederhier/ntfy)                  :2586
        └── gatus      (twinproduction/gatus)                :8082
```

**Key design decisions:**
- No Docker registry — images are built locally and transferred via `docker save | ssh docker load`
- No external CI/CD — all builds run on the developer machine
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
| **Email** | Mailgun (EU region) |
| **Payments** | Stripe (TEST keys on staging, LIVE on production) |

---

## 3. Environments

### Production

| Component | URL | Container | Port |
|-----------|-----|-----------|------|
| Website | `sovereignhealth.io` | static files (nginx) | — |
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
| Website | `www-demo.sovereignhealth.io` | static files (nginx) | — |
| App | `demo.sovereignhealth.io` | `sh-staging-frontend` | 3001 |
| API | `api-demo.sovereignhealth.io` | `sh-staging-backend` | 8081 |
| DB | internal | `sh-staging-db` | 5432 |

- Branch: `develop`
- Compose: `docker-compose.staging.yml` + `.env.staging`
- Log level: `info`
- Stripe: TEST keys
- Protected by nginx basic auth
- Demo user: `demo@sovereignhealth.io` / `Demo2026!`

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
| `docker-compose.dev.yml` | Local development | — |
| `docker-compose.selfhosted.yml` | OSS self-hosted deployment | — |

---

## 5. Deployment Pipeline

The deploy script (`ops/deploy.sh`) handles the entire pipeline:

```
Local: pre-flight checks
  → Local: docker build (backend/frontend)
  → Local: docker save | ssh docker load (transfer to VPS)
  → VPS: staging DB backup (staging only)
  → VPS: docker compose up -d --force-recreate
  → VPS: migrations run automatically on backend startup
  → VPS: rsync website static files
  → VPS: docker image prune (cleanup)
  → VPS/Cloudflare: cache purge (production only)
  → VPS: verification (health check, version assertion)
  → Local/ntfy/Telegram: deployment report + notification
```

### Pre-flight Checks

Run automatically before every deploy:

1. **Local disk space** — need 2GB+ free for Docker build cache
2. **VPS disk space** — warns if < 2GB free
3. **SSH connectivity** — fail fast if VPS unreachable
4. **Frontend lockfile sync** — runs `pnpm install --frozen-lockfile` to catch stale `pnpm-lock.yaml`

### Build Process

**Backend (Rust):**
```bash
docker build -f apps/health/sovereign-health/api/Dockerfile \
  -t sovereign-health-backend:${tag} .
```
- Multi-stage build: `rust:1.83-slim` → `debian:bookworm-slim`
- Uses `runtime-tokio-rustls` (no libssl-dev required)
- Migrations embedded via `sqlx::migrate!()` — run on startup

**Frontend (Next.js):**
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${api_url}" \
  --build-arg NEXT_PUBLIC_ENVIRONMENT="${env}" \
  -t sovereign-health-frontend:${tag} .
```
- `NEXT_PUBLIC_API_URL` is baked at build time — separate images for staging vs production
- Standalone output mode for minimal image size

**Website (static):**
```bash
cd website && pnpm build
rsync -avz --delete out/ VPS:/opt/sovereign-health/homepage/
```

### Transfer & Restart

```bash
# Transfer image (no registry needed)
docker save image:tag | ssh root@VPS "docker load"

# Restart container
ssh root@VPS "cd /opt/sovereign-health && \
  docker compose -f ${compose_file} up -d --force-recreate ${service}"
```

---

## 6. Version Management

### Single source of truth

`api/src/lib.rs` → `pub const VERSION: &str = "X.Y.Z";`

### Bump script

```bash
bash ops/bump-version.sh 0.22.0
```

Updates 7 files automatically:
- `ops/deploy.sh` — `VERSION="X.Y.Z"`
- `api/src/lib.rs` — `pub const VERSION`
- `api/Cargo.toml` — `version = "X.Y.Z"`
- `frontend/package.json` — `"version"`
- `website/package.json` — `"version"`
- `api/tests/snapshots/integration__health_snapshot.snap`
- `api/tests/snapshots/integration__hello_snapshot.snap`
- `Cargo.lock` (regenerated)

### Versioning strategy

- **Minor bump** (0.21.0 → 0.22.0): sprint releases with new features, migrations, or significant changes
- **Patch bump** (0.21.0 → 0.21.1): bug fixes, small improvements, dependency updates
- No RC tags — every version is a full release

---

## 7. Release Workflow

### Phase 1: Pre-deployment checks (localhost)

```bash
cargo fmt --check && cargo clippy -- -D warnings   # Backend lint
cargo test -p sovereign-health-backend              # Backend tests
pnpm --filter sovereign-health-frontend lint        # Frontend lint
pnpm --filter sovereign-health-frontend test        # Frontend tests
bash frontend/scripts/check-theme-colors.sh         # Theme audit
cargo audit                                          # Security (advisory)
```

### Phase 2: Version bump (localhost)

```bash
bash ops/bump-version.sh X.Y.Z
```

### Phase 3: Generate release artifacts & commit (localhost)

All artifacts go into `docs/project-files/releases/vX.Y.Z/`:

| File | Purpose |
|------|---------|
| `release-audit.json` | Automated check results |
| `RELEASE_vX.Y.Z.md` | Release notes |
| `YYYY-MM-DD_testing-report_vX.Y.Z.md` | Test pyramid results |
| `YYYY-MM-DD_manual-testing-checklist_vX.Y.Z.md` | Manual test checklist |

```bash
git add <files>
git commit -m "release: vX.Y.Z — summary"
```

### Phase 4: Deploy to staging

```bash
bash ops/deploy.sh staging              # Full deploy
bash ops/deploy.sh staging backend      # Backend only
bash ops/deploy.sh staging frontend     # Frontend only
```

### Phase 5: Post-deploy verification (staging)

1. API health: `curl https://api-demo.sovereignhealth.io/health` → version matches
2. Frontend loads: `https://demo.sovereignhealth.io/`
3. Container creation times are fresh (not old containers surviving)
4. Migrations applied: check `_sqlx_migrations` table
5. No errors in `docker logs sh-staging-backend`

### Phase 6: Manual testing (staging)

Walk through the manual testing checklist. Latest checklist:
`docs/project-files/releases/v0.22.0/2026-03-20_manual-testing-checklist_v0.22.0.md`

### Phase 7: Promote to production

```bash
# Merge develop → main
bash ops/deploy.sh promote

# Deploy to production
bash ops/deploy.sh production --confirm

# Push to GitHub
bash ops/deploy.sh git

# Tag release
git tag -a vX.Y.Z -m "Sovereign Health Intelligence vX.Y.Z"
git push origin --tags
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

This restores the previous Docker image tag and restarts containers. Database migrations are NOT rolled back automatically — if a migration needs reversal, write a new migration.

---

## 9. Monitoring & Notifications

### Gatus (uptime monitoring)

- Config: `ops/gatus-config.yaml`
- Status page: `https://status.sovereignhealth.io`
- Checks: API health, frontend, website (production + staging)
- Alerts via ntfy + Telegram on failure

### Notification Channels (ntfy + Telegram dual-dispatch)

Notifications are sent from two places:
1. **Deploy script** (`ops/deploy.sh`) — deploy start/finish, failures, verification results
2. **API runtime** (`services/notify.rs`) — auth events, billing events, security alerts

| Channel | ntfy topic | Purpose |
|---------|-----------|---------|
| Critical | `sh-critical` | MFA brute force, security breaches |
| Errors | `sh-errors` | Deploy failures, API errors |
| Billing | `sh-billing` | Subscriptions, payments, refunds |
| Users | `sh-users` | Signups, account changes, MFA events |
| Info | `sh-info` | Deploys, general status |
| Status | `sh-status` | Gatus uptime alerts |

### Runtime notification hooks (API)

The `Notifier` service is injected as `web::Data<Notifier>` into Actix handlers:

| Event | Channel | Priority |
|-------|---------|----------|
| New signup | Users | Default |
| Email verified | Users | Default |
| Password reset | Users | Default |
| MFA enabled | Users | Default |
| MFA disabled | Users | High |
| MFA brute force lockout | Critical | High |
| Password changed | Users | Default |
| Account deletion | Users | High |
| New subscription | Billing | Default |
| Plan changed | Billing | Default |
| Cancellation requested | Billing | High |
| Subscription cancelled | Billing | High |
| Subscription reactivated | Billing | Default |
| Payment failed | Billing | Urgent |
| Refund processed | Billing | High |
| Admin refund | Billing | High |

---

## 10. Database Operations

### Migrations

- Location: `api/migrations/` (numbered SQL files)
- Applied automatically on backend startup via `sqlx::migrate!()`
- Convention: `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for idempotency
- Current count: 103 migrations

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
| `ops/deploy.sh production --confirm` | Full production deploy |
| `ops/deploy.sh promote` | Merge develop → main (no deploy) |
| `ops/deploy.sh git` | Push to GitHub |
| `ops/deploy.sh status` | Show VPS container status |
| `ops/deploy.sh rollback <env> [component]` | Restore previous images |
| `ops/deploy.sh staging-reset-db` | Reset staging database |
| `ops/bump-version.sh X.Y.Z` | Bump version across all files |
| `ops/test-all.sh` | Run full test suite |
| `ops/cleanup.sh` | Docker cleanup on VPS |

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
| `MAILGUN_API_KEY` | Transactional email |
| `NTFY_BASE_URL` / `NTFY_TOKEN` | Push notifications |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram alerts |
| `CF_ZONE_ID` / `CF_API_TOKEN` | Cloudflare cache purge |

---

## 13. Troubleshooting

### Common issues

**Container not recreated after deploy:**
```bash
# Check creation time
ssh root@VPS "docker inspect --format='{{.Created}}' sh-staging-backend"
# Force recreate
ssh root@VPS "cd /opt/sovereign-health && docker compose -f docker-compose.staging.yml --env-file .env.staging -p sh-staging up -d --force-recreate backend"
```

**Frontend lockfile out of sync:**
```bash
cd apps/health/sovereign-health/frontend
pnpm install --ignore-workspace
git add pnpm-lock.yaml
```

**Stale content after deploy (Cloudflare cache):**
```bash
# Auto-purged for production deploys, or manually:
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

**Migration failed on startup:**
```bash
# Check logs
ssh root@VPS "docker logs sh-staging-backend 2>&1 | head -50"
# Migrations are idempotent — restarting usually fixes transient issues
ssh root@VPS "docker restart sh-staging-backend"
```

**SSH $-variable escaping issues:**
Never inline strings containing `$` through SSH. Always pipe via stdin:
```bash
# BAD:  ssh VPS "echo $HOME"
# GOOD: echo '$HOME' | ssh VPS "cat"
```

**Docker build fails with libssl-dev:**
The project uses `rustls` everywhere. Never add `native-tls` or `openssl` as a dependency. Ensure sqlx uses `runtime-tokio-rustls` and reqwest uses `rustls-tls`.
