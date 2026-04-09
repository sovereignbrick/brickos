# ADR-044: Platform Pool is Read-Write for Auth Operations

**Status:** Accepted
**Date:** 2026-04-09

## Context

The two-pool architecture (ADR-041) gives each app two database connections:

- **Platform pool** -- connects to the `brickos` database (users, organizations, billing, service accounts)
- **App pool** -- connects to the app's own database (e.g., `scr` for CRM contacts, `shi` for health measurements)

During Sprint 036 planning, the platform pool was initially documented as "read-only" with 3 max connections. This was incorrect. When planning Sovereign CRM's auth stack, the question arose: how does a user register in a new app if the platform pool is read-only?

Investigation of SHI's auth handlers (`apps/health/sovereign-health/api/src/handlers/auth.rs`) revealed that **every auth operation writes to the platform database** through the PlatformPool:

| Operation | Platform DB Writes |
|-----------|-------------------|
| Registration | INSERT: users, user_preferences, user_profile, user_licenses, license_events, refresh_tokens, email_verifications, newsletter_subscribers |
| Login | INSERT: refresh_tokens. UPDATE: users.last_login_at |
| MFA setup | INSERT/UPDATE: user_mfa |
| MFA login | INSERT: email_verifications (MFA token). UPDATE: user_mfa (recovery code used) |
| Email verification | UPDATE: email_verifications (used_at), users (email_verified) |
| Password reset | INSERT: email_verifications (reset token). UPDATE: users (password_hash). UPDATE: refresh_tokens (revoke all) |
| Logout | DELETE: refresh_tokens |
| Token refresh | INSERT: refresh_tokens. DELETE: old refresh_tokens |

## Decision

The platform pool is **read-write** in all apps. Every app that authenticates users needs full INSERT/UPDATE/DELETE access to auth-related platform tables.

### Pool configuration per app

| Pool | Database | Max connections | Access |
|------|----------|----------------|--------|
| PlatformPool | `brickos` | 5 | **Read-write** (auth, billing, org management) |
| AppPool (PgPool) | `{prefix}` (e.g., `scr`) | 10 | Read-write (domain data) |

### Auth handler pattern

Every new BrickOS app gets the same auth handlers that write to the platform DB:

```rust
pub async fn signup(
    platform_pool: web::Data<PlatformPool>,  // writes to brickos DB
    app_pool: web::Data<PgPool>,             // not used for auth
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    // All user/auth writes go through platform_pool.0
    sqlx::query("INSERT INTO users ...")
        .execute(&platform_pool.0)
        .await?;
}
```

### What each pool owns

**Platform pool (brickos DB) -- auth + billing writes:**
- users, user_preferences, user_profile
- user_licenses, license_events
- refresh_tokens, email_verifications
- user_mfa
- newsletter_subscribers
- organizations, org_members
- subscriptions, payment_events
- service_accounts, service_account_keys

**App pool (app DB) -- domain data only:**
- App-specific tables (e.g., crm_contacts, crm_companies for CRM)
- App-specific search indexes
- No auth tables

## Alternatives Considered

- **Read-only platform pool + auth via platform-api:** Apps call `POST /platform/api/v1/auth/signup` on the platform API (port 9000) instead of writing directly. This would centralize auth but adds network latency, a single point of failure, and requires the platform-api to be running for any app to authenticate users. The SHI pattern of direct writes is simpler and proven.

- **Shared auth service (microservice):** A dedicated auth microservice handles all registration/login for all apps. Architecturally clean but adds operational complexity (another service to deploy, monitor, scale). Premature for the current scale (< 10 apps).

- **Read-only platform pool + separate auth pool:** Three pools per app (platform-read, platform-auth-write, app). Adds complexity without benefit -- the same database user needs write access either way.

## Consequences

**Easier:**
- Every app has a complete, self-contained auth stack from day one
- No dependency on a central auth service -- each app starts and authenticates independently
- Scaffold generator includes auth handler stubs that write to the platform pool
- Consistent pattern: auth writes always go through `PlatformPool`, domain writes through `PgPool`

**Harder:**
- Every app has write access to the platform database -- a bug in one app's auth handler could corrupt shared user data (mitigated by: same codebase, same patterns, same `brickos-auth` crate for hashing/JWT)
- Database connection count grows: each app adds 5 connections to the platform DB (mitigated by: PostgreSQL default limit is 100, 5 apps x 5 = 25 connections total)
- Auth handler code is duplicated across apps (mitigated by: scaffold generator produces identical stubs, eventual extraction to a shared `brickos-auth-handlers` crate when patterns stabilize)
