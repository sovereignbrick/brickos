# Design: OAuth Social Login

**Issue:** [#91](https://github.com/sovereignbrick/brickos/issues/91)
**Milestone:** [Auth Modernization](https://github.com/sovereignbrick/brickos/milestone/14)
**Status:** Draft
**Date:** 2026-03-18

## Problem
Users must create a dedicated email/password account to use BrickOS. This adds friction at signup — especially for users who expect Google/Apple sign-in. It also blocks iOS App Store submission (Apple requires Sign in with Apple if other social logins exist).

## Current Auth Stack
- Email/password (Argon2 hashing)
- TOTP-based MFA (6-digit codes + recovery)
- JWT + refresh tokens (HTTP-only cookies)
- Rate-limited via Governor
- Key files: `crates/brickos-auth/`, `api/src/handlers/auth.rs`

## Approach

### Priority Providers
1. **Google** — OIDC, largest user base, quick win
2. **Apple** — required for App Store, OIDC-based

### Quick-Win Providers to Evaluate
3. **GitHub** — simple OAuth2 flow, developer audience overlap
4. **LNURL-auth** — Lightning Network login, no email needed, aligns with sovereignty ethos (similar to Nostr NIP-98 in #70)
5. **Microsoft** — if org/clinic support grows

### Flow
1. User clicks "Sign in with Google" → redirect to provider
2. Provider authenticates → callback with authorization code
3. Server exchanges code for ID token → extracts email + provider user ID
4. If account exists with that email → link provider and log in
5. If no account → create account (skip email verification, provider already verified)
6. Return JWT + refresh token as usual

## Data Model

```sql
CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,          -- 'google', 'apple', 'github'
    provider_user_id VARCHAR(255) NOT NULL, -- provider's unique user ID
    provider_email VARCHAR(255),            -- email from provider (may differ from account email)
    access_token_enc BYTEA,                 -- encrypted, for API access if needed
    refresh_token_enc BYTEA,                -- encrypted
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_user_id),
    UNIQUE(user_id, provider)
);
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/auth/oauth/:provider/start` | Generate auth URL, redirect to provider |
| GET | `/auth/oauth/:provider/callback` | Handle provider callback, create/link account |
| GET | `/auth/oauth/accounts` | List linked OAuth providers for current user |
| DELETE | `/auth/oauth/accounts/:provider` | Unlink a provider |

## UI Changes
- **Login page:** provider buttons below email/password form (Google, Apple icons)
- **Signup page:** same buttons, "Or sign up with..."
- **Settings → Security:** list linked providers with unlink option
- All labels i18n (EN + DE)

## Open Questions
- [ ] Rust crate: `openidconnect` (full OIDC) vs `oauth2` (lighter)? OIDC preferred since Google and Apple both support it.
- [ ] Store OAuth tokens encrypted or not at all? Only needed if we call provider APIs on user's behalf.
- [ ] Allow login with OAuth only (no password set)? Or require password as fallback?
- [ ] LNURL-auth: requires Lightning wallet — is the user base large enough to prioritize?

## References
- Related: [#70 Nostr NIP-98 login](https://github.com/sovereignbrick/brickos/issues/70)
- Related: [#68 PASETO tokens](https://github.com/sovereignbrick/brickos/issues/68)
- Related: [#69 WebAuthn/FIDO2](https://github.com/sovereignbrick/brickos/issues/69)
