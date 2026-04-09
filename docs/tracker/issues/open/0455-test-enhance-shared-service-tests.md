---
number: 455
title: "test: enhance shared service tests for brickos/org/consumer layers"
milestone: "Sovereign Health Intelligence -- Production Quality"
labels: [testing, platform-elevation]
created: 2026-04-10
priority: P1
sprint: 039
---

After platform elevation (two-pool, shared crates), verify all three layers work correctly:

## brickos layer
- Auth flow end-to-end (signup, login, MFA, refresh, logout)
- Service accounts (create, rotate, validate)
- Billing (tier assignment, stripe webhooks)
- Notifications (ntfy + telegram)

## Organization layer
- Data isolation between orgs
- Admin vs member permissions
- Multi-org membership
- org_apps enablement

## Consumer layer (SHI)
- Measurements CRUD via correct pool
- Import pipeline (PDF, screenshot, CSV)
- Marker matching + calculated markers
- Dr. Alex with health context
- Affiliate tracking
