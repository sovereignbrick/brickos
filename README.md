<!--
============================================================================
 SOVEREIGN BRICK OU -- BrickOS Platform

 Building sovereignty, brick by brick.

 Your apps. Your data. Your server.

 https://brickos.io/
 AGPL-3.0 -- https://github.com/sovereignbrick
============================================================================
-->

# BrickOS

**Building sovereignty, brick by brick.**

Privacy-first software platform for people who want control over their data. Cloud SaaS with a self-hosted option -- every app can run on your own hardware via StartOS, works over Tor, and ships as a PWA.

## Philosophy

BrickOS exists because your most sensitive data -- health records, financial history, personal communications -- shouldn't live on servers you don't control. The platform is built on five principles:

1. **Sovereign-first** -- You own your data. Export it, self-host it, delete it. No vendor lock-in, no data hostage.
2. **Brick architecture** -- Modular apps composed from shared platform crates and packages. Each "brick" is independent but stronger together.
3. **Privacy by design** -- AES-256-GCM encryption at rest, Row-Level Security in PostgreSQL, field-level encryption for health data. No third-party analytics, no tracking pixels.
4. **Self-hostable** -- Every app runs in Docker on any Linux machine -- your VPS, a Raspberry Pi via Start9, or your laptop. The cloud version is a convenience, not a requirement.
5. **Open source core** -- AGPL-3.0 licensed. Read the code, audit the security, fork it. Commercial licenses available for organizations that need proprietary modifications.

```
┌─────────────────────────────────────────────────────────┐
│  L1: BrickOS Platform                                    │
│  Shared crates (auth, crypto, billing, email, db)        │
│  Defines tiers, features, pricing -- the sovereign        │
│  authority for all apps.                                 │
├─────────────────────────────────────────────────────────┤
│  L2: Organizations                                       │
│  Personal accounts, clinics, enterprises.                │
│  Subscribe per product. Billing anchor.                  │
├─────────────────────────────────────────────────────────┤
│  L3: Apps                                                │
│  Health (live) · Finance (planned) · Infrastructure      │
│  Each app enforces its product's tier config and         │
│  runs independently on any deployment target.            │
└─────────────────────────────────────────────────────────┘
```

## Products

| Product | Domain | Status | Links |
|---------|--------|--------|-------|
| **Sovereign Health Intelligence** | Health | Live (v0.28.0) | [app.sovereignhealth.io](https://app.sovereignhealth.io) |
| **Sovereign Link** | Infrastructure | Live | URL shortener + QR codes ([brickos.io/r/](https://brickos.io)) |
| **Sovereign Proposal Platform** | Infrastructure | Design | Decentralized governance on Nostr + Bitcoin |
| **BTC Tracker** | Finance | Planned | Bitcoin portfolio tracking |

## Distribution

| Target | Status | Technology |
|--------|--------|-----------|
| **Cloud SaaS** | Live | Docker on Hetzner VPS, Cloudflare CDN |
| **PWA** | Live | Installable on desktop + mobile, offline-first, push notifications |
| **Flatpak** | Planned | Linux desktop app via Tauri ([design 025](apps/health/sovereign-health/docs/project-files/design/025-flatpak-deployment.md)) |
| **Start9** | Planned | Self-hosted on personal hardware ([design 022](apps/health/sovereign-health/docs/project-files/design/022-deployment-architecture-scaling.md)) |
| **Tor** | Live | `.onion` hidden service for censorship-resistant access |

## Architecture

```
brickos/
├── apps/
│   ├── health/
│   │   └── sovereign-health/         Sovereign Health Intelligence
│   │       ├── api/                  Rust Actix-web backend (v0.28.0)
│   │       ├── frontend/             Next.js 16 PWA frontend
│   │       ├── website/              Marketing website (sovereignhealth.io)
│   │       ├── ops/                  Deploy scripts, nginx configs, smoke tests
│   │       └── docs/                 Design docs, sprint planning, releases
│   ├── finance/
│   │   └── btc-tracker/              Bitcoin portfolio tracking (planned)
│   └── infrastructure/
│       └── sovereign-link/           URL shortener, QR codes, affiliate links
│
├── crates/                           Shared Rust libraries
│   ├── brickos-auth/                 JWT, MFA, session management
│   ├── brickos-crypto/               AES-GCM encryption at rest
│   ├── brickos-db/                   Database pool, migrations
│   ├── brickos-billing/              Stripe + BTC Lightning payments
│   └── brickos-email/                Transactional email (Mailgun)
│
├── packages/                         Shared Node packages
│   ├── ui/                           @brickos/ui -- React component library
│   └── tokens/                       @brickos/tokens -- design tokens (CSS)
│
├── docs/
│   └── tracker/                      Local-first issue tracker (80 open, 72 closed)
│
└── ops/                              Platform-wide deploy scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rust, Actix-web 4, SQLx 0.8 |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| **Database** | PostgreSQL 16 (pgAudit, Row-Level Security) |
| **AI** | Anthropic Claude API (Dr. Alex health assistant) |
| **Payments** | Stripe + Strike (Bitcoin Lightning) |
| **PWA** | @serwist/next (service worker), idb (IndexedDB), Web Push API |
| **Infrastructure** | Docker, Hetzner VPS, Cloudflare (CDN + DNS + WAF) |
| **Monitoring** | Gatus (uptime), ntfy (push alerts), Sentry (error tracking) |
| **CI/CD** | GitHub Actions, deploy.sh (SSH-based Docker deploy) |

## PWA Capabilities

Sovereign Health ships as a full Progressive Web App:

- **Installable** -- add to home screen on Android, iOS, desktop (Chrome/Edge)
- **Offline fallback** -- dedicated offline page when network is unavailable
- **Service worker caching** -- static assets precached, API responses cached (cache-first for content, network-first for user data)
- **Offline write** -- measurements can be created offline, queued in IndexedDB, synced on reconnect
- **Push notifications** -- Web Push API with VAPID, subscription management in settings
- **Graceful degradation** -- offline banner, disabled write actions, friendly error messages

## Getting Started

```bash
# Clone
git clone https://github.com/sovereignbrick/brickos.git
cd brickos

# Backend
cd apps/health/sovereign-health/api
cp .env.example .env          # Configure database URL, JWT secret
cargo build                    # Build all Rust crates
cargo test --test smoke        # Fast sanity check

# Frontend
cd ../frontend
pnpm install                   # Install all dependencies
pnpm build                     # Production build (includes service worker)
pnpm test                      # Run 223 tests

# Docker (full stack)
cd ../ops
docker compose up -d           # Start backend + frontend + postgres
```

See individual CLAUDE.md files in each app directory for detailed development instructions.

## Design Documents

| # | Title | Status |
|---|-------|--------|
| [021](apps/health/sovereign-health/docs/project-files/design/021-multi-tenant-platform-offering.md) | Multi-Tenant Platform Offering | Draft |
| [022](apps/health/sovereign-health/docs/project-files/design/022-deployment-architecture-scaling.md) | Deployment Architecture & Scaling | Draft |
| [023](apps/health/sovereign-health/docs/project-files/design/023-progressive-web-app.md) | Progressive Web App | Shipped (Sprint 011) |
| [024](apps/health/sovereign-health/docs/project-files/design/024-url-shortener-service.md) | Sovereign Link | Shipped (Sprint 010) |
| [025](apps/health/sovereign-health/docs/project-files/design/025-flatpak-deployment.md) | Flatpak Desktop Deployment | Draft |
| [026](apps/health/sovereign-health/docs/project-files/design/026-sovereign-proposal-platform.md) | Sovereign Proposal Platform | Draft |
| [027](apps/health/sovereign-health/docs/project-files/design/027-multi-region-infrastructure.md) | Multi-Region Infrastructure | Draft |

## License

AGPL-3.0 -- see [LICENSE](LICENSE) for details.

Open source core. Premium tiers for SaaS features (billing, AI quotas, advanced import).

---

*BrickOS -- Bitcoin introduced Proof of Work. Health needs Proof of Blood. Infrastructure needs Proof of Ownership.*
