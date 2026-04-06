# Sovereign Link v0.2.0 - Platform Mode

**Date:** 2026-04-06
**Sprint:** 028
**PR:** #338
**Branch:** `sprint-028-sovereign-link-platform`

## Highlights

1. **TOML config support** - Load settings from config.toml with env var overlay
2. **API auth middleware** - JWT and API key authentication on REST endpoints (standalone mode)
3. **musl cross-compilation** - Static binary build for Linux amd64/arm64
4. **NIP-89 app listing** - Signed event publishing with Schnorr (BIP-340)
5. **Start9 package** - Health check, backup/restore scripts, icon
6. **Integration tests** - 18 new tests covering auth flows, CRUD, redirect, QR
7. **Platform schema elevation** - 5 SQL migrations moving 39 tables to brickos schema
8. **Service account auth** - Middleware for cross-app API access
9. **Per-org namespaces** - Organization-scoped short link codes
10. **Platform reporting** - 6 admin and org-level analytics endpoints
11. **Sovereign Voice API** - Service-to-service link creation and stats
12. **DB consistency checks** - Automated health check endpoint

## New Features

### Standalone Mode
- TOML config file loading (config.toml) with environment variable overlay
- API auth middleware (JWT + API key) on /api/v1/links routes
- NIP-89 app listing with Schnorr signing (BIP-340)
- Start9 package: health check, backup/restore, instructions, icon
- musl cross-compilation: Makefile + .cargo/config.toml

### Platform Mode
- Service account authentication middleware (SHA256 key hash, scopes, rate limits)
- Per-org namespace resolution: GET /r/{org_slug}/{code}
- Platform admin endpoints: stats, stats/by-org, stats/by-app, orgs
- Org-scoped endpoints: orgs/{org_id}/stats, orgs/{org_id}/links
- Service API: POST /api/v1/service/links, /batch, /{code}/stats
- DB consistency check: GET /api/v1/admin/consistency

### Platform Schema (BrickOS)
- 001: Create brickos schema, move 39 platform tables
- 002: Service accounts, service account keys, reserved codes (30+ seeded)
- 003: Refactor license_tiers (add app_key, move to brickos schema)
- 004: Add app_key to product_features, tier_features, app_settings, search_index
- 005: Split user_profile and billing_profile

## Database Migrations

**5 new platform migrations** in `crates/brickos-db/migrations/`. These must be run BEFORE deploying the SHI backend.

**Execution order:**
```bash
psql $DB < crates/brickos-db/migrations/001_create_brickos_schema.sql
psql $DB < crates/brickos-db/migrations/002_service_accounts.sql
psql $DB < crates/brickos-db/migrations/003_refactor_license_tiers.sql
psql $DB < crates/brickos-db/migrations/004_add_app_key_columns.sql
psql $DB < crates/brickos-db/migrations/005_split_user_profile.sql
```

**Safety:** All migrations use IF EXISTS / IF NOT EXISTS. No columns are dropped. search_path is updated for backward compatibility.

## Tests

- 18 new integration tests (auth flows, CRUD, redirect, QR, health)
- 17 existing unit tests
- **35 total, all passing**

## Breaking Changes

None. All changes are backward compatible. SHI continues working unchanged via PostgreSQL search_path.

## Upgrade Notes

1. Run platform migrations on staging first
2. Verify SHI works (login, dashboard, measurements)
3. Run platform migrations on production
4. Deploy SHI backend (includes Sovereign Link platform mode)
