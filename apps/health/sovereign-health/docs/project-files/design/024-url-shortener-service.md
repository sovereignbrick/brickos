# Design: BrickOS Link — URL Shortener Service

**Issue:** [#151](https://github.com/sovereignbrick/brickos/issues/151)
**Status:** Draft
**Date:** 2026-03-23
**Related:** [013-affiliate-hierarchy.md](013-affiliate-hierarchy.md), [021-multi-tenant-platform-offering.md](021-multi-tenant-platform-offering.md)

## Problem

1. **Affiliate URLs are ugly:** `https://app.sovereignhealth.io/?ref=a3f2c1b9`
2. **Cross-app ambiguity:** same affiliate code, multiple BrickOS apps — where does the link go?
3. **Tor addresses are unusable:** `4ikzwwyopd5lpv7d2bxtmfddgwr2f3i4au3zevbdj4zbwurcckb7vsqd.onion`
4. **No self-hosted alternative:** YOURLS is PHP/MySQL — wrong stack for sovereign infrastructure

## Core Decisions

### Decision 1: One codebase, two deployment modes

There is ONE crate at `apps/technology/shortener/`. It compiles into two binaries via Cargo feature flags. Not two repos, not a shared library + two consumers. One codebase.

```
apps/technology/shortener/         ← ONE crate
│
├── cargo build --features platform    → brickos.io/r/ (our VPS)
│   Uses: Postgres, brickos-auth JWT, affiliate integration
│   Knows about: app prefixes, org hierarchy, commission reporting
│
└── cargo build --features standalone  → Sovereign Link (Start9/Docker)
    Uses: SQLite, basic auth or API key
    Knows about: links, clicks, QR codes. Nothing else.
```

Why not two codebases:
- Bug fixed once, both modes get it
- Redirect handler, QR gen, REST API, click tracking — all shared (~60% of code)
- One Cargo.lock, one CI pipeline, one test suite

Why not a shared crate + two binaries:
- Over-engineering. Feature flags achieve the same separation. Extract later only if the modes diverge so much that `#[cfg]` becomes painful.

### Decision 2: 2-char app prefix for auto codes, clean vanity codes

```
Auto-generated (every user, per app):
  brickos.io/r/sha3f2c1b9     → app.sovereignhealth.io/?ref=a3f2c1b9
  brickos.io/r/bta3f2c1b9     → app.btctracker.io/?ref=a3f2c1b9

Vanity (Horizon+ tier, user-chosen, globally unique):
  brickos.io/r/drclinic        → app.sovereignhealth.io/?ref=a3f2c1b9

Campaign (admin-created):
  brickos.io/r/btc-prague      → sovereignhealth.io/pricing?utm=btcprague
```

| Code type | Format | Length | App routing |
|-----------|--------|--------|-------------|
| Auto affiliate | `{2-char prefix}{8-char hash}` | 10 | Prefix = app (fast path, no DB lookup) |
| Vanity | `{3-30 char slug}` | 3-30 | DB lookup (`short_links.app_key`) |
| Campaign | `{slug}` | 3-50 | DB lookup |

Registered prefixes:

| Prefix | App | Domain |
|--------|-----|--------|
| `sh` | Sovereign Health | health |
| `bt` | BTC Tracker | finance |
| `bn` | Bitcoin Node | infrastructure |
| `lk` | BrickOS Link | infrastructure |

Redirect handler logic:
```
GET /r/{code}
1. code.len() == 10 AND code[0..2] matches known prefix?
   → Fast path: build target URL from app_prefixes table, no short_links lookup
2. Otherwise → DB lookup on short_links.code
3. Not found → 404
```

### Decision 3: Shortener layers on top of affiliate system, doesn't replace it

```
New flow:
  brickos.io/r/sha3f2c1b9                          ← shortener (new)
  → 301 → app.sovereignhealth.io/?ref=a3f2c1b9
  → referral-redirect.tsx sets sh_ref cookie         ← existing, unchanged
  → POST /api/affiliate/click                        ← existing, unchanged
  → User signs up → affiliate_conversions            ← existing, unchanged
  → Admin approves → affiliate_payouts               ← existing, unchanged
```

| Concern | Owned by | Stays where |
|---------|----------|-------------|
| Redirect + top-of-funnel clicks | Shortener | `short_links`, `short_link_clicks` |
| Cookie + attribution | Frontend | `referral-redirect.tsx` |
| Click dedup + rate limiting | Health API | `affiliate_clicks` (deprecate after 30 days) |
| Conversions | Health API (billing) | `affiliate_conversions` |
| Commissions + payouts | Health API | `affiliate_commission_rates`, `affiliate_payouts` |

BrickOS admin dashboard reads from BOTH: shortener for clicks, health API for conversions/revenue. Joined on `affiliate_code`.

### Decision 4: Start with routes in health API, extract at Phase 3

Phase 1-2: `short_links` table + handlers live in the existing Sovereign Health API. Nginx proxies `brickos.io/r/*` to port 8080.

Phase 3: extract to `apps/technology/shortener/` when second BrickOS app launches or when the shortener needs independent deployment.

The DB schema is platform-level from day one — no migration needed at extraction, just moving handlers.

## Data Model

### Table: `app_prefixes`

```sql
CREATE TABLE IF NOT EXISTS app_prefixes (
    prefix VARCHAR(2) PRIMARY KEY,
    app_key VARCHAR(50) NOT NULL,
    domain VARCHAR(30) NOT NULL,
    base_url TEXT NOT NULL,
    signup_path TEXT NOT NULL DEFAULT '/',
    is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO app_prefixes VALUES
    ('sh', 'sovereign-health', 'health', 'https://app.sovereignhealth.io', '/?ref='),
    ('bt', 'btc-tracker', 'finance', 'https://app.btctracker.io', '/?ref='),
    ('bn', 'bitcoin-node', 'infrastructure', 'https://node.brickos.io', '/?ref=');
```

### Table: `short_links`

```sql
CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    link_type VARCHAR(20) NOT NULL DEFAULT 'affiliate',  -- affiliate, vanity, campaign, generic

    -- Hierarchy
    domain VARCHAR(30) NOT NULL DEFAULT 'health',
    app_key VARCHAR(50) NOT NULL DEFAULT 'sovereign-health',

    -- Ownership
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    affiliate_code VARCHAR(8),

    -- Metadata
    title VARCHAR(100),
    tags TEXT[],

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
CREATE INDEX IF NOT EXISTS idx_short_links_domain_app ON short_links(domain, app_key);
CREATE INDEX IF NOT EXISTS idx_short_links_affiliate ON short_links(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_short_links_owner ON short_links(owner_user_id);
```

### Table: `short_link_clicks`

```sql
CREATE TABLE IF NOT EXISTS short_link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    referrer_domain VARCHAR(255),
    country_code VARCHAR(2),
    visitor_hash VARCHAR(64),
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_link_time
    ON short_link_clicks(short_link_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_time
    ON short_link_clicks(clicked_at);
```

### Auto-generation on user signup

```
1. users.affiliate_code = "a3f2c1b9"  (existing, unchanged)
2. INSERT INTO short_links (code, target_url, link_type, domain, app_key, affiliate_code)
   VALUES ('sha3f2c1b9', 'https://app.sovereignhealth.io/?ref=a3f2c1b9', 'affiliate', 'health', 'sovereign-health', 'a3f2c1b9')
```

When user activates for second app:
```
INSERT INTO short_links (code, ...) VALUES ('bta3f2c1b9', ...)
```

Same affiliate code, different prefix. Affiliate page shows all links grouped by app.

## Hierarchical Reporting (BrickOS Admin)

The 2-char prefix makes aggregation trivial:

```sql
SELECT LEFT(sl.code, 2) AS app, COUNT(c.id) AS clicks
FROM short_link_clicks c
JOIN short_links sl ON sl.id = c.short_link_id
WHERE sl.link_type = 'affiliate'
GROUP BY LEFT(sl.code, 2);
```

Full dashboard view:
```
BrickOS Platform Overview
                        Clicks    Conversions    Revenue     Commissions
All Apps                12,450    342            €8,550      €1,710
├── sh (Health)         11,200    310            €7,750      €1,550
│   ├── Affiliates       8,400    245            €6,125      €1,225
│   ├── Vanity             700     13              €325         €65
│   └── Campaigns        2,100     52            €1,300        €260
└── bt (Finance)         1,250     32              €800        €160

Top Affiliates (cross-app)
Code            Apps      Clicks   Conversions   Revenue
drclinic        sh         2,400    67            €1,675
sha3f2c1b9      sh,bt      1,100    28              €700
```

Conversion/revenue data comes from the existing `affiliate_conversions` table in the health API, joined on `affiliate_code`.

## API Endpoints

### Platform mode (Phase 1-2, in health API)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/r/{code}` | None | 301 redirect + record click |
| `GET` | `/r/{code}+` | None | Public click count (JSON) |
| `GET` | `/r/{code}.qr` | None | QR code PNG |
| `GET` | `/api/v1/links` | User | List user's short links |
| `POST` | `/api/v1/links` | User | Create short link (generic/vanity) |
| `PUT` | `/api/v1/links/{id}` | User | Update target URL or title |
| `DELETE` | `/api/v1/links/{id}` | User | Deactivate link |
| `GET` | `/api/v1/links/{id}/stats` | User | Click analytics for owned link |
| `GET` | `/api/v1/admin/links` | Admin | All links + hierarchical reporting |
| `POST` | `/api/v1/admin/links/campaign` | Admin | Create campaign links |

### Standalone mode (Sovereign Link)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/{code}` | None | 301 redirect + record click |
| `GET` | `/{code}.qr` | None | QR code PNG |
| `GET` | `/` | Basic | Dashboard (server-rendered HTML) |
| `GET` | `/new` | Basic | Create link form |
| `GET` | `/discover` | Basic | Start9 service auto-discovery |
| `GET/POST` | `/api/v1/links` | API key | REST CRUD |
| `GET` | `/api/v1/links/export` | API key | JSON backup of all links |

## Vanity Code Rules

- 3-30 characters, lowercase alphanumeric + hyphens
- No leading/trailing hyphens
- Must NOT start with a registered 2-char prefix followed by 8 hex chars (collision with auto codes)
- Reserved: `api`, `admin`, `health`, `finance`, `app`, `docs`, `status`, `new`, `discover`
- Horizon+ tier only (tier-gated)
- Globally unique (not per-app) — avoids confusion
- One vanity per app per user (can change, old code stays as redirect)

## Nginx Routing

```nginx
server {
    server_name brickos.io www.brickos.io;

    location /r/ {
        proxy_pass http://127.0.0.1:8080/r/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header CF-IPCountry $http_cf_ipcountry;
    }

    location / {
        # brickos.io website (future)
    }
}
```

## UI Changes

### Affiliate page (Sovereign Health frontend)

```
Your referral links:

Sovereign Health:
┌────────────────────────────────────┐
│  brickos.io/r/sha3f2c1b9    [Copy]│
└────────────────────────────────────┘

Custom vanity link (Horizon+):
┌────────────────────────────────────┐
│  brickos.io/r/[__________]  [Save]│
└────────────────────────────────────┘
```

### BrickOS admin panel (brickos.io/admin or dedicated)

Top-level dashboard aggregating all apps:
- Hierarchical tree view (platform > domain > app > link type)
- Click/conversion/revenue columns
- Filters: date range, app, link type, affiliate
- Campaign creation
- Affiliate performance ranking (cross-app)

This is the **master admin** — each app's own admin panel shows only its links.

## Standalone Product: Sovereign Link

### Scope: Single-node shortener

A Start9/Docker user runs one node with multiple services. Sovereign Link shortens addresses for those services. It does NOT need affiliates, commissions, multi-app hierarchy, or org model.

```
What Sovereign Link needs              What it does NOT need
──────────────────────                  ─────────────────────
Code → target redirect                 Affiliate system
QR code generation                     Commission tracking
Simple click counter                   Hierarchical reporting
Basic auth / API key                   Multi-app prefixes
SQLite (no Postgres)                   Organization model
Works with JS disabled                 Vanity marketplace
Tor-aware (.onion validation)          Campaign management
Start9 service auto-discovery          Payment/payout tracking
JSON export/backup
```

### Start9 Auto-Discovery (killer feature)

Start9 exposes installed services via its internal API. Sovereign Link scans and offers to create links:

```
Found 5 services on your node. Create short links?

Service          Onion Address          Code
BTCPay Server    4ikz...vsqd.onion     /btcpay
Nextcloud        7xbm...abc.onion      /cloud
Matrix/Synapse   m3kd...xyz.onion      /chat
Gitea            9pqr...mno.onion      /git
Vaultwarden      2hjk...def.onion      /vault

[Create All]
```

### Reverse Proxy Mode (clearnet gateway for Tor services)

Beyond shortening, Sovereign Link can act as a **clearnet gateway** to Tor hidden services. Three link modes:

| Mode | What happens | Visitor needs |
|------|-------------|---------------|
| **Redirect** | 301 to .onion address | Tor Browser |
| **Proxy (LAN)** | Fetches via Tor SOCKS, serves clearnet response | LAN access, regular browser |
| **Proxy (Public)** | Same, but exposed via tunnel | Just a browser, anywhere |

This solves the real Start9 pain: getting BTCPay Server on clearnet is hard (VPS + domain + SSL + nginx + Tor bridge). Sovereign Link becomes the **single ingress point**:

```
Internet → Tunnel → Sovereign Link → Tor SOCKS → BTCPay .onion
                                               → Nextcloud .onion
                                               → Matrix .onion
```

One tunnel, one SSL cert, one config — instead of per-service setup.

**Per-link mode selection in UI:**
```
Edit Link: /btcpay
  Code:    btcpay
  Target:  4ikz...vsqd.onion/btcpay
  Mode:    ○ Redirect (301 to .onion)
           ○ Proxy - LAN only
           ● Proxy - Public (via tunnel)
  Domain:  pay.mydomain.com
  SSL:     ● Auto (Let's Encrypt)  ○ Bring your own
```

**Handler implementation** — same function, different response:
```rust
match link.mode {
    LinkMode::Redirect => {
        HttpResponse::MovedPermanently()
            .insert_header(("Location", &link.target_url))
            .finish()
    }
    LinkMode::Proxy => {
        let response = tor_client.get(&link.target_url).await?;
        proxy_response(response, &link).await  // rewrite URLs, serve clearnet
    }
}
```

### Tunnel Options (user's choice, not ours)

Sovereign Link doesn't provide the tunnel — it works with whatever the user configures:

| Option | Cost | Sovereignty | Setup |
|--------|------|-------------|-------|
| Cloudflare Tunnel | Free | Low (CF sees traffic) | Easy |
| VPS + WireGuard | $5/mo | High | Medium |
| **BrickOS Relay** | $3/mo | Medium (we run relay) | Easy |
| SSH reverse tunnel | Free (with VPS) | High | Medium |

**BrickOS Relay** (future revenue opportunity): managed WireGuard endpoints. User gets `*.relay.brickos.io` subdomain or brings their own domain. Traffic encrypted end-to-end. Included in Horizon tier as cross-sell. Optional — Sovereign Link works without it.

### Future: Hub mode (not v1)

Single-node covers 95% of Start9 users. Hub mode (multiple users sharing a shortener, family/small org) is a config flag away — add basic user accounts. Not needed for v1.

## One Codebase, Not Two

There is ONE crate at `apps/technology/shortener/`. Feature flags select the deployment mode. Not two repos, not a shared library + two consumers.

**Why not two codebases:** Bug fixed once → both modes get it. Redirect handler, QR gen, REST API, click tracking are all shared (~60% of code). One Cargo.lock, one CI pipeline.

**Why not a shared crate + two binaries:** Over-engineering. Feature flags achieve the same separation with less indirection. Extract only if modes diverge so much that `#[cfg]` becomes painful.

## Crate Architecture

```
apps/technology/shortener/
├── Cargo.toml
├── src/
│   ├── main.rs                  # Entry: reads config, selects mode
│   ├── config.rs                # Platform vs standalone config
│   ├── handlers/
│   │   ├── redirect.rs          # SHARED: GET /{code} hot path
│   │   ├── api.rs               # SHARED: CRUD REST API
│   │   ├── qr.rs                # SHARED: QR code generation
│   │   ├── stats.rs             # SHARED: click analytics
│   │   ├── platform_admin.rs    # PLATFORM: cross-app reporting, BrickOS admin
│   │   ├── affiliate.rs         # PLATFORM: prefix routing, affiliate integration
│   │   ├── standalone_ui.rs     # STANDALONE: server-rendered HTML dashboard
│   │   ├── discovery.rs         # STANDALONE: Start9 service auto-discovery
│   │   └── proxy.rs             # STANDALONE: reverse proxy mode (Tor → clearnet)
│   ├── db/
│   │   ├── mod.rs               # LinkStore trait (shared interface)
│   │   ├── postgres.rs          # PLATFORM: full schema
│   │   └── sqlite.rs            # STANDALONE: simplified schema
│   └── tor.rs                   # STANDALONE: SOCKS proxy for .onion validation
├── migrations/
│   ├── postgres/                # Platform: short_links, short_link_clicks, app_prefixes
│   └── sqlite/                  # Standalone: links, clicks (simplified)
├── templates/                   # askama: standalone HTML UI
├── static/                      # Minimal CSS (dark theme, no JS)
├── Dockerfile
├── startos/
│   ├── manifest.yaml
│   ├── instructions.md
│   └── icon.png
└── README.md
```

### DB Trait Pattern

Both modes implement the same trait — handlers don't know which backend:

```rust
#[async_trait]
pub trait LinkStore: Send + Sync {
    async fn get_by_code(&self, code: &str) -> Option<ShortLink>;
    async fn create(&self, link: NewLink) -> Result<ShortLink>;
    async fn record_click(&self, link_id: Uuid, meta: ClickMeta) -> Result<()>;
    async fn list_by_owner(&self, owner_id: Uuid) -> Vec<ShortLink>;
    async fn stats(&self, link_id: Uuid, range: DateRange) -> LinkStats;
}

// postgres.rs implements LinkStore with full schema + joins to affiliate tables
// sqlite.rs implements LinkStore with simplified schema
```

### Feature Flag Matrix

| Feature | `--features platform` | `--features standalone` |
|---------|----------------------|------------------------|
| Postgres backend | Yes | No |
| SQLite backend | No | Yes |
| brickos-auth JWT | Yes | No |
| Basic auth / API key | No | Yes |
| 2-char prefix routing | Yes | No |
| Cross-app reporting | Yes | No |
| Affiliate integration | Yes | No |
| Embedded HTML UI | No | Yes |
| Start9 auto-discovery | No | Yes |
| Tor SOCKS proxy | No | Yes |
| Reverse proxy mode | No | Yes |
| Tunnel integration | No | Yes |
| SSL / Let's Encrypt | No | Yes |
| QR codes | Yes | Yes |
| REST API | Yes | Yes |
| Redirect handler | Yes | Yes |

### Build Commands

```bash
# Platform binary (our VPS — compiles with brickos-auth, Postgres)
cargo build -p brickos-shortener --features platform

# Standalone binary (Start9/Docker — compiles with SQLite, askama, tor)
cargo build -p brickos-shortener --features standalone

# Dev (both features for full test coverage)
cargo test -p brickos-shortener --features "platform,standalone"
```

### Start9 Package Spec

```yaml
id: sovereign-link
title: Sovereign Link
version: 1.0.0
description: Self-hosted URL shortener for Tor, Nostr, and local services
license: AGPL-3.0
wrapper-repo: https://github.com/sovereignbrick/sovereign-link-startos
upstream-repo: https://github.com/sovereignbrick/brickos

interfaces:
  main:
    name: Web Interface
    description: Short link management UI
    tor-config:
      port-mapping:
        80: 8080
    lan-config:
      443:
        ssl: true
        internal: 8080

dependencies: {}
```

## Additional Considerations

### QR Codes
`/r/{code}.qr` (platform) or `/{code}.qr` (standalone) returns PNG. Use `qrcode` Rust crate. Critical for clinics (print materials) and Start9 users (physical access to services).

### Link Previews (OG meta)
301 redirects fire before social platforms can scrape OG tags. Options:
- Pure 301 (fast, no preview) — start here
- HTML page with OG tags + JS redirect (slower, rich preview) — add if requested

### Abuse Prevention
- Rate limit creation: 10/day regular users, unlimited admin
- Rate limit redirects: 100/min per IP per code
- Target URL validation: platform mode restricts to `*.brickos.io` / `*.sovereignhealth.io` — no open redirect. Standalone mode allows any target.

### GDPR
- `short_link_clicks` stores no PII (no IP, no user agent)
- `visitor_hash` = SHA256(IP + code + date), daily rotation, one-way
- `country_code` from Cloudflare CF-IPCountry header only
- Affiliate data export includes short links + click counts

### Multi-language
Auto-detect `Accept-Language` header, append `?locale=de` to target URL if target app supports i18n.

## Shared Design System (for standalone UI)

The standalone UI uses server-rendered HTML (askama templates, no React). To maintain BrickOS visual identity:

**Design tokens** are extracted to `packages/tokens/brickos-tokens.css`:
```css
:root {
  --bk-bg: #09090b;
  --bk-fg: #fafafa;
  --bk-muted: #a1a1aa;
  --bk-border: #27272a;
  --bk-card: #18181b;
  --bk-accent: #22d3ee;
  --bk-success: #22c55e;
  --bk-warning: #eab308;
  --bk-danger: #ef4444;
  --bk-radius: 0.625rem;
  --bk-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}
```

This same CSS is consumed by:
- **React apps** (via `@brickos/ui` package + Tailwind) — the OKLch equivalents
- **Server-rendered apps** (via `<link>` to the CSS file) — hex for simplicity
- **askama templates** — dark theme only, same visual language

The Sovereign Link standalone UI uses this token file directly — no Tailwind, no build step, just CSS variables in askama templates.

## Effort Estimate

| Phase | Points | When |
|-------|--------|------|
| Phase 1: Core redirect + affiliate links (in health API) | 5 pts | Sprint 010 |
| Phase 2: Campaigns + BrickOS admin + QR | 5 pts | Sprint 010 (if time) |
| Phase 3: Extract to `apps/technology/shortener/` | 8 pts | When second app launches |
| Phase 4a: Standalone shortener + Start9 package | 5 pts | After Phase 3 |
| Phase 4b: Reverse proxy mode (LAN clearnet) | 5 pts | After Phase 4a |
| Phase 4c: Tunnel integration + custom domains + SSL | 3 pts | After Phase 4b |
| Phase 5: BrickOS Relay managed service (optional revenue) | 5 pts | Business decision |

## Open Questions

- [ ] Vanity codes: globally unique or per-app? (Recommendation: global — avoids confusion)
- [ ] Redirect: 301 or 302? (Recommendation: 301 with `Cache-Control: private, max-age=0`)
- [ ] Start9 product name: "Sovereign Link" or "BrickOS Link"?
- [ ] Should Start9 package integrate with Start9's Tor for auto-discovery of sibling service onion addresses?
- [ ] Should standalone support custom domains (e.g., `ln.mydomain.com`)?
- [ ] Reserve common vanity codes (health, wellness, bitcoin) for future?

## References

- [013-affiliate-hierarchy.md](013-affiliate-hierarchy.md) — Commission model and org integration
- [021-multi-tenant-platform-offering.md](021-multi-tenant-platform-offering.md) — Multi-app platform structure
- YOURLS (https://yourls.org/) — Inspiration, not implementation
- `api/src/handlers/affiliate.rs` — Current affiliate handler (1004 lines)
- `api/migrations/20260312000051_affiliate_system.sql` — Affiliate schema
- `api/migrations/20260316000076_organizations.sql` — Org model with app_roles
- `crates/brickos-startos/` — Existing Start9 integration crate (stub)
- `apps/technology/bitcoin-node/` — Existing infra app (packaging precedent)
- Old spec: `docs/project-files/design/old-design/old specs/E-26_PWA_APP.md` (references Tor shortening)
