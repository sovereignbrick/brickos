---
number: 233
title: "ops: fix staging compose env vars, CORS for website, deploy robustness"
labels: [bug, ops, infrastructure]
milestone: release-workflow
---

## Description

Multiple deployment issues surfaced during Sprint 013 staging testing. These need a permanent fix to prevent recurrence.

## Issues Found

### 1. Staging website calls production API
The staging website (`www-demo.sovereignhealth.io`) was built without `NEXT_PUBLIC_API_URL` set, so it defaulted to the production API (`api.sovereignhealth.io`). The feature-details page showed production data instead of staging.

**Fix applied:** `deploy.sh` now sets `NEXT_PUBLIC_API_URL` for staging website builds.
**Permanent fix needed:** Ensure all staging builds consistently use staging API URLs.

### 2. Staging API CORS doesn't include staging website
The staging API's CORS config only allowed `demo.sovereignhealth.io` (app), not `www-demo.sovereignhealth.io` (website). The feature comparison table couldn't fetch data — browser blocked by CORS.

**Fix applied:** Added `CORS_ORIGINS` and `WEBSITE_URL` to `docker-compose.staging.yml`.
**Permanent fix needed:** deploy.sh should manage CORS origins for all staging domains automatically.

### 3. docker compose up loses secret env vars
Running `docker compose -f docker-compose.staging.yml up -d` directly (not via deploy.sh) creates containers with blank `ENCRYPTION_KEY`, `JWT_SECRET`, and `DB_PASSWORD` — because these are `${VARIABLE}` references that require the shell env to be sourced from `.env` first.

This caused the staging backend to crash-loop with:
```
ENCRYPTION_KEY must be 32 bytes (64 hex chars) — left: 0, right: 32
```

**Root cause:** The compose file uses `${DB_PASSWORD_STAGING}` etc. which are stored in `/opt/sovereign-health/.env` on the VPS. Running `docker compose up` without sourcing that file creates containers with empty values.

**Permanent fix needed:**
- Option A: Use `env_file:` directive in compose to auto-load `.env`
- Option B: Add a wrapper script on VPS (`sh-compose.sh`) that sources `.env` before calling compose
- Option C: deploy.sh should be the ONLY way to manage containers (document this, add guard)

### 4. deploy.sh doesn't update compose CORS/WEBSITE_URL
When new staging domains are added (like the website), the compose file on the VPS needs manual updating. deploy.sh should manage the compose env vars or at least sync the compose file.

**Permanent fix needed:** deploy.sh should template or sync the compose file to VPS, not rely on manual VPS edits.

### 5. Docker build timeout on crate download
`cargo chef cook` timed out downloading crates during a deploy, causing a full build failure. This is intermittent (network issue) but the deploy had no retry logic.

**Permanent fix needed:** Add `--no-cache` retry on build failure, or pre-warm the cargo registry cache.

## Proposed Solution

### A. Compose env_file directive
```yaml
# docker-compose.staging.yml
services:
  backend:
    env_file:
      - .env          # shared secrets
      - .env.staging   # staging-specific overrides
    environment:
      # Only non-secret overrides here
      FRONTEND_URL: https://demo.sovereignhealth.io
      WEBSITE_URL: https://www-demo.sovereignhealth.io
      CORS_ORIGINS: https://demo.sovereignhealth.io,https://www-demo.sovereignhealth.io
```

### B. deploy.sh syncs compose file
```bash
# In deploy.sh, before docker compose up:
scp ops/docker-compose.staging.yml $VPS:/opt/sovereign-health/
```

### C. Guard against raw docker compose
```bash
# Add to VPS /opt/sovereign-health/docker-compose.staging.yml header:
# WARNING: Do not run 'docker compose up' directly.
# Use: bash deploy.sh staging
# Direct compose up will lose secret env vars.
```

## Files to Fix

- `apps/health/sovereign-health/ops/deploy.sh` — sync compose files, manage env vars
- `apps/health/sovereign-health/ops/docker-compose.staging.yml` — add env_file directive
- `apps/health/sovereign-health/ops/docker-compose.prod.yml` — same pattern
- VPS: `/opt/sovereign-health/.env` — ensure all required vars documented

## Prevention

- [ ] deploy.sh syncs compose files to VPS on every deploy
- [ ] Compose files use `env_file:` for secrets (not shell variable expansion)
- [ ] CORS origins managed in one place (deploy.sh or .env)
- [ ] Document: "never run docker compose directly on VPS"
- [ ] Add compose health check that verifies ENCRYPTION_KEY is set before starting
