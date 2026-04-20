---
number: 586
title: "feat: build-ID cache invalidation signal (SW + client banner for stale versions)"
milestone: "Sprint 047 -- Multi-App URL Routing + Stability"
labels: [feat, stability, frontend, dx, p2]
created: 2026-04-20
priority: P2
estimate: 0.5d
---

During Sprint 046 RC testing, 3 of the 8 hotfix rounds wasted ~30 min
each because the user's browser served stale cached bundles via the
service worker. This issue adds a small build-ID signal that tells
the client "a newer build is live, reload to pick it up."

## Scope

1. **Backend `/health`** already returns `version`. Add a per-deploy
   unique build ID (e.g. git short SHA of main at build time) via a
   new field `build: "abc1234"`.

2. **Frontend client check** runs on a slow interval (e.g. every 60s
   while tab is focused):
   - GET `/health`
   - Compare response `build` field against the hardcoded `BUILD_ID`
     baked into the bundle
   - If different -> show a subtle top banner: "A newer version of
     BrickOS is available. [Refresh now]" / [Later]

3. **Service worker** (`src/sw.ts`) already sets `skipWaiting: true` +
   `clientsClaim: true` so once the SW updates, the next navigation
   gets the new code. The banner nudges the user to navigate/refresh.

4. **Build-time injection:**
   - Next.js `NEXT_PUBLIC_BUILD_ID` set to the git short SHA in
     `next.config.ts` (or `env:` block)
   - Rust `BUILD_ID` compile-time env var stamped into
     `lib.rs:VERSION` sibling, exposed via `/health`

## Acceptance

- `/health` response includes `build: "<short-sha>"`
- Fresh page load reads the baked `NEXT_PUBLIC_BUILD_ID`
- Background poll every 60s; mismatch -> banner
- Dismissing the banner stays dismissed for the current session only
  (re-appears next session until user refreshes and matches the build)
- No extra fetch on slow connections / offline
- Works on both planes + custom domains

## Non-goals

- Hard force-refresh without user consent
- Rollback detection (if build goes backwards, treat as normal update)

## Why this goes in Sprint 047

The multi-app URL routing refactor (#577) moves ~30 routes; RC iterations
will be painful if users keep hitting cached bundles. Shipping this first
halves the RC pain cost.
