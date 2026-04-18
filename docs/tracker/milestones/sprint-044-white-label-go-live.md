---
title: "Sprint 044 -- White-Label Go-Live"
status: active
opened: 2026-04-18
target: 2026-04-30
---

## Goal

Full branded white-label deployment for first customer. A clinic operator
creates an org in the platform admin, sets branding + domain, and their
users see a fully branded experience.

## Issues (21 total)

### Phase 0: Carry-over Stabilization (6)
- #540 deploy.sh chunked scp transfer (P1)
- #541 deploy.sh image name mismatch (P1)
- #542 E2E shared login session (P2)
- #543 Platform audit logs 404 (P2)
- #539 Migrate load_tier_features (P2)
- #490 Licensing dead code cleanup (P3, after #539)

### Phase 1: Infrastructure (1)
- #544 Wildcard DNS + nginx *.brickos.io (P0)

### Phase 2: Backend Org Resolution (3)
- #545 Domain-to-org resolution middleware (P0)
- #546 Org ID in JWT login flow (P0)
- #547 Public branding endpoint (P0)

### Phase 3: Frontend Org Context (3)
- #548 OrgContext React provider (P0)
- #549 Org branding login page (P0)
- #550 Org branding main UI (P1)

### Phase 4: Email + Data Isolation (2)
- #551 Per-org email templates (P1)
- #552 Org-scoped data isolation RLS (P1)

### Phase 5: Stretch (3)
- #553 Practitioner dashboard (P2)
- #554 Per-org AI model override (P3)
- #526 brickos.io frontend remaining (P2)
