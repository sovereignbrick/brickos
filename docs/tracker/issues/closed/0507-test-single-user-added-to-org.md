---
number: 507
title: "test: [manual] single user -- admin adds Jane to Life Algorithm as Client"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-e, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: E
estimate: 0.1d
blocked_by: [506, 499]
---

As brickos admin, add Jane to Life Algorithm and verify she sees the org context.

## Steps

1. As admin: `/platform/orgs/{life-algorithm-id}` -> Members tab
2. Click **Add member**
3. Email: `jane.doe@life-algorithm.test`
4. Role: `Client` (displayed per the branding override)
5. Add
6. Verify the "Member added" toast and the row in the table

## As Jane (separate browser tab)

7. Reload the dashboard or click the user profile dropdown
8. Open the **Org switcher** row in the dropdown
9. Verify the list shows:
    - "Personal (Individual)" (her personal org if auto-created at signup)
    - "Life Algorithm (client)"
10. Select "Life Algorithm"
11. Page reloads
12. Verify: the tier indicator now reflects Life Algorithm's Horizon tier (not Jane's personal Glimpse)
13. Navigate to `/markers` -- verify Jane has access to Horizon-gated features (body composition, supplement impact, etc.)

## Expected result

- Add member succeeds
- Jane sees the org in her switcher immediately after refresh
- Switching contexts actually changes her effective tier

## Who

User (manual) -- may need a second browser window to simulate the two actors.

## Verification

Green/bug. This tests the full two-sided onboarding happy path.
