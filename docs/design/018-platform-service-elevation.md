# 018 -- Platform Service Elevation: Decoupling Apps from Shared Infrastructure

**Status:** Draft v1
**Author:** Helmut / Claude
**Date:** 2026-04-08
**Related:** 005-platform-multi-tenant, 006-platform-schema-elevation, 012-url-shortener-service, 014-brickos-platform-gui, 015-brickos-unified-app-routing, 017-sovereign-crm

---

## 1. Problem Statement

BrickOS is growing from a single-app platform (SHI) into a multi-app ecosystem (SHI, Sovereign Link, Sovereign Voice, Sovereign CRM, and more). Today, every platform service is parasitically coupled to SHI:

- **Sovereign Link platform mode** runs inside SHI's Actix-web process, borrows SHI's database pool, trusts SHI's JWT without verification, and queries `brickos.users` / `brickos.organizations` directly.
- **Platform admin routes** (org management, branding, service accounts) are embedded in Sovereign Link handlers, which are embedded in SHI.
- **Sovereign Link's migrations** live inside SHI's migration folder.
- **Auth, billing, email, notifications** -- all initialized in SHI's `main.rs` and unavailable to any other app.

If SHI is retired, scaled down, or temporarily offline, every platform service and every other app loses:
- User authentication
- Organization management
- Service account validation
- Link shortening
- Billing and licensing
- Email delivery
- Notification dispatch

### The Dependency Chain Today

```
┌──────────────────────────────────────────────────────────────────┐
│  SHI Backend Process (single binary, single Actix-web server)    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ SHI handlers │  │ SL handlers  │  │ Platform     │          │
│  │ (health)     │  │ (links)      │  │ admin routes │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └────────┬────────┴──────────────────┘                   │
│                  │                                               │
│         ┌────────┴────────┐                                      │
│         │ Shared PgPool   │──── PostgreSQL (sovereign_health DB) │
│         │ Shared JWT      │     brickos schema + public schema   │
│         │ Shared config   │                                      │
│         │ Shared Encryptor│                                      │
│         └─────────────────┘                                      │
│                                                                  │
│  SHI owns: pool init, migrations, auth, config, CORS, all of it │
└──────────────────────────────────────────────────────────────────┘
```

### Goal: Independent Apps Consuming Platform Services

```
┌──────────────────────────────────────────────────────────────────────┐
│  BrickOS Platform Layer (shared database, shared crates)             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  brickos schema: users, organizations, org_members, billing,   │ │
│  │  service_accounts, app_prefixes, short_links, audit_log,       │ │
│  │  content_strings, search_index, domain_mappings                │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                              │                                       │
│  ┌──────────────┐  ┌────────┴───────┐  ┌──────────────┐            │
│  │ brickos-auth │  │ brickos-db     │  │ brickos-     │            │
│  │ JWT, MFA,    │  │ User, Org,     │  │ crypto       │            │
│  │ Argon2       │  │ ServiceAccount │  │ AES-256-GCM  │            │
│  └──────┬───────┘  └──────┬─────────┘  └──────┬───────┘            │
│         │                 │                    │                     │
│    ┌────┴─────────────────┴────────────────────┴────┐               │
│    │           Shared PostgreSQL (brickos DB)        │               │
│    └──────┬────────────┬────────────┬───────────────┘               │
│           │            │            │                                │
│  ┌────────┴──┐  ┌──────┴─────┐  ┌──┴──────────┐  ┌────────────┐   │
│  │ shi.api   │  │ link.api   │  │ crm.api     │  │ voice.api  │   │
│  │ :8080     │  │ :8082      │  │ :8084       │  │ :8086      │   │
│  │           │  │            │  │             │  │            │   │
│  │ shi.*     │  │ short_links│  │ crm_*       │  │ (stateless │   │
│  │ tables    │  │ clicks     │  │ tables      │  │  or own DB)│   │
│  │           │  │ prefixes   │  │             │  │            │   │
│  │ Own GUI   │  │ Own GUI    │  │ Own GUI     │  │ Own GUI    │   │
│  │ Own i18n  │  │ Own i18n   │  │ Own i18n    │  │ Own i18n   │   │
│  │ Own domain│  │ Own domain │  │ Own domain  │  │ Own domain │   │
│  └───────────┘  └────────────┘  └─────────────┘  └────────────┘   │
│                                                                      │
│  Each app: own process, own config, own migrations, own port         │
│  Shared: brickos schema, brickos-* crates, platform JWT verification │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Naming Convention

### 2.1 The `app_key` as Universal Identifier

The `app_key` column already exists in `license_tiers`, `product_features`, `tier_features`, `app_settings`, `search_index`, `short_links`, and `app_prefixes`. It is the canonical identifier for an app within the platform.

**Current app_key values in the database:**

| app_key | Product | Prefix | Status |
|---------|---------|--------|--------|
| `sovereign-health` | Sovereign Health Intelligence | `sh` | Production |
| `sovereign-link` | Sovereign Link | `lk` | Production (platform mode in SHI) |
| `sovereign-voice` | Sovereign Voice | `sv` | Early (CLI tool) |
| `sovereign-crm` | Sovereign CRM | `sc` | Design phase |
| `btc-tracker` | BTC Tracker | `bt` | Future |
| `sovereign-exchange` | Sovereign Exchange | `se` | Future |
| `sovereign-identity` | Sovereign Identity | `si` | Future |

### 2.2 Naming Rules

**Principle:** One canonical name per layer, derived mechanically from the `app_key`.

```
app_key (database)       → sovereign-health
crate name (Cargo.toml)  → sovereign-health-api
binary name              → sovereign-health-api
docker image             → sovereignbrick/sovereign-health-api
container name (prod)    → shi-api        (short prefix for ops)
container name (staging) → shi-staging-api
port (prod)              → 8080
port (staging)           → 8081
nginx upstream           → sovereign-health-api
env prefix               → SHI_             (existing, keep for backward compat)
service account name     → sovereign-health
```

**Full naming table:**

| Layer | SHI | Sovereign Link | Sovereign CRM | Sovereign Voice |
|-------|-----|----------------|---------------|-----------------|
| **app_key** | `sovereign-health` | `sovereign-link` | `sovereign-crm` | `sovereign-voice` |
| **prefix** | `sh` | `lk` | `sc` | `sv` |
| **API crate** | `sovereign-health-api` | `sovereign-link-api` | `sovereign-crm-api` | `sovereign-voice-api` |
| **Frontend** | `sovereign-health-frontend` | `sovereign-link-frontend` | `sovereign-crm-frontend` | `sovereign-voice-frontend` |
| **Docker (API)** | `sovereignbrick/shi-api` | `sovereignbrick/link-api` | `sovereignbrick/crm-api` | `sovereignbrick/voice-api` |
| **Docker (web)** | `sovereignbrick/shi-web` | `sovereignbrick/link-web` | `sovereignbrick/crm-web` | `sovereignbrick/voice-web` |
| **Container (prod)** | `shi-api` | `link-api` | `crm-api` | `voice-api` |
| **Container (staging)** | `shi-staging-api` | `link-staging-api` | `crm-staging-api` | `voice-staging-api` |
| **Port (prod)** | `8080` | `8082` | `8084` | `8086` |
| **Port (staging)** | `8081` | `8083` | `8085` | `8087` |
| **Env prefix** | `SHI_` | `LINK_` | `CRM_` | `VOICE_` |
| **Domain (prod)** | `app.sovereignhealth.io` | `app.sovereignlink.io` | `app.sovereigncrm.io` | `app.sovereignvoice.io` |
| **Domain (platform)** | `app.brickos.io/health/` | `app.brickos.io/links/` | `app.brickos.io/crm/` | `app.brickos.io/voice/` |
| **Service account** | `sovereign-health` | `sovereign-link` | `sovereign-crm` | `sovereign-voice` |
| **DB schema** | `shi` (app-specific tables) | `link` (if needed) | `crm` | `voice` |

### 2.3 Platform Services Naming

Platform services are not apps. They are shared infrastructure.

| Layer | Name | Purpose |
|-------|------|---------|
| **Crate** | `brickos-auth` | JWT, MFA, Argon2, token validation |
| **Crate** | `brickos-crypto` | AES-256-GCM Encryptor |
| **Crate** | `brickos-db` | Platform models (User, Organization, ServiceAccount) |
| **Crate** | `brickos-email` | EmailProvider trait (Mailgun, Log) |
| **Crate** | `brickos-billing` | Stripe + Strike |
| **Crate** | `brickos-i18n` | i18n monitoring trait (NEW -- see section 8) |
| **API** (future) | `brickos-platform-api` | Standalone platform admin API |
| **GUI** | Platform GUI at `app.brickos.io/platform/` | Design 014/016 |

**Rule:** Platform crates use the `brickos-` prefix. App crates use the `sovereign-` prefix (matching the product brand).

---

## 3. What Needs to Move

### 3.1 Services Currently in SHI That Are Platform-Level

| Service | Current Location | Target | Effort |
|---------|-----------------|--------|--------|
| JWT verification | `brickos-auth` crate (already extracted) | No change | Done |
| Password hashing | `brickos-auth` crate | No change | Done |
| MFA (TOTP) | `brickos-auth` crate | No change | Done |
| Encryption | `brickos-crypto` crate | No change | Done |
| Email sending | `brickos-email` crate | No change | Done |
| User CRUD | SHI `handlers/auth.rs` | Each app does its own (via `brickos-auth` + `brickos-db`) | Medium |
| Org management | SL `handlers/org_admin.rs` | Each app or future `brickos-platform-api` | Medium |
| Service account auth | SL `handlers/service_auth.rs` | Extract to `brickos-db` or `brickos-auth` | Small |
| Content strings (i18n) | SHI `handlers/content_strings.rs` | Per-app (each app has own content_strings table with app_key) | Medium |
| Notifications (ntfy) | SHI `services/notify.rs` | Extract to `brickos-notify` crate | Small |
| Platform admin stats | SL `handlers/platform_admin.rs` | Future `brickos-platform-api` | Large (later) |

### 3.2 Sovereign Link -- Specific Decoupling

| Coupling Point | Current | Target | Migration |
|----------------|---------|--------|-----------|
| Database pool | Borrows SHI's PgPool | Own PgPool in `sovereign-link-api` main.rs | Create own main.rs with pool init |
| JWT auth | Trusts SHI JWT (no verification) | Verify JWT using `brickos-auth::jwt::verify()` | Add verification call |
| User lookup | Reads `brickos.users` directly | Still reads `brickos.users` (shared table) -- this is correct | No change |
| Org lookup | Reads `brickos.organizations` directly | Still reads `brickos.organizations` -- this is correct | No change |
| Service accounts | Reads `brickos.service_accounts` directly | Still reads `brickos.service_accounts` -- this is correct | No change |
| Migrations | In SHI's migrations folder | Own migration folder: `apps/technology/sovereign-link/api/migrations/` | Move and re-test |
| Process | Embedded in SHI binary | Own binary: `sovereign-link-api` | New main.rs, new Cargo.toml |
| Port | SHI's port (8080) | Own port: 8082 (prod), 8083 (staging) | Config + nginx |
| CORS | SHI's CORS config | Own CORS config (allow link.brickos.io, app.brickos.io) | Config |
| Config | None (uses SHI's) | Own config: `LINK_DATABASE_URL`, `LINK_JWT_SECRET`, etc. | New config.rs |
| Sentry | SHI's Sentry | Own Sentry DSN (or shared) | Config |

**Key insight:** Sovereign Link already queries `brickos.*` tables with explicit schema qualification. It does NOT need copies of user/org tables. It shares the same PostgreSQL database (brickos schema) but runs as its own process. This is the correct pattern -- shared data, independent processes.

---

## 4. Target Architecture Per App

Each app follows the same structure. No app depends on another app's process.

### 4.1 App Anatomy

```
apps/{pillar}/{product}/
├── api/                              # Rust/Axum or Actix-web API
│   ├── src/
│   │   ├── main.rs                   # Own server, own pool, own config
│   │   ├── config.rs                 # App-specific config (env vars)
│   │   ├── handlers/                 # App-specific endpoints
│   │   ├── models/                   # App-specific models
│   │   ├── services/                 # App-specific business logic
│   │   └── middleware/               # App-specific middleware (if any)
│   ├── migrations/                   # App-specific migrations (own folder)
│   └── Cargo.toml                    # Depends on brickos-* crates
├── frontend/                         # Next.js PWA
│   ├── src/
│   │   ├── app/                      # App routes (login, dashboard, settings, ...)
│   │   ├── components/               # App-specific components
│   │   ├── lib/                      # Auth context, API client, theme, sync
│   │   └── i18n/                     # App-specific translations (EN, DE)
│   └── package.json
└── ops/
    ├── deploy.sh                     # App-specific deploy script
    ├── docker-compose.prod.yml       # App containers
    └── docker-compose.staging.yml
```

### 4.2 What Each App Initializes (main.rs Pattern)

Every app's `main.rs` follows the same structure (derived from SHI's proven pattern):

```rust
// sovereign-link-api/src/main.rs  (example)
#[tokio::main]
async fn main() -> std::io::Result<()> {
    // 1. Logging
    tracing_subscriber::fmt().json().init();

    // 2. Config (app-specific env vars)
    let config = LinkConfig::from_env();   // LINK_DATABASE_URL, LINK_JWT_SECRET, ...

    // 3. Database pool (connects to shared brickos DB, but own pool)
    let pool = PgPoolOptions::new()
        .max_connections(config.db_pool_max)
        .connect(&config.database_url).await?;

    // 4. Platform crates (shared, initialized per-app)
    let encryptor = brickos_crypto::Encryptor::new(config.encryption_key.as_deref());
    let email = brickos_email::create_email_provider(!config.is_oss());
    let jwt_secret = config.jwt_secret.clone();

    // 5. App-specific migrations (from own folder)
    sqlx::migrate!("./migrations").run(&pool).await?;

    // 6. App-specific services
    let link_store = PgLinkStore::new(pool.clone());

    // 7. HTTP server (own port)
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(link_store.clone()))
            .app_data(web::Data::new(config.clone()))
            .configure(routes::configure)
    })
    .bind(("0.0.0.0", config.port))?  // 8082
    .run()
    .await
}
```

### 4.3 What Is Shared vs. App-Specific

| Concern | Shared (Platform) | App-Specific |
|---------|-------------------|--------------|
| Database | Same PostgreSQL instance, `brickos` schema | Own schema for app tables, own migration folder |
| Users | `brickos.users` (read/write via shared pool) | User preferences, app-specific profile fields |
| Organizations | `brickos.organizations` (read) | Org-level app settings |
| Auth | `brickos-auth` crate (JWT verify, password hash) | App-specific middleware, rate limiters |
| Encryption | `brickos-crypto` crate (Encryptor) | App decides which fields to encrypt |
| Email | `brickos-email` crate (EmailProvider) | App-specific templates, triggers |
| Billing | `brickos-billing` crate (Stripe/Strike) | App-specific tiers, features, pricing |
| Notifications | `brickos-notify` crate (ntfy/Telegram) | App-specific alert rules |
| i18n | Platform monitors translation % (section 8) | App owns its own translations (content_strings, static JSON) |
| Config | `DATABASE_URL`, `JWT_SECRET` (can share or separate) | `{APP}_PORT`, `{APP}_MODE`, app-specific keys |
| Process | N/A | Own binary, own port, own Docker container |
| Domain | `app.brickos.io/{app}/` (unified) | Own domain (e.g., `app.sovereignhealth.io`) |
| Deploy | Shared deploy patterns (deploy.sh template) | Own deploy.sh, own docker-compose |
| Admin | Platform GUI at `/platform/apps/{app}/` | App-specific admin within its own GUI |

---

## 5. Sovereign Link Elevation Plan

### 5.1 Current State -> Target State

```
CURRENT                                       TARGET
─────────────────────────────────────        ─────────────────────────────────────
apps/technology/sovereign-link/               apps/technology/sovereign-link/
  src/                                          api/
    main.rs      (standalone only)                src/
    lib.rs       (platform = library)               main.rs      (platform + standalone)
    config.rs    (standalone only)                  config.rs    (both modes)
    handlers/    (mixed platform+standalone)         handlers/    (cleaned up)
    db/                                             db/
      postgres.rs (no pool init)                      postgres.rs (own pool init)
      sqlite.rs   (standalone)                        sqlite.rs   (standalone)
    auth/        (standalone only)                  auth/        (JWT verify via brickos-auth)
  migrations/                                     migrations/
    sqlite/      (standalone)                       sqlite/      (standalone)
                                                    postgres/    (platform -- moved from SHI)
  Cargo.toml     (library crate)                  Cargo.toml   (binary crate)
  Dockerfile     (standalone only)              frontend/        (NEW -- link management UI)
  templates/     (server-rendered HTML)           src/app/       (Next.js, same pattern as SHI)
                                                ops/
                                                  deploy.sh
                                                  docker-compose.prod.yml
                                                  docker-compose.staging.yml
```

### 5.2 Step-by-Step Migration

**Phase 1: Extract Sovereign Link as Independent API Binary**

1. Create `apps/technology/sovereign-link/api/` directory structure
2. New `Cargo.toml` with `brickos-auth`, `brickos-crypto`, `brickos-db` dependencies
3. New `main.rs` that initializes its own PgPool, Encryptor, config
4. New `config.rs` with `LINK_` prefixed env vars (`LINK_DATABASE_URL`, `LINK_PORT=8082`, `LINK_JWT_SECRET`)
5. Move Sovereign Link PostgreSQL migrations from SHI's folder to `api/migrations/postgres/`
6. Keep SQLite migrations at `api/migrations/sqlite/` for standalone mode
7. **Feature flags remain:** `standalone` (SQLite + own auth) vs `platform` (PostgreSQL + brickos-auth JWT verify)
8. Add proper JWT verification in platform mode (currently trusts blindly)

**Phase 2: Remove Sovereign Link from SHI**

1. Remove `sovereign-link` dependency from SHI's `Cargo.toml`
2. Remove `.configure(sovereign_link::configure_routes)` from SHI's `main.rs`
3. Remove `PgLinkStore` initialization from SHI's `main.rs`
4. Add nginx upstream for `link-api` on port 8082
5. Route `/r/*` traffic to `link-api` instead of SHI
6. Route `/api/v1/links/*` to `link-api`
7. Route `/api/v1/service/links/*` to `link-api`
8. Route `/api/v1/admin/stats*` and `/org/*` to `link-api` (or future platform-api)

**Phase 3: Sovereign Link Frontend (Optional -- Web UI)**

1. The standalone server-rendered templates (`templates/*.html`) work for self-hosted mode
2. For platform mode, create a minimal Next.js frontend at `frontend/` (same stack as SHI)
3. Or: manage links from the Platform Admin GUI (design 016, `/platform/apps/link/`)
4. Decision: standalone keeps Askama templates, platform uses Platform GUI

**Phase 4: Verify SHI Is Unaffected**

1. SHI continues to work with zero Sovereign Link code
2. SHI's affiliate links now call Sovereign Link's API via service account (HTTP, not in-process)
3. SHI's `/r/{code}` redirects are handled by nginx -> `link-api` (not SHI)
4. Existing short_links data is untouched (same PostgreSQL, same `brickos` schema)
5. Full regression test: all SHI E2E tests pass, all affiliate flows work

---

## 6. SHI Migration Safety

### 6.1 Zero-Downtime Migration Strategy

The decoupling must not break SHI or lose data. The migration is additive, not destructive.

**Step 1: Deploy Sovereign Link API alongside SHI (both serve /r/)**

```
nginx:
  /r/*  ->  try link-api:8082 first, fallback to shi-api:8080
```

Both processes can serve redirects from the same database. No conflict because short_links is read-heavy, write-rare.

**Step 2: Verify Sovereign Link API handles all traffic correctly**

Monitor for 24-48 hours:
- Redirect latency
- Click recording completeness
- API endpoint parity (create, update, delete, stats)

**Step 3: Remove Sovereign Link routes from SHI**

Only after Step 2 is verified. SHI rebuild without `sovereign-link` dependency.

**Step 4: Update nginx to route exclusively to link-api**

```
nginx:
  /r/*  ->  link-api:8082   (no more fallback to SHI)
```

### 6.2 Data Safety

- **No table changes.** The `brickos.short_links`, `brickos.short_link_clicks`, and `brickos.app_prefixes` tables remain exactly where they are.
- **No migration changes.** The tables already exist. Sovereign Link's migration folder contains the same DDL (idempotent with `IF NOT EXISTS`).
- **No data copy.** Both SHI and Sovereign Link API read/write the same tables during the transition period.
- **Rollback:** If Sovereign Link API has issues, re-enable the routes in SHI (revert the dependency removal). Zero data loss.

### 6.3 Test Checklist

Before removing Sovereign Link from SHI:

- [ ] `cargo check` passes for SHI without `sovereign-link` dependency
- [ ] `cargo check` passes for `sovereign-link-api` with `--features platform`
- [ ] `sovereign-link-api` starts and serves `/health` on port 8082
- [ ] `GET /r/{code}` redirects correctly (test 10 known codes)
- [ ] `POST /api/v1/links` creates a new link (test with JWT)
- [ ] `GET /api/v1/links/{id}/stats` returns correct click counts
- [ ] `POST /api/v1/service/links` works with service account API key
- [ ] Click recording: `country_code` and `referrer_domain` populated
- [ ] QR code generation: `GET /r/{code}.qr` returns SVG
- [ ] Affiliate redirect: `GET /r/sha3f2c1b9` fast-path works
- [ ] SHI E2E tests pass (login, measurements, doctor chat, affiliate)
- [ ] SHI affiliate page creates links (now via HTTP to link-api, not in-process)
- [ ] Staging deploy succeeds for both services
- [ ] Production deploy succeeds with nginx dual-routing

---

## 7. Platform Admin: Who Manages What

### 7.1 Platform Admin GUI (design 016)

The Platform Admin GUI at `app.brickos.io/platform/` manages cross-app concerns. Each app registers itself and its admin surface.

```
/platform/apps/                         All apps overview (health, link, crm, voice)
/platform/apps/health/overview          SHI stats, app-specific admin
/platform/apps/link/overview            Sovereign Link stats, global link management
/platform/apps/crm/overview             CRM stats, ingestion metrics
/platform/apps/voice/overview           Voice publishing stats
```

**Who manages the app_prefixes table?** Platform admin (not any individual app). This is infrastructure-level routing config.

**Who manages service accounts?** Platform admin. Service accounts are cross-app credentials.

**Who manages users and organizations?** Platform admin for cross-org views. Each app can also manage its own user-facing settings.

### 7.2 App-Level Business Logic

Each app has its own business rules that live in its own codebase:

| App | Business Logic (App-Level) | Platform Logic (Shared) |
|-----|---------------------------|------------------------|
| **SHI** | Health markers, zones, measurements, doctor chat, AI credits | User auth, org membership, billing, email |
| **Sovereign Link** | Link CRUD, click tracking, analytics, QR codes, redirect fast-path | User auth, org membership, service accounts |
| **Sovereign CRM** | Contacts, companies, projects, meetings, captures, lead pipeline, graph | User auth, org membership, AI provider config |
| **Sovereign Voice** | NOSTR publishing, scheduling, audience analytics | Service account auth (calls Sovereign Link API) |

---

## 8. i18n Architecture

### 8.1 Per-App i18n (Each App Owns Its Translations)

Each app manages its own translations independently:

```
apps/health/sovereign-health/frontend/src/i18n/
  messages/en.json     (1,796 keys)
  messages/de.json     (1,796 keys)

apps/technology/sovereign-link/frontend/src/i18n/   (NEW)
  messages/en.json
  messages/de.json

apps/data/sovereign-crm/frontend/src/i18n/          (future)
  messages/en.json
  messages/de.json
```

Each app has:
- Static JSON message files (bundled at build time)
- Optional database-driven content_strings table (per app, filtered by `app_key`)
- `next-intl` (or equivalent) for runtime translation
- Locale stored in cookie (per-app, same pattern as SHI)
- Minimum: EN + DE (CLAUDE.md convention)

### 8.2 Platform i18n Monitoring (NEW)

The Platform Admin GUI monitors translation completeness across all apps without owning the translations.

```
/platform/content/i18n                  i18n overview dashboard
/platform/content/i18n/health           SHI translation status
/platform/content/i18n/link             Sovereign Link translation status
/platform/content/i18n/crm              CRM translation status
```

**Dashboard view:**

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
│  [Export missing keys as CSV]  [Export all as XLIFF]             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**How it works:**

Each app exposes an i18n status endpoint:
```
GET /api/v1/i18n/status
→ {
    "app_key": "sovereign-health",
    "locales": {
      "en": { "total_keys": 1796, "translated": 1796 },
      "de": { "total_keys": 1796, "translated": 1764 }
    },
    "missing_keys": {
      "de": ["affiliate.payout.pending", "admin.compliance.new_field", ...]
    }
  }
```

Platform GUI aggregates status from all apps. No translation data is copied to the platform -- it only reads status.

**Optional `brickos-i18n` crate:** A tiny shared crate providing:
- `I18nStatus` struct (for the status endpoint response)
- Helper function to compare `en.json` vs `de.json` and compute missing keys
- Could be used by each app's status endpoint

---

## 9. Sovereign Voice Considerations

Sovereign Voice is currently a stateless CLI tool (TypeScript, no API server). As it evolves (design 007), it will need:

- **Own API server** (`sovereign-voice-api`) for scheduling, audience management, analytics
- **Own frontend** at `app.brickos.io/voice/` or `app.sovereignvoice.io`
- **Own database tables** (schedules, posts, audience segments, engagement metrics)
- **Service account** for calling Sovereign Link API (already designed in migration 002)
- **i18n** for its frontend (EN + DE)

The elevation pattern established here applies directly. Sovereign Voice does NOT depend on SHI or Sovereign Link at the process level -- only at the API level via service accounts.

---

## 10. Sovereign CRM Considerations

Per design 017, Sovereign CRM:

- Lives at `apps/data/sovereign-crm/`
- Has `sovereign-crm-api` (Rust/Axum, port 8084) and `sovereign-crm-frontend` (Next.js)
- Uses `brickos-auth`, `brickos-crypto`, `brickos-db`, `brickos-email` (same crates as SHI)
- Has its own 15 tables in `crm` schema (or `crm_` prefixed in `public`)
- Has its own i18n (EN + DE)
- Has its own domain: `app.sovereigncrm.io` or `app.brickos.io/crm/`

CRM follows the exact same pattern as the elevated Sovereign Link. No coupling to SHI or Sovereign Link processes.

---

## 11. Database Strategy

### 11.1 One Database, Multiple Schemas

All apps share one PostgreSQL instance but use separate logical spaces:

```
PostgreSQL instance: brickos
├── brickos schema    (platform: users, orgs, billing, service_accounts, ...)
├── public schema     (SHI health tables: zones, markers, measurements, ...)
├── link schema       (future: if Sovereign Link needs app-specific tables beyond short_links)
├── crm schema        (future: crm_contacts, crm_companies, crm_projects, ...)
└── voice schema      (future: schedules, posts, audience, ...)
```

**Current reality:** SHI health tables are in `public` schema. Short link tables are in `brickos` schema (already elevated). CRM tables would be `crm_` prefixed in `public` or in a `crm` schema.

**Migration ownership:**
- `crates/brickos-db/migrations/` -- platform schema (`brickos.*`)
- `apps/health/sovereign-health/api/migrations/` -- SHI-specific tables
- `apps/technology/sovereign-link/api/migrations/postgres/` -- Sovereign Link tables (moved from SHI)
- `apps/data/sovereign-crm/api/migrations/` -- CRM-specific tables
- Each app runs its own migrations on startup against the shared database

### 11.2 Connection Pooling

Each app creates its own `PgPool` connecting to the same `DATABASE_URL`. This is fine for a single-VPS deployment (Hetzner CAX41). Each pool has `max_connections` tuned per app:

| App | max_connections | Rationale |
|-----|----------------|-----------|
| SHI API | 15 | Heaviest app (measurements, AI, billing) |
| Sovereign Link API | 5 | Mostly redirects (read-heavy, fast) |
| Sovereign CRM API | 10 | Contact CRUD, search, graph queries |
| Sovereign Voice API | 3 | Lightweight (scheduling, NOSTR publishing) |
| **Total** | 33 | Well within PostgreSQL default (100) |

### 11.3 Shared vs. App Database

**Current:** One PostgreSQL database shared by all apps.
**Future option:** Per-app PostgreSQL databases for stronger isolation. Not needed now (single VPS), but the architecture supports it -- each app only reads its own migrations folder and `brickos` schema.

---

## 12. Implementation Phases

### Phase 1: Extract Sovereign Link API (1-2 days)

- [ ] New directory: `apps/technology/sovereign-link/api/`
- [ ] New `Cargo.toml` depending on `brickos-auth`, `brickos-crypto`, `brickos-db`
- [ ] New `main.rs` with own PgPool, own config, own port (8082)
- [ ] New `config.rs` with `LINK_` env prefix
- [ ] Move PostgreSQL migrations from SHI to `api/migrations/postgres/`
- [ ] Add JWT verification via `brickos-auth` (replace blind trust)
- [ ] Fix 2 compilation errors (ShortLink fields in sqlite.rs)
- [ ] `cargo check --features platform` passes
- [ ] `cargo check --features standalone` passes

### Phase 2: Deploy Sovereign Link API Alongside SHI (1 day)

- [ ] Docker compose: add `link-api` container on port 8082
- [ ] nginx: route `/r/*` to `link-api` with SHI fallback
- [ ] Deploy to staging
- [ ] Run Sovereign Link E2E tests against staging
- [ ] Monitor 24h: redirects, click recording, API endpoints

### Phase 3: Remove Sovereign Link from SHI (1 day)

- [ ] Remove `sovereign-link` from SHI `Cargo.toml`
- [ ] Remove `.configure(sovereign_link::configure_routes)` from SHI `main.rs`
- [ ] Remove `PgLinkStore` init from SHI `main.rs`
- [ ] SHI affiliate page calls Sovereign Link API via HTTP (service account)
- [ ] Full SHI regression test
- [ ] Deploy SHI (without Sovereign Link) to staging
- [ ] Deploy to production

### Phase 4: i18n Monitoring (1 day)

- [ ] Create `brickos-i18n` crate with `I18nStatus` struct and helper
- [ ] Add `GET /api/v1/i18n/status` to SHI API
- [ ] Add `GET /api/v1/i18n/status` to Sovereign Link API
- [ ] Platform GUI: i18n dashboard aggregating all app statuses

### Phase 5: Template for Future Apps (documentation)

- [ ] Document the "new app checklist" based on this design
- [ ] Create a template `main.rs` / `config.rs` / `Cargo.toml` for new apps
- [ ] Document nginx routing rules for adding a new app
- [ ] Document docker-compose patterns for staging + production

---

## 13. Open Questions

1. **Shared `DATABASE_URL` or per-app?** All apps could use the same connection string (simplest), or each app could have its own (`LINK_DATABASE_URL`, `CRM_DATABASE_URL`) pointing to the same instance but allowing future separation. Recommend: per-app env var, same value for now.

2. **Platform Admin API -- when?** Currently, platform admin routes live in Sovereign Link handlers (org management, branding, stats). Should we extract to a dedicated `brickos-platform-api` now, or after the Sovereign Link decoupling? Recommend: after -- focus on Sovereign Link first, then extract platform routes as a third step.

3. **SHI affiliate link creation.** Today SHI creates affiliate short links in-process (Rust function call). After decoupling, it must call Sovereign Link's HTTP API. Should this use the service account API or a direct database write? Recommend: service account API (clean separation, same as Sovereign Voice already does).

4. **Standalone mode packaging.** The standalone Sovereign Link binary (SQLite) is a separate product from the platform-mode API. Should they be the same binary with feature flags (current), or separate crates? Recommend: keep as one crate with feature flags -- the shared handler code is valuable.

5. **Docker image naming.** Current SHI images: `sovereign-health-backend`, `sovereign-health-frontend`. New convention proposes: `sovereignbrick/shi-api`, `sovereignbrick/link-api`. Should we rename SHI images too (breaking change for existing deployments)? Recommend: new names for new apps, keep SHI names until next major version.

6. **Content strings ownership.** The `content_strings` table currently has all SHI strings. When Sovereign Link gets its own frontend, should it have its own `content_strings` rows (filtered by `app_key=sovereign-link`), or its own table? Recommend: same table, filtered by `app_key` -- the infrastructure is already built (migration 004 added `app_key` to the relevant tables).
