# Sovereign Link v0.3.0 - White-Label Ready

**Date:** 2026-04-07
**Sprint:** 029
**Release:** `sovereign-link/v0.3.0`

## Highlights

1. **White-label org branding** - Logo, primary color, footer text per organization
2. **Custom domain mapping** - Organizations can serve links from their own domain
3. **Org admin panel** - 22 new API endpoints for full org management
4. **Docker Hub image** - 164MB image, health endpoint, ready to pull and run
5. **GitHub Release binary** - Static binary attached to the release via REST API
6. **Start9 package pipeline** - Build script, Tor auto-discovery, health/backup scripts
7. **NIP-89 WebSocket publishing** - App listing events now publish to relays (was log-only)
8. **147+ tests across platform** - 43 platform crate, 22 Voice, SL E2E, cross-app integration

## New Features

### White-Label

- Org branding: logo URL, primary color, footer text stored per organization
- Custom domain mapping: organizations serve short links from their own domain
- Org admin panel: 22 JSON API endpoints, no server-rendered HTML

### Org Admin Endpoints (22 total)

- **Dashboard:** org stats, activity feed, usage summary
- **Links:** CRUD operations scoped to org namespace
- **Members:** invite, list, update role, remove
- **Affiliates:** list, create, update, stats
- **Branding:** get/update logo, color, footer
- **Domains:** add/verify/remove custom domain mappings
- **Onboarding:** guided setup flow endpoints

### Standalone Ship

- Docker Hub image (164MB, health endpoint verified)
- GitHub Release with attached binary
- Start9 build pipeline: build script, Tor auto-discovery, health check, backup/restore
- Custom domain support in standalone mode
- NIP-89 app listing via WebSocket (tungstenite) to relays

## Database Migrations

**2 new migrations** in this release:

- **006 - Backfill personal orgs:** Creates personal organizations for legacy users who predate the org model
- **007 - Org branding + domain_mappings:** Adds branding columns (logo_url, primary_color, footer_text) to organizations table, creates domain_mappings table for custom domain resolution

**Execution order:**
```bash
psql $DB < crates/brickos-db/migrations/006_backfill_personal_orgs.sql
psql $DB < crates/brickos-db/migrations/007_org_branding_domain_mappings.sql
```

**Safety:** Both migrations use IF EXISTS / IF NOT EXISTS. No columns are dropped. Backward compatible.

## Testing

- Platform crate: 43 test functions (up from 7)
- Sovereign Voice: 22 tests (first-ever coverage)
- SL E2E script: redirect, QR, CRUD, auth flows
- Cross-app integration tests
- Per-app CI workflows
- Platform smoke: 17/17 passing
- **Total: 147+ tests, all passing**

## Infrastructure

- BCM/DR strategy documented at platform level
- Automated smoke test hook added to deploy.sh
- Per-app CI workflows for independent build and test

## Breaking Changes

None. All changes are backward compatible. Existing links, orgs, and API consumers continue working unchanged.

## Upgrade Notes

1. Run migration 006 on staging first, verify legacy users have personal orgs
2. Run migration 007, verify branding columns and domain_mappings table exist
3. Deploy updated binary or pull new Docker image
4. Verify health endpoint responds
5. Run platform smoke tests (17/17 expected)
