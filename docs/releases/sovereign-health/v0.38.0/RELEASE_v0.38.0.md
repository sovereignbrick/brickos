# Sovereign Health Intelligence v0.38.0

**Date:** 2026-04-06
**Sprint:** 028
**Tags:** `sovereign-link/v0.2.0`, `brickos-platform/v0.1.0`

## Highlights

1. **BrickOS Platform Schema** - 39 shared tables elevated from `public` to `brickos` PostgreSQL schema. All apps now share identity, billing, and org tables via `search_path`.
2. **Sovereign Link Platform Mode** - Service account auth, per-org namespaces, platform reporting (6 endpoints), Sovereign Voice integration API, DB consistency checks.
3. **NOSTR Pubkey on Users** - `nostr_pubkey` column added to users table for NIP-98 authentication.
4. **Platform Test Infrastructure** - Platform smoke test (17 checks), DB integrity test (23 checks), unified RC test runner.
5. **Gatus Monitoring** - BrickOS Website, Sovereign Link, Platform DB added to status.sovereignhealth.io.
6. **Deployment Workflow** - Elevated from SHI-specific to platform-level, supporting per-app independent deployments.

## Database Migrations

**5 platform migrations** in `crates/brickos-db/migrations/`:

| Migration | Description |
|---|---|
| 001 | Create `brickos` schema, move 39 platform tables, set search_path |
| 002 | Service accounts, service account keys, reserved codes (42 seeded) |
| 003 | Refactor license_tiers (add app_key, move to brickos schema) |
| 004 | Add app_key to product_features, tier_features, app_settings, search_index |
| 005 | Split user_profile and billing_profile |

**SHI app migration:**

| Migration | Description |
|---|---|
| 20260406000004 | Add nostr_pubkey column to users table |

## New Endpoints (Platform Mode)

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/service/links | Service account link creation |
| POST | /api/v1/service/links/batch | Batch link creation (max 100) |
| GET | /api/v1/service/links/{code}/stats | Service account stats query |
| GET | /api/v1/admin/stats | Platform-wide statistics |
| GET | /api/v1/admin/stats/by-org | Stats grouped by organization |
| GET | /api/v1/admin/stats/by-app | Stats grouped by source app |
| GET | /api/v1/admin/orgs | List all organizations |
| GET | /api/v1/admin/consistency | DB consistency checks |
| GET | /api/v1/orgs/{org_id}/stats | Org-scoped statistics |
| GET | /api/v1/orgs/{org_id}/links | Org-scoped link list |
| GET | /r/{org_slug}/{code} | Per-org namespace redirect |

## Tests

| Suite | Result |
|---|---|
| Platform smoke (staging) | 17/17 passed |
| Platform smoke (production) | 17/17 passed |
| Platform DB integrity | 22/23 passed (1 known: legacy users without personal orgs) |
| SHI E2E (Playwright) | 30 passed |
| Sovereign Link (cargo) | 35 passed |

## Breaking Changes

None. All changes are backward compatible via PostgreSQL `search_path` resolution.

## Known Issues

- Legacy users (created before org migration) do not have personal organizations. Does not affect functionality. Backfill migration planned for next sprint.
- NIP-89 relay publishing logs events but does not connect to WebSocket relays (needs tungstenite crate). Falls back to log output for manual publishing.

## Upgrade Notes

1. Run platform migrations (001-005) BEFORE deploying backend
2. Restart backend after migration 001 to pick up new search_path
3. Verify with: `bash tests/platform-smoke.sh production`
