---
number: 579
title: "bug: /measurements flickers / refresh loops on staging after login"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [bug, frontend, p0, rc-blocker]
created: 2026-04-20
priority: P0
estimate: 0.5d
blocked_by: []
---

Reported by user during Sprint 046 RC #18 on 2026-04-20:

> "page loading, but flickering ongling as it looks like a refresh loop,
>  when i navigate avai and come back still flickering/refreshing"

Happens on `https://test-clinic.demo.sovereignhealth.io/measurements`
(end-user plane). Persists across navigate-away-and-back, so it's not a
transient network blip.

## Likely root causes

1. PlaneGate re-firing in a loop (unlikely; `/measurements` is in
   END_USER_ONLY_PREFIXES, and we're already on the end-user plane)
2. An infinite `useEffect` dependency chain on the page
3. `OrgContextProvider` fetch -> state update -> component that reads
   org -> re-fetch cycle
4. `useAuth` re-hydration causing child components to re-mount

## Debug plan

1. Open DevTools -> Network tab, navigate to /measurements, record
2. Look for repeating fetches with the same URL (expected culprit:
   `/api/v1/org/branding`, `/auth/me`, or `/measurements`)
3. If fetches ARE looping, track down the useEffect with the missing
   dep or the unstable reference
4. If fetches are NOT looping but the page visually flickers, check
   React re-render frequency (DevTools Profiler)

## Acceptance

- `/measurements` renders once on load, no continuous re-fetches in
  Network tab
- Tabbing away and back does not trigger a refresh
- No console errors on the page
