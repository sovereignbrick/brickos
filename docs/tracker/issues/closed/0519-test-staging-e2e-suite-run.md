---
number: 519
title: "test: [automated] run full Playwright E2E suite against staging"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-g, automated, e2e]
created: 2026-04-11
priority: P1
sprint: 041
phase: G
estimate: 0.3d
blocked_by: [516]
---

Point the Playwright suite at the staging URLs and run every spec that can run without a real human admin login.

## Scope

```bash
cd apps/health/sovereign-health/frontend
E2E_BASE_URL=https://app.staging.brickos.io \
  E2E_API_URL=https://api.staging.brickos.io \
  JWT_SECRET=<staging jwt secret from 1pw> \
  E2E_USER_ID=<admin user id from staging> \
  npx playwright test e2e/sprint-040-smoke.spec.ts \
                      e2e/health.spec.ts \
                      e2e/suite-licensing-journeys.spec.ts
```

## Expected result

- sprint-040-smoke: 7/7 passing (or whatever the updated count is)
- health.spec.ts: all tests passing
- licensing-journeys: Journey 3 + 4 passing (Journey 1 + 2 deferred as before)

## Who

Claude (automated). Uses same JWT cookie injection pattern as localhost smoke.

## Verification

Per-suite pass count recorded in lessons doc. Any regression from localhost is P1. Staging-only failures are P0.
