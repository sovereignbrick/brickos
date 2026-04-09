---
number: 404
title: "feat: CRM auth handlers -- signup, login, MFA, password reset, email verify, token refresh"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, auth]
created: 2026-04-09
sprint: 036
points: 8
blocked_by: [390]
---

Implement the complete auth handler stack for Sovereign CRM, writing to the platform DB through PlatformPool. Port from SHI's `handlers/auth.rs` pattern.

**Note:** Auth middleware (JWT verification on protected routes) is in #414. This issue covers the public auth endpoints.

## Endpoints

- `POST /api/v1/auth/signup` -- register new user
- `POST /api/v1/auth/login` -- email + password, returns JWT (or mfa_token if MFA enabled)
- `POST /api/v1/auth/login/mfa` -- verify TOTP code or recovery code, returns JWT
- `POST /api/v1/auth/verify-email` -- mark email verified
- `POST /api/v1/auth/forgot-password` -- send password reset email
- `POST /api/v1/auth/reset-password` -- verify token + update password
- `POST /api/v1/auth/refresh` -- refresh JWT from refresh_token
- `POST /api/v1/auth/logout` -- revoke refresh token
- `GET  /api/v1/auth/me` -- return current user (protected)

## Platform DB Writes (all via PlatformPool)

**Registration (signup):**
- INSERT: users, user_preferences, user_profile, user_licenses, license_events
- INSERT: refresh_tokens (JWT refresh token)
- INSERT: email_verifications (verification token)
- INSERT: newsletter_subscribers (if consent given, with app_source = 'sovereign-crm')

**Login:**
- SELECT: users (credential check)
- INSERT: refresh_tokens
- UPDATE: users.last_login_at
- INSERT: email_verifications (MFA token if MFA enabled)

**Email Verification:**
- UPDATE: email_verifications (mark used)
- UPDATE: users (email_verified = true)

**Password Reset:**
- INSERT: email_verifications (reset token)
- UPDATE: users (password_hash)
- UPDATE: refresh_tokens (revoke all)

## Shared Crate Usage

- `brickos_auth::password::hash()` / `verify()` -- Argon2 password hashing
- `brickos_auth::jwt::create()` / `verify()` -- JWT with SCR_JWT_SECRET
- `brickos_auth::mfa::verify_totp()` -- TOTP verification against user_mfa
- `brickos_email` -- send verification and password reset emails

## Signup Flow

1. Validate email format, password strength (>= 8 chars), display name
2. Check email not already registered
3. Hash password with Argon2
4. INSERT user into platform DB
5. INSERT user_preferences, user_profile (defaults)
6. INSERT user_licenses (default free tier)
7. INSERT newsletter_subscribers (if consent, with app_source)
8. Generate email verification token
9. Send verification email via brickos-email
10. Issue JWT + refresh token
11. Return 201 with token

## Login Flow

1. Fetch user by email from platform DB
2. Verify password with Argon2
3. Check email_verified (if not, return 403 with resend option)
4. Check user_mfa exists:
   - If MFA enabled: return mfa_token (short-lived), require TOTP step
   - If no MFA: issue JWT + refresh token, return 200
5. UPDATE users.last_login_at

## MFA Login Flow

1. Verify mfa_token
2. Accept 6-digit TOTP code OR recovery code
3. Verify against user_mfa record
4. If recovery code: mark as used, warn on remaining count
5. Issue JWT + refresh token
6. Return 200

## Acceptance Criteria

- User can register with email, password, display name
- Verification email is sent (or logged in dev mode)
- User can log in after verifying email
- MFA flow: login returns mfa_token -> verify TOTP -> get JWT
- Password reset: request -> email -> token -> new password
- Token refresh works with valid refresh_token
- Logout revokes refresh token
- All writes to platform pool, not app pool
- Referral code detection (URL param) stored on user record
