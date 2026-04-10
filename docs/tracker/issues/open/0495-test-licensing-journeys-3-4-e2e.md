---
number: 495
title: "test: [automated] run licensing journeys 3 + 4 against two-pool env"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-b, automated, e2e]
created: 2026-04-11
priority: P1
sprint: 041
phase: B
estimate: 0.25d
blocked_by: [491, 494]
---

Sprint 040 #471 shipped the Playwright licensing journeys suite skeleton. Journeys 3 (admin override) and 4 (org member seat enforcement) are gated on `E2E_TWO_POOL_READY=1`. After Phase B stands up the two-pool env, this test runs those journeys for the first time in real.

## Scope

- [ ] `E2E_TWO_POOL_READY=1 E2E_BASE_URL=http://localhost:3001 JWT_SECRET=... npx playwright test e2e/suite-licensing-journeys.spec.ts --grep "Journey [34]"`
- [ ] Journey 3 green (admin override applies, effective tier changes, clears cleanly)
- [ ] Journey 4 green (seat limit hit returns 422 SeatLimitExceeded with role + current + max)
- [ ] Any failures trigger a bug issue file against this milestone with P0

## Who

Claude (automated).

## Verification

- Journeys 3 and 4 pass in CI-mode Playwright run
- No `test.skip()` calls remaining in the suite for these journeys
