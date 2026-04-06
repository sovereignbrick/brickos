# ADR-039: Platform-Level Deployment Workflow with Per-App Units

**Status:** Accepted
**Date:** 2026-04-06

## Context

The existing deployment workflow was designed for SHI only (one backend, one frontend, one website). With Sovereign Link, Sovereign Voice, and platform DB migrations, we need a workflow that supports deploying individual components without redeploying everything.

## Decision

Elevate the deployment workflow to platform level (`docs/deployment/README.md`). Each app is an independent deployment unit with its own build, transfer, and runtime. Only deploy what changed.

Deployment order when multiple units changed:
1. Platform DB migrations (always first)
2. Backend services (independent of each other)
3. Frontend services
4. Static websites

Platform DB migrations are run manually via psql. App migrations run automatically via sqlx::migrate!() on backend startup.

Sprint closing follows a strict checklist: pre-flight, artifacts, staging deploy, verification, manual testing, production promotion. No steps are skippable without explicit `--no-smoke` flag.

## Alternatives Considered

- **Single deploy command for everything:** `deploy.sh all`. Slower, rebuilds unchanged apps, risk of breaking working apps with unrelated changes.
- **Microservices with individual repos:** Each app in its own repo. Loses monorepo benefits (shared crates, atomic commits, single CI).
- **Container orchestration (Kubernetes):** Overkill for current scale (1 VPS, 3 apps). Adds infrastructure complexity.

## Consequences

**Easier:**
- Fix a bug in Sovereign Voice without rebuilding SHI (30-second deploy vs 15-minute Docker build)
- Platform DB changes are tested in isolation before any app deployment
- Each app team (future) can deploy independently
- Rollback per-app without affecting other apps

**Harder:**
- Must track deployment order when multiple units change
- Platform DB migrations require manual psql execution (not embedded in any app)
- Must verify ALL apps after platform DB changes (schema move affects everyone)
- Version management is per-app (multiple versions to track)
