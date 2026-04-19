---
number: 563
title: "refactor(backend): org_resolver resolves *.sovereignhealth.io (keep *.brickos.io resolution)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [refactor, backend, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.25d
blocked_by: []
parent: 559
phase: 3
---

Phase 3 of Design 025. Backend `org_resolver.rs` already resolves `{slug}.brickos.io` / `{slug}.demo.brickos.io` post-Sprint 044 (kept -- admin plane). Add resolution for `{slug}.sovereignhealth.io` / `{slug}.demo.sovereignhealth.io` (end-user plane).

## File: `apps/health/sovereign-health/api/src/middleware/org_resolver.rs`

Current state (post Sprint 044):
- Lines 84-93: `PLATFORM_DOMAINS` includes the specific brickos.io platform hosts -- keep
- Lines 113-115: **short-circuits `.sovereignhealth.io` to `None`** -- REMOVE
- Lines 117-122: resolves `{slug}.demo.brickos.io` and `{slug}.brickos.io` -- KEEP as-is

Target state:
- `PLATFORM_DOMAINS`: keep brickos.io platform hosts, ALSO add `app.sovereignhealth.io`, `api.sovereignhealth.io`, `demo.sovereignhealth.io`, `api-demo.sovereignhealth.io`, `www-demo.sovereignhealth.io`, `www.sovereignhealth.io`, `sovereignhealth.io`, `dev.sovereignhealth.io`
- `slug_candidate` logic: strip BOTH `.sovereignhealth.io` variants AND `.brickos.io` variants, in this order:
  - `.demo.sovereignhealth.io` (staging end-user)
  - `.demo.brickos.io` (staging admin)
  - `.sovereignhealth.io` (prod end-user)
  - `.brickos.io` (prod admin)
- Both planes resolve to the same `OrgContext` -- the frontend decides which UI to render based on hostname

## Tests

Add unit tests:
- `test.sovereignhealth.io` -> `Some(OrgContext)` (end-user plane)
- `test.demo.sovereignhealth.io` -> `Some(OrgContext)` (staging end-user)
- `test.brickos.io` -> `Some(OrgContext)` (admin plane) -- already works, add a test
- `test.demo.brickos.io` -> `Some(OrgContext)` (staging admin)
- `app.sovereignhealth.io` -> `None` (platform / default SHI)
- `app.brickos.io` -> `None` (platform admin)
- `health.acme.com` -> `Some(OrgContext)` via `domain_mappings`

## Acceptance

- `GET /api/v1/org/branding` on `test-clinic.sovereignhealth.io` -> `is_org: true`, org branding
- `GET /api/v1/org/branding` on `test-clinic.brickos.io` -> `is_org: true`, same org branding
- `GET /api/v1/org/branding` on `app.sovereignhealth.io` / `app.brickos.io` -> `is_org: false`
- Custom domain resolution unchanged
- All new and existing tests pass
