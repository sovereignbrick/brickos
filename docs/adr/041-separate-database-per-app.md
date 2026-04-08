# ADR-041: Separate PostgreSQL Database Per App

**Status:** Accepted
**Date:** 2026-04-08

## Context

Design 018 (Platform Service Elevation) decouples BrickOS apps from a shared monolithic database. Today all tables (platform + SHI health + Sovereign Link) live in one PostgreSQL database (`sovereign_health`). As we add Sovereign CRM, Sovereign Voice, and prepare for multi-VPS scaling and EU/US data residency, a single shared database becomes a liability:

- A broken migration in one app can corrupt another app's data
- Cannot move one app to a different VPS without migrating the entire database
- Backup/restore is all-or-nothing
- Connection pool contention between apps
- No path to per-region data residency (EU users in EU, US users in US)

## Decision

Each app gets its own PostgreSQL database. The platform gets a dedicated `brickos` database for shared tables (users, organizations, billing, service accounts).

```
PostgreSQL instance:
  brickos   (platform: users, orgs, billing, service_accounts, audit)
  shi       (Sovereign Health: zones, markers, measurements, ...)
  sli       (Sovereign Link: short_links, clicks, app_prefixes)
  scr       (Sovereign CRM: contacts, companies, projects, meetings, ...)
  svo       (Sovereign Voice: schedules, posts, audience, ...)
```

Each app connects with **two PgPools**: one for reading platform data (users, orgs) from the `brickos` database, one for reading/writing app-specific data from its own database. No cross-database JOINs -- assemble results in application code.

Database names match the 3-char app prefix (ADR-042).

## Alternatives Considered

- **One database, multiple schemas:** Simpler connection management, supports cross-schema JOINs. But cannot be split across VPS instances, backup/restore is still all-or-nothing, and a rogue migration in one schema can lock the entire database.
- **One database, shared tables:** Current state. Growing coupling, no isolation, no independent scaling.
- **Fully separate databases with no shared platform DB:** Each app duplicates user/org tables. Data consistency nightmare. Rejected.

## Consequences

**Easier:**
- Move any app to a different VPS by changing one connection string
- Independent backup/restore per app
- Per-region deployment (EU and US each run full database set)
- A broken migration in `scr` cannot affect `shi` data
- Connection pool sizing per app (no contention)
- Clean ownership: each app's deploy.sh manages only its own database

**Harder:**
- Two PgPools per app (platform reads + app reads/writes)
- No cross-database JOINs (must query platform DB separately and assemble in Rust)
- Platform DB migrations must complete before any app starts (deployment order matters)
- More PostgreSQL databases to monitor (5 initially, grows with apps)
- Slightly more complex connection string management (two DATABASE_URL env vars per app)

## Migration Path

1. Create new databases: `brickos`, `shi`, `sli`
2. `pg_dump` platform tables from `sovereign_health` -> `pg_restore` into `brickos`
3. `pg_dump` SHI health tables from `sovereign_health` -> `pg_restore` into `shi`
4. `pg_dump` Sovereign Link tables from `sovereign_health` -> `pg_restore` into `sli`
5. Verify row counts and checksums
6. Update all connection strings
7. Keep `sovereign_health` as read-only backup for 30 days
