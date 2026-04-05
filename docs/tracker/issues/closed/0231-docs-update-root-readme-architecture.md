---
github_number: 237
title: "docs: update root README.md — current architecture, remove stale dirs"
labels: [documentation, chore]
milestone: infrastructure
---

## Description

The root `README.md` needs a refresh to reflect the current BrickOS architecture and remove stale placeholder directories.

## Changes Needed

### 1. Remove stale directories
- [ ] Delete `apps/finance/tax-trainer/` — empty placeholder, no planned work
- [ ] Delete `apps/technology/bitcoin-node/` — empty placeholder, no planned work
- [ ] Keep `apps/finance/btc-tracker/` — future planned app

### 2. Update README.md architecture section
- [ ] Reflect current monorepo structure accurately
- [ ] Add **Sovereign Link** (shipped Sprint 010) under Infrastructure
- [ ] Add **PWA** (shipped Sprint 011) — installable, offline-first, push notifications
- [ ] Add **Planned: Flatpak** packaging (design doc 025)
- [ ] Add **Planned: Sovereign Proposal Platform** (design doc 026)
- [ ] Add **Planned: Start9 self-hosted package** (design doc 022)
- [ ] Reference design docs 021-027 for roadmap context
- [ ] Update tech stack table (add @serwist/next, idb, Sovereign Link)
- [ ] Update deployment section (staging + production, deploy.sh workflow)

### 3. Accurate directory tree

```
brickos/
├── apps/
│   ├── health/
│   │   └── sovereign-health/        ← Sovereign Health Intelligence (live)
│   │       ├── api/                  Rust Actix-web backend
│   │       ├── frontend/             Next.js 16 PWA frontend
│   │       ├── website/              Marketing website
│   │       ├── ops/                  Deploy scripts, nginx configs
│   │       └── docs/                 Design docs, sprint planning
│   ├── finance/
│   │   └── btc-tracker/             ← BTC Tracker (planned)
│   └── infrastructure/
│       └── sovereign-link/           ← URL shortener + affiliate links (live)
├── crates/                           Shared Rust libraries
│   ├── brickos-auth/                 JWT, MFA, session management
│   ├── brickos-crypto/               Encryption at rest
│   ├── brickos-db/                   DB pool, migrations
│   ├── brickos-billing/              Stripe, BTC payments
│   └── brickos-email/                Email provider trait
├── packages/                         Shared Node packages
│   └── tokens/                       @brickos/tokens design system
├── platform/                         Platform-wide services (planned)
├── ops/                              Platform-wide deploy scripts
└── docs/                             Platform documentation + issue tracker
```

### 4. Add sections for
- **PWA capabilities** — installable, offline fallback, service worker caching, push notifications, offline write queue with sync
- **Distribution targets** — SaaS (cloud), PWA (installable web app), Flatpak (Linux desktop, planned), Start9 (self-hosted, planned)
- **Infrastructure** — Sovereign Link (live), Sovereign Proposal Platform (design phase)

## Files

- `README.md` — root README
- `apps/finance/tax-trainer/` — DELETE
- `apps/technology/bitcoin-node/` — DELETE
