---
number: 550
title: "feat: org branding in main UI (nav, header, buttons)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, frontend, p1, white-label]
created: 2026-04-18
priority: P1
estimate: 0.6d
blocked_by: [548]
---

After login, the UI must reflect the org's branding via CSS custom
properties (--brand-primary, --brand-accent) injected from OrgContext.

## Acceptance

- Navbar shows org logo
- Primary buttons use --brand-primary color
- Page title shows org name
- Switching orgs updates all branding
- Default BrickOS theme when no org context
