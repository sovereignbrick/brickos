# Access Control -- Evidence Package

**Control:** JWT authentication, MFA, Row-Level Security, rate limiting, admin roles
**Regimes:** GDPR Art. 25 (data protection by design), GDPR Art. 32 (security), NIS 2 Art. 21
**Last verified:** 2026-04-06
**Verification method:** Code audit + Automated test

## Implementation

BrickOS enforces layered access control:

1. **JWT Authentication** -- HMAC-signed tokens with role/tier claims, 2h access + 60d refresh, secret rotation support via dual-secret fallback
2. **Row-Level Security (RLS)** -- PostgreSQL RLS policies on all user-data tables; queries only return rows matching `app.current_user_id` session variable
3. **Rate Limiting** -- In-memory sliding window rate limiter on auth endpoints (login, register, password reset)
4. **Admin Role Enforcement** -- Separate `AdminUser` extractor rejects non-admin requests at the middleware level
5. **MFA** -- TOTP-based two-factor authentication available for all users

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| JWT claims struct | `crates/brickos-auth/src/jwt.rs` | L16-23 | Claims: sub, role, tier, exp, iat |
| JWT creation | `crates/brickos-auth/src/jwt.rs` | L25-47 | Token signing with HMAC secret |
| JWT verification | `crates/brickos-auth/src/jwt.rs` | L49-57 | Token validation + expiry check |
| Secret rotation fallback | `crates/brickos-auth/src/jwt.rs` | L62-80 | Dual-secret verification for graceful rotation |
| Auth middleware extractor | `apps/health/sovereign-health/api/src/middleware/auth.rs` | L9-13 | AuthenticatedUser struct with user_id, role, tier |
| RLS session setup | `apps/health/sovereign-health/api/src/middleware/auth.rs` | L23-30 | Sets `app.current_user_id` via `set_config` |
| Admin role extractor | `apps/health/sovereign-health/api/src/middleware/auth.rs` | L44-62 | AdminUser -- rejects non-admin with 403 |
| Bearer token extraction | `apps/health/sovereign-health/api/src/middleware/auth.rs` | L64-108 | Header parsing, JWT verification, last_active update |
| Rate limiter | `apps/health/sovereign-health/api/src/services/rate_limit.rs` | L10-14 | Sliding window limiter keyed by IP/email |
| RLS migration | `apps/health/sovereign-health/api/migrations/20260317000084_row_level_security.sql` | -- | ENABLE ROW LEVEL SECURITY on user-data tables |
| Data access log migration | `apps/health/sovereign-health/api/migrations/20260317000085_data_access_log.sql` | -- | Audit table for data access events |

## Test References

| Test | File | Assertion |
|---|---|---|
| Auth integration tests | `apps/health/sovereign-health/api/tests/auth_test.rs` | JWT flow, token refresh, unauthorized access rejected |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-003 | PostgreSQL, pgAudit, RLS | Decision to use PostgreSQL RLS for tenant isolation |
| ADR-016 | GDPR Privacy Architecture | Overall data protection design including access control |

## Automated Verification

```bash
# Auth and access control tests
cargo test -p sovereign-health-api --test auth_test

# Verify RLS is enabled on user-data tables
psql -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true" sovereign_health

# Verify no endpoints bypass auth (grep for handlers without AuthenticatedUser)
grep -rn "pub async fn" apps/health/sovereign-health/api/src/handlers/ | grep -v "AuthenticatedUser\|AdminUser\|pub async fn health\|pub async fn public"
```

## Manual Verification Steps

1. Attempt API request without Bearer token -- verify 401 response
2. Attempt admin endpoint with non-admin token -- verify 403 response
3. Trigger rate limit on login endpoint -- verify 429 with Retry-After header
4. Query user-data table without setting RLS variable -- verify 0 rows returned
