# 018 -- Platform Service Elevation: Decoupling Apps from Shared Infrastructure

**Status:** Draft v2
**Author:** Helmut / Claude
**Date:** 2026-04-08
**Related:** 005-platform-multi-tenant, 006-platform-schema-elevation, 012-url-shortener-service, 014-brickos-platform-gui, 015-brickos-unified-app-routing, 017-sovereign-crm

---

## 1. Problem Statement

BrickOS is growing from a single-app platform (Sovereign Health) into a multi-app ecosystem. Today, every platform service is parasitically coupled to Sovereign Health's process:

- **Sovereign Link platform mode** runs inside Sovereign Health's Actix-web process, borrows its database pool, trusts its JWT without verification, and queries `brickos.users` / `brickos.organizations` directly.
- **Platform admin routes** (org management, branding, service accounts) are embedded in Sovereign Link handlers, which are embedded in Sovereign Health.
- **Sovereign Link's migrations** live inside Sovereign Health's migration folder.
- **Auth, billing, email, notifications** -- all initialized in Sovereign Health's `main.rs` and unavailable to any other app.

If Sovereign Health is retired, scaled down, or temporarily offline, every platform service and every other app loses user auth, org management, service account validation, link shortening, billing, email, and notifications.

### The Dependency Chain Today

```
┌──────────────────────────────────────────────────────────────────────┐
│  Sovereign Health Backend (single binary, single Actix-web server)    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ SHI handlers │  │ SLI handlers │  │ Platform     │              │
│  │ (health)     │  │ (links)      │  │ admin routes │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └────────┬────────┴──────────────────┘                       │
│                  │                                                   │
│         ┌────────┴────────┐                                          │
│         │ Shared PgPool   │──── PostgreSQL (sovereign_health DB)     │
│         │ Shared JWT      │     brickos schema + public schema       │
│         │ Shared config   │                                          │
│         └─────────────────┘                                          │
│                                                                      │
│  SHI owns: pool init, migrations, auth, config, CORS, all of it     │
└──────────────────────────────────────────────────────────────────────┘
```

### Goal: Independent Apps, Each With Own Database

```
┌──────────────────────────────────────────────────────────────────────┐
│  BrickOS Platform Layer (shared crates, platform DB)                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ brickos-auth │  │ brickos-db   │  │ brickos-     │              │
│  │ JWT, MFA,    │  │ User, Org,   │  │ crypto       │              │
│  │ Argon2       │  │ SvcAccount   │  │ AES-256-GCM  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  brickos-platform-api  :9000                        │            │
│  │  Platform DB (brickos schema): users, orgs, billing,│            │
│  │  service_accounts, app_prefixes, domain_mappings    │            │
│  │  Manages: all service accounts, all cross-app config│            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ shi.api   │  │ sli.api   │  │ scr.api   │  │ svo.api   │       │
│  │ :8080     │  │ :8082     │  │ :8084     │  │ :8086     │       │
│  │           │  │           │  │           │  │           │       │
│  │ Own DB    │  │ Own DB    │  │ Own DB    │  │ Own DB    │       │
│  │ shi.*     │  │ sli.*     │  │ scr.*     │  │ svo.*     │       │
│  │ tables    │  │ tables    │  │ tables    │  │ tables    │       │
│  │           │  │           │  │           │  │           │       │
│  │ Own GUI   │  │ Own GUI   │  │ Own GUI   │  │ Own GUI   │       │
│  │ Own i18n  │  │ Own i18n  │  │ Own i18n  │  │ Own i18n  │       │
│  │ Own domain│  │ Own domain│  │ Own domain│  │ Own domain│       │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘       │
│                                                                      │
│  Each app: own process, own DB, own config, own migrations, own port │
│  Shared: brickos-* crates, platform DB for auth/org/billing          │
│  Inter-app: encrypted service account API calls only                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Naming Convention

### 2.1 The `app_key` as Universal Identifier

The `app_key` is the canonical 3-letter identifier for an app. It drives container names, env prefixes, database names, and URL prefixes.

| app_key | Product | 3-Char Prefix | Status |
|---------|---------|---------------|--------|
| `sovereign-health` | Sovereign Health Intelligence | `shi` | Production |
| `sovereign-link` | Sovereign Link | `sli` | Production (embedded in SHI, to be elevated) |
| `sovereign-voice` | Sovereign Voice | `svo` | Early (CLI tool) |
| `sovereign-crm` | Sovereign CRM | `scr` | Design phase (doc 017) |
| `sovereign-exchange` | Sovereign Exchange | `sex` | Future |
| `sovereign-identity` | Sovereign Identity | `sid` | Future |

### 2.2 Naming Rules

**Principle:** One canonical name per layer, derived mechanically from the `app_key` and 3-char prefix.

**Full naming table:**

| Layer | Sovereign Health | Sovereign Link | Sovereign CRM | Sovereign Voice |
|-------|-----------------|----------------|---------------|-----------------|
| **app_key** | `sovereign-health` | `sovereign-link` | `sovereign-crm` | `sovereign-voice` |
| **prefix** | `shi` | `sli` | `scr` | `svo` |
| **API crate** | `sovereign-health-api` | `sovereign-link-api` | `sovereign-crm-api` | `sovereign-voice-api` |
| **Frontend** | `sovereign-health-frontend` | `sovereign-link-frontend` | `sovereign-crm-frontend` | `sovereign-voice-frontend` |
| **Docker (API)** | `sovereignbrick/shi-api` | `sovereignbrick/sli-api` | `sovereignbrick/scr-api` | `sovereignbrick/svo-api` |
| **Docker (web)** | `sovereignbrick/shi-web` | `sovereignbrick/sli-web` | `sovereignbrick/scr-web` | `sovereignbrick/svo-web` |
| **Container (prod)** | `shi-api` | `sli-api` | `scr-api` | `svo-api` |
| **Container (staging)** | `shi-staging-api` | `sli-staging-api` | `scr-staging-api` | `svo-staging-api` |
| **Port (prod)** | `8080` | `8082` | `8084` | `8086` |
| **Port (staging)** | `8081` | `8083` | `8085` | `8087` |
| **Env prefix** | `SHI_` | `SLI_` | `SCR_` | `SVO_` |
| **Domain (prod)** | `app.sovereignhealth.io` | `app.sovereignlink.io` | `app.sovereigncrm.io` | `app.sovereignvoice.io` |
| **Domain (platform)** | `app.brickos.io/health/` | `app.brickos.io/links/` | `app.brickos.io/crm/` | `app.brickos.io/voice/` |
| **Service account** | `sovereign-health` | `sovereign-link` | `sovereign-crm` | `sovereign-voice` |
| **App database** | `shi` | `sli` | `scr` | `svo` |
| **DB schema (app tables)** | `shi` | `sli` | `scr` | `svo` |

**Docker image rename (SHI):** Current `sovereign-health-backend` / `sovereign-health-frontend` will be renamed to `sovereignbrick/shi-api` / `sovereignbrick/shi-web`. This is a breaking change for existing deployments -- managed via thorough testing and coordinated deploy (production downtime acceptable).

### 2.3 Platform Services Naming

Platform services are not apps. They are shared infrastructure.

| Layer | Name | Purpose |
|-------|------|---------|
| **Crate** | `brickos-auth` | JWT, MFA, Argon2, token validation |
| **Crate** | `brickos-crypto` | AES-256-GCM Encryptor |
| **Crate** | `brickos-db` | Platform models (User, Organization, ServiceAccount) |
| **Crate** | `brickos-email` | EmailProvider trait (Mailgun, Log) |
| **Crate** | `brickos-billing` | Stripe + Strike |
| **Crate** | `brickos-notify` | ntfy + Telegram dual-dispatch (extract from SHI) |
| **Crate** | `brickos-i18n` | i18n monitoring trait (NEW -- section 8) |
| **API** | `brickos-platform-api` | Platform admin API (port 9000) -- extracted NOW |
| **Database** | `brickos` (PostgreSQL database) | Platform-level tables only |
| **GUI** | Platform GUI at `app.brickos.io/platform/` | Design 014/016 |

**Rule:** Platform crates use the `brickos-` prefix. App crates use the `sovereign-` prefix (matching the product brand).

---

## 3. What Needs to Move

### 3.1 Services Currently in SHI That Are Platform-Level

| Service | Current Location | Target | Effort |
|---------|-----------------|--------|--------|
| JWT verification | `brickos-auth` crate | No change | Done |
| Password hashing | `brickos-auth` crate | No change | Done |
| MFA (TOTP) | `brickos-auth` crate | No change | Done |
| Encryption | `brickos-crypto` crate | No change | Done |
| Email sending | `brickos-email` crate | No change | Done |
| User CRUD | SHI `handlers/auth.rs` | Each app does its own (via `brickos-auth` + `brickos-db`) | Medium |
| Org management | SL `handlers/org_admin.rs` | `brickos-platform-api` | Medium |
| Service account auth | SL `handlers/service_auth.rs` | Extract to `brickos-auth` | Small |
| Service account CRUD | Not yet implemented | `brickos-platform-api` (all service accounts managed by platform) | Medium |
| Content strings (i18n) | SHI `handlers/content_strings.rs` | Each app owns its own (no platform mixture) | Medium |
| Notifications (ntfy) | SHI `services/notify.rs` | Extract to `brickos-notify` crate | Small |
| Platform admin stats | SL `handlers/platform_admin.rs` | `brickos-platform-api` | Large |

### 3.2 Sovereign Link -- Specific Decoupling

| Coupling Point | Current | Target |
|----------------|---------|--------|
| Database pool | Borrows SHI's PgPool | Own PgPool connecting to own `sli` database |
| JWT auth | Trusts SHI JWT (no verification) | Verify JWT using `brickos-auth::jwt::verify()` |
| User lookup | Reads `brickos.users` directly | Reads platform DB `brickos.users` via separate connection |
| Org lookup | Reads `brickos.organizations` directly | Reads platform DB via separate connection |
| Service accounts | Reads `brickos.service_accounts` directly | Reads platform DB; all service account CRUD via platform API |
| Migrations | In SHI's migrations folder | Own migration folder against own `sli` database |
| Process | Embedded in SHI binary | Own binary: `sovereign-link-api` |
| Port | SHI's port (8080) | Own port: 8082 (prod), 8083 (staging) |
| Config | None (uses SHI's) | Own config: `SLI_DATABASE_URL`, `SLI_JWT_SECRET`, etc. |

---

## 4. Database Architecture: Separate DB Per App

### 4.1 Why Separate Databases

**Decision:** Each app gets its own PostgreSQL database. The platform gets its own database. This prepares for:

1. **Multi-VPS scaling:** Apps can be moved to different servers without database surgery
2. **EU/US data residency:** Run one BrickOS platform instance per region, each with its own set of app databases
3. **Independent backup/restore:** Restore one app without affecting others
4. **Load balancer readiness:** Database connections route to the correct backend per app
5. **Isolation:** A broken migration in one app cannot corrupt another app's data
6. **Clean ownership:** Each app's deploy.sh manages only its own database

```
PostgreSQL Instance (Hetzner VPS)
├── brickos          (platform DB: users, orgs, billing, service_accounts, ...)
├── shi              (Sovereign Health: zones, markers, measurements, ...)
├── sli              (Sovereign Link: short_links, clicks, app_prefixes, ...)
├── scr              (Sovereign CRM: contacts, companies, projects, ...)
└── svo              (Sovereign Voice: schedules, posts, audience, ...)
```

### 4.2 Platform DB vs. App DB

| Database | Owner | Contains | Accessed By |
|----------|-------|----------|-------------|
| `brickos` | Platform | users, organizations, org_members, service_accounts, billing, subscriptions, audit_log, domain_mappings, reserved_codes | All apps (read), platform-api (read/write) |
| `shi` | Sovereign Health | zones, markers, measurements, devices, doctor_chat, content_strings, user_profile_health, ... | shi-api only |
| `sli` | Sovereign Link | short_links, short_link_clicks, app_prefixes, content_strings | sli-api only |
| `scr` | Sovereign CRM | crm_contacts, crm_companies, crm_projects, crm_meetings, crm_captures, ... | scr-api only |
| `svo` | Sovereign Voice | schedules, posts, audience_segments, engagement_metrics, content_strings | svo-api only |

### 4.3 Cross-Database Access Pattern

Apps need to read platform data (users, orgs) but own their app-specific data. Two connection pools per app:

```rust
// sovereign-link-api/src/main.rs
let platform_pool = PgPoolOptions::new()
    .max_connections(3)
    .connect(&config.platform_database_url)   // SLI_PLATFORM_DATABASE_URL -> brickos DB
    .await?;

let app_pool = PgPoolOptions::new()
    .max_connections(5)
    .connect(&config.database_url)            // SLI_DATABASE_URL -> sli DB
    .await?;

// Platform reads (users, orgs, service accounts)
let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
    .fetch_one(&platform_pool).await?;

// App reads/writes (short_links, clicks)
let link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE code = $1")
    .fetch_one(&app_pool).await?;
```

**No cross-database JOINs.** If an app needs platform data + app data in one response, it makes two queries and assembles in Rust. This is the correct pattern for database-per-service architecture -- it's how microservices work at scale (Stripe, Shopify, etc.).

### 4.4 Migration from Shared to Separate

**SHI health tables currently in `public` schema of the `sovereign_health` database.** These need to move to their own `shi` database.

Migration steps:
1. Create new databases: `sli`, `scr`, `svo` (and rename `sovereign_health` -> `shi`, or create `shi` and migrate data)
2. Move Sovereign Link tables (`short_links`, `short_link_clicks`, `app_prefixes`) from `brickos` schema in `sovereign_health` DB to `sli` database
3. Move SHI health tables from `public` schema in `sovereign_health` DB to `shi` database
4. Keep platform tables in `brickos` database
5. Update all connection strings

**Schema naming within each DB:** Each app database uses the `public` schema for its tables (simple, standard). No need for custom schema names within an app's own database -- the database name IS the namespace.

### 4.5 Multi-Region / Multi-VPS Scaling

```
EU Region (Hetzner Nuremberg)                US Region (Hetzner Ashburn)
┌────────────────────────────┐              ┌────────────────────────────┐
│  Load Balancer             │              │  Load Balancer             │
│  ┌──────┐  ┌──────┐       │              │  ┌──────┐  ┌──────┐       │
│  │VPS-1 │  │VPS-2 │       │              │  │VPS-3 │  │VPS-4 │       │
│  │shi   │  │sli   │       │              │  │shi   │  │sli   │       │
│  │scr   │  │svo   │       │              │  │scr   │  │svo   │       │
│  │brickos│  │      │       │              │  │brickos│  │      │       │
│  └──────┘  └──────┘       │              └──────┘  └──────┘       │
│                            │              │                            │
│  PostgreSQL (EU data)      │              │  PostgreSQL (US data)      │
│  brickos, shi, sli, scr   │              │  brickos, shi, sli, scr   │
└────────────────────────────┘              └────────────────────────────┘
```

Each region is a full BrickOS platform instance with its own set of databases. Data residency is enforced at the region level -- EU users' data stays in EU, US users' data stays in US. The platform handles routing based on user's org region setting.

**Per-app VPS scaling (single region):** If `shi` gets heavy traffic, move it to its own VPS. The database connection string changes, nothing else. This is only possible with separate databases per app.

### 4.6 Connection Pooling

| Database | App | max_connections | Notes |
|----------|-----|----------------|-------|
| `brickos` | platform-api | 10 | Platform admin, org management |
| `brickos` | shi-api (platform reads) | 3 | User lookup, org lookup |
| `brickos` | sli-api (platform reads) | 3 | User/org/service account lookup |
| `brickos` | scr-api (platform reads) | 3 | User/org lookup |
| `brickos` | svo-api (platform reads) | 2 | Service account lookup |
| `shi` | shi-api | 15 | Health data (measurements, AI, billing) |
| `sli` | sli-api | 5 | Links (read-heavy redirects) |
| `scr` | scr-api | 10 | Contacts, search, graph |
| `svo` | svo-api | 3 | Scheduling, publishing |
| **Total** | | **54** | Well within PostgreSQL default (100) per DB |

---

## 5. Inter-App Communication

### 5.1 Service Accounts (Managed by Platform)

All service accounts are managed exclusively by `brickos-platform-api`. No app creates or modifies service accounts directly.

```
Platform Admin GUI -> POST /platform/api/v1/service-accounts
  -> Creates entry in brickos.service_accounts
  -> Returns API key (shown once, hashed in DB with SHA-256)
  -> All communication encrypted (TLS between services on same VPS, mTLS between VPS)
```

**Service account flow:**
```
Sovereign Voice                    Sovereign Link API
─────────────                     ──────────────────
POST /api/v1/service/links
  Authorization: Bearer {api_key}
  X-Service-Account: sovereign-voice
  Body: { target_url, app_key }
         │
         └──────────── sli-api validates:
                       1. SHA-256(api_key) matches brickos.service_accounts
                       2. Account is_active = true
                       3. Scopes include "links:create"
                       4. Rate limit not exceeded
                       5. Returns 201 Created
```

### 5.2 Encrypted Communication

All inter-app API calls use:
- **Same VPS:** TLS (localhost is still encrypted -- no plaintext HTTP between containers)
- **Cross-VPS:** mTLS (mutual TLS with service certificates)
- **API keys:** SHA-256 hashed at rest, transmitted only in `Authorization` header over TLS
- **No shared secrets in env files:** Service account keys are generated by platform-api and distributed securely

---

## 6. Sovereign Link Elevation Plan

### 6.1 Step-by-Step Migration

**Phase 1: Create Sovereign Link API as Independent Binary**

1. Create `apps/technology/sovereign-link/api/` directory structure
2. New `Cargo.toml` with `brickos-auth`, `brickos-crypto`, `brickos-db` dependencies
3. New `main.rs` with two PgPools (platform + app), own config, port 8082
4. New `config.rs` with `SLI_` prefixed env vars
5. Create `sli` database, move Sovereign Link tables from SHI's DB
6. Sovereign Link migrations in own folder against `sli` database
7. Feature flags remain: `standalone` (SQLite) vs `platform` (PostgreSQL)
8. Add proper JWT verification via `brickos-auth`
9. Fix 2 compilation errors (ShortLink fields in sqlite.rs)

**Phase 2: Deploy Alongside SHI (Dual Routing)**

1. Docker compose: add `sli-api` container on port 8082
2. nginx: route `/r/*` to `sli-api` with SHI fallback
3. Deploy to staging, run E2E tests
4. Monitor 24-48h: redirects, click recording, API endpoints

**Phase 3: Remove Sovereign Link from SHI**

1. Remove `sovereign-link` from SHI `Cargo.toml`
2. Remove `.configure(sovereign_link::configure_routes)` from SHI `main.rs`
3. SHI affiliate page calls Sovereign Link API via HTTP (service account, encrypted)
4. Full SHI regression test
5. Deploy to production (downtime acceptable -- test thoroughly first)

**Phase 4: Extract Platform Admin API**

1. Create `brickos-platform-api` crate (port 9000)
2. Move org management handlers from Sovereign Link to platform-api
3. Move platform admin stats handlers to platform-api
4. Service account CRUD endpoints in platform-api
5. Platform GUI talks to platform-api (not to SHI or SLI)

### 6.2 SHI Migration Safety

**Data migration path for SHI:**

1. Create `shi` database (new, empty)
2. Migrate SHI health tables from `public` schema in `sovereign_health` DB to `shi` database
3. Use `pg_dump --schema=public` + `pg_restore` into `shi` database
4. Verify row counts match, run checksums on critical tables
5. Update `SHI_DATABASE_URL` to point to `shi` database
6. Keep old `sovereign_health` database as read-only backup for 30 days
7. Platform tables stay in `brickos` database (already elevated via migration 001)

**Test checklist (before production):**

- [ ] `shi` database has all 53+ health tables with correct data
- [ ] `sli` database has short_links, clicks, prefixes with correct data
- [ ] `brickos` database has all platform tables (users, orgs, billing, ...)
- [ ] SHI API starts against `shi` DB + `brickos` DB (two pools)
- [ ] SLI API starts against `sli` DB + `brickos` DB (two pools)
- [ ] Login flow works (JWT issued by SHI, verified by SLI)
- [ ] Affiliate link creation works (SHI -> SLI via service account API)
- [ ] Redirect works (`GET /r/{code}` served by sli-api)
- [ ] Click recording works (country, referrer populated)
- [ ] All SHI E2E tests pass (measurements, doctor chat, billing)
- [ ] Platform admin GUI works (stats, org management)
- [ ] Staging deploy succeeds for all services
- [ ] Production deploy succeeds (coordinated, downtime window)

---

## 7. Platform Admin: Who Manages What

### 7.1 Platform-Level Business Logic (brickos-platform-api)

| Responsibility | Endpoint Pattern | Description |
|---------------|-----------------|-------------|
| User management | `/platform/api/v1/users/*` | Cross-app user CRUD, role assignment |
| Organization management | `/platform/api/v1/orgs/*` | Create/update/disable orgs, member management |
| Service accounts | `/platform/api/v1/service-accounts/*` | CRUD, key rotation, scope management |
| Billing | `/platform/api/v1/billing/*` | Subscriptions, payments, invoices |
| App registry | `/platform/api/v1/apps/*` | Register apps, configure prefixes, enable/disable per org |
| Domain mappings | `/platform/api/v1/domains/*` | Custom domain configuration |
| i18n monitoring | `/platform/api/v1/i18n/status` | Aggregate translation status from all apps |
| Audit | `/platform/api/v1/audit/*` | Cross-app audit log |
| Platform stats | `/platform/api/v1/stats/*` | Cross-app analytics |

### 7.2 App-Level Business Logic (per app)

Each app has its own business rules. All apps follow the same naming pattern (Sovereign {Product}).

| App | Business Logic (App-Level) | Platform Logic (Shared) |
|-----|---------------------------|------------------------|
| **Sovereign Health** | Health markers, zones, measurements, doctor chat, AI credits, health-specific content strings | User auth, org membership, billing, email |
| **Sovereign Link** | Link CRUD, click tracking, analytics, QR codes, redirect fast-path, link-specific content strings | User auth, org membership, service accounts |
| **Sovereign CRM** | Contacts, companies, projects, meetings, captures, lead pipeline, graph, CRM-specific content strings | User auth, org membership, AI provider config |
| **Sovereign Voice** | NOSTR publishing, scheduling, audience analytics, voice-specific content strings | Service account auth (calls Sovereign Link API) |

---

## 8. i18n Architecture

### 8.1 Per-App i18n (Each App Owns Its Translations)

Each app manages its own translations independently. Content strings reside in the app's own database -- **no mixture between app and platform**.

```
Sovereign Health (shi DB):
  content_strings table (app_key = 'sovereign-health')
  frontend/src/i18n/messages/en.json  (1,796 keys)
  frontend/src/i18n/messages/de.json  (1,796 keys)

Sovereign Link (sli DB):
  content_strings table (app_key = 'sovereign-link')
  frontend/src/i18n/messages/en.json
  frontend/src/i18n/messages/de.json

Sovereign CRM (scr DB):
  content_strings table (app_key = 'sovereign-crm')
  frontend/src/i18n/messages/en.json
  frontend/src/i18n/messages/de.json
```

Each app has:
- Static JSON message files (bundled at build time)
- Database-driven `content_strings` table in its own database
- `next-intl` for runtime translation
- Locale stored in cookie (per-app)
- Minimum: EN + DE (CLAUDE.md convention)

### 8.2 Platform i18n Monitoring

The Platform Admin GUI monitors translation completeness across all apps without owning the translations.

Each app exposes:
```
GET /api/v1/i18n/status
-> {
    "app_key": "sovereign-health",
    "locales": {
      "en": { "total_keys": 1796, "translated": 1796 },
      "de": { "total_keys": 1796, "translated": 1764 }
    }
  }
```

Platform GUI aggregates:

```
┌──────────────────────────────────────────────────────────────────┐
│  i18n Status                                                     │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  App                  EN        DE        Keys    Missing DE     │
│  ──────────────────────────────────────────────────────────      │
│  Sovereign Health     100%      98.2%     1,796   32 keys        │
│  Sovereign Link       100%       0.0%       145   145 keys       │
│  Sovereign CRM        100%      85.0%       420   63 keys        │
│  Platform GUI         100%      92.0%       310   25 keys        │
│  ──────────────────────────────────────────────────────────      │
│  Total                100%      89.3%     2,671   265 keys       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**`brickos-i18n` crate:** Shared `I18nStatus` struct and helper function to compare `en.json` vs `de.json` and compute missing keys. Used by each app's status endpoint.

---

## 9. Future App Considerations

### 9.1 Sovereign Voice

Currently a stateless TypeScript CLI tool. As it evolves (design 007):
- Own API server (`sovereign-voice-api`, port 8086)
- Own database (`svo`)
- Own frontend at `app.brickos.io/voice/` or `app.sovereignvoice.io`
- Service account for calling Sovereign Link API
- Own i18n (content_strings in `svo` database)

### 9.2 Sovereign CRM

Per design 017:
- Own API server (`sovereign-crm-api`, port 8084)
- Own database (`scr`) with 15 tables
- Own frontend at `app.brickos.io/crm/` or `app.sovereigncrm.io`
- Uses all `brickos-*` crates
- Own i18n (content_strings in `scr` database)

Both follow the exact same pattern established by the Sovereign Link elevation.

---

## 10. Architecture Validation

### 10.1 Industry Best Practices Alignment

| Practice | BrickOS Approach | Reference |
|----------|-----------------|-----------|
| **Database-per-service** | Each app owns its own PostgreSQL database | Stripe, Shopify, Netflix microservices pattern |
| **Shared authentication** | Platform DB holds users/orgs; apps verify JWTs via shared crate | Auth0/Keycloak pattern -- centralized identity, distributed verification |
| **Service mesh communication** | Encrypted service account API calls (TLS/mTLS) | Kubernetes service mesh pattern (Istio, Linkerd) without the complexity |
| **Independent deployability** | Each app has own deploy.sh, own Docker image, own port | 12-factor app methodology |
| **Schema ownership** | Each service owns its data; no cross-service writes | Domain-Driven Design bounded contexts |
| **Feature flags for deployment modes** | `standalone` (SQLite) vs `platform` (PostgreSQL) | Start9/Umbrel packaging pattern for sovereign apps |
| **Centralized config, distributed execution** | Platform manages service accounts; apps use them independently | Consul/Vault pattern (simplified) |

### 10.2 What This Architecture Enables

- **Add a new app in 1 day:** Copy template, create database, register in platform, deploy
- **Remove an app with zero impact:** Drop database, remove nginx route, remove from platform registry
- **Scale an app independently:** Move to its own VPS, update connection string
- **Multi-region deployment:** One platform instance per region, full data residency
- **Sovereign distribution:** Any app can run standalone (SQLite mode) on Start9/Umbrel

---

## 11. Resolved Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Per-app DATABASE_URL** | `SLI_DATABASE_URL`, `SCR_DATABASE_URL`, etc. Each app connects to its own database. Separate `{APP}_PLATFORM_DATABASE_URL` for platform DB reads. |
| D2 | **Extract brickos-platform-api NOW** | Platform admin routes (org mgmt, service accounts, stats) move to dedicated service immediately. Apps must not contain platform logic. |
| D3 | **Service account API for all inter-app calls** | SHI calls Sovereign Link via service account HTTP API (not in-process). All communication encrypted. Service accounts managed exclusively by platform. |
| D4 | **Keep standalone as one crate with feature flags** | Shared handler code between standalone (SQLite) and platform (PostgreSQL) is valuable. One crate, two build targets. |
| D5 | **Rename SHI Docker images to new convention** | `sovereign-health-backend` -> `sovereignbrick/shi-api`. Breaking change managed via thorough testing. Production downtime acceptable. |
| D6 | **Content strings in app database, not platform** | Each app owns its translations in its own DB. No mixture. Platform only monitors completion % via i18n status endpoint. |
| D7 | **Separate database per app** | Prepares for multi-VPS scaling, EU/US data residency, independent backup/restore. Each app gets its own PostgreSQL database. |
| D8 | **3-char prefix** | `shi`, `sli`, `svo`, `scr`, `sex`, `sid`. Used for container names, env prefixes, database names. Consistent across all layers. |

---

## 12. Implementation Phases

### Phase 1: Platform API + Database Split (3-4 days)

- [ ] Create `brickos-platform-api` crate (port 9000)
- [ ] Move org management, service account, platform stats handlers from SL to platform-api
- [ ] Service account CRUD endpoints (create, rotate, revoke, list)
- [ ] Create separate databases: `brickos` (platform), `shi` (health), `sli` (links)
- [ ] Migrate data: `pg_dump` / `pg_restore` per schema into target databases
- [ ] Verify row counts and checksums
- [ ] Extract `brickos-notify` crate from SHI

### Phase 2: Sovereign Link Elevation (2-3 days)

- [ ] New `sovereign-link-api` binary with two PgPools (platform + app)
- [ ] Move PostgreSQL migrations to own folder
- [ ] Add JWT verification via `brickos-auth`
- [ ] Fix compilation errors
- [ ] `SLI_` env prefix, port 8082
- [ ] Deploy alongside SHI (dual nginx routing)
- [ ] E2E tests, 24h monitoring

### Phase 3: SHI Decoupling (2 days)

- [ ] Remove `sovereign-link` from SHI Cargo.toml
- [ ] SHI affiliate links via service account HTTP API (encrypted)
- [ ] SHI connects to `shi` database + `brickos` platform database (two pools)
- [ ] Rename Docker images: `sovereignbrick/shi-api`, `sovereignbrick/shi-web`
- [ ] Full regression test (all SHI E2E tests)
- [ ] Deploy to production (coordinated, downtime window)

### Phase 4: i18n + Template (1-2 days)

- [ ] Create `brickos-i18n` crate
- [ ] Add `GET /api/v1/i18n/status` to each app
- [ ] Platform GUI: i18n monitoring dashboard
- [ ] Document "new app checklist" based on this design
- [ ] Create template `main.rs` / `config.rs` / `Cargo.toml` for future apps

### Phase 5: Sovereign CRM + Voice (follows naturally)

- [ ] Sovereign CRM: create `scr` database, follow elevation template
- [ ] Sovereign Voice: when it gets an API server, create `svo` database
- [ ] Each new app is a 1-day setup following the established pattern
