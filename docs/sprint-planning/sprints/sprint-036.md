# Sprint 036 - Sovereign CRM Foundation (Phase 1)

**Started:** 2026-04-09
**Goal:** Scaffold the Sovereign CRM app (API + frontend) with two-pool architecture, full auth flows (registration, login, MFA), SHI-parity base UI, core CRUD endpoints (contacts, companies, projects), universal tagging, brickos-ai crate with Ollama fallback, and staging deployment.
**Version target:** v0.43.0
**Previous:** Sprint 035 (SHI two-pool refactor, platform database separation)
**Design:** [017-sovereign-crm.md](../../design/017-sovereign-crm.md), [018-platform-service-elevation.md](../../design/018-platform-service-elevation.md)

---

## Architecture Context (from Sprint 035)

Sprint 035 established the two-pool pattern. Sovereign CRM follows it from day one:

- **Platform pool** (read-write, 5 connections) -- `brickos` DB: users, organizations, billing, service_accounts, refresh_tokens, email_verifications, user_mfa
- **App pool** (read-write, 10 connections) -- `scr` DB: crm_contacts, crm_companies, crm_projects, crm_tags, crm_taggings
- **No cross-DB JOINs** -- assemble in Rust
- **PlatformPool newtype** for type safety (same pattern as SHI)
- **Service account** for inter-app calls (e.g., CRM -> Sovereign Link for short URLs)

**IMPORTANT:** The platform pool is NOT read-only. Auth operations (registration, login, MFA, password reset, token refresh) all write to the platform DB through PlatformPool. This matches SHI's established pattern where auth handlers INSERT/UPDATE users, refresh_tokens, email_verifications, user_mfa, user_licenses, etc.

### Reused Platform Services

| Crate | Usage in CRM |
|-------|-------------|
| `brickos-auth` | JWT, MFA (TOTP), password hashing (Argon2), token management |
| `brickos-crypto` | AES-256-GCM per-field encryption (email, phone, notes) |
| `brickos-db` | User, Organization, OrgMember, RefreshToken models |
| `brickos-email` | Email verification, password reset emails |
| `brickos-billing` | Subscription tier checks, license management |
| `brickos-notify` | Admin alerts (ntfy + Telegram) |
| `brickos-i18n` | Translation status endpoint |
| `brickos-ai` | **NEW** -- AI provider abstraction with Ollama fallback |

### Naming Convention (Design 018)

```
App key:        sovereign-crm
Prefix:         scr
API crate:      sovereign-crm-api
Frontend:       sovereign-crm-frontend
Docker:         sovereignbrick/scr-api, sovereignbrick/scr-web
Ports:          8084 (prod), 8085 (staging)
Env prefix:     SCR_
Database:       scr
Domain:         app.sovereigncrm.io / app.brickos.io/crm/
```

---

## Dependency Graph

```
Layer 0 (no deps -- scaffold + shared crate):
  #401 Create scr database + platform registration
  #390 API crate scaffold (Cargo.toml, main.rs, config.rs, two-pool)
  #391 Frontend scaffold (Next.js 16, full SHI-parity base UI)
  #413 brickos-ai crate (provider trait, Anthropic + Ollama impls, fallback chain)
       |
       v
Layer 1 (needs Layer 0 -- schema + auth):
  #402 Initial migrations: contacts, companies, projects, contact_company
  #403 Initial migrations: tags, taggings, search_index
  #404 Auth handlers: registration, login, MFA, password reset, email verification
       |
       v
Layer 2 (needs Layer 1 -- middleware + crypto):
  #414 Auth middleware + org-scoping (JWT verify, org_id filter on all CRM queries)
  #405 Per-field encryption via brickos-crypto
       |
       v
Layer 3 (needs Layer 2 -- core CRUD):
  #406 Contact CRUD endpoints + frontend pages
  #407 Company CRUD endpoints + frontend pages
  #408 Project CRUD endpoints + frontend pages
       |
       v
Layer 4 (needs Layer 3 -- cross-cutting):
  #409 Universal tagging system (API + UI)
  #410 i18n setup (EN + DE content files)
  #415 Settings page (profile, security/MFA, account, data & privacy)
       |
       v
Layer 5 (needs Layer 4 -- deploy + test):
  #411 Docker compose + deploy.sh + staging deployment
  #412 Smoke tests + integration tests
```

---

## Sprint Backlog

### Layer 0 -- Scaffold + Shared Crate (no deps)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 1 | #401 Create `scr` database on staging + register app in platform | 2 | - |
| 2 | #390 API crate scaffold: Cargo.toml, main.rs (two-pool), config.rs, lib.rs, error.rs | 5 | - |
| 3 | #391 Frontend scaffold: full SHI-parity base UI (registration, login, MFA, navbar, profile) | 8 | - |
| 4 | #413 brickos-ai crate: AiProvider trait, Anthropic + Ollama impls, fallback manager | 5 | - |

**Points:** 20

**Details for #401:**
- Create `scr` database on staging PostgreSQL
- `CREATE DATABASE scr OWNER brickos;`
- Register `sovereign-crm` in platform app registry (org_apps if available)
- Create `sovereign-crm` service account via platform-api for inter-app calls
- Add `SCR_DATABASE_URL`, `SCR_PLATFORM_DATABASE_URL`, `SCR_JWT_SECRET`, `SCR_ENCRYPTION_KEY` env vars

**Details for #390:**
- Create `apps/data/sovereign-crm/api/` directory structure
- `Cargo.toml` with workspace deps: actix-web, sqlx, brickos-auth, brickos-crypto, brickos-db, brickos-email, brickos-billing, brickos-notify, brickos-i18n, brickos-ai
- `main.rs` with two-pool init (PlatformPool newtype + PgPool), tracing, dotenvy
- `config.rs` loading `SCR_*` env vars (including `SCR_OLLAMA_BASE_URL` for local AI)
- `lib.rs` with VERSION const, route configuration
- `error.rs` with AppError enum + ResponseError impl
- Auth handler stubs (register, login, verify, reset) -- writes to platform pool
- Port 8084 (prod) / 8085 (staging)
- Add crate to workspace Cargo.toml

**Details for #391 (EXPANDED -- full SHI-parity base UI):**

The frontend must ship with a complete user-facing shell, not empty placeholders. Replicate the SHI base UI stack:

**Auth pages:**
- `/login` -- email + password, MFA (TOTP 6-digit + recovery codes), demo mode detection
- `/signup` -- email, password (strength indicator), display name, country, newsletter consent, TOS
- `/forgot-password` -- email entry, reset token flow
- `/verify-email` -- token verification page

**Root layout provider stack (same nesting as SHI):**
```
<html dark suppressHydrationWarning>
  <head> brand detection script (prevent logo flash)
  <body>
    NextIntlClientProvider
      ThemeProvider
        AuthProvider (cookie-based JWT, session expiry, window focus refresh)
          ContentProvider
            {children}
            Toaster (sonner)
```

**Navbar component:**
- Sticky, responsive, auto-hide on mobile scroll
- Logo + app name (brand-aware: SovereignCRM vs BrickOS)
- Top navigation menu: Dashboard, Contacts, Companies, Projects
- Language selector (EN/DE)
- Search icon (Ctrl+K)
- User menu: avatar with initials, display name, tier badge, Settings, Theme toggle, Sign out
- Unauthenticated: Login + Sign Up buttons
- Mobile hamburger menu with portal + focus trap

**Brand system:**
- `lib/brand.ts` -- hostname-based brand detection (sovereigncrm.io vs brickos.io)
- Middleware sets brand cookie, head script sets HTML class before React
- Brand config: logo, appName, subtitle, showDemo, showRegister

**Favicon/metadata:**
- favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png
- OG metadata, Twitter cards
- PWA manifest

**Empty CRM pages (wired into top nav):**
- `/crm/dashboard` -- placeholder
- `/crm/contacts` -- placeholder
- `/crm/companies` -- placeholder
- `/crm/projects` -- placeholder
- `/crm/tags` -- placeholder

**Details for #413 (NEW -- brickos-ai crate):**

Extract AI provider logic into a shared platform crate that any BrickOS app can import.

Location: `crates/brickos-ai/`

```rust
/// Provider trait -- implemented by each backend
#[async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse, AiError>;
    async fn vision(&self, request: VisionRequest) -> Result<ChatResponse, AiError>;
    fn supports_vision(&self) -> bool;
    fn cost_per_1k_tokens(&self) -> (f64, f64); // (input, output)
}

/// Built-in implementations
pub struct AnthropicProvider { api_key, api_url, model, ... }
pub struct OllamaProvider { base_url, model, ... }  // http://localhost:11434
pub struct OpenAiProvider { api_key, model, ... }    // optional

/// Fallback manager -- tries providers in priority order
pub struct AiProviderManager {
    providers: Vec<(Priority, Box<dyn AiProvider>)>,
    failure_counts: DashMap<String, (u32, Instant)>,
    // 3 failures in 5min -> skip to next provider
    // Check recovery every 5min
}

impl AiProviderManager {
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse, AiError>;
    // Tries providers in priority order, auto-failover on error
}
```

**Ollama specifics:**
- Connects to Ollama's OpenAI-compatible `/v1/chat/completions` endpoint
- Default model: `llama3.2` (configurable via `BRICKOS_OLLAMA_MODEL`)
- Base URL: `BRICKOS_OLLAMA_BASE_URL` (default `http://localhost:11434`)
- Health check: `GET /api/tags` to verify Ollama is running
- Vision support: `llama3.2-vision:11b` for image extraction
- No API key needed (local)

**Platform-level configuration:**
- Reads from `brickos.app_settings` table (setting_key = `ai_provider_config`)
- JSON config: `{ providers: [{ provider, model, priority, api_key_encrypted, base_url }] }`
- Org-level override: `brickos.app_settings WHERE app_key = 'sovereign-crm' AND org_id = ?`
- Falls back to platform default if no org override

**Fallback chain (default):**
1. Anthropic Claude Sonnet (cloud, best quality)
2. OpenAI GPT-4o (cloud, alternative)
3. Ollama llama3.2 (local, sovereign, zero cloud dependency)

**Why a shared crate:**
- SHI can migrate from hardcoded `call_claude()` to `brickos_ai::AiProviderManager`
- CRM gets AI from day one (email extraction, meeting transcription in Phase 2-3)
- Sovereign Voice, Almanac, etc. all benefit
- Single place to configure Ollama for the entire platform
- Cost tracking per provider per app via `ai_usage_log.provider` column

---

### Layer 1 -- Schema + Auth Handlers (needs Layer 0)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 5 | #402 Migrations: crm_contacts, crm_companies, crm_projects, crm_contact_company | 3 | #390 |
| 6 | #403 Migrations: crm_tags, crm_taggings, crm_search_index | 2 | #390 |
| 7 | #404 Auth handlers: signup, login, MFA verify, password reset, email verify, token refresh | 8 | #390 |

**Points:** 13

**Details for #402:**
```sql
-- 001_core_tables.sql (in scr database)
CREATE TABLE IF NOT EXISTS crm_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    email           TEXT,               -- encrypted via brickos-crypto
    name            TEXT NOT NULL,
    phone           TEXT,               -- encrypted
    role            TEXT,
    notes           TEXT,               -- encrypted
    lead_stage      TEXT DEFAULT 'new',
    first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
    interaction_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON crm_contacts(org_id);

CREATE TABLE IF NOT EXISTS crm_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    name            TEXT NOT NULL,
    domain          TEXT,
    website         TEXT,
    notes           TEXT,               -- encrypted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, domain)
);

CREATE TABLE IF NOT EXISTS crm_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT DEFAULT '#6366f1',
    notes           TEXT,               -- encrypted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_contact_company (
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
    role_title      TEXT,
    is_primary      BOOLEAN DEFAULT false,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    PRIMARY KEY (contact_id, company_id)
);
```

**Details for #403:**
```sql
-- 002_tags_and_search.sql (in scr database)
CREATE TABLE IF NOT EXISTS crm_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    name        TEXT NOT NULL,
    color       TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS crm_taggings (
    tag_id      UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_taggings_entity ON crm_taggings(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS crm_search_index (
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    org_id          UUID NOT NULL,
    locale          TEXT NOT NULL DEFAULT 'en',
    title           TEXT NOT NULL,
    subtitle        TEXT,
    snippet         TEXT,
    url_path        TEXT NOT NULL,
    category_weight REAL NOT NULL DEFAULT 1.0,
    tsv_document    tsvector NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, org_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_crm_search_tsv ON crm_search_index USING GIN(tsv_document);
CREATE INDEX IF NOT EXISTS idx_crm_search_org ON crm_search_index(org_id, entity_type);
```

**Details for #404 (REWRITTEN -- full auth handlers, not just middleware):**

CRM needs the complete auth stack, writing to the platform DB through PlatformPool. Port from SHI's `handlers/auth.rs` pattern:

**Endpoints:**
- `POST /api/v1/auth/signup` -- create user in platform DB (users, user_preferences, user_profile, user_licenses, refresh_tokens, email_verifications)
- `POST /api/v1/auth/login` -- verify credentials, check email_verified, handle MFA, issue JWT + refresh token
- `POST /api/v1/auth/login/mfa` -- verify TOTP code or recovery code
- `POST /api/v1/auth/verify-email` -- mark email verified in platform DB
- `POST /api/v1/auth/forgot-password` -- create reset token, send email via brickos-email
- `POST /api/v1/auth/reset-password` -- verify token, update password_hash
- `POST /api/v1/auth/refresh` -- refresh JWT from refresh_token
- `POST /api/v1/auth/logout` -- revoke refresh token
- `GET  /api/v1/auth/me` -- return current user profile

**Platform DB writes (all via PlatformPool):**
- INSERT: users, user_preferences, user_profile, user_licenses, license_events, refresh_tokens, email_verifications, newsletter_subscribers
- UPDATE: users (last_login_at, email_verified, password_hash), email_verifications (used_at)
- DELETE: refresh_tokens (on logout/revoke)

**Password hashing:** `brickos_auth::password::hash()` / `verify()` (Argon2)
**JWT:** `brickos_auth::jwt::create()` / `verify()` with `SCR_JWT_SECRET`
**MFA:** `brickos_auth::mfa::verify_totp()` with user_mfa table
**Email:** `brickos_email::send_verification()` / `send_password_reset()`

---

### Layer 2 -- Middleware + Encryption (needs Layer 1)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 8 | #414 Auth middleware + org-scoping (JWT verify on protected routes, inject AuthContext) | 3 | #404 |
| 9 | #405 Per-field encryption setup (brickos-crypto Encryptor for email, phone, notes) | 3 | #402 |

**Points:** 6

**Details for #414 (split from old #404 -- middleware only, not auth handlers):**
- Actix-web middleware that runs on all `/api/v1/*` routes except `/api/v1/auth/*`
- Extracts Bearer token, verifies via `brickos_auth::jwt::verify()`
- Fetches User + OrgMember from platform pool
- Injects `AuthContext { user_id, org_id, role }` into request extensions
- All CRM handlers extract AuthContext and filter by `org_id`
- Returns 401 for missing/invalid token
- Org A's user cannot see org B's data (returns empty, not 403)

**Details for #405:**
- Init `brickos_crypto::Encryptor` from `SCR_ENCRYPTION_KEY` env var
- Encrypt on write: email, phone, notes -> `"v1:{iv}:{ciphertext}"`
- Decrypt on read: before returning in API response
- Admin endpoints must also decrypt (per feedback)
- NULL values remain NULL (don't encrypt empty fields)
- Missing encryption key prevents API startup (fail fast)

---

### Layer 3 -- Core CRUD (needs Layer 2)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 10 | #406 Contact CRUD: list, create, get, update, delete + frontend pages | 5 | #414, #405 |
| 11 | #407 Company CRUD: list, create, get, update, delete + frontend pages | 3 | #414, #405 |
| 12 | #408 Project CRUD: list, create, get, update, delete + frontend pages | 3 | #414, #405 |

**Points:** 11

**Details for #406:**
- `GET    /api/v1/contacts`          -- list (paginated, sortable by name/last_seen/interaction_count)
- `POST   /api/v1/contacts`          -- create (validate email uniqueness per org)
- `GET    /api/v1/contacts/:id`      -- detail (includes companies, tags, project assignments)
- `PUT    /api/v1/contacts/:id`      -- update
- `DELETE /api/v1/contacts/:id`      -- soft delete or hard delete
- Frontend: contact list (card grid), contact detail page, create/edit form
- All PII fields encrypted/decrypted via brickos-crypto
- Update search_index on create/update/delete

**Details for #407:**
- `GET    /api/v1/companies`         -- list (paginated, sortable)
- `POST   /api/v1/companies`         -- create (unique domain per org)
- `GET    /api/v1/companies/:id`     -- detail (includes member contacts via junction)
- `PUT    /api/v1/companies/:id`     -- update
- `DELETE /api/v1/companies/:id`     -- delete
- Frontend: company list, company detail with member contacts, create/edit form

**Details for #408:**
- `GET    /api/v1/projects`          -- list (paginated)
- `POST   /api/v1/projects`          -- create
- `GET    /api/v1/projects/:id`      -- detail (includes assigned contacts)
- `PUT    /api/v1/projects/:id`      -- update
- `DELETE /api/v1/projects/:id`      -- delete
- `POST   /api/v1/projects/:id/contacts` -- assign contact to project
- `DELETE /api/v1/projects/:id/contacts/:contact_id` -- unassign
- Frontend: project list with color indicators, project detail, assign contacts

---

### Layer 4 -- Cross-cutting (needs Layer 3)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 13 | #409 Universal tagging: tag CRUD + polymorphic tagging API + tag filter UI | 3 | #406, #407, #408 |
| 14 | #410 i18n: EN + DE content files, useContent() pattern, /api/v1/i18n/status endpoint | 2 | #391 |
| 15 | #415 Settings page: profile, security (MFA setup/disable, password change), account, data & privacy | 5 | #404, #391 |

**Points:** 10

**Details for #409:**
- `GET    /api/v1/tags`              -- list all org tags with usage counts
- `POST   /api/v1/tags`              -- create tag (lowercase, trimmed)
- `DELETE /api/v1/tags/:id`          -- delete tag (cascades taggings)
- `POST   /api/v1/tags/:id/assign`   -- `{ entity_type, entity_id }`
- `DELETE /api/v1/tags/:id/unassign` -- `{ entity_type, entity_id }`
- All list endpoints accept `?tags=vip,partner` query param for filtering
- Frontend: tag cloud view, tag filter bar on all list pages, inline tag editor

**Details for #410:**
- Create `frontend/src/i18n/messages/en.json` and `de.json` with all CRM keys
- Categories: crm.nav.*, crm.contacts.*, crm.companies.*, crm.projects.*, crm.tags.*, crm.auth.*, crm.settings.*, crm.common.*, crm.errors.*
- Use `useContent()` hook pattern (per feedback)
- Proper UTF-8 umlauts in German (per feedback)
- `GET /api/v1/i18n/status` endpoint via `brickos_i18n::compute_status()`

**Details for #415 (NEW -- Settings page):**

Port SHI's settings architecture for CRM:

**Tab structure:**
1. **Profile** -- display name, email (read-only), country
2. **Security** -- MFA setup/disable (TOTP QR code, recovery codes), password change
3. **Account** -- subscription tier, license key (read from platform pool via brickos-billing)
4. **Data & Privacy** -- GDPR data export (JSON), anonymous data sharing toggle

**Security tab (SHI parity):**
- MFA setup: generate TOTP secret, show QR code, verify with 6-digit code, show 8 recovery codes
- MFA disable: require TOTP code to disable
- Recovery codes: copy to clipboard, download as text
- Password change: old password required, new password with strength indicator
- All writes go to platform pool (user_mfa, users tables)

**API endpoints:**
- `GET    /api/v1/settings/profile` -- read profile from platform pool
- `PUT    /api/v1/settings/profile` -- update display name, country
- `POST   /api/v1/settings/mfa/setup` -- generate TOTP secret + QR
- `POST   /api/v1/settings/mfa/verify` -- verify code, enable MFA, return recovery codes
- `DELETE /api/v1/settings/mfa` -- disable MFA (requires code)
- `POST   /api/v1/settings/mfa/recovery-codes` -- regenerate recovery codes
- `PUT    /api/v1/settings/password` -- change password (requires old password)
- `GET    /api/v1/settings/license` -- current tier info from platform pool
- `POST   /api/v1/settings/data-export` -- GDPR export (JSON)

---

### Layer 5 -- Deploy + Test (needs Layer 4)

| # | Issue | Pts | Blocked By |
|---|-------|-----|------------|
| 16 | #411 Docker compose (staging + prod) + deploy.sh + Dockerfile + staging deploy | 3 | All above |
| 17 | #412 Smoke tests + integration tests (auth, CRUD, tags, encryption, org-scoping) | 3 | All above |

**Points:** 6

**Details for #411:**
- `apps/data/sovereign-crm/ops/Dockerfile` -- multi-stage with cargo-chef
- COPY lines for ALL workspace crates including brickos-ai in planner + builder stages
- `docker-compose.staging.yml`: scr-staging-api (port 8085), scr-staging-web
- `docker-compose.prod.yml`: scr-api (port 8084), scr-web
- `deploy.sh` following SHI pattern (pre-flight, build --no-cache, push, up, smoke test, ntfy)
- Explicit `name:` in compose files (per feedback)

**Details for #412:**
- `tests/smoke.rs` -- routes exist, health endpoint 200, unauth returns 401
- `tests/integration.rs`:
  - Auth: signup -> verify email -> login -> get /me -> token works
  - Auth: login with MFA -> verify TOTP -> access granted
  - Contact CRUD: create -> read -> update -> delete
  - Company CRUD: create with domain uniqueness
  - Project CRUD: create -> assign contact -> unassign
  - Tags: create -> assign to contact -> filter by tag -> delete cascades
  - Encryption: verify DB stores encrypted, API returns decrypted
  - Org-scoping: user from org A gets empty list querying org B
- Use `actix_web::test`, snapshot with `insta`

---

## Summary

| Layer | Description | Issues | Points |
|-------|-------------|--------|--------|
| L0 | Scaffold + brickos-ai crate | #401, #390, #391, #413 | 20 |
| L1 | Database schema + auth handlers | #402, #403, #404 | 13 |
| L2 | Auth middleware + encryption | #414, #405 | 6 |
| L3 | Core CRUD (contacts, companies, projects) | #406, #407, #408 | 11 |
| L4 | Tags + i18n + settings | #409, #410, #415 | 10 |
| L5 | Deploy + test | #411, #412 | 6 |
| **Total** | | **17 issues** | **66 pts** |

---

## Critical Path

```
Day 1-3: Scaffold (L0)
  #401 DB creation              [2 pts]  parallel
  #390 API crate scaffold       [5 pts]  parallel
  #391 Frontend base UI         [8 pts]  parallel
  #413 brickos-ai crate         [5 pts]  parallel
    |
    v
Day 4-5: Schema + Auth (L1)
  #402 Core table migrations    [3 pts]  parallel with #403
  #403 Tags + search migrations [2 pts]  parallel with #402
  #404 Auth handlers (signup, login, MFA, reset) [8 pts]
    |
    v
Day 6: Middleware + Crypto (L2)
  #414 Auth middleware + org-scoping [3 pts]  parallel with #405
  #405 Per-field encryption         [3 pts]  parallel with #414
    |
    v
Day 7-9: Core CRUD (L3)
  #406 Contact CRUD  [5 pts]  parallel
  #407 Company CRUD  [3 pts]  parallel
  #408 Project CRUD  [3 pts]  parallel
    |
    v
Day 10-11: Cross-cutting (L4)
  #409 Universal tagging  [3 pts]  parallel
  #410 i18n (EN + DE)     [2 pts]  parallel
  #415 Settings page      [5 pts]  parallel (only needs #404 + #391)
    |
    v
Day 12: Deploy + Test (L5)
  #411 Docker + staging deploy  [3 pts]
  #412 Smoke + integration tests [3 pts]
```

**Parallel tracks:**
- L0: All four issues can run in parallel (DB, API, frontend, brickos-ai)
- L1: #402 and #403 parallel; #404 starts once #390 is done
- L2: #414 and #405 in parallel
- L3: All three CRUD issues in parallel
- L4: #415 only needs #404 + #391, can start earlier than #409/#410
- brickos-ai crate (#413) is independent -- can be developed anytime in L0

---

## Not In Scope (Future Sprints)

These Design 017 features are explicitly deferred:

- Email ingestion pipeline (camera-to-CRM) -- Phase 2 (uses brickos-ai vision)
- Meeting intelligence (audio recording, Whisper transcription) -- Phase 3
- Quick capture mode (photo/audio/text inbox) -- Phase 4
- Relationship graph (Cytoscape.js) -- Phase 5
- Web profile enrichment (LinkedIn, GitHub, NOSTR) -- Phase 2
- Lead pipeline Kanban view -- Phase 4
- Smart lists (saved filters) -- Phase 2
- vCard import/export -- Phase 2
- SHI migration to brickos-ai (separate sprint, decouple from CRM)
- Platform GUI CRM tab -- Phase 6

---

## Definition of Done

- [x] `scr` database created on staging with all tables
- [ ] API starts with two-pool architecture (platform read-write + app read-write)
- [ ] User can register, verify email, and log in to CRM
- [ ] MFA setup and verification works (TOTP + recovery codes)
- [ ] Password reset flow works end-to-end
- [ ] Navbar shows logo, user name, theme toggle, language selector, top nav menu
- [ ] Settings page: profile, security (MFA), account, data & privacy
- [ ] Brand-aware login (sovereigncrm.io vs brickos.io)
- [ ] Auth middleware verifies JWT and scopes CRM data by org_id
- [ ] PII fields encrypted at rest via brickos-crypto
- [ ] Contact CRUD works end-to-end (API + frontend)
- [ ] Company CRUD works end-to-end (API + frontend)
- [ ] Project CRUD works end-to-end with contact assignment
- [ ] Universal tagging works across all entity types
- [ ] All UI strings in EN + DE via useContent()
- [ ] Dark theme enforced, no white backgrounds
- [ ] brickos-ai crate: AiProvider trait + Anthropic + Ollama implementations
- [ ] brickos-ai fallback chain configurable via app_settings
- [ ] Smoke + integration tests pass (auth + CRUD + encryption + org-scoping)
- [ ] Docker images build (sovereignbrick/scr-api, scr-web)
- [ ] Staging deployed and accessible
