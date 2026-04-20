---
number: 580
title: "bug: clicking Thresholds tab in /settings logs user out on staging"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [bug, frontend, auth, p0, rc-blocker]
created: 2026-04-20
priority: P0
estimate: 0.5d
blocked_by: []
---

Reported during Sprint 046 RC #20 on 2026-04-20:

> "i click on threshold link i got loged out and can no longer login"

Happens on `https://test-clinic.demo.sovereignhealth.io/settings` ->
click Thresholds tab. Session is lost; subsequent logins fail until the
backend rate limiter resets.

## Likely root cause

Frontend `request()` in `src/lib/api.ts:135` clears the token and
dispatches `session-expired` on any 401 response. ThresholdsTab fetches
markers / calculated markers / custom ranges. If one of those endpoints
returns 401 (even spuriously), the user is logged out.

Likely suspects:
- `/settings/reference-ranges` (returns 401 if JWT is missing or if
  user lacks permission; should be visible to any logged-in user)
- `/markers` or `/user-markers` with an expired / wrong-scope token
- Multi-tab race (opening /settings in multiple tabs with stale state)

## Debug plan

1. DevTools Network tab, click Thresholds, see which request returns 401
2. Check backend logs (staging) for the failing endpoint + path
3. If 401 is legit (token expired), move the auto-logout behaviour to
   refresh the token first before clearing
4. If 401 is spurious (backend bug), fix the handler

## Acceptance

- Clicking Thresholds tab loads the reference-range editor without
  clearing the auth token
- Session survives navigation between all settings tabs
