---
number: 587
title: "feat: Sovereign Link end-user skeleton (so APPS nav licensed tiles have pages)"
milestone: "Sprint 048+ -- Backlog"
labels: [feat, frontend, sovereign-link, p2]
created: 2026-04-20
priority: P2
estimate: 2d
---

The APPS nav registry (Sprint 046 #571) already registers Sovereign Link
as an available app, but the links point at `/platform/links` (platform
admin management) or are greyed out. There's no end-user page for a
licensed org to USE their links.

## Scope

Create minimal end-user pages at (using multi-app prefix from Sprint 047
#577):

- `{slug}.brickos.io/sovereign-link/` (or the apex alias) -- landing
  page: "Your links" list, create/edit/delete actions for org members
- `{slug}.brickos.io/sovereign-link/analytics` -- per-org link
  click-through stats

Reuses the existing `short_links` table with `app_key='sovereign-link'`
and `org_id` filter.

## Why not in Sprint 047

Sprint 047's theme is the URL routing refactor -- #577 moves the
existing SHI app to `/sovereign-health/*`, which is already a 3.5d
anchor. Adding a second app's end-user UI would balloon the sprint.

File this for Sprint 048 so the admin-nav "Licensed by BrickOS" greyed
state has a coherent target once we approve a customer for Sovereign
Link.

## Acceptance

- Org member on a licensed org can list + create short links via their
  tenant subdomain
- Click analytics show org-scoped counts (not cross-org leakage)
- Nav registry entry at `src/lib/admin-nav/apps/sovereign-link.ts`
  points at the real routes, `visibleWhen: 'installed'` gate works
- No platform-admin-only flows leak into end-user scope
