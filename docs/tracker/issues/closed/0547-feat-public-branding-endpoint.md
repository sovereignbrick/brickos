---
number: 547
title: "feat: public branding endpoint (unauthenticated)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.4d
blocked_by: [545]
---

Login page needs org branding before authentication. Create
`GET /api/v1/org/branding` that reads OrgContext from middleware
and returns the org's branding (logo, colors, name).

## Acceptance

- `Host: testclinic.brickos.io` GET /api/v1/org/branding -> org branding JSON
- `Host: app.brickos.io` -> default BrickOS branding
- No authentication required
- Cache-Control: public, max-age=300
