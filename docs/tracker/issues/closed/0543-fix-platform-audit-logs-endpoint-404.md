---
number: 543
title: "fix: platform audit logs endpoint returns 404"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [fix, platform, p2]
created: 2026-04-18
priority: P2
estimate: 0.25d
blocked_by: []
---

`/platform/audit` page shows "Error 404" for audit logs, app events,
and DB audit tabs. The admin audit endpoints are registered in lib.rs
but return 404 on staging/production.

## Acceptance

- GET /admin/audit/access-logs returns 200
- GET /admin/audit/events returns 200
- Frontend audit tab loads data
