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

Privacy-first software platform for people who want control over their data. Every app runs on your own hardware, encrypts your data locally, and works over Tor.

## Products

| Product | Domain | Status |
|---------|--------|--------|
| **Sovereign Health Intelligence** | Health | Active (v0.19.1-rc1) |
| **BTC Tracker** | Finance | Planned |
| **Tax Exam Trainer** | Finance | Planned |
| **Bitcoin Node Manager** | Node | Planned |

## Architecture

```
platform/          BrickOS core services (auth, billing, backup)
crates/            Shared Rust libraries (brickos-auth, brickos-crypto, etc.)
packages/          Shared React libraries (@brickos/ui, @brickos/i18n)
apps/
  health/          Sovereign Health domain
  finance/         Sovereign Finance domain
  node/            Sovereign Node domain
```

## Tech Stack

- **Backend:** Rust / Actix-web 4
- **Frontend:** Next.js 16 / React 19 / Tailwind 4
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **AI:** Anthropic Claude API
- **Payments:** Stripe + Strike (Bitcoin)
- **Packaging:** Docker + StartOS

## Getting Started

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos
cargo build                    # Build all Rust crates
pnpm install && pnpm build     # Build all frontends
```

## License

AGPL-3.0 -- see [LICENSE](LICENSE) for details.

Open source core with proprietary premium tiers.

---

*Sovereign Brick OU -- Estonia*
*Bitcoin introduced Proof of Work. Health needs Proof of Blood.*
