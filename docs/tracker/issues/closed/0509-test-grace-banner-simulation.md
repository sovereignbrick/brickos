---
number: 509
title: "test: [automated] simulate payment failure -> grace banner appears"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-e, automated]
created: 2026-04-11
priority: P2
sprint: 041
phase: E
estimate: 0.2d
blocked_by: [506]
---

Automated test for the in-app grace banner from Sprint 040 #476. Writes a user_license directly to `downgrade_grace` state and verifies the banner renders.

## Scope

Write `ops/scripts/test-grace-banner.sh`:

1. Take Jane's user_id
2. `UPDATE user_licenses SET status='downgrade_grace', grace_period_ends=NOW() + INTERVAL '5 days', downgraded_at=NOW(), previous_tier_slug='focus' WHERE user_id = '...'`
3. Open browser (via Playwright) as Jane
4. Assert the grace banner appears at the top of every authenticated page
5. Assert the banner text mentions "5 days"
6. Assert the "Update payment method" CTA links to `/billing`
7. Click the dismiss X
8. Assert the banner is hidden for the current session (sessionStorage)
9. Reload page, assert banner stays hidden
10. Open new browser context (fresh session), assert banner returns
11. Cleanup: `UPDATE user_licenses SET status='active', grace_period_ends=NULL WHERE user_id = '...'`

## Who

Claude (automated). Add as `e2e/grace-banner.spec.ts` alongside the existing sprint-040 smoke.

## Verification

- Test passes
- Banner behavior matches design 022 §2.5
