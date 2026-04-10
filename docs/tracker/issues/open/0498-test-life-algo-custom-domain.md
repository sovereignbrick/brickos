---
number: 498
title: "test: [manual] Life Algorithm -- add custom domain mapping"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-c, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: C
estimate: 0.1d
blocked_by: [497]
---

Add the custom domain mapping for Life Algorithm on dev. Ignore actual SSL provisioning (that's ops work).

## Steps

1. `/platform/orgs/{life-algorithm-id}` -> Branding tab
2. Scroll to **Custom domains** section
3. Enter `life-algorithm.brickos.io` in the input
4. Click **Add domain**
5. Verify the domain appears in the table with `ssl_status='pending'`

## Expected result

- Domain row added
- `ssl_status` displays "pending" in amber
- Created date matches now
- Remove button works (test by adding a throwaway `test.brickos.io`, then removing it)

## Who

User (manual).

## Verification

Report green/bug.
