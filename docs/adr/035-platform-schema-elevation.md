# ADR-035: Elevate Shared Tables to brickos PostgreSQL Schema

**Status:** Accepted
**Date:** 2026-04-06

## Context

BrickOS is growing from a single app (SHI) to a multi-app platform (SHI, Sovereign Link, Sovereign Voice). 39 tables in the SHI database (users, organizations, billing, audit, etc.) serve the entire platform, not just SHI. As more apps depend on these tables, having them in SHI's `public` schema creates coupling, migration conflicts, and conceptual confusion about ownership.

## Decision

Create a dedicated `brickos` PostgreSQL schema and move all platform-level tables into it using `ALTER TABLE SET SCHEMA`. Set `search_path = public, brickos` on the database so existing SHI code continues working without changes.

Categories moved: Identity (4 tables), Organizations (5), Billing (17), Communication (5), Audit (4), Infrastructure (4) = 39 tables total.

10 ambiguous tables (license_tiers, user_profile, user_preferences, etc.) are moved with additive changes (new `app_key` columns, split tables) but no columns dropped.

## Alternatives Considered

- **Separate databases:** Cross-DB joins require foreign data wrappers. Too complex for current scale.
- **Table name prefixes:** `brickos_users` vs `shi_measurements`. Naming convention only, no schema-level isolation. Fragile.
- **Leave as-is:** All apps connect to SHI's database. Growing coupling as apps multiply.

## Consequences

**Easier:**
- Any new app can access platform tables without depending on SHI
- Clear ownership: `brickos.*` = platform, `public.*` = SHI health domain
- Platform migrations managed separately from app migrations
- Service accounts, reserved codes, org hierarchy live at platform level

**Harder:**
- `ALTER DATABASE SET search_path` requires backend restart to take effect on existing connections
- Encrypted columns (AES-256-GCM) cannot be migrated at SQL level (need app-layer decryption)
- Platform migrations must be run manually via psql (not embedded in any app binary)
- All apps must include `brickos` in their search_path
