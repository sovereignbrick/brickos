---
number: 401
title: "feat: create scr database on staging + register app in platform"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, infrastructure]
created: 2026-04-08
sprint: 036
points: 2
blocked_by: []
---

Create the `scr` PostgreSQL database on staging for Sovereign CRM.

## Tasks

- [ ] `CREATE DATABASE scr OWNER brickos;` on staging PostgreSQL
- [ ] Register `sovereign-crm` in platform app registry (org_apps if available)
- [ ] Create `sovereign-crm` service account via platform-api for inter-app calls
- [ ] Add `SCR_DATABASE_URL` and `SCR_PLATFORM_DATABASE_URL` to staging .env
- [ ] Add `SCR_ENCRYPTION_KEY` and `SCR_JWT_SECRET` to staging .env
- [ ] Verify connectivity from staging VPS

## Acceptance Criteria

- `psql -d scr` connects successfully on staging
- Service account exists with scope `links:create` (for future Sovereign Link integration)
- All SCR_* env vars are set and loadable
