---
number: 548
title: "feat: OrgContext React provider"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, frontend, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.6d
blocked_by: [547]
---

Create OrgContextProvider that wraps the app and provides org branding
+ metadata to all components.

## Implementation

- New: frontend/src/lib/org-context.tsx
- Pre-login: fetches /api/v1/org/branding for login page theming
- Post-login: decodes JWT for org_id + org_role
- Provides: orgId, orgRole, orgSlug, branding, isOrgContext
- Replaces useBrand() hook
- OrgSwitcher writes through provider

## Acceptance

- useOrg() hook available in any component
- Login page renders with org branding before auth
- After login, org_id and org_role in context
- OrgSwitcher still works
- No flash of wrong branding on page load
