---
number: 524
title: "test: [P2] fix DEMO_ADMIN Playwright fixture for cold-boot DBs"
milestone: "Sprint 043 -- SHI Production Push"
labels: [test, sprint-041, phase-a, automated, p2]
created: 2026-04-11
priority: P2
sprint: 041
phase: A
estimate: 0.1d
discovered_by: 568
related: [491, 568]
---

## Summary

The Playwright `DEMO_ADMIN` fixture in `apps/health/sovereign-health/frontend/e2e/helpers/auth.ts:78-82` points at `demo@sovereignhealth.io` with `role=user`. After the #491 + #522 fix, cold-boot DBs correctly seed the demo user, but the seed sets `role=user` (per the original demo seed migration `20260308000012_seed_demo_data.sql`).

The platform admin tests (`platform-session.spec.ts`) all assume `DEMO_ADMIN` has admin access. On cold-boot DBs the demo user can't reach `/platform/*` -- the tests redirect to `/login` and fail with "TimeoutError: page.waitForURL".

This was masked on the long-running dev DB because someone manually `UPDATE`d the demo user to `admin` at some point in the past. After PR #568 that manual surgery is no longer reproducible.

## Reproduction (full E2E run from PR #568 verification)

1. Cold-boot dev stack post #568
2. `cd apps/health/sovereign-health/frontend`
3. `E2E_BASE_URL=http://localhost:3000 JWT_SECRET=... npx playwright test e2e/platform-session.spec.ts`
4. 10/11 tests fail with `loginAndNavigate` timeout

After 10 failed login attempts, the auth rate limiter trips and locks `demo@sovereignhealth.io` out for 22 minutes -- a second symptom of the same root cause.

## Acceptance criteria

Pick one of:

**Option A (recommended): point the fixture at the dev admin user**

```ts
// helpers/auth.ts
export const DEMO_ADMIN = {
  email: 'dev@sovereignhealth.io',
  password: 'SovereignDev1',
}
```

The dev admin is seeded with `role=admin` and `email_verified=true` by the bootstrap migration `20260411000001_bootstrap_brickos_schema_for_dev.sql` (PR #568) on every cold boot.

**Option B: elevate the demo user to admin in the bootstrap migration**

Add to `20260411000001_bootstrap_brickos_schema_for_dev.sql`:

```sql
UPDATE users SET role = 'admin', email_verified = true, email_verified_at = NOW()
WHERE email = 'demo@sovereignhealth.io';
```

This also works but conflates "demo user" (which is supposed to be a non-admin walkthrough) with "admin user". Option A is cleaner.

## Verification

After fix:

- [ ] `npx playwright test e2e/platform-session.spec.ts` runs to completion (no `loginAndNavigate` timeouts)
- [ ] Tests that depend on admin role (sidebar nav, services, orgs list, members, AI config, compliance, branding, app switcher) all pass
- [ ] No rate-limiter trip during the test run (because the credentials are correct)

## Out of scope

- The other failing E2E suites (`suite-1-auth`, `suite-12b-sprint024`, `suite-14-platform-scoping`, etc.) -- those have separate fixture issues. File separately if you want them addressed.

## Related

- PR #568 (which made the cold-boot DB the test target instead of the long-running surgery DB)
- `apps/health/sovereign-health/frontend/e2e/helpers/auth.ts`
- `apps/health/sovereign-health/frontend/e2e/platform-session.spec.ts`
