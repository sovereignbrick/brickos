# ADR-010: Monorepo — Cargo Workspace + pnpm Workspace

**Status:** Accepted
**Date:** 2026-03-08

## Context
The platform has shared logic across backend services (auth, encryption, billing, email) and shared React components across frontends. Changes to shared code must be coordinated atomically.

## Decision
Single **monorepo** using Cargo workspace (Rust) + pnpm workspace (Node):

```
platform/       — Core platform services
crates/         — Shared Rust crates (brickos-auth, brickos-db, brickos-email)
packages/       — Shared React packages
apps/{domain}/{product}/ — Individual applications
ops/            — Platform-wide deploy scripts
docs/           — Platform-wide documentation
```

## Alternatives Considered
- **Polyrepo:** Separate repos per service. Easier isolation but cross-cutting changes (e.g., encryption key rotation) require coordinated PRs across repos.
- **Monorepo with Nx/Turborepo:** Adds build orchestration but unnecessary complexity for current team size.

## Consequences
- **Easier:** Atomic commits across shared code and apps, single `git log` for full history, shared CI checks.
- **Harder:** Larger repo, longer initial clone, blast radius of bad commits is wider.
- **Convention:** Frontend has its own `pnpm-lock.yaml` for Docker builds (must be synced separately when `package.json` changes).
