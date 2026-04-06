# Sovereign Link -- Product Specification

**Version:** 1.0
**Date:** 2026-04-06
**Status:** Draft
**Codebase:** `apps/technology/sovereign-link/`

---

## 1. Product Vision

Sovereign Link is a **self-hosted URL shortener** that gives individuals and small organizations full control over their link infrastructure. It's the simplest BrickOS app -- a proving ground for sovereign deployment patterns (NOSTR login, Start9 packaging, static binary distribution) that will later be ported to the full Sovereign Health platform.

### Why it exists
1. **BrickOS needs a simple app** to test NOSTR auth, Start9 packaging, and distribution without risking the health platform
2. **Start9 users need link shortening** -- Tor .onion addresses are 56 chars, unusable on print/QR
3. **NOSTR users need sovereign infrastructure** -- existing URL shorteners are centralized
4. **BrickOS affiliate links need shortening** -- already running in production (`brickos.io/r/*`)

### What it is NOT
- Not a Bitly competitor (no analytics dashboards, no team management, no branded domains in v1)
- Not a link-in-bio tool
- Not a marketing platform

---

## 2. User Personas

### Persona 1: Start9 Node Runner ("Max")
- Runs a Start9 server at home with Bitcoin node, BTCPay, Nextcloud
- Wants short memorable links for his .onion services
- Shares links via QR codes on business cards
- Non-technical for web dev but comfortable with Start9 UI
- **Auth preference:** Tor hidden service address = access control. May use basic password for extra security.

### Persona 2: NOSTR Power User ("Lisa")
- Active on NOSTR, uses multiple clients (Damus, Amethyst, Primal)
- Wants to shorten links she shares in NOSTR notes
- Has NIP-07 browser extension (nos2x, Alby)
- Values: no tracking, no accounts, keypair-based everything
- **Auth preference:** NOSTR NIP-98 (keypair login, no email required)

### Persona 3: BrickOS Affiliate ("Dev")
- Promotes Sovereign Health via referral links
- Needs clean URLs for social media (`brickos.io/r/drclinic` not `app.sovereignhealth.io/?ref=a3f2c1b9`)
- Tracks click performance
- **Auth preference:** Email/password (already has BrickOS account)

### Persona 4: Self-Hoster ("Anna")
- Runs services on a VPS via Docker Compose
- Wants a lightweight link shortener alongside her other services
- Values: small Docker image, SQLite, no external dependencies
- **Auth preference:** Email/password or API key for automation

---

## 3. Deployment Modes

### 3.1 Standalone Mode (new in v1.0)

Self-contained binary or Docker container. No external dependencies.

| Property | Value |
|---|---|
| Database | SQLite (single file) |
| Auth | Email/password + NOSTR NIP-98 + API key |
| UI | Server-rendered HTML (askama), dark theme, no JS required |
| Config | `config.toml` or environment variables |
| Binary size | < 20MB |
| Memory | < 50MB |
| Dependencies | None (static binary, no runtime deps) |

### 3.2 Platform Mode (existing, unchanged)

Integrated into BrickOS platform (Sovereign Health API).

| Property | Value |
|---|---|
| Database | PostgreSQL (shared with SHI) |
| Auth | brickos-auth JWT (shared session) |
| UI | Part of SHI admin panel |
| Config | Part of SHI config |
| Routing | `brickos.io/r/*` via nginx |

### 3.3 Start9 Mode (standalone variant)

Sovereign Link packaged as a Start9 service (.s9pk).

| Property | Value |
|---|---|
| Database | SQLite (mounted volume) |
| Auth | All three methods available (email, NOSTR, API key) |
| Access | Tor hidden service (auto-configured by Start9) + optional LAN HTTPS |
| Config | Start9 UI config screen |
| Updates | Start9 marketplace |
| Discovery | Auto-detect sibling .onion services on the same Start9 (future) |

**Start9 Auth Model:**
Start9 is "bring your own auth" -- the OS provides secure transport (Tor + HTTPS) but each service manages its own login. The Tor .onion address itself is the primary access boundary (only someone who knows the address can connect). Sovereign Link implements its own auth on top of this:

- First user to register becomes admin
- Admin can enable/disable registration
- NOSTR login works via Tor (NIP-98 events are transport-agnostic)
- API keys work for automation/scripts

---

## 4. Feature Specification

### 4.1 Link Management

| Feature | Description | v1.0 |
|---|---|---|
| Create link | Auto-generate 6-char code or specify custom code | Yes |
| Custom codes | 3-30 chars, lowercase alphanumeric + hyphens | Yes |
| Redirect | `GET /{code}` -> 301 to target URL, `Cache-Control: private, max-age=0` | Yes |
| QR code | `GET /{code}.qr` -> PNG image | Yes |
| Edit link | Change target URL, title, tags | Yes |
| Deactivate | Soft-disable (redirect returns 410 Gone) | Yes |
| Delete | Permanent removal | Yes |
| Expiry | Optional auto-deactivation date | Yes |
| Bulk import | Upload JSON array of links | Yes |
| Bulk export | Download all links as JSON | Yes |
| Click count | Total clicks per link | Yes |
| Click details | Referrer domain, country code, daily breakdown | Yes |
| Click privacy | SHA256(IP + code + date), no raw IP stored | Yes |
| Tor targets | Accept .onion URLs as targets | Yes |
| Link preview | OG meta tags for social sharing | v1.1 |
| Custom domains | Bring your own domain | v1.1 |
| Reverse proxy | Proxy .onion targets via clearnet | v1.2 |

### 4.2 Authentication

#### 4.2.1 Email + Password

Standard registration and login flow:

```
POST /auth/register
  { email, password, display_name? }
  -> 201 Created (email verification optional in standalone)

POST /auth/login
  { email, password }
  -> 200 { token, user }

POST /auth/refresh
  Authorization: Bearer <token>
  -> 200 { token }
```

- Argon2id password hashing
- JWT tokens (24h expiry, configurable)
- First registered user auto-becomes admin
- Admin can disable further registration

#### 4.2.2 NOSTR NIP-98

Passwordless authentication using NOSTR keypair:

```
POST /auth/nostr
  {
    "event": {
      "kind": 27235,
      "created_at": <unix_timestamp>,
      "tags": [
        ["u", "https://link.example.com/auth/nostr"],
        ["method", "POST"]
      ],
      "content": "",
      "pubkey": "<hex_pubkey>",
      "id": "<event_id>",
      "sig": "<signature>"
    }
  }
  -> 200 { token, user, created: true|false }
```

Verification steps:
1. Event kind must be 27235
2. `u` tag must match our endpoint URL
3. `created_at` must be within 60 seconds of server time
4. Signature must be valid for pubkey (secp256k1)
5. Lookup user by pubkey:
   - Found: issue JWT
   - Not found: auto-create account, issue JWT

**Browser integration:**
- Primary: NIP-07 browser extension (nos2x, Alby, Nostr Connect)
  - `window.nostr.signEvent(event)` signs the NIP-98 event
- Fallback: paste nsec private key (with security warning)
  - Signing happens client-side in the browser, nsec never sent to server

#### 4.2.3 API Key

For headless/script access:

```
GET /api/v1/links
  Authorization: Bearer <api_key>
  -> 200 [links]
```

- Generated in user settings or on first login
- No expiry (revoke + regenerate to rotate)
- Scoped to the user who generated it

#### 4.2.4 Auth Provider Architecture (SSO-ready)

```rust
#[async_trait]
pub trait AuthProvider: Send + Sync {
    async fn authenticate(&self, req: &AuthRequest) -> Result<AuthResult, AuthError>;
    fn provider_name(&self) -> &'static str;
}

pub enum AuthRequest {
    EmailPassword { email: String, password: String },
    NostrNip98 { event: NostrEvent },
    ApiKey { key: String },
    // Future: Oidc { token: String }, Saml { assertion: String }
}
```

This extensible trait means:
- Adding OAuth/OIDC later = new AuthProvider implementation
- Adding SAML for enterprise = new AuthProvider implementation
- Sovereign Health can import the same trait + NOSTR implementation
- The pattern was designed in SSO design doc 012

### 4.3 Web Interface

Server-rendered HTML using askama templates. No JavaScript framework. Core functionality works with JS completely disabled.

#### Pages

| Route | Page | Auth |
|---|---|---|
| `/` | Public landing: "Sovereign Link - Self-hosted URL shortener" | None |
| `/login` | Login form (email tab + NOSTR tab) | None |
| `/register` | Registration form (if enabled) | None |
| `/dashboard` | Link list with click counts | Required |
| `/new` | Create link form | Required |
| `/links/{id}` | Link detail with stats chart | Required |
| `/settings` | User settings (password, NOSTR key, API key) | Required |
| `/{code}` | Redirect (301) | None |
| `/{code}.qr` | QR code image | None |
| `/{code}+` | Public click count (JSON) | None |

#### Design

- Dark theme using BrickOS design tokens (`--bk-bg: #09090b`, etc.)
- No Tailwind, no build step -- pure CSS variables in templates
- Responsive (mobile-friendly)
- Accessibility: WCAG AA contrast, keyboard navigation, semantic HTML
- Icons: inline SVG (no icon library dependency)

### 4.4 REST API

Full CRUD API for programmatic access. Same endpoints work for all three auth methods (JWT from email/NOSTR login, or API key).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/{code}` | None | 301 redirect |
| `GET` | `/{code}.qr` | None | QR code PNG |
| `GET` | `/{code}+` | None | Public click count |
| `POST` | `/auth/register` | None | Create email account |
| `POST` | `/auth/login` | None | Email login |
| `POST` | `/auth/nostr` | None | NOSTR login |
| `POST` | `/auth/refresh` | JWT | Refresh token |
| `GET` | `/api/v1/links` | JWT/Key | List user's links |
| `POST` | `/api/v1/links` | JWT/Key | Create link |
| `GET` | `/api/v1/links/{id}` | JWT/Key | Get link detail |
| `PUT` | `/api/v1/links/{id}` | JWT/Key | Update link |
| `DELETE` | `/api/v1/links/{id}` | JWT/Key | Delete link |
| `GET` | `/api/v1/links/{id}/stats` | JWT/Key | Click analytics |
| `GET` | `/api/v1/links/export` | JWT/Key | Export all links (JSON) |
| `POST` | `/api/v1/links/import` | JWT/Key | Import links (JSON) |
| `GET` | `/api/v1/me` | JWT/Key | Current user info |
| `PUT` | `/api/v1/me/settings` | JWT/Key | Update settings |
| `POST` | `/api/v1/me/api-key` | JWT | Generate/regenerate API key |
| `GET` | `/health` | None | Service health + version |

### 4.5 NOSTR Distribution (NIP-89)

On startup (if configured), publish an app listing event to NOSTR relays:

```json
{
  "kind": 31990,
  "tags": [
    ["d", "sovereign-link"],
    ["k", "1"],
    ["web", "<base_url>", "web"],
    ["web", "https://github.com/sovereignbrick/brickos", "source"]
  ],
  "content": "{\"name\":\"Sovereign Link\",\"about\":\"Self-hosted URL shortener with NOSTR login. Privacy-first, open source (AGPL-3.0).\",\"website\":\"<base_url>\",\"nips\":[98,89]}"
}
```

This makes the instance discoverable by NOSTR clients that support NIP-89 app recommendations.

---

## 5. Non-Functional Requirements

| Requirement | Target | Rationale |
|---|---|---|
| Redirect latency | < 10ms p95 | Hot path, no auth, must be fast |
| Page render | < 100ms | Server-rendered, no JS hydration |
| Startup time | < 2 seconds | Quick container restart |
| Memory usage | < 50MB idle | Run alongside other services |
| Binary size | < 20MB | Reasonable download size |
| Docker image | < 30MB | Alpine-based, musl static |
| SQLite DB | < 1MB per 10K links | Minimal disk footprint |
| Concurrent users | 100+ | Sufficient for personal/small org use |
| Uptime | 99.9% | Service restart < 2s |
| No external deps | Zero runtime dependencies | No Postgres, Redis, or APIs needed |
| Offline capable | Works without internet | All features work, except NOSTR relay comms |
| License | AGPL-3.0 | Open source, self-hostable |

---

## 6. Technical Architecture

### 6.1 Crate Structure

```
apps/technology/sovereign-link/
  Cargo.toml
  src/
    main.rs              # Entry: reads config, selects mode
    config.rs            # Config from TOML/ENV
    auth/
      mod.rs             # AuthProvider trait
      email.rs           # Email + password auth
      nostr.rs           # NIP-98 auth
      api_key.rs         # API key auth
      jwt.rs             # Token creation/verification
    handlers/
      redirect.rs        # GET /{code} -- SHARED (both modes)
      api.rs             # REST CRUD -- SHARED
      qr.rs              # QR generation -- SHARED
      web.rs             # Server-rendered HTML pages -- STANDALONE
      auth_routes.rs     # Login/register endpoints -- STANDALONE
    db/
      mod.rs             # LinkStore + UserStore traits
      sqlite.rs          # SQLite implementation -- STANDALONE
      postgres.rs        # PostgreSQL implementation -- PLATFORM
    models.rs            # Shared data types
    nostr/
      nip98.rs           # NIP-98 event verification
      nip89.rs           # NIP-89 app listing publisher
  templates/             # askama HTML templates
    base.html
    login.html
    dashboard.html
    link_detail.html
    new_link.html
    settings.html
  static/
    style.css            # BrickOS design tokens
    favicon.ico
  migrations/
    sqlite/
      001_initial.sql
    postgres/
      (uses existing SHI migrations)
  startos/
    manifest.yaml
    instructions.md
    icon.png
  Dockerfile
  config.example.toml
  README.md
```

### 6.2 Feature Flags

```toml
[features]
default = ["standalone"]
standalone = ["rusqlite", "askama", "argon2"]
platform = ["sqlx", "brickos-auth"]
```

- `standalone`: SQLite, embedded templates, own auth
- `platform`: PostgreSQL, brickos-auth JWT, no UI (uses SHI admin)
- Both: redirect handler, QR gen, REST API, click tracking

### 6.3 Database Traits

```rust
#[async_trait]
pub trait LinkStore: Send + Sync {
    async fn get_by_code(&self, code: &str) -> Result<Option<Link>>;
    async fn create(&self, new: NewLink) -> Result<Link>;
    async fn update(&self, id: &str, update: UpdateLink) -> Result<Link>;
    async fn delete(&self, id: &str) -> Result<()>;
    async fn list_by_user(&self, user_id: &str, limit: i64, offset: i64) -> Result<Vec<Link>>;
    async fn record_click(&self, link_id: &str, meta: ClickMeta) -> Result<()>;
    async fn get_stats(&self, link_id: &str, days: i32) -> Result<LinkStats>;
    async fn export_all(&self, user_id: &str) -> Result<Vec<Link>>;
    async fn import_batch(&self, user_id: &str, links: Vec<NewLink>) -> Result<usize>;
}

#[async_trait]
pub trait UserStore: Send + Sync {
    async fn get_by_id(&self, id: &str) -> Result<Option<User>>;
    async fn get_by_email(&self, email: &str) -> Result<Option<User>>;
    async fn get_by_nostr_pubkey(&self, pubkey: &str) -> Result<Option<User>>;
    async fn get_by_api_key(&self, key: &str) -> Result<Option<User>>;
    async fn create(&self, new: NewUser) -> Result<User>;
    async fn update(&self, id: &str, update: UpdateUser) -> Result<User>;
    async fn link_nostr(&self, user_id: &str, pubkey: &str) -> Result<()>;
}
```

---

## 7. Security

| Concern | Mitigation |
|---|---|
| Open redirect | Target URL validation: reject `javascript:`, `data:` schemes |
| Link enumeration | Rate limit `GET /{code}` (1000/min per IP) |
| Spam creation | Rate limit `POST /api/v1/links` (50/day per user) |
| Password brute force | Rate limit `/auth/login` (10/min per IP), Argon2id hashing |
| NOSTR replay attack | NIP-98 event `created_at` must be within 60 seconds |
| API key leakage | Keys displayed once on generation, stored as SHA256 hash |
| Click tracking privacy | No raw IPs, SHA256 daily-rotating hash, no user agents |
| XSS | askama auto-escapes all template variables |
| CSRF | SameSite=Strict cookies, no state-changing GET requests |

---

## 8. Sprint Plan

### Sprint A: Core + Auth (3 days, 20 pts)

| Day | Task | Pts |
|---|---|---|
| 1 AM | SQLite backend: LinkStore + UserStore traits + implementation | 3 |
| 1 AM | Database migrations (SQLite) | 1 |
| 1 PM | Email auth: register, login, JWT, password hashing | 3 |
| 1 PM | Config system (TOML + ENV) | 1 |
| 2 AM | NOSTR NIP-98 auth: event verification, auto-create, JWT | 5 |
| 2 PM | Web UI: login page (email + NOSTR tabs) | 2 |
| 2 PM | Web UI: dashboard (link list + click counts) | 2 |
| 3 AM | Web UI: create link + link detail with stats | 2 |
| 3 PM | Docker single-container build | 1 |
| 3 PM | Integration testing (all auth flows + CRUD) | - |

### Sprint B: Distribution (2 days, 9 pts)

| Day | Task | Pts |
|---|---|---|
| 1 AM | Static binary release (musl cross-compile) | 2 |
| 1 PM | NOSTR NIP-89 app listing publisher | 2 |
| 2 AM | Start9 package (.s9pk): manifest, config, health check | 3 |
| 2 PM | Documentation: README, self-hosting guide, Start9 guide | 2 |

### Sprint C: Polish + Port (2 days, 10 pts)

| Day | Task | Pts |
|---|---|---|
| 1 AM | Click analytics UI (daily chart, top referrers) | 3 |
| 1 PM | Settings page: password change, NOSTR key link, API key management | 2 |
| 1 PM | Account linking: connect email + NOSTR to same user | 2 |
| 2 | Port NOSTR NIP-98 auth to Sovereign Health (new AuthProvider) | 3 |

**Total: 39 pts across 7 days (3 + 2 + 2)**

---

## 9. Compatibility

### What MUST NOT break
- `brickos.io/r/*` affiliate link routing (nginx -> SHI API on port 8080)
- Existing `short_links` and `short_link_clicks` tables in SHI DB
- Affiliate click tracking and commission reporting
- Vanity code management in SHI admin panel

### How compatibility is maintained
- Standalone mode is a SEPARATE binary with its OWN SQLite database
- No shared state between standalone and platform modes
- The `LinkStore` trait ensures both modes implement the same interface
- If a standalone instance needs to federate with the platform, it's a future API integration (not v1.0)

---

## 10. Success Criteria

### v1.0 is successful if:
1. A user can `docker run` Sovereign Link and create their first short link within 60 seconds
2. A NOSTR user can login with NIP-07 extension without creating an email account
3. A Start9 user can install from the marketplace and shorten their first .onion address
4. The binary runs for 30 days without crashes or memory leaks
5. At least 3 NOSTR clients discover Sovereign Link via NIP-89

### Metrics to track:
- Docker Hub pulls
- GitHub release downloads
- Start9 marketplace installs
- NIP-89 recommendation events from other NOSTR users
- GitHub stars

---

## 11. Open Questions

- [x] **[DECIDED] Vanity codes:** Globally unique across the platform. Each vanity code must specify which app it applies to (add `app_key` column to vanity codes table). This ensures no collisions between apps while keeping codes unique at the platform level.
- [x] **[DECIDED] Redirect type:** 301 (permanent) with `Cache-Control: private, max-age=0`. The 301 signals permanence to clients, while the Cache-Control header ensures browsers re-check the server on each visit (supporting deactivation and analytics).
- [x] **[DECIDED] Start9 product name:** "Sovereign Link" with the header clearly mentioning "Part of the brickos.io platform". This maintains brand consistency while making the platform relationship visible.
- [x] **[DECIDED] Start9 Tor auto-discovery:** YES, integrate with Start9 Tor for auto-discovery of sibling .onion services on the same Start9 node. This enables Sovereign Link to detect and offer to shorten .onion addresses of other services running on the same host.
- [x] **[DECIDED] Custom domains (standalone):** YES, support custom domains (e.g., `ln.mydomain.com`). Users can point their own domain at the Sovereign Link instance for branded short URLs.
- [x] **[DECIDED] Reserve vanity codes:** YES, reserve common codes (health, wellness, bitcoin, btc, nostr, link, admin, api, auth, settings, dashboard, etc.) to prevent user squatting on platform-relevant terms.
