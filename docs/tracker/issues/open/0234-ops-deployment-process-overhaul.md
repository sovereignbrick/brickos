---
number: 234
title: "ops: deployment process overhaul — root cause analysis + clean redesign"
labels: [bug, ops, infrastructure, priority-high]
milestone: release-workflow
---

## Problem Statement

The deployment process is fragile. Multiple issues surfaced during Sprint 013 testing that caused staging downtime, wasted time, and required multiple redeploy cycles. The current process has grown organically and needs a clean redesign.

## Error Log (Sprint 013 session, 2026-03-24)

### Error 1: Staging website fetches from production API
- **What:** Feature comparison table on staging website showed no data
- **Cause:** `NEXT_PUBLIC_API_URL` not set during staging website build — defaults to production
- **Time wasted:** ~15 min debugging
- **Fix applied:** Added env var to `deploy.sh` for staging builds
- **Root cause:** Website build doesn't receive environment-specific config

### Error 2: CORS blocks staging website → staging API
- **What:** Browser blocked feature table fetch — no `Access-Control-Allow-Origin` header
- **Cause:** Staging API CORS only allows `demo.sovereignhealth.io`, not `www-demo.sovereignhealth.io`
- **Time wasted:** ~20 min debugging
- **Fix applied:** Added WEBSITE_URL + CORS_ORIGINS to docker-compose.staging.yml
- **Root cause:** New domains require manual compose file edits on VPS

### Error 3: `docker compose up` kills staging backend (3 times!)
- **What:** Backend crash-loops with "ENCRYPTION_KEY must be 32 bytes"
- **Cause:** Running `docker compose up` directly doesn't source `.env` file — secret vars are empty
- **Time wasted:** ~30 min across 3 occurrences
- **Fix:** Only deploy.sh can restart containers — it sources env files correctly
- **Root cause:** Compose file uses `${VAR}` interpolation that requires shell env, not `env_file:` directive

### Error 4: Docker build timeout during deploy
- **What:** `cargo chef cook` timed out downloading crates.io registry
- **Cause:** Network issue during Docker build — no retry logic
- **Time wasted:** ~10 min
- **Fix:** Manual retry
- **Root cause:** No build retry mechanism, no pre-warmed cache

### Error 5: Manual VPS compose edits not synced
- **What:** Compose changes made on VPS (CORS, WEBSITE_URL) not in repo
- **Cause:** deploy.sh doesn't sync compose files — relies on manual VPS management
- **Time wasted:** Ongoing risk of drift
- **Root cause:** Compose files treated as VPS-local config, not source-controlled

### Error 6: `source .env && docker compose up` doesn't work
- **What:** Even sourcing the env file before compose up didn't pass vars to containers
- **Cause:** `source` alone doesn't `export` — need `set -a && source .env && set +a`
- **Time wasted:** ~15 min
- **Root cause:** Fragile env var passing mechanism

## Total Impact

- **~90 min wasted** on deployment issues in a single session
- **3 staging outages** (backend crash-loop)
- **6 separate issues**, all preventable

## Root Cause Analysis

The fundamental problem: **secrets management and environment configuration are implicit, not explicit.**

```
Current (fragile):
  .env on VPS (secrets) → sourced by deploy.sh → passed to shell
  shell vars → interpolated into compose YAML → passed to container
  Any break in this chain → empty secrets → crash

Desired (robust):
  .env on VPS (secrets) → loaded directly by Docker via env_file
  compose YAML → references env_file, not shell vars
  deploy.sh → syncs compose files, never needs to source secrets
```

## Proposed Redesign

### Option A: env_file in compose (minimal change)

```yaml
# docker-compose.staging.yml
services:
  backend:
    image: sovereign-health-backend:staging
    env_file:
      - /opt/sovereign-health/.env.secrets     # DB_PASSWORD, JWT_SECRET, ENCRYPTION_KEY
      - /opt/sovereign-health/.env.staging     # FRONTEND_URL, CORS_ORIGINS, WEBSITE_URL
    environment:
      RUST_LOG: info                            # Only non-secret overrides
```

**Pros:** Simple, Docker-native, secrets never in compose YAML
**Cons:** Need to restructure env files on VPS

### Option B: deploy.sh templates compose file (medium change)

```bash
# deploy.sh generates compose from template, injecting env-specific values
envsubst < ops/docker-compose.staging.tmpl.yml > /tmp/compose.yml
scp /tmp/compose.yml $VPS:/opt/sovereign-health/docker-compose.staging.yml
```

**Pros:** Compose files are in repo (templated), deploy.sh is single source of truth
**Cons:** More complex, envsubst dependency

### Option C: Full container orchestration rethink (big change)

Move to:
- **Docker Swarm** with `docker secret` for secrets management
- Or **Coolify/Portainer** for managed deploys
- Or **Kamal** (from Basecamp) — zero-downtime deploys over SSH

**Pros:** Production-grade, zero-downtime, proper secrets
**Cons:** Migration effort, new tooling to learn

## Recommendation

**Option A first** (1-2 hour effort):
1. Create `.env.secrets` and `.env.staging` on VPS with proper separation
2. Update compose files to use `env_file:` directive
3. Remove all `${VAR}` interpolation from compose
4. Update deploy.sh to sync compose files to VPS
5. Add deploy.sh guard: warn if anyone runs `docker compose up` directly
6. Document the new process

**Option C later** (when we add US region or 3+ services):
Evaluate Kamal or Docker Swarm for multi-region deploys.

## Acceptance Criteria

- [ ] `docker compose up -d` on VPS works WITHOUT sourcing any env files
- [ ] All secrets loaded via `env_file:` directive
- [ ] deploy.sh syncs compose files from repo to VPS
- [ ] CORS origins and WEBSITE_URL managed in one place
- [ ] No manual VPS edits needed for normal deploys
- [ ] Documentation updated with new process
- [ ] Test: fresh VPS clone can run full stack with just deploy.sh
