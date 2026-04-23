---
number: 595
title: "chore: platform admin top-bar cleanup -- drop redundant tabs, hide filters on pages that ignore them"
milestone: "Sprint 052 -- Backlog"
labels: [chore, ux, admin, p3]
created: 2026-04-23
priority: P3
estimate: 1-2h
---

## Observed (Sprint 051 RC by helmut)

On `app.brickos.io/platform/*`, the top bar has:
- Three navigation tabs: **Platform | Links | Apps**
- Two dropdown filters: **All Apps** (SHI, Sovereign Link, ...) and **All Orgs** (Individuals, BrickOS, Demo, ...)

On most platform pages (Home, Users, Services, Alerts, etc.) both the tabs and the filters are no-ops. Users click them expecting behavior, nothing happens, loss of trust.

## Root cause

1. **Top tabs are Sprint 046 placeholder nav** that the code comment at `src/app/platform/layout.tsx:601` explicitly marks as "to be replaced by Design 027 multi-app URL routing" -- never replaced. They duplicate items already in the sidebar.

2. **Filters are consumed by only 4 pages:**
   - `/platform/audit` (appFilter + orgFilter)
   - `/platform/analytics` (appFilter + orgFilter)
   - `/platform/members` PEOPLE section (orgFilter)
   - `/platform/links` (appFilter + orgFilter)
   
   Every other page reads `usePlatformFilter()` nowhere. The dropdowns render unconditionally in the layout, so they appear on pages they don't affect.

## Acceptance (Option A + B combined)

- [ ] Remove the "Platform | Links | Apps" header tab row from `src/app/platform/layout.tsx`. Left sidebar is the canonical nav.
- [ ] Move filter render out of the layout header into a small `<PlatformFilters />` component.
- [ ] Call `<PlatformFilters />` only from the 4 pages that consume it: `/platform/audit`, `/platform/analytics`, `/platform/members`, `/platform/links`.
- [ ] All other platform pages: top-right shows only the user profile menu (clean).
- [ ] Verify each of the 4 filter-using pages still works end-to-end.
- [ ] `pnpm exec tsc --noEmit` clean; vitest green; one Playwright spec update if needed (sprint-047-admin-coverage).

## Why P3 / Sprint 052

Pure UX polish. Zero behavior change for platform admins who already know which pages use the filters. Closes a "why doesn't this do anything?" surface that's been present since Sprint 046.

Found during Sprint 051 post-promote RC walk by helmut 2026-04-23.
