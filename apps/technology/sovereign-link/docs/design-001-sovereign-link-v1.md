# Design: Sovereign Link v1.0

**Date:** 2026-04-06
**Status:** Draft
**Parent spec:** `apps/health/sovereign-health/docs/project-files/design/024-url-shortener-service.md`
**Goal:** Standalone URL shortener with NOSTR + email login, deployable via Docker/binary/Start9

---

## 1. Context

Sovereign Link already runs in production as part of the Sovereign Health API (platform mode), providing affiliate URL shortening for `brickos.io/r/*`. This design specifies the **standalone mode** -- a self-contained URL shortener that can be deployed independently.

### What exists today (DO NOT BREAK)
- Affiliate link shortening: `brickos.io/r/sha3f2c1b9` -> `app.sovereignhealth.io/?ref=a3f2c1b9`
- QR code generation: `brickos.io/r/{code}.qr`
- Click analytics (privacy-preserving: hashed IPs, no user agents)
- Vanity codes for Horizon+ users
- Campaign links for admin
- Integrated into Sovereign Health API on port 8080

### What v1.0 adds (standalone mode)
- Independent deployment (Docker, binary, Start9)
- NOSTR NIP-98 login (passwordless)
- Email + password login (traditional)
- SQLite storage (no PostgreSQL dependency)
- Embedded web UI (server-rendered, no React)
- NOSTR NIP-89 app listing (discoverable via NOSTR clients)
- Start9 package (.s9pk)

---

## 2. Functional Requirements

### 2.1 Core URL Shortening

| ID | Requirement | Priority |
|---|---|---|
| F-01 | Create short link with auto-generated 6-char code | MUST |
| F-02 | Create short link with custom vanity code (3-30 chars) | MUST |
| F-03 | Redirect: `GET /{code}` returns 301 to target URL | MUST |
| F-04 | QR code: `GET /{code}.qr` returns PNG | MUST |
| F-05 | Click tracking: count, referrer domain, country code (from CF header) | MUST |
| F-06 | Click privacy: SHA256(IP + code + date) hash, daily rotation, no raw IP | MUST |
| F-07 | Link CRUD: create, update target URL, deactivate, delete | MUST |
| F-08 | Link expiry: optional `expires_at` timestamp | SHOULD |
| F-09 | Bulk import/export: JSON format | SHOULD |
| F-10 | Link preview: title, description, tags metadata | COULD |

### 2.2 Authentication

Three auth methods, user chooses at login:

| ID | Requirement | Priority |
|---|---|---|
| A-01 | **Email + password** login (traditional) | MUST |
| A-02 | **NOSTR NIP-98** login (keypair-based, passwordless) | MUST |
| A-03 | **API key** for headless/script access | MUST |
| A-04 | Session management (JWT tokens, 24h expiry) | MUST |
| A-05 | Account creation via email (with verification) | MUST |
| A-06 | Account creation via NOSTR (auto-create on first NIP-98 auth) | MUST |
| A-07 | Link email + NOSTR accounts (same user, two login methods) | SHOULD |
| A-08 | MFA (TOTP) for email accounts | COULD |

#### NOSTR NIP-98 Login Flow

```
1. User clicks "Login with NOSTR"
2. Frontend generates a challenge: random nonce + timestamp
3. User signs the challenge with their NOSTR private key (via NIP-07 browser extension or manual nsec)
4. Frontend sends signed event to backend: POST /auth/nostr
   {
     "event": {
       "kind": 27235,  // NIP-98 HTTP Auth
       "created_at": 1234567890,
       "tags": [
         ["u", "https://link.brickos.io/auth/nostr"],
         ["method", "POST"],
         ["payload", "<sha256 of request body>"]
       ],
       "content": "",
       "pubkey": "<user's public key>",
       "sig": "<signature>"
     }
   }
5. Backend verifies:
   - Event kind is 27235
   - URL tag matches our endpoint
   - Created_at is within 60 seconds
   - Signature is valid for pubkey
6. Backend looks up user by pubkey:
   - Exists: issue JWT session token
   - New: create user account with pubkey as identifier, issue JWT
7. Return JWT token to frontend
```

#### Email Login Flow (standard)

```
1. POST /auth/register { email, password }
2. Email verification link sent
3. POST /auth/login { email, password } -> JWT token
4. Standard JWT refresh cycle
```

#### SSO Pattern (future-ready)

The auth system is designed to be extensible for SSO (per design doc 012):
- Auth is a pluggable trait: `AuthProvider { verify() -> UserId }`
- Email auth implements `AuthProvider`
- NOSTR NIP-98 implements `AuthProvider`
- Future OIDC/SAML would implement `AuthProvider`
- User accounts can have multiple linked auth methods

This means Sovereign Link becomes the **testbed for BrickOS multi-auth**. Once NOSTR + email works here, porting to Sovereign Health is just adding the NOSTR `AuthProvider` implementation.

### 2.3 Web UI

Server-rendered HTML (askama templates), no JavaScript framework. Works with JS disabled.

| ID | Requirement | Priority |
|---|---|---|
| U-01 | Login page: email/password form + "Login with NOSTR" button | MUST |
| U-02 | Dashboard: list all user's links with click counts | MUST |
| U-03 | Create link: form with target URL, optional custom code | MUST |
| U-04 | Link detail: click stats (total, last 7d chart, top referrers) | MUST |
| U-05 | Settings: change password, link NOSTR key, generate API key | SHOULD |
| U-06 | Dark theme (BrickOS design tokens) | MUST |
| U-07 | Mobile responsive | MUST |
| U-08 | No JavaScript required for core functionality | MUST |
| U-09 | QR code display inline on link detail page | SHOULD |

### 2.4 API

REST API for programmatic access (same as platform mode, subset):

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/{code}` | None | 301 redirect + record click |
| `GET` | `/{code}.qr` | None | QR code PNG |
| `POST` | `/auth/register` | None | Create email account |
| `POST` | `/auth/login` | None | Email login -> JWT |
| `POST` | `/auth/nostr` | None | NOSTR NIP-98 login -> JWT |
| `GET` | `/api/v1/links` | JWT/API key | List user's links |
| `POST` | `/api/v1/links` | JWT/API key | Create link |
| `PUT` | `/api/v1/links/{id}` | JWT/API key | Update link |
| `DELETE` | `/api/v1/links/{id}` | JWT/API key | Delete link |
| `GET` | `/api/v1/links/{id}/stats` | JWT/API key | Click analytics |
| `GET` | `/api/v1/links/export` | JWT/API key | JSON export of all links |

### 2.5 NOSTR Distribution (NIP-89)

| ID | Requirement | Priority |
|---|---|---|
| N-01 | Publish NIP-89 "App Handler" event to NOSTR relays | MUST |
| N-02 | App listing: name, description, URL, supported NIPs | MUST |
| N-03 | Update listing on new releases | SHOULD |

NIP-89 event:
```json
{
  "kind": 31990,
  "tags": [
    ["d", "sovereign-link"],
    ["k", "27235"],
    ["web", "https://link.brickos.io", "web"],
    ["web", "https://github.com/sovereignbrick/brickos", "source"]
  ],
  "content": "{\"name\":\"Sovereign Link\",\"about\":\"Self-hosted URL shortener with NOSTR login. Privacy-first, no tracking, open source.\",\"website\":\"https://link.brickos.io\"}"
}
```

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NF-01 | Redirect latency | < 10ms p95 (hot path, no auth) |
| NF-02 | Startup time | < 2 seconds |
| NF-03 | Memory usage | < 50MB idle |
| NF-04 | Binary size | < 20MB (static, no runtime deps) |
| NF-05 | SQLite DB size | < 1MB per 10,000 links |
| NF-06 | No external dependencies at runtime | No Postgres, Redis, or external APIs required |
| NF-07 | Single binary deployment | `./sovereign-link` just works |
| NF-08 | Docker image size | < 30MB (Alpine-based) |
| NF-09 | Tor-aware | Accept .onion target URLs |
| NF-10 | AGPL-3.0 license | Open source, self-hostable |

---

## 4. Architecture

### 4.1 One Codebase, Two Modes

Per the parent spec (design 024), feature flags select the mode:

```
cargo build --features standalone   -> Sovereign Link binary
cargo build --features platform     -> BrickOS platform integration
```

v1.0 focuses on `standalone` mode only. Platform mode is already running in production.

### 4.2 Standalone Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Sovereign Link v1.0           │
                    │                                       │
   Internet ──────> │  actix-web HTTP server (port 8080)   │
                    │    ├── /{code}        -> redirect     │
                    │    ├── /{code}.qr     -> QR PNG       │
                    │    ├── /auth/*        -> login/reg    │
                    │    ├── /api/v1/*      -> REST API     │
                    │    ├── /dashboard     -> HTML UI      │
                    │    └── /static/*      -> CSS/icons    │
                    │                                       │
                    │  SQLite (data.db)                     │
                    │    ├── users                           │
                    │    ├── links                           │
                    │    ├── clicks                          │
                    │    └── sessions                        │
                    │                                       │
                    │  Config: config.toml or ENV vars       │
                    └─────────────────────────────────────┘
```

### 4.3 Database Schema (SQLite)

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- UUID
    email TEXT UNIQUE,                -- NULL if NOSTR-only account
    password_hash TEXT,               -- NULL if NOSTR-only account
    nostr_pubkey TEXT UNIQUE,         -- NULL if email-only account
    display_name TEXT,
    api_key TEXT UNIQUE,              -- auto-generated, for API access
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    title TEXT,
    tags TEXT,                        -- JSON array
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TEXT,                  -- ISO 8601
    click_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    visitor_hash TEXT,                -- SHA256(IP + code + date)
    referrer_domain TEXT,
    country_code TEXT,
    clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,         -- SHA256 of JWT
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_links_code ON links(code);
CREATE INDEX idx_links_user ON links(user_id);
CREATE INDEX idx_clicks_link ON clicks(link_id, clicked_at);
```

### 4.4 Auth Provider Trait

```rust
#[async_trait]
pub trait AuthProvider: Send + Sync {
    /// Verify credentials and return user ID
    async fn authenticate(&self, request: &AuthRequest) -> Result<AuthResult, AuthError>;
    /// Provider name for logging
    fn provider_name(&self) -> &'static str;
}

pub enum AuthRequest {
    EmailPassword { email: String, password: String },
    NostrNip98 { event: NostrEvent },
    ApiKey { key: String },
}

pub struct AuthResult {
    pub user_id: String,
    pub display_name: Option<String>,
    pub created: bool,  // true if account was auto-created (NOSTR first login)
}
```

This trait is the SSO-ready pattern from design 012. Adding OIDC or SAML later is just another `AuthProvider` implementation.

---

## 5. Deployment Options

### 5.1 Static Binary

```bash
# Download
curl -L https://github.com/sovereignbrick/brickos/releases/latest/download/sovereign-link-linux-amd64 -o sovereign-link
chmod +x sovereign-link

# Run
./sovereign-link
# Listening on http://0.0.0.0:8080
# Data stored in ./data.db
```

### 5.2 Docker

```bash
docker run -d \
  -p 8080:8080 \
  -v sovereign-link-data:/data \
  -e ADMIN_EMAIL=you@example.com \
  -e ADMIN_PASSWORD=your-password \
  sovereignbrick/sovereign-link:latest
```

### 5.3 Start9

One-click install from Start9 marketplace. Config via Start9 UI:
- Admin email/password
- Custom domain (optional)
- Tor hidden service (automatic via Start9)

### 5.4 Docker Compose (with reverse proxy)

```yaml
services:
  sovereign-link:
    image: sovereignbrick/sovereign-link:latest
    volumes:
      - link-data:/data
    environment:
      - BASE_URL=https://link.yourdomain.com
      - ADMIN_EMAIL=you@example.com
    restart: unless-stopped

volumes:
  link-data:
```

---

## 6. Configuration

```toml
# config.toml (or equivalent ENV vars)

[server]
host = "0.0.0.0"
port = 8080
base_url = "http://localhost:8080"  # Used for QR codes and NIP-89

[database]
path = "./data.db"  # SQLite file path

[auth]
jwt_secret = ""          # Auto-generated on first run if empty
jwt_expiry_secs = 86400  # 24 hours
allow_registration = true

[admin]
email = ""               # First user with this email gets admin
password = ""            # Initial admin password (change after first login)

[nostr]
enabled = true
relays = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"]
nip89_publish = true     # Publish app listing to relays on startup

[links]
default_code_length = 6
max_custom_code_length = 30
rate_limit_creates = 50  # Per user per day
rate_limit_redirects = 1000  # Per IP per minute
```

---

## 7. Compatibility with Existing Platform Mode

### What MUST NOT change
- `brickos.io/r/*` redirect routing (nginx -> Sovereign Health API)
- Affiliate link generation on user signup
- Click tracking in `short_link_clicks` table
- Vanity code management in admin panel
- Commission/payout reporting

### What standalone mode shares
- Redirect handler logic (same function, different DB backend)
- QR code generation (same `qrcode` crate)
- Click privacy model (same SHA256 hashing)
- REST API shape (same endpoints, different auth)

### Integration point
Standalone Sovereign Link instances can optionally report to the BrickOS platform (future):
```
Standalone -> POST https://api.brickos.io/v1/federation/clicks
```
This enables a network of sovereign link instances feeding analytics back to the platform. Not v1.0 scope.

---

## 8. Implementation Plan

### Sprint A: Core + Auth (2-3 days)

| Task | Pts |
|---|---|
| SQLite backend (LinkStore trait implementation) | 3 |
| Email + password auth (register, login, JWT) | 3 |
| NOSTR NIP-98 auth (verify, auto-create, JWT) | 5 |
| Auth provider trait (extensible for future SSO) | 2 |
| Embedded web UI: login, dashboard, create link | 5 |
| Docker single-container build | 2 |
| **Total** | **20** |

### Sprint B: Distribution (1-2 days)

| Task | Pts |
|---|---|
| Static binary release (GitHub Actions or manual) | 2 |
| NOSTR NIP-89 app listing publisher | 2 |
| Start9 package (.s9pk) | 3 |
| Documentation: README, self-hosting guide | 2 |
| **Total** | **9** |

### Sprint C: Polish + Port (1-2 days)

| Task | Pts |
|---|---|
| Click analytics UI (charts, top referrers) | 3 |
| API key management in settings | 2 |
| Link email + NOSTR accounts | 2 |
| Port NOSTR NIP-98 auth to Sovereign Health | 3 |
| **Total** | **10** |

---

## 9. Open Questions

- [ ] Should standalone mode support multiple users, or is it single-user by default?
  Recommendation: multi-user from day one (simple to implement, needed for Start9 family use)
- [ ] NOSTR key management: rely on NIP-07 browser extension only, or also support pasting nsec?
  Recommendation: NIP-07 primary, nsec paste as fallback (with strong warning about key exposure)
- [ ] Custom domains in standalone mode?
  Recommendation: not v1.0, add in v1.1 (config complexity)
- [ ] Should the standalone binary auto-update?
  Recommendation: no auto-update, show "new version available" banner (sovereign = user controls updates)

---

## 10. References

- Parent spec: `apps/health/sovereign-health/docs/project-files/design/024-url-shortener-service.md`
- SSO patterns: `apps/health/sovereign-health/docs/project-files/design/012-enterprise-sso.md`
- NOSTR NIP-98: https://github.com/nostr-protocol/nips/blob/master/98.md
- NOSTR NIP-89: https://github.com/nostr-protocol/nips/blob/master/89.md
- NOSTR NIP-07: https://github.com/nostr-protocol/nips/blob/master/07.md
- Existing code: `apps/technology/sovereign-link/`
- Start9 packaging: https://docs.start9.com/latest/developer-docs/
