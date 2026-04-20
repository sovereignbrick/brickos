---
number: 546
title: "feat: org ID in JWT login flow"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, auth, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.5d
blocked_by: [545]
---

When a user logs in through an org subdomain, the JWT must include
org_id and org_role claims. The JWT Claims struct already has these
fields but they're never populated.

## Implementation

1. In auth.rs::login(), extract OrgContext from request extensions
2. If org present, query org_members for user's role
3. If not a member -> 403
4. Call create_jwt_with_org() instead of create_jwt()
5. Same for refresh token + MFA verification

## Acceptance

- Login via testclinic.brickos.io -> JWT with org_id + org_role
- Login via app.brickos.io -> JWT without org claims (unchanged)
- Non-member gets 403
- Token refresh preserves org context
