---
number: 458
title: "chore: review GitHub, GitLab pages + README docs for latest SHI state"
milestone: "Sovereign Health Intelligence -- Production Quality"
labels: [docs, chore]
created: 2026-04-10
priority: P1
sprint: 039
---

Ensure all public-facing documentation accurately reflects the current state of SHI after platform elevation, two-pool architecture, and brickos-ai integration.

## GitHub Repository

- [ ] Root README.md -- reflects current monorepo structure, all pillars, crate list
- [ ] Repository description + topics match current state
- [ ] GitHub Project board ("BrickOS Sprint Board") updated with Sprint 039
- [ ] Closed milestones reflect completed work
- [ ] Open issues synced with local tracker (docs/tracker/)

## GitLab Mirror

- [ ] Mirror is up to date (deploy.sh pushes to both)
- [ ] README renders correctly on GitLab
- [ ] CI/CD pipeline status (if configured)

## README Files Audit

- [ ] `/README.md` (root) -- monorepo overview, pillar structure, key commands
- [ ] `apps/health/sovereign-health/README.md` -- SHI features, setup, deployment
- [ ] `apps/health/sovereign-health/api/README.md` -- API endpoints, testing commands
- [ ] `apps/health/sovereign-health/frontend/README.md` -- frontend stack, dev setup
- [ ] `apps/health/sovereign-health/website/README.md` -- website pages, deployment
- [ ] `apps/data/sovereign-crm/README.md` -- CRM features, 77 endpoints, staging URLs
- [ ] `apps/data/sovereign-crm/api/README.md` -- API quickstart
- [ ] `apps/technology/sovereign-link/README.md` -- Link service, dual-mode
- [ ] `apps/platform/brickos-platform-api/README.md` -- Platform API, port 9000
- [ ] `crates/brickos-ai/README.md` -- AI provider abstraction
- [ ] `crates/brickos-auth/README.md` -- JWT, MFA, Argon2
- [ ] `crates/brickos-crypto/README.md` -- AES-256-GCM encryption
- [ ] `crates/brickos-db/README.md` -- shared models
- [ ] `crates/brickos-email/README.md` -- email provider trait
- [ ] `crates/brickos-billing/README.md` -- Stripe + Strike
- [ ] `crates/brickos-notify/README.md` -- ntfy + Telegram
- [ ] `crates/brickos-i18n/README.md` -- translation monitoring
- [ ] `ops/README.md` or scaffold docs -- scaffold-app.sh usage

## Content to Verify

- [ ] Version numbers consistent (Cargo.toml, lib.rs, deploy.sh, README)
- [ ] Architecture diagrams reflect two-pool + separate DB per app
- [ ] Feature lists match what's actually implemented
- [ ] URLs point to correct staging/production endpoints
- [ ] Setup instructions work (cargo build, pnpm install, docker compose)
- [ ] License (AGPL-3.0) stated consistently
- [ ] No stale references to old architecture (single DB, embedded SLI, etc.)
