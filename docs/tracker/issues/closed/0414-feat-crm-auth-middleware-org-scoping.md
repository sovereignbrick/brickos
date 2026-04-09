---
number: 414
title: "feat: CRM auth middleware + org-scoping on protected routes"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, auth]
created: 2026-04-09
sprint: 036
points: 3
blocked_by: [404]
---

Actix-web middleware for JWT verification and org-scoping on all protected CRM routes.

Split from #404 (which now covers auth handlers). This issue covers only the middleware layer.

## Implementation

- Middleware runs on all `/api/v1/*` routes EXCEPT `/api/v1/auth/*` (public auth routes)
- Extracts Bearer token from Authorization header
- Verifies JWT via `brickos_auth::jwt::verify(&token, &config.jwt_secret)`
- Fetches User from platform pool: `SELECT * FROM users WHERE id = $1`
- Fetches OrgMember from platform pool to get org_id + role
- Injects `AuthContext { user_id, org_id, role }` into request extensions
- Returns 401 for missing/invalid/expired token

## AuthContext

```rust
pub struct AuthContext {
    pub user_id: Uuid,
    pub org_id: Uuid,
    pub role: String,        // "admin", "member", "editor"
    pub display_name: String,
}
```

## Org-Scoping Rules

- Every CRM query MUST include `WHERE org_id = $auth.org_id`
- Admin endpoints additionally check `role = 'admin'`
- Org A's user querying CRM data gets only their org's data (empty list, not 403)
- Platform admins see stats only, never contact PII

## Acceptance Criteria

- Protected route without token -> 401
- Protected route with invalid JWT -> 401
- Protected route with valid JWT -> AuthContext injected, handler executes
- Auth routes (/signup, /login, etc.) work without token
- User from org A cannot see org B's contacts
