---
number: 518
title: "test: [manual] Life Algorithm full walkthrough on staging"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-g, manual]
created: 2026-04-11
priority: P0
sprint: 041
phase: G
estimate: 0.5d
blocked_by: [516, 517]
---

Re-run the Life Algorithm onboarding from scratch, this time on staging. Full happy path from new org to active client.

## Prerequisites

- Staging deployed (#516)
- Migrations verified (#517)

## Steps (follow docs/runbooks/issue-org-license.md)

1. Log in as platform admin at `https://app.staging.brickos.io/login` (or equivalent)
2. Create Life Algorithm org via `/platform/orgs` "New organization"
3. Configure branding tab: logo + colors + role labels
4. Add custom domain: `life-algorithm.staging.brickos.io`
5. Generate Horizon license JWT: 1 owner / 3 practitioners / 50 members, 14 features selected, 365 days
6. Add org_owner `admin@life-algorithm.test`
7. Add 3 coaches
8. Bulk add 10 clients via the admin GUI (one by one) OR via the API helper
9. Sign out, sign in as Jane (new user flow from #506-#508 but on staging)
10. Add Jane to Life Algorithm
11. Jane switches context, sees the branding, adds a measurement, exports data

## Expected result

- Every step from Phase C-E works on staging
- No staging-only bugs (i.e. things that worked on dev break on staging)
- Staging logs clean (`docker logs shi-backend --tail 100` shows no errors)

## Who

User (manual). Claude monitors logs in parallel.

## Verification

Each step green or bug-reported. Any staging-only bug is P0 and halts Phase G.

**This is the sprint's gate criterion.** If this test fails, production is deferred to Sprint 042 regardless of any other green flags.
