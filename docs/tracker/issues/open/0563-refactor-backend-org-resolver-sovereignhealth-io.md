---
number: 563
title: "refactor(backend): org_resolver resolves *.sovereignhealth.io, stops special-casing brickos.io"
milestone: "Sprint 045 -- Domain Realignment"
labels: [refactor, backend, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.25d
blocked_by: []
parent: 559
phase: 3
---

Phase 3 of Design 025. Invert `org_resolver.rs` so sovereignhealth.io subdomains resolve to orgs, and brickos.io subdomains (other than the explicit platform ones) stop resolving.

## File: `apps/health/sovereign-health/api/src/middleware/org_resolver.rs`

Current state (post Sprint 044):
- Lines 84-93: `PLATFORM_DOMAINS` includes `app.brickos.io`, `demo.brickos.io`, etc. -- keep
- Lines 113-115: **short-circuits `.sovereignhealth.io` to `None`** -- REMOVE
- Lines 117-122: resolves `{slug}.demo.brickos.io` and `{slug}.brickos.io` -- REPLACE

Target state:
- Keep `PLATFORM_DOMAINS` for brickos.io platform hosts (`app.brickos.io`, `demo.brickos.io`, `api.brickos.io`, `api-demo.brickos.io`, `status.brickos.io`, `brickos.io`, `www.brickos.io`, `localhost`)
- Also keep `app.sovereignhealth.io`, `api.sovereignhealth.io`, `demo.sovereignhealth.io`, `api-demo.sovereignhealth.io`, `www-demo.sovereignhealth.io`, `www.sovereignhealth.io`, `sovereignhealth.io` in PLATFORM_DOMAINS -- these are specific subdomains that should NOT resolve to an org
- Resolve `{slug}.sovereignhealth.io` and `{slug}.demo.sovereignhealth.io` via the same slug lookup as today
- Leave `custom_domain` lookup via `domain_mappings` unchanged

## Tests

- Add unit tests in `tests/integration.rs` or a new `tests/org_resolver.rs`:
  - `test.sovereignhealth.io` -> `Some(OrgContext)` when org with slug "test" exists
  - `test.demo.sovereignhealth.io` -> same (staging)
  - `app.sovereignhealth.io` -> `None` (platform)
  - `app.brickos.io` -> `None` (platform admin)
  - `health.acme.com` -> `Some(OrgContext)` via `domain_mappings`

## Acceptance

- `GET /api/v1/org/branding` on `test-clinic.sovereignhealth.io` -> `is_org: true`, org branding
- `GET /api/v1/org/branding` on `app.sovereignhealth.io` -> `is_org: false`, default BrickOS branding
- `GET /api/v1/org/branding` on `app.brickos.io` -> `is_org: false`
- All new and existing org_resolver tests pass
- No regressions on custom domain resolution
