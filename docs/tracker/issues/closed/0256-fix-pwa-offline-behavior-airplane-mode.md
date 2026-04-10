---
number: 256
github_number: 476
title: "fix: PWA does not load in airplane mode — define expected offline behavior"
labels: [fix, frontend, pwa]
milestone: ux-and-onboarding
---

## Description

The PWA failed to load when tested on an airplane with airplane mode enabled. Need to define and implement the expected offline behavior.

## Current Behavior

- App shows blank/error page when offline
- Service worker may not be caching critical assets
- No offline fallback UI

## Expected Behavior

A PWA should provide a meaningful offline experience:

1. **App shell loads** — cached HTML/CSS/JS renders the UI frame
2. **Cached data visible** — last-synced markers, dashboard, profile
3. **Offline indicator** — clear banner: "You're offline — showing cached data"
4. **Graceful degradation** — features requiring network are disabled with explanation
5. **Sync on reconnect** — queue actions taken offline, sync when back online

## Requirements

- [ ] Audit current service worker caching strategy
- [ ] Ensure app shell (layout, navigation, styles) is pre-cached
- [ ] Cache API responses for dashboard/markers (stale-while-revalidate)
- [ ] Add offline fallback page with clear messaging
- [ ] Add network status indicator component
- [ ] Test: install PWA → load data → go offline → app still renders
- [ ] Test: airplane mode from cold start (no prior cache)
- [ ] Document expected offline capabilities per feature

## Notes

- PWA offline is a core value prop for sovereign/self-hosted users
- Related to #240 (PWA splash screen blank/black page)
