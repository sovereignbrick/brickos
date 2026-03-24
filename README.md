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

Privacy-first software platform for people who want control over their data. Cloud SaaS with a self-hosted option — every app can run on your own hardware via StartOS, works over Tor, and ships as a PWA + Flatpak desktop app.

## Products

| Product | Domain | Status |
|---------|--------|--------|
| **Sovereign Health Intelligence** | Health | Active (v0.26.0) |
| **Sovereign Link** | Infrastructure | Active — URL shortener with QR codes |
| **BTC Tracker** | Finance | Planned |
| **Tax Exam Trainer** | Finance | Planned |
| **Bitcoin Node Manager** | Infrastructure | Planned |

## Architecture

```
platform/
  core-api/              BrickOS platform API (shared auth, billing, backup)
  dashboard/             Platform admin dashboard
  website/               brickos.io marketing website

crates/
  brickos-auth/          Authentication & JWT
  brickos-billing/       Stripe + Strike billing
  brickos-crypto/        Encryption at rest
  brickos-db/            Database helpers
  brickos-email/         Transactional email (Mailgun)
  brickos-backup/        Encrypted backup gateway
  brickos-startos/       StartOS packaging helpers

packages/
  ui/                    @brickos/ui — shared React component library
  tokens/                @brickos/tokens — design tokens

apps/
  health/
    sovereign-health/    Sovereign Health Intelligence (API + frontend + website + ops)
  finance/
    btc-tracker/         Bitcoin portfolio tracking (planned)
    tax-trainer/         Tax exam preparation (planned)
  infrastructure/
    sovereign-link/      URL shortener & QR codes (library crate, mounted in health API)
    bitcoin-node/        Bitcoin full node manager (planned)
```

## Tech Stack

- **Backend:** Rust / Actix-web 4
- **Frontend:** Next.js 16 / React 19 / Tailwind 4
- **Database:** PostgreSQL 16 (pgAudit)
- **Cache:** Redis 7
- **AI:** Anthropic Claude API
- **Payments:** Stripe + Strike (Bitcoin Lightning)
- **Packaging:** Docker, PWA (Serwist), Flatpak (Tauri), StartOS

## Getting Started

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos
cargo build                    # Build all Rust crates
pnpm install && pnpm build     # Build all frontends
```

See [Self-Hosting Guide](apps/health/sovereign-health/docs/project-files/design/old-design/SELF_HOST.md) for running your own instance.

## License

AGPL-3.0 -- see [LICENSE](LICENSE) for details.

Open source core with proprietary premium tiers.

---

*BrickOS*
*Bitcoin introduced Proof of Work.*
*Health needs Proof of Blood. Infrastructure needs Proof of Ownership.*
