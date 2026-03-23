---
github_number: 151
title: "feat: BrickOS Link — URL shortener + Sovereign Link (Start9)"
milestone: horizon-tier
labels: [feat]
points: 5
---

## Description
One Rust crate, two deployment modes:

**Platform mode** (`brickos.io/r/`): Affiliate short links with 2-char app prefix (`sha3f2c1b9`), vanity codes (`drclinic`), campaigns, hierarchical reporting across all BrickOS apps. Layers on top of existing affiliate system (doesn't replace it).

**Standalone mode** (Sovereign Link): Self-hosted URL shortener for Tor .onion addresses, Nostr npubs, and local services. Ships as Start9 package and Docker image. SQLite, basic auth, embedded HTML UI, zero BrickOS dependencies.

### Code Routing
- Auto affiliate: `brickos.io/r/{2-char prefix}{8-char hash}` — prefix identifies app, no DB lookup needed
- Vanity: `brickos.io/r/{slug}` — globally unique, clean for promotion, DB lookup
- Campaign: `brickos.io/r/{slug}` — admin-created, DB lookup

### Phases
1. Core redirect + affiliate links in health API (5 pts)
2. Campaigns + BrickOS admin reporting + QR (5 pts)
3. Extract to `apps/infrastructure/shortener/` (8 pts)
4. Standalone mode + Start9 package — Sovereign Link (5 pts)

### Key Architecture Decision
One crate with feature flags (`--features platform` vs `--features standalone`). Shared: redirect handler, QR gen, REST API, click tracking (~60%). Platform adds: prefix routing, affiliate integration, cross-app reporting. Standalone adds: embedded UI, Tor SOCKS, Start9 auto-discovery.

## Design Doc
apps/health/sovereign-health/docs/project-files/design/024-url-shortener-service.md
