<p align="center">
  <img src="docs/screenshots/demo.gif" alt="Sovereign Health Intelligence" width="800" />
</p>

<h1 align="center">BrickOS</h1>

<p align="center">
  <strong>Building sovereignty, brick by brick.</strong><br />
  Privacy-first software platform for people who want control over their data.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/rust-1.80+-orange.svg" alt="Rust" />
  <img src="https://img.shields.io/badge/next.js-16-black.svg" alt="Next.js" />
  <img src="https://img.shields.io/badge/postgresql-16-336791.svg" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/docker-ready-2496ED.svg" alt="Docker" />
  <a href="https://app.sovereignhealth.io"><img src="https://img.shields.io/badge/live-app.sovereignhealth.io-green.svg" alt="Live" /></a>
</p>

---

## What is BrickOS?

BrickOS is a modular platform for building sovereign applications -- software where users own their data and choose where it runs. Cloud SaaS with a self-hosted escape hatch: every app can run on your own hardware via Docker, StartOS, or Tor.

Your most sensitive data -- health records, financial history, personal communications -- shouldn't live on servers you don't control.

### Principles

- **Sovereign-first** -- You own your data. Export it, self-host it, delete it. No vendor lock-in.
- **Brick architecture** -- Modular apps composed from shared platform crates. Each "brick" is independent but stronger together.
- **Privacy by design** -- AES-256-GCM encryption at rest, Row-Level Security, field-level encryption. Zero third-party tracking.
- **Self-hostable** -- Docker-based. Runs on a VPS, Raspberry Pi via Start9, or your laptop.
- **Open source** -- AGPL-3.0 licensed. Read the code, audit the security, fork it.

## Products

| Product | Domain | Status |
|---------|--------|--------|
| [**Sovereign Health Intelligence**](apps/health/sovereign-health/) | Health | **Live** -- [app.sovereignhealth.io](https://app.sovereignhealth.io) |
| [**Sovereign Link**](apps/infrastructure/sovereign-link/) | Infrastructure | **Live** -- URL shortener + QR codes |
| **BTC Tracker** | Finance | Planned |

### Sovereign Health Intelligence

Personal health data platform for biomarker tracking. Import lab PDFs, track 100+ biomarkers across 8 health zones, get AI-powered insights from Dr. Alex.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="400" />
  <img src="docs/screenshots/marker-detail.png" alt="Marker Detail" width="400" />
</p>
<p align="center">
  <img src="docs/screenshots/trends.png" alt="Trends" width="400" />
  <img src="docs/screenshots/dr-alex.png" alt="Dr. Alex AI Chat" width="400" />
</p>

## Quick Start

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos/apps/health/sovereign-health/ops
docker compose -f docker-compose.dev.yml up -d
```

Then open [http://localhost:3000](http://localhost:3000).

For development setup, see individual README files in each app directory.

## Architecture

```
brickos/
├── apps/
│   ├── health/
│   │   └── sovereign-health/        Sovereign Health Intelligence
│   │       ├── api/                 Rust Actix-web backend
│   │       ├── frontend/            Next.js 16 PWA
│   │       ├── website/             Marketing website
│   │       └── ops/                 Deploy scripts, Docker configs
│   ├── finance/
│   │   └── btc-tracker/             BTC portfolio tracking (planned)
│   └── infrastructure/
│       └── sovereign-link/          URL shortener + affiliate links
│
├── crates/                          Shared Rust libraries
│   ├── brickos-auth/                JWT, MFA, session management
│   ├── brickos-crypto/              AES-256-GCM encryption at rest
│   ├── brickos-db/                  Database pool, migrations
│   ├── brickos-billing/             Stripe + BTC Lightning payments
│   ├── brickos-email/               Transactional email (Mailgun)
│   ├── brickos-backup/              Backup gateway service
│   └── brickos-startos/             Start9 integration
│
├── packages/                        Shared Node packages
│   ├── ui/                          @brickos/ui component library
│   └── tokens/                      @brickos/tokens design tokens
│
└── docs/                            Platform documentation
    ├── tracker/                     Local-first issue tracker
    └── screenshots/                 App screenshots + demo GIF
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rust, Actix-web 4, SQLx 0.8 |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| **Database** | PostgreSQL 16 (pgAudit, Row-Level Security, field-level encryption) |
| **AI** | Anthropic Claude API (Dr. Alex health assistant) |
| **Payments** | Stripe + Strike (Bitcoin Lightning) |
| **PWA** | Serwist (service worker), IndexedDB (offline write queue), Web Push |
| **Infrastructure** | Docker, Hetzner VPS, Cloudflare CDN/DNS/WAF |
| **Monitoring** | Gatus (uptime), ntfy (alerts), in-app API metrics dashboard |

## Distribution

| Target | Status | Notes |
|--------|--------|-------|
| **Cloud SaaS** | Live | Docker on Hetzner VPS, Cloudflare CDN |
| **PWA** | Live | Installable, offline-first, push notifications, background sync |
| **Tor** | Live | `.onion` hidden service for censorship-resistant access |
| **Start9** | Planned | Self-hosted on personal hardware |
| **Flatpak** | Planned | Linux desktop app |

## Security & Privacy

- **Encryption at rest** -- AES-256-GCM for all health measurements
- **Row-Level Security** -- PostgreSQL RLS policies on all user data tables
- **pgAudit** -- Database-level audit logging for all write operations
- **DB audit triggers** -- Application-level audit trail with changed fields
- **DSGVO/GDPR** -- Data export (Art. 20), deletion cascade (Art. 17), consent management (Art. 7), access logs (Art. 15)
- **IP hashing** -- SHA-256 pseudonymization in audit logs
- **No tracking** -- Zero third-party analytics, no ad networks

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[AGPL-3.0](LICENSE) -- Open source core. Commercial licenses available for organizations needing proprietary modifications.

## Links

- **App:** [app.sovereignhealth.io](https://app.sovereignhealth.io)
- **Demo:** [demo.sovereignhealth.io](https://demo.sovereignhealth.io)
- **Website:** [sovereignhealth.io](https://sovereignhealth.io)
- **Platform:** [brickos.io](https://brickos.io)

---

*Your body is the operating system of your life. Blood is its diagnostic interface.*
