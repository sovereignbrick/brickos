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
   - `general/`, `branding/`, `domains/`, `analytics/`, `affiliate/`, `billing/`, `apps/` (to be reworked in #571), `page.tsx` (Overview)
   - **DO NOT** move `members/` -- it collapses into `/platform/members` (see #2 below)
2. **Collapse members into one unified list.** Per decision 2026-04-20: there is ONE members list for the entire platform. Each member has one or more roles (`member`, `org_owner`, `tech_admin`, `commercial_admin`, `platform_admin`).
   - Keep the single route at `/platform/members`
   - On `{slug}.brickos.io/platform/members` the org filter is locked to the current slug (pre-existing `isOrgLocked` context handles this)
   - On `app.brickos.io/platform/members` the platform admin can filter by any org or "All orgs"
   - Delete `src/app/org/members/` entirely; no page move
   - Nav item lives in the new PEOPLE section (see §Proposed nav in Design 026)
3. Extend `platform/layout.tsx:buildNavItems()`:
   - New `ORGANIZATION` section: General, Branding, Domains, Analytics, Affiliate, Billing (6 items)
   - New `PEOPLE` section: Members (single item)
   - All gated with `o = isOrgOwner || isTechAdmin || isCommercialAdmin || isPlatform`
4. Remove `/org/layout.tsx`; its visible chrome moves into `/platform/org/page.tsx`
5. Add redirect: `/org/*` -> `/platform/org/*` (keeps stale in-page links working during the refactor)
6. Remove dead code: unused imports in the old /org tree

## Cross-references

- `/platform/branding`, `/platform/domains`: audit whether these were platform-default branding/domains (keep) or always org-scoped duplicates (collapse into `/platform/org/*`)
- `/platform/members`: already the canonical members page (orgFilter context handles scope). Just ensure its role gating matches the new unified-roles model.

## Acceptance

- `{slug}.brickos.io/platform` shows ORGANIZATION (6 items) + PEOPLE (1 item) in the sidebar
- Each ORGANIZATION item renders the same UI as `/org/*` did on Sprint 045
- `/platform/members` works identically on both `app.brickos.io` (picks org) and `{slug}.brickos.io` (org locked)
- A member with multiple roles shows all roles in the members list and gets the most-permissive visibility in the sidebar
- No duplicate pages in sidebar
- `/org/*` redirects to `/platform/org/*`
- Existing `/platform/*` tests still pass
- No console errors in dev or prod build
