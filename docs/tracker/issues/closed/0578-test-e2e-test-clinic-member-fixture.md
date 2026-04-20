---
number: 578
title: "test: e2e fixture -- a test-clinic member user so authed Sprint 046 tests run"
milestone: "Sprint 047 -- Multi-App URL Routing + Stability"
labels: [test, e2e, p2]
created: 2026-04-20
priority: P2
estimate: 0.25d
blocked_by: []
---

Sprint 046 regression suite `sprint-046-plane-routing.spec.ts` has three
authed tests that navigate to `/platform` on an org subdomain and assert
sidebar sections render (ORGANIZATION, PEOPLE, APPS, "Licensed by
BrickOS" tag). They currently fail on staging because the shared
`DEMO_ADMIN` fixture (`dev@sovereignhealth.io`) is NOT a member of
`test-clinic` -- Sprint 044's login handler returns 403 for non-members
on an org subdomain.

## Scope

1. Seed or document a `test-clinic` member credential for E2E use
   - e.g. `e2e-test-clinic@sovereignhealth.io` with role `org_owner`
2. Add a `TEST_CLINIC_OWNER` export in `e2e/helpers/auth.ts`
3. Parameterise `auth.setup.ts` so it picks the right credential based on
   `E2E_BASE_URL` (org subdomain -> TEST_CLINIC_OWNER, platform domain ->
   DEMO_ADMIN)
4. Re-run the authed Sprint 046 suite against `test-clinic.demo.brickos.io`
   and confirm all 20/20 pass

## Acceptance

- `E2E_BASE_URL=https://test-clinic.demo.brickos.io npx playwright test sprint-046 --project=chromium` -> 20/20 green
- Baseline suite (`suite-1-auth`, `suite-2-profile`) still passes against
  `demo.brickos.io` with DEMO_ADMIN

## Workaround until this lands

Use `--project=unauth` which skips the setup dependency. Runs 17/20 of
the Sprint 046 regression checks. The 3 skipped tests (sidebar
visibility) need to be walked manually via the RC checklist A1.3-A1.6.
