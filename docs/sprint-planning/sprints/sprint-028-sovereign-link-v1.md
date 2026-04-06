# 007 - Sprint Plan: Sovereign Link v1.0

**Version:** 1.0
**Date:** 2026-04-06
**Duration:** 5 days (Monday-Friday)
**Total Issues:** 29
**Total Points:** 68

---

## Milestone Summary

| Milestone | Description | Issues | Points | Days |
|---|---|---|---|---|
| **M1** | Sovereign Link Standalone v1.0 | 18 | 43 | 1-4 |
| **M2** | BrickOS Platform Schema | 5 | 12 | 5 |
| **M3** | Sovereign Link Platform Mode | 6 | 13 | 5 |

---

## Day 1 (Monday) - Foundation: Traits, Config, SQLite, Email Auth

**Focus:** Get the data layer and primary auth working. By end of day, a user can register, log in, and the database is ready.

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 1 | Define LinkStore and UserStore traits with core data models | 2 | M1 | - |
| 2 | Implement config system with TOML and environment variable support | 1 | M1 | - |
| 3 | Create SQLite database migrations | 1 | M1 | - |
| 4 | Implement SQLite LinkStore and UserStore | 3 | M1 | #1, #3 |
| 5 | Implement email auth with registration, login, JWT, and Argon2id | 3 | M1 | #2, #4 |

**Day 1 Total: 10 points**

```
Dependency Graph:

  #1 (Traits) ----+
                   +--> #4 (SQLite impl) --+--> #5 (Email auth)
  #3 (Migrations) +                        |
                                           |
  #2 (Config) ----------------------------+
```

---

## Day 2 (Tuesday) - Core Features: NOSTR Auth, Redirect, API, Click Tracking

**Focus:** The two critical paths - redirect handler (hot path, < 10ms) and NOSTR authentication. Plus the full REST API and click tracking.

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 6 | Implement NOSTR NIP-98 authentication | 5 | M1 | #2, #4 |
| 7 | Implement redirect handler (hot path) | 2 | M1 | #4 |
| 8 | Implement click tracking with privacy-preserving hashing | 2 | M1 | #4 |
| 9 | Implement REST API CRUD endpoints | 3 | M1 | #1, #5 |

**Day 2 Total: 12 points**

```
Dependency Graph:

  #4 (SQLite) ----+--> #6 (NIP-98 auth)
  #2 (Config) ----+
                   +--> #7 (Redirect handler)
  #4 (SQLite) ----+
                   +--> #8 (Click tracking)

  #1 (Traits) ----+--> #9 (REST API)
  #5 (Email auth) +
```

---

## Day 3 (Wednesday) - Web UI: Login, Dashboard, Links, Settings

**Focus:** Server-rendered HTML pages. By end of day, the app is fully usable via browser.

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 10 | Build web UI for login page with email and NOSTR tabs | 3 | M1 | #5, #6 |
| 11 | Build web UI for dashboard and create link pages | 3 | M1 | #7, #9 |
| 12 | Implement QR code generation endpoint | 1 | M1 | #4 |
| 13 | Build web UI for settings page | 2 | M1 | #10 |

**Day 3 Total: 9 points**

```
Dependency Graph:

  #5 (Email auth) ----+--> #10 (Login UI) --> #13 (Settings UI)
  #6 (NIP-98 auth) ---+

  #7 (Redirect) ------+--> #11 (Dashboard UI)
  #9 (REST API) ------+

  #4 (SQLite) -----------> #12 (QR code)
```

---

## Day 4 (Thursday) - Distribution: Docker, Binary, Start9, NIP-89, Tests

**Focus:** Packaging and distribution. By end of day, Sovereign Link can be deployed via Docker, static binary, or Start9 marketplace.

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 14 | Build Docker single-container image | 2 | M1 | - |
| 15 | Build static binary release with musl cross-compilation | 2 | M1 | - |
| 16 | Implement NIP-89 app listing publisher | 2 | M1 | #6 |
| 17 | Create Start9 package (.s9pk) | 3 | M1 | #14, #15 |
| 18 | Write integration tests for auth flows and CRUD operations | 3 | M1 | #5, #6, #7, #9 |

**Day 4 Total: 12 points**

```
Dependency Graph:

  #14 (Docker) --------+--> #17 (Start9 .s9pk)
  #15 (Static binary) -+

  #6 (NIP-98) -----------> #16 (NIP-89 publisher)

  #5 (Email auth) -----+
  #6 (NIP-98 auth) ----+--> #18 (Integration tests)
  #7 (Redirect) -------+
  #9 (REST API) -------+
```

---

## Day 5 (Friday) - Platform: Schema Elevation, Multi-Tenant, Service Accounts

**Focus:** Two parallel tracks. Track A: elevate shared tables to brickos schema (M2). Track B: build multi-tenant platform mode (M3). Track B depends on Track A completing first.

### Track A - BrickOS Platform Schema (M2)

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 19 | Create brickos PostgreSQL schema and move platform tables | 3 | M2 | - |
| 20 | Refactor license_tiers by splitting feature columns into tier_features | 3 | M2 | #19 |
| 21 | Refactor user_profile and user_preferences by splitting health columns | 3 | M2 | #19 |
| 22 | Add app_key column to product_features, tier_features, app_settings, and search_index | 1 | M2 | #19 |
| 23 | Create migration ownership structure in packages/brickos-db | 2 | M2 | #19 |

### Track B - Sovereign Link Platform Mode (M3)

| # | Issue | Pts | Milestone | Depends On |
|---|---|---|---|---|
| 24 | Create service_accounts and reserved_codes tables in brickos schema | 2 | M3 | #19 |
| 25 | Implement service account API and authentication | 3 | M3 | #24 |
| 26 | Implement per-org namespace resolution in redirect handler | 3 | M3 | #24 |
| 27 | Implement platform and org-level reporting endpoints | 2 | M3 | #24 |
| 28 | Implement Sovereign Voice integration API for link creation | 2 | M3 | #25 |
| 29 | Implement DB consistency check queries for platform schema | 1 | M3 | #19 |

**Day 5 Total: 25 points across 11 issues** (this is the heaviest day - realistically some items spill into the following week)

```
Dependency Graph:

  #19 (Schema move) --+--> #20 (license_tiers refactor)
                      +--> #21 (user_profile split)
                      +--> #22 (app_key columns)
                      +--> #23 (migration ownership)
                      +--> #24 (service_accounts + reserved_codes) --+--> #25 (Service account API) --> #28 (Voice integration)
                      |                                               +--> #26 (Org namespaces)
                      |                                               +--> #27 (Reporting endpoints)
                      +--> #29 (Consistency checks)
```

---

## Full Dependency Graph

```
DAY 1                    DAY 2                   DAY 3                  DAY 4                  DAY 5
------                   ------                  ------                 ------                 ------

#1 Traits --------+----> #9 REST API ---------> #11 Dashboard UI                              #19 Schema move --+-> #20 license_tiers
                  |                                                                                              |-> #21 profile split
#3 Migrations ----+--> #4 SQLite --+-----------> #12 QR code                                                    |-> #22 app_key cols
                                   |                                                                             |-> #23 migration pkg
#2 Config --------+----+-> #6 NIP-98 ---+------> #10 Login UI ------> #13 Settings UI                           |-> #29 consistency
                  |    |                |                                                                        |
                  +----+-> #7 Redirect -+------> #11 Dashboard UI                                               +-> #24 svc_accounts -+-> #25 svc API --> #28 Voice API
                       |                |                                                                                              |-> #26 org ns
                       +-> #8 Clicks    +-----------------------------------------------> #18 Integration tests                        |-> #27 reporting
                       |                |
                       +-> #5 Email ----+-------> #10 Login UI
                                        +-------> #9 REST API
                                        +-----------------------------------------------> #18 Integration tests

                                                                       #14 Docker -------> #17 Start9 .s9pk
                                                                       #15 Static binary --+
                                                  #6 NIP-98 -----------------------------------> #16 NIP-89
```

---

## Risk Notes

1. **Day 5 is overloaded** (25 points). The schema elevation (M2) and platform mode (M3) work is substantial. Realistically, M2 items #20 and #21 (refactoring license_tiers and user_profile/preferences) may spill into the following week. The schema move (#19) itself is low-risk and fast.

2. **NIP-98 is the highest-risk single item** (5 points). NOSTR cryptographic verification, secp256k1 signature validation, and browser extension integration require careful testing. Schedule this early on Day 2 so blockers surface fast.

3. **Start9 packaging (#17) depends on Docker + static binary**. If cross-compilation issues arise on Day 4, the Start9 package may slip. Docker build should be validated first.

4. **Schema elevation (#19) is low-risk technically** (ALTER TABLE SET SCHEMA is metadata-only) but high-impact organizationally. Test on staging with production data copy before running on production.

---

## References

- `002-sovereign-link-specification.md` - Standalone product spec
- `003-platform-multi-tenant-specification.md` - Multi-tenant platform mode
- `004-platform-schema-elevation.md` - Schema elevation strategy
- Machine-readable issue list: `sprint-sovereign-link-v1.json`
