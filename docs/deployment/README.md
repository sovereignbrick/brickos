# BrickOS Platform Deployment Workflow

**Last updated:** 2026-04-06
**Elevated from:** `apps/health/sovereign-health/docs/project-files/deployment/README.md`

This document defines the platform-level deployment workflow for ALL BrickOS applications. Each app can be deployed independently. Only deploy what changed.

For SHI-specific deployment details (Docker build flags, LibreOffice setup, frontend env vars), see the [SHI deployment doc](../../apps/health/sovereign-health/docs/project-files/deployment/README.md).

---

## 1. Platform Architecture

```
Developer Machine (localhost)
  |
  +-- Platform DB migrations   (crates/brickos-db/migrations/)
  +-- SHI Backend              (apps/health/sovereign-health/api/)
  +-- SHI Frontend             (apps/health/sovereign-health/frontend/)
  +-- SHI Website              (apps/health/sovereign-health/website/)
  +-- Sovereign Link           (apps/technology/sovereign-link/)
  +-- Sovereign Voice          (apps/attention/sovereign-voice/)
  |
  |  docker save | ssh docker load | scp | rsync
  v
VPS (72.61.154.115)
  |
  +-- nginx (shared reverse proxy, TLS, routing)
  |     +-- sovereignhealth.io          -> static files
  |     +-- app.sovereignhealth.io      -> SHI frontend :3000
  |     +-- api.sovereignhealth.io      -> SHI backend :8080
  |     +-- brickos.io/r/*              -> SHI backend :8080 (Sovereign Link platform mode)
  |
  +-- PostgreSQL (shared database)
  |     +-- brickos schema              -> platform tables (users, orgs, billing, links)
  |     +-- public schema               -> SHI tables (measurements, markers, zones)
  |
  +-- Docker containers
  |     +-- sovereign-health-backend    -> :8080
  |     +-- sovereign-health-frontend   -> :3000
  |     +-- sovereign-health-db         -> :5432 (internal)
  |     +-- redis                       -> internal
  |
  +-- Systemd services
  |     +-- nostr-scheduler.service     -> Sovereign Voice (Node.js)
  |
  +-- Monitoring
        +-- gatus                       -> status.sovereignhealth.io
        +-- ntfy                        -> ntfy.brickos.io
```

---

## 2. Deployment Units

Each unit is independently deployable. Only deploy what changed in the sprint.

| Unit | Source | Build | Transfer | Runtime | Port |
|------|--------|-------|----------|---------|------|
| **Platform DB** | `crates/brickos-db/migrations/` | SQL | psql via SSH | PostgreSQL | - |
| **SHI Backend** | `apps/health/sovereign-health/api/` | Docker (Rust) | docker save/load | Container | 8080 |
| **SHI Frontend** | `apps/health/sovereign-health/frontend/` | Docker (Next.js) | docker save/load | Container | 3000 |
| **SHI Website** | `apps/health/sovereign-health/website/` | Next.js static | rsync | nginx static | - |
| **Sovereign Link** (platform) | `apps/technology/sovereign-link/` | Part of SHI backend | Same container | Same as SHI | 8080 |
| **Sovereign Link** (standalone) | `apps/technology/sovereign-link/` | Docker or musl binary | docker save/load or scp | Container or systemd | 8090 |
| **Sovereign Voice** | `apps/attention/sovereign-voice/` | pnpm build | scp dist/ | systemd (Node.js) | - |

### Dependency Order

Always deploy in this order when multiple units changed:

```
1. Platform DB migrations     (affects all apps)
2. SHI Backend               (includes Sovereign Link platform mode)
3. SHI Frontend              (depends on backend API)
4. SHI Website               (independent, can be parallel with frontend)
5. Sovereign Voice            (independent)
6. Sovereign Link standalone  (independent)
```

**Rule:** Platform DB migrations ALWAYS run before any app deployment. Never simultaneously.

---

## 3. Deploy Commands

```bash
# Platform DB (migrations only)
ops/deploy.sh platform-db staging           # Run brickos schema migrations on staging
ops/deploy.sh platform-db production        # Run brickos schema migrations on production

# SHI (existing commands, unchanged)
ops/deploy.sh staging                       # Full SHI deploy (backend + frontend + website)
ops/deploy.sh staging backend               # SHI backend only
ops/deploy.sh staging frontend              # SHI frontend only
ops/deploy.sh staging website               # SHI website only
ops/deploy.sh production --confirm          # Full SHI production deploy

# Sovereign Voice
ops/deploy.sh staging sovereign-voice       # Build + scp + restart systemd
ops/deploy.sh production sovereign-voice    # Same for production

# Sovereign Link (standalone, when deployed separately)
ops/deploy.sh staging sovereign-link        # Build + docker save/load
ops/deploy.sh production sovereign-link     # Same for production

# Status and rollback
ops/deploy.sh status                        # All containers + systemd services
ops/deploy.sh rollback staging backend      # Rollback specific component
```

---

## 4. Sprint Closing Workflow

### Phase 1: Pre-flight checks (localhost)

```bash
# Platform-level checks
cargo fmt --check                                          # Format check
cargo clippy -p sovereign-link -- -D warnings              # Lint changed app
cargo test -p sovereign-link --features standalone --no-default-features  # Test changed app

# SHI checks (if SHI changed)
cargo test -p sovereign-health-backend                     # SHI backend tests
pnpm --filter sovereign-health-frontend build              # Frontend type check
pnpm --filter sovereign-health-frontend lint               # Frontend lint

# Sovereign Voice checks (if Voice changed)
cd apps/attention/sovereign-voice && pnpm build && pnpm test
```

**Rule:** Only run checks for apps that changed in the sprint. No need to rebuild everything.

### Phase 2: Sprint artifacts (before deploy)

All artifacts are MANDATORY before production deploy.

| Artifact | Location | Required |
|----------|----------|----------|
| Sprint summary | `docs/sprint-planning/sprints/sprint-NNN.md` | Yes |
| Retrospective | `docs/sprint-planning/retrospectives/YYYY-MM-DD_sprint-NNN-retro.md` | Yes |
| Release notes (per changed app) | `docs/releases/<app>/vX.Y.Z/RELEASE_vX.Y.Z.md` | Yes |
| Version bump (per changed app) | Cargo.toml / package.json | Yes |

```bash
# Version bump
# SHI: bash ops/bump-version.sh X.Y.Z
# Sovereign Link: edit Cargo.toml version field
# Sovereign Voice: edit package.json version field

# Commit artifacts
git add docs/sprint-planning/ docs/releases/
git commit -m "docs: Sprint NNN artifacts (summary, retro, release notes)"
```

### Phase 3: Deploy to staging

```bash
# Step 1: Platform DB (if migrations changed)
ops/deploy.sh platform-db staging

# Step 2: Verify all apps still work
curl -s https://api-demo.sovereignhealth.io/health    # SHI backend
curl -s https://demo.sovereignhealth.io               # SHI frontend

# Step 3: Deploy changed apps
ops/deploy.sh staging backend                          # If SHI backend changed
ops/deploy.sh staging sovereign-voice                  # If Voice changed
```

### Phase 4: Staging verification

**Staging demo user:** `demo@sovereignhealth.io` / `SovereignDemo1`
**Staging URLs:** `demo.sovereignhealth.io` (frontend), `api-demo.sovereignhealth.io` (API)

```bash
# Automated health checks
curl -s http://localhost:8081/health                   # SHI backend (staging)
curl -s http://localhost:3001                          # SHI frontend (staging)
ssh root@VPS "systemctl status nostr-scheduler"       # Sovereign Voice

# Login test with demo user
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@sovereignhealth.io","password":"SovereignDemo1"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('token','FAILED'))")
echo "Login: $([ "$TOKEN" != "FAILED" ] && echo 'OK' || echo 'FAILED')"

# Test authenticated endpoints
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/v1/measurements?limit=5 \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Measurements: {len(d.get(\"data\",[]))} returned')" 2>/dev/null || echo "Measurements: endpoint check needed"

# Cross-app integration check
# Sovereign Link redirect works: curl -I brickos.io/r/test-code
# SHI reads from brickos schema: login, view dashboard, view measurements

# Platform DB consistency
curl -s http://localhost:8081/api/v1/admin/consistency # If endpoint deployed
```

### Phase 5: Manual testing

Walk through the relevant testing checklist for each changed app.
Only test what changed - no need to re-test unchanged apps.

### Phase 6: Promote to production

```bash
# 1. Merge develop into main
git checkout main
git merge develop --no-edit
git push origin main
git push gitlab main

# 2. Deploy platform DB first (if migrations changed)
ops/deploy.sh platform-db production

# 3. Verify all apps still work on production
curl -s https://api.sovereignhealth.io/health

# 4. Deploy changed apps
ops/deploy.sh production --confirm                    # SHI
ops/deploy.sh production sovereign-voice              # Voice (if changed)

# 5. Return to develop
git checkout develop

# 6. Tag release (per app that shipped)
git tag -a sovereign-link/v0.2.0 -m "Sovereign Link v0.2.0 - Platform mode"
git tag -a brickos-platform/v0.1.0 -m "BrickOS Platform Schema v0.1.0"
git push origin --tags

# 7. Purge CDN cache (if website/frontend changed)
```

---

## 5. Platform DB Migration Workflow

Platform migrations are the most critical deployment step. They affect ALL apps.

### Before Writing a Migration

- [ ] Does this change affect existing data? If yes, test on a DB copy first.
- [ ] Is the migration idempotent? (IF EXISTS, IF NOT EXISTS, ON CONFLICT)
- [ ] Does it DROP anything? If yes, get explicit approval. Prefer deprecation.
- [ ] Does it change column types? If yes, test with existing data.

### Execution Order

```
crates/brickos-db/migrations/          <- Platform (runs first)
  001_create_brickos_schema.sql
  002_service_accounts.sql
  ...

apps/health/sovereign-health/api/migrations/  <- SHI app (runs second, on backend startup)
  20260308000001_create_zones.sql
  ...
```

**Platform migrations are run manually via psql.** They are NOT embedded in any app binary.
**SHI migrations run automatically via sqlx::migrate!()** on backend startup.

### How to Run Platform Migrations

```bash
# Staging
ssh root@72.61.154.115 "psql -U sovereign_health sovereign_health_staging \
  < /opt/brickos/crates/brickos-db/migrations/001_create_brickos_schema.sql"

# Production
ssh root@72.61.154.115 "psql -U sovereign_health sovereign_health \
  < /opt/brickos/crates/brickos-db/migrations/001_create_brickos_schema.sql"
```

### Verification After Platform Migration

```bash
# 1. Tables moved to brickos schema
psql -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='brickos' ORDER BY tablename;"

# 2. search_path includes brickos
psql -c "SHOW search_path;"
# Expected: "public, brickos" or "$user, public, brickos"

# 3. SHI queries still work (unqualified table names resolve via search_path)
psql -c "SELECT count(*) FROM users;"              # Should work (finds brickos.users)
psql -c "SELECT count(*) FROM measurements;"       # Should work (finds public.measurements)

# 4. Run all app health checks
curl -s http://localhost:8080/health                # Production SHI
curl -s http://localhost:8081/health                # Staging SHI
```

---

## 6. Per-App Deployment Details

### Sovereign Health Intelligence (SHI)

See [SHI deployment doc](../../apps/health/sovereign-health/docs/project-files/deployment/README.md) for full details including:
- Docker build flags (--no-cache for code changes)
- Frontend NEXT_PUBLIC_API_URL handling
- Staging vs production image management
- Database backup before deploy

### Sovereign Link (Platform Mode)

Sovereign Link platform mode compiles INTO the SHI backend binary. Deploying SHI backend deploys Sovereign Link platform mode.

- Routes: `brickos.io/r/*` -> nginx -> SHI backend :8080
- No separate deployment needed
- Version tied to SHI backend version

### Sovereign Link (Standalone Mode)

Independent deployment for self-hosters, Start9, Docker Hub.

```bash
# Build standalone binary
cd apps/technology/sovereign-link
make build-musl                                    # Static binary
make build-docker                                  # Docker image

# Deploy to Docker Hub (future)
docker push brickos/sovereign-link:0.2.0

# Deploy to Start9 Marketplace (future)
# Requires start9-sdk tooling
```

### Sovereign Voice

```bash
# Build
cd apps/attention/sovereign-voice
pnpm install && pnpm build

# Deploy to VPS
scp -r dist/ package.json schedule.json root@72.61.154.115:/opt/nostr-scheduler/
ssh root@72.61.154.115 "cd /opt/nostr-scheduler && npm install --omit=dev && systemctl restart nostr-scheduler"

# Verify
ssh root@72.61.154.115 "systemctl status nostr-scheduler"
ssh root@72.61.154.115 "cd /opt/nostr-scheduler && node dist/index.js list schedule.json"
```

---

## 7. Rollback per App

Each app can be rolled back independently.

| App | Rollback method |
|-----|----------------|
| SHI Backend | `ops/deploy.sh rollback staging backend` (restores previous Docker image) |
| SHI Frontend | `ops/deploy.sh rollback staging frontend` |
| Sovereign Voice | `ssh root@VPS "cd /opt/nostr-scheduler && git checkout HEAD~1 -- dist/"` then restart systemd |
| Platform DB | Write a new corrective migration. Never revert manually. |

**Rule:** Database migrations are NEVER rolled back. Write a new migration to undo changes.

---

## 8. Version Management

Each app has its own version. They are NOT synchronized.

| App | Version file | Current |
|-----|-------------|---------|
| SHI Backend | `api/Cargo.toml` + `api/src/lib.rs` | v0.37.0 |
| Sovereign Link | `apps/technology/sovereign-link/Cargo.toml` | v0.1.0 |
| Sovereign Voice | `apps/attention/sovereign-voice/package.json` | v0.1.0 |
| Platform DB | Sequential migration numbers (001, 002, ...) | 005 |

### Tagging Convention

```
git tag sovereign-health/v0.37.0         # SHI release
git tag sovereign-link/v0.2.0            # Sovereign Link release
git tag sovereign-voice/v0.1.0           # Sovereign Voice release
git tag brickos-platform/v0.1.0          # Platform schema release
```

---

## 9. Critical Rules (Platform-Level)

Inherited from SHI, elevated for multi-app:

| Rule | Why |
|------|-----|
| **NEVER deploy to production automatically or without explicit user confirmation** | Production is the live system with real users. Every production action (migrations, deploys, restarts) requires the user to explicitly say "deploy to production." No automation, no assumptions, no "while we're at it." Sprint 029 incident: migrations ran on production without user sign-off. |
| **NEVER run production migrations without completing staging testing first** | Staging must be fully verified (smoke, E2E, manual testing) and the user must confirm before any production action. Sprint 029 incident: production migrations ran before staging testing was confirmed complete. |
| Platform DB migrations FIRST, then app deployments | Apps depend on platform schema. Deploying app before migration = queries fail. |
| Never deploy platform DB and app changes simultaneously | If something breaks, you need to know which change caused it. |
| Verify ALL apps after platform DB migration | A schema move (ALTER TABLE SET SCHEMA) should be transparent via search_path, but verify. |
| Each app deploys independently | Sovereign Voice failure should not block SHI deployment. |
| Only deploy what changed | No full platform redeploy for a one-line fix in Sovereign Voice. |
| Test platform migrations on staging with ALL apps running | SHI, Sovereign Link, Sovereign Voice must all work after migration. |
| Never modify an applied migration | SQLx tracks checksums. Modified = all subsequent migrations silently skip. Write a new migration. |
| One DB container only | Check `docker ps | grep db` after every operation. Orphan DBs cause empty data. |
| Branch rules | Staging: deploy from `develop`. Production: deploy from `main` only. |

---

## 10. Monitoring (Shared)

| Service | URL | Monitors |
|---------|-----|----------|
| Gatus | status.sovereignhealth.io | SHI API, SHI frontend, website (staging + production) |
| ntfy | ntfy.brickos.io | Deploy notifications, error alerts, billing events |
| Telegram | Bot alerts | Dual-dispatch with ntfy |

**TODO:** Add Sovereign Link and Sovereign Voice health checks to Gatus.

---

## 11. Quick Reference

| I want to... | Command |
|--------------|---------|
| Deploy SHI to staging | `ops/deploy.sh staging` |
| Deploy only SHI backend | `ops/deploy.sh staging backend` |
| Deploy Sovereign Voice | `ops/deploy.sh staging sovereign-voice` |
| Run platform migrations on staging | `ops/deploy.sh platform-db staging` |
| Check all services | `ops/deploy.sh status` |
| Rollback SHI backend | `ops/deploy.sh rollback staging backend` |
| Build Sovereign Link binary | `cd apps/technology/sovereign-link && make build-musl` |
| Check VPS disk space | `ssh root@72.61.154.115 "df -h /"` |
| View Sovereign Voice logs | `ssh root@72.61.154.115 "journalctl -u nostr-scheduler -f"` |
