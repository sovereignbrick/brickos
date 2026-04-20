---
number: 552
title: "feat: org-scoped data isolation (RLS audit + org_id filtering)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, security, p1, white-label]
created: 2026-04-18
priority: P1
estimate: 1d
blocked_by: [546]
---

Measurements and other data tables filter by user_id only, not org_id.
A practitioner in two orgs could see cross-org data.

## Implementation

1. Extend rls.rs to set app.current_org_id from JWT
2. Migration: ADD COLUMN org_id to measurements + other data tables
3. Backfill: org_id from org_members lookup
4. RLS policies with IS NULL fallback for individual users
5. All INSERT queries include org_id from JWT context

## Acceptance

- User in org A cannot see measurements from org B
- Individual users (no org) see only their own data (unchanged)
- Platform admins query across all orgs
- Backfill migration is idempotent
