---
number: 549
title: "feat: org branding on login page"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, frontend, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.4d
blocked_by: [548]
---

Login page must show the org's logo, primary color, and name
when accessed via the org's subdomain.

## Acceptance

- testclinic.brickos.io/login shows clinic logo, name, colors
- app.brickos.io/login shows BrickOS branding
- sovereignhealth.io/login shows SHI branding (backward compat)
- No layout shift when branding loads
- Works with base64 logos
