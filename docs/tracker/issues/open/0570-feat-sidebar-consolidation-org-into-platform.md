---
number: 570
title: "feat: sidebar consolidation -- fold /org/* into /platform/* (Phase A)"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [feat, frontend, p0, admin]
created: 2026-04-20
priority: P0
estimate: 1d
blocked_by: []
parent: design-026
phase: A
---

Phase A of Design 026. Move the org-admin page components from `/org/*` into `/platform/org/*` and extend `platform/layout.tsx:buildNavItems()` with a new ORGANIZATION section. Delete the standalone `/org` layout.

## Scope

1. Move `src/app/org/*` to `src/app/platform/org/*`:
   - `general/`, `branding/`, `members/`, `domains/`, `analytics/`, `affiliate/`, `billing/`, `apps/` (to be reworked in #571), `page.tsx` (Overview)
2. Extend `platform/layout.tsx:buildNavItems()`:
   - New `ORGANIZATION` section
   - Items: General, Branding, Members, Domains, Analytics, Affiliate, Billing
   - All gated with `o = isOrgOwner || isTechAdmin || isCommercialAdmin || isPlatform`
3. Remove `/org/layout.tsx`; its visible chrome (`{org.orgName} Settings` title etc.) moves into the `/platform/org/page.tsx` header
4. Add hard redirect: `/org/*` -> `/platform/org/*` (not for BC; keeps stale in-page links working during the refactor)
5. Remove dead code: unused imports in the old /org tree

## Cross-references

- Existing `/platform/branding`, `/platform/domains`, `/platform/members` may DUPLICATE the moved org pages. Audit each:
  - If the page is already org-scoped via `orgFilter` context, collapse into one route under `/platform/org/*`
  - If the page is platform-global (e.g. /platform/branding is about platform default branding, not org branding), keep both and rename for clarity

## Acceptance

- `{slug}.brickos.io/platform` shows ORGANIZATION section with 7 items (or n items depending on audit outcome)
- Each item renders the same UI as `/org/*` did on Sprint 045
- No duplicate pages in sidebar (the /platform copies of branding/domains/members are resolved)
- `/org/*` redirects to `/platform/org/*`
- Existing `/platform/*` tests still pass
- No console errors in dev or prod build
