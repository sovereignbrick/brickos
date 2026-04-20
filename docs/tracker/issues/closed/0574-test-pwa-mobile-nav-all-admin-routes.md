---
number: 574
title: "test: PWA + mobile nav works on all unified admin routes"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [test, pwa, mobile, p0, admin]
created: 2026-04-20
priority: P0
estimate: 0.5d
blocked_by: [570, 571, 572, 573]
parent: design-026
---

Per user requirement 2026-04-20: unified admin home must work on PWA + mobile browser. Dedicated verification pass across the new route tree.

## Scope

Test on iOS Safari (narrow viewport) + Chrome Android + installed PWA (both OSes):

### Navigation

- Mobile sheet / hamburger toggles on all `/platform/*` routes
- APPS section's nested app sub-items collapse/expand cleanly (touch)
- Scroll past first screen doesn't lock the sidebar open
- Tap outside closes the sheet

### Layout

- ORGANIZATION + APPS + PLATFORM sections all fit in narrow viewport without horizontal scroll
- Header filter dropdowns (app / org selectors) are reachable on mobile
- "Viewing as platform admin on {OrgName}" banner doesn't overflow

### Touch targets

- Every nav item is >= 44x44 CSS px (iOS HIG minimum)
- Group dividers (OVERVIEW / ORGANIZATION / APPS / PLATFORM) are visually distinct enough to not be mistaken for clickable items

### PWA

- App installable from both planes (manifest + icon)
- Service worker doesn't cache stale `/platform` routes after deploy (check `feedback_sw_cache_no_cache.md`)
- Works offline for the last-visited admin page (read-only); online-only actions queue or show a banner

### Cross-plane

- Profile menu "Admin" / "Open Sovereign Health" entries are tappable on mobile
- New-tab opening works inside the installed PWA (spec behaviour varies; document observed behaviour)

## Acceptance

- All items above checked on iOS Safari, Chrome Android, iOS installed PWA, Android installed PWA
- Any regressions from Sprint 045 Playwright suite are fixed
- Mobile Lighthouse score on `/platform` >= 90 for Performance + Accessibility + Best Practices
- Filed bugs for anything below the bar
