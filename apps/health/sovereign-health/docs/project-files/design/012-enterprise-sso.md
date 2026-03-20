# Design: Enterprise SSO (Single Sign-On)

**Issue:** Backlog (Sprint 004 P-BL research item)
**Milestone:** Auth Modernization / Horizon Tier
**Status:** Draft
**Date:** 2026-03-19
**Related:** [001-oauth-social-login.md](001-oauth-social-login.md)

## BrickOS Identity Role

BrickOS is a **Service Provider (SP)** / Relying Party — it consumes identity from external sources, it does not issue identity for third parties. The identity architecture:

| Role | What it means | BrickOS? |
|---|---|---|
| Identity Provider (IdP) | Issues tokens that other apps trust (Google, Azure AD, Okta) | **No** — BrickOS does not issue identity tokens for external systems |
| Service Provider (SP) | Trusts tokens from IdPs to authenticate users | **Yes** — BrickOS trusts Google, Apple, and org IdPs |
| Own auth | Email/password + MFA managed internally | **Yes** — BrickOS is its own IdP only for its own users |

BrickOS could become a platform-level IdP in the future if multiple apps (`apps/health/`, `apps/finance/`, etc.) share one identity via `platform/auth`. But that's a platform architecture decision, not needed for SSO.

## Problem

The current Horizon tier ($99.99/mo) targets "clinics and health professionals" with up to 10 team members. But a 3-person clinic and a 50-person hospital chain have fundamentally different identity needs. Without SSO support:

1. Creates friction for org admins managing team access
2. Prevents centralized user provisioning/deprovisioning (security risk — departed employees keep access)
3. Blocks adoption by enterprise healthcare customers who mandate SSO as a procurement requirement
4. Misses compliance expectations (ISO 27001, SOC 2) where centralized identity management is assumed

## Horizon Tier Structure

### The problem with a single Horizon tier

The current single `horizon` tier ($99.99/mo, 10 seats) can't serve the full range of organizational customers:

| Customer type | Example | Seats | SSO needed? | Price model |
|---|---|---|---|---|
| Small clinic | 3 practitioners | 2-10 | No — they all know the password | Fixed monthly |
| Wellness center | 8 staff + receptionist | 5-15 | Maybe Google Workspace | Fixed monthly |
| Hospital department | Cardiology team | 10-100+ | Yes — IT policy mandates it | Per-seat |
| Lab chain / enterprise | National diagnostics company | 50-500+ | Yes — SAML required by procurement | Annual contract |

### Recommended: Horizon sub-tiers

Split the single Horizon tier into two organization-level tiers:

```
Individual tiers (unchanged):
  glimpse           → free
  focus              → $9.99/mo ($99.90/yr)
  insight            → $24.99/mo ($249.90/yr)
  clarity            → $49.99/mo ($499.90/yr)

Organization tiers (replace single "horizon"):
  horizon            → $99.99/mo flat, up to 10 seats
                       Team features, data sharing, org dashboard
                       Org roles (owner, admin, member)
                       No SSO — small clinics don't need it

  horizon_enterprise → custom pricing (contact sales)
                       Unlimited seats, per-seat billing
                       SSO (OIDC + SAML 2.0), SCIM provisioning
                       Domain verification, audit compliance
                       Dedicated support, SLA, onboarding
```

### Why SSO is the natural tier boundary

SSO is the clearest signal that a customer is enterprise:
- If they need SSO → they have an IT department → they expect enterprise pricing, SLA, onboarding
- If they don't need SSO → they're a small team → fixed monthly pricing is fine
- SSO-requiring customers also typically need SAML (not just OIDC), SCIM, audit trails, and custom contracts — all enterprise features

### DB impact: minimal

**No schema changes needed.** The existing `license_tiers` table supports this with a new row:

```sql
-- Add horizon_enterprise tier
INSERT INTO license_tiers (
    slug, name, description,
    price_monthly, price_yearly,
    max_markers, history_days, max_measurements,
    max_calculated_markers, max_templates, max_medications,
    chat_general_monthly, chat_lab_import_monthly, chat_med_import_monthly,
    csv_export, json_export, custom_thresholds, ai_insights,
    cohort_benchmark, api_access, self_hosted_hybrid,
    team_sharing, max_team_members,
    is_active, sort_order
) VALUES (
    'horizon_enterprise', 'Horizon Enterprise', 'Enterprise tier for hospitals and large organizations with SSO, SAML, and SCIM',
    NULL, NULL,  -- custom pricing (contact sales)
    -1, -1, -1, -- unlimited
    -1, -1, -1, -- unlimited
    -1, -1, -1, -- unlimited chat
    true, true, true, true,
    true, true, true,
    true, -1,   -- unlimited team members
    true, 60
);
```

The existing `organizations.tier_id` already references `license_tiers(id)`, so an org can be assigned to either `horizon` or `horizon_enterprise`.

Feature gating in `product_features` distinguishes what each tier gets:

```sql
-- Team features: both Horizon tiers
INSERT INTO product_features (slug, name, tier_slugs) VALUES
    ('team_sharing', 'Team Sharing', '{"horizon","horizon_enterprise"}'),
    ('org_dashboard', 'Organization Dashboard', '{"horizon","horizon_enterprise"}'),
    ('data_sharing', 'Data Sharing', '{"horizon","horizon_enterprise"}');

-- Enterprise-only features
INSERT INTO product_features (slug, name, tier_slugs) VALUES
    ('sso_oidc', 'SSO — OIDC', '{"horizon_enterprise"}'),
    ('sso_saml', 'SSO — SAML 2.0', '{"horizon_enterprise"}'),
    ('scim', 'SCIM Provisioning', '{"horizon_enterprise"}'),
    ('custom_sla', 'Custom SLA', '{"horizon_enterprise"}'),
    ('dedicated_support', 'Dedicated Support', '{"horizon_enterprise"}');
```

### Upgrade path

```
Individual user → Clarity (personal advanced)
                → Horizon (creates org, invites team)
                → Horizon Enterprise (org grows, needs SSO)
```

The `org_type` column maps naturally:
- `horizon` → `org_type: 'clinic'` or `'family'`
- `horizon_enterprise` → `org_type: 'enterprise'`

### Alternative approaches considered

**Option B: Seat-based single Horizon** — `$19.99/seat/mo`, SSO included at 10+ seats. Simple pricing but penalizes small clinics and the SSO threshold feels arbitrary.

**Option C: Horizon + add-on modules** — `$99.99/mo base + $49.99 SSO add-on`. Granular but requires a new `add_ons` table, complex Stripe product structure, and confusing checkout flow.

**Option A (recommended)** wins because: no schema changes, clean upgrade path, SSO is the natural enterprise boundary, and "contact sales" for enterprise is industry standard.

## How Enterprise SSO Differs from Social Login

| Aspect | Social Login (design 001) | Enterprise SSO (this doc) |
|---|---|---|
| Providers | Fixed set: Google, Apple, GitHub | Per-customer: each org brings their own IdP |
| Configuration | You register once with Google/Apple | Each org configures their IdP connection via admin UI |
| Who uses it | Any individual user | Users belonging to an organization |
| Routing | User clicks a provider button | Domain-based: `user@clinic-berlin.de` → org's IdP |
| Tier requirement | Any tier | Horizon Enterprise only |
| Protocols | OIDC only | OIDC + SAML 2.0 |
| Trust model | You trust Google/Apple | You trust the org's IdP for that domain |

Both share the same underlying token infrastructure (JWT + refresh tokens) and can reuse `user_oauth_accounts` for storing provider identities.

## Target Users

- **Horizon Enterprise** (`org_type: 'enterprise'`) — hospitals, lab chains, wellness companies with IT departments that require centralized identity management
- **Note:** Small clinics on the base `horizon` tier (`org_type: 'clinic'`) use email/password + team invites. SSO is an upgrade trigger to `horizon_enterprise`

## Protocols

### OIDC (OpenID Connect)

Modern, REST/JSON-based. Covers the majority of current IdPs:

| IdP | OIDC Support | Notes |
|---|---|---|
| Azure AD (Entra ID) | Yes | Most common in DACH healthcare |
| Google Workspace | Yes | Common for smaller clinics |
| Okta | Yes | Enterprise identity leader |
| Keycloak | Yes | Open-source, self-hosted |
| Auth0 | Yes | Developer-friendly |
| OneLogin | Yes | HR-focused |

**Flow:**
1. User enters email at login → app detects `@clinic-berlin.de` → looks up SSO connection
2. Redirect to org's IdP authorization endpoint (with PKCE, state, nonce)
3. User authenticates at IdP (password, MFA, whatever the org requires)
4. IdP redirects back with authorization code
5. Server exchanges code for ID token → validates signature via IdP's JWKS
6. Extract `sub`, `email`, `name` → find or create user → issue JWT + refresh token

### SAML 2.0

XML-based, older but still dominant in hospital IT and large enterprises:

| IdP | SAML Support | Notes |
|---|---|---|
| Azure AD (Entra ID) | Yes | Dual OIDC+SAML |
| ADFS (on-prem) | Yes | Legacy Windows Server environments |
| Shibboleth | Yes | Academic/research hospitals |
| PingFederate | Yes | Large healthcare enterprises |
| Keycloak | Yes | Can act as SAML IdP |

**Flow:**
1. User enters email → app detects domain → generates SAML AuthnRequest
2. Redirect (or POST) to IdP's SSO URL
3. User authenticates at IdP
4. IdP POSTs a SAML Response (signed XML assertion) to app's ACS URL
5. Server validates XML signature, extracts NameID + attributes
6. Find or create user → issue JWT + refresh token

**Why both?** Healthcare customers frequently require SAML. A clinic using Azure AD can use OIDC, but a hospital with on-prem ADFS or Shibboleth will only support SAML. Supporting both maximizes addressable market.

## Rust Crate Options

### OIDC

| Crate | Version | Downloads | Recommendation |
|---|---|---|---|
| `openidconnect` | 4.0.1 | ~6.3M | **Use this.** Same author as `oauth2` crate. Supports discovery, JWKS, PKCE, nonce. Already recommended for social login (design 001) — reuse for org SSO |
| `oauth2` | 5.0.0 | ~27.8M | Dependency of `openidconnect`, not needed directly |

### SAML 2.0

| Crate | Version | Downloads | Notes |
|---|---|---|---|
| `samael` | 0.0.17 | ~190K | Most mature Rust SAML 2.0 SP library. Supports AuthnRequest generation, Response parsing, XML signature validation. Used by [Cloudflare Workers](https://github.com/cloudflare/). Apache-2.0 license |
| `saml-rs` | — | Minimal | Less maintained, fewer features |
| `lightsaml` | — | No Rust equivalent | PHP/Python only |

**Recommendation:** `samael` for SAML 2.0. It's the only production-quality Rust SAML crate and covers SP-initiated SSO which is the standard flow.

### Alternative: SSO Proxy / Gateway

Instead of implementing SAML/OIDC directly, consider an SSO gateway that normalizes all providers to a single callback:

| Option | Type | Notes |
|---|---|---|
| **Ory Hydra** | Self-hosted OIDC server | Could act as a federation point — all IdPs connect to Hydra, app only talks to Hydra |
| **Dex** (CoreOS) | Self-hosted OIDC connector | Supports SAML→OIDC bridging |
| **WorkOS** | SaaS | Drop-in enterprise SSO. $0 up to 1M MAU. REST API, handles SAML/OIDC/SCIM. Abstracts all IdP complexity |

**Trade-off:** Direct implementation (`openidconnect` + `samael`) gives full control and no vendor dependency (aligns with sovereignty ethos). A gateway like WorkOS is faster to ship but adds a SaaS dependency for a privacy-focused health platform.

## Data Model

### New table: `sso_connections`

```sql
CREATE TABLE sso_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Domain routing
    email_domain VARCHAR(255) NOT NULL,      -- e.g., 'clinic-berlin.de'

    -- Protocol
    protocol VARCHAR(10) NOT NULL,           -- 'oidc' or 'saml'
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- OIDC configuration (NULL if protocol = 'saml')
    oidc_issuer_url TEXT,                    -- e.g., 'https://login.microsoftonline.com/{tenant}/v2.0'
    oidc_client_id VARCHAR(255),
    oidc_client_secret_enc BYTEA,            -- encrypted at rest
    oidc_scopes TEXT DEFAULT 'openid email profile',

    -- SAML configuration (NULL if protocol = 'oidc')
    saml_idp_entity_id TEXT,                 -- IdP entity ID
    saml_idp_sso_url TEXT,                   -- IdP SSO endpoint
    saml_idp_certificate TEXT,               -- IdP signing certificate (PEM)
    saml_sp_entity_id TEXT,                  -- Our entity ID (default: https://app.sovereignhealth.io)
    saml_name_id_format VARCHAR(100) DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

    -- Metadata
    configured_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(email_domain)                     -- one SSO connection per domain
);

-- Index for fast domain lookup at login time
CREATE INDEX idx_sso_connections_domain ON sso_connections(email_domain) WHERE is_active = true;
```

### Extended: `user_oauth_accounts` (from design 001)

The existing `user_oauth_accounts` table works for both social login and enterprise SSO. Add one column to link to the SSO connection:

```sql
ALTER TABLE user_oauth_accounts
    ADD COLUMN sso_connection_id UUID REFERENCES sso_connections(id) ON DELETE SET NULL;
```

- Social login: `sso_connection_id = NULL`, `provider = 'google'` / `'apple'`
- Enterprise SSO: `sso_connection_id = <uuid>`, `provider = 'oidc'` / `'saml'`

### Extended: `users`

```sql
ALTER TABLE users
    ADD COLUMN has_password BOOLEAN NOT NULL DEFAULT true;
```

SSO-only users have `has_password = false`. They must set a password before unlinking their SSO provider.

## API Changes

### SSO Login Flow (public)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/sso/discover` | Submit email → returns `{ sso_required: true, provider: "oidc", redirect_url: "..." }` or `{ sso_required: false }` |
| GET | `/auth/sso/callback` | OIDC callback — code exchange, user creation/login |
| POST | `/auth/sso/callback/saml` | SAML ACS (Assertion Consumer Service) — receives signed XML POST |

### SSO Admin (authenticated, org_owner/org_admin + Horizon Enterprise tier)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/org/:org_id/sso` | Get current SSO configuration |
| POST | `/org/:org_id/sso` | Create/update SSO connection (OIDC or SAML) |
| DELETE | `/org/:org_id/sso` | Remove SSO connection |
| POST | `/org/:org_id/sso/test` | Test SSO connection (dry-run auth flow) |
| GET | `/org/:org_id/sso/saml/metadata` | Download SP metadata XML (for SAML IdP configuration) |

### Login Flow Change

The existing `POST /auth/login` flow needs a domain check before password auth:

```
1. User submits email
2. Extract domain from email
3. Check sso_connections for active connection on that domain
4. If SSO connection found:
   a. OIDC: generate auth URL, return { sso_required: true, redirect_url }
   b. SAML: generate AuthnRequest, return { sso_required: true, redirect_url, method: "POST" }
5. If no SSO connection: proceed with normal email/password auth
```

## UI Changes

### Login Page
- After email input (before password), check domain via `/auth/sso/discover`
- If SSO required: show "Sign in with your organization" button, hide password field
- If not: show normal password field

### Settings → Organization (Horizon Enterprise tier, org_owner/org_admin)
- **SSO Configuration panel:**
  - Protocol selector: OIDC / SAML
  - OIDC: issuer URL, client ID, client secret fields
  - SAML: IdP SSO URL, IdP certificate upload, entity ID
  - Email domain field (auto-suggested from org billing email)
  - Test connection button
  - Download SP metadata button (SAML)
- **Team members list:** shows which users logged in via SSO vs password

### Settings → Security (individual user)
- Show "Signed in via SSO (clinic-berlin.de)" if SSO user
- Hide password change if `has_password = false`, show "Set a password" instead

### All labels i18n (EN + DE)

## Tier Gating

SSO is a **Horizon Enterprise-only feature**. Enforcement points:

1. **API:** `POST /org/:org_id/sso` checks org's `tier_id` → reject if not `horizon_enterprise`
2. **Frontend:** SSO config panel hidden for non-enterprise orgs, with "Upgrade to Horizon Enterprise" prompt
3. **Login flow:** `sso_connections` lookup only returns active connections for `horizon_enterprise` orgs (prevents SSO from breaking if org downgrades)
4. **Feature check:** `product_features` tier_slugs array contains only `horizon_enterprise` for SSO features (see Horizon Tier Structure section above)

## Security Considerations

### Domain Verification
Before activating SSO for a domain, verify the org actually owns it:
1. Org admin enters domain (e.g., `clinic-berlin.de`)
2. App generates a TXT record value (e.g., `brickos-verify=abc123`)
3. Admin adds TXT record to their DNS
4. App verifies via DNS lookup → activates SSO connection

This prevents an attacker from claiming `gmail.com` as their SSO domain.

### Account Linking (Pre-Account Takeover Prevention)
Same risk as social login (see design 001):
- If SSO email matches existing password account: **do not auto-link**
- Require the user to prove they own the existing account (enter password or click verification link)
- Use IdP's `sub` claim as primary identifier, not email

### SAML-Specific
- Validate XML signatures using the IdP's certificate (stored in `sso_connections`)
- Reject unsigned or expired assertions
- Validate `Destination`, `Audience`, and `InResponseTo` fields
- Protect against XML Signature Wrapping (XSW) attacks — `samael` handles this
- Clock skew tolerance: +-5 minutes on `NotBefore`/`NotOnOrAfter`

### Session Management
- SSO users should have shorter JWT expiry (e.g., 1 hour vs 2 hours for password users)
- Support IdP-initiated logout (SAML SLO / OIDC back-channel logout) in a future phase
- When an org disables SSO, existing sessions continue until JWT expires but refresh tokens are revoked

### Org Downgrade from Horizon Enterprise
If an org downgrades from Horizon Enterprise to base Horizon (or lower):
1. SSO connection marked `is_active = false`
2. Existing SSO users can still log in with password (if set) or must set one
3. SSO login attempts return "SSO is no longer available for this organization"
4. Team features (data sharing, org dashboard) remain available if downgrading to base Horizon

## SCIM (Future — Out of Scope)

SCIM (System for Cross-domain Identity Management) enables automatic user provisioning/deprovisioning from the IdP. When an employee is removed from Azure AD, they're automatically deactivated in BrickOS.

Not in scope for MVP SSO, but the `org_members` table is already structured to support it. Future work:
- `POST /scim/v2/Users` — create user
- `PATCH /scim/v2/Users/:id` — update/deactivate
- `GET /scim/v2/Users` — list users with filtering

## Implementation Phases

### Phase A: OIDC SSO (5 pts)
1. `horizon_enterprise` tier seed + `product_features` entries
2. `sso_connections` migration
3. Domain discovery endpoint (`/auth/sso/discover`)
4. OIDC flow using `openidconnect` crate (reuse from social login)
5. Org admin UI for OIDC configuration
6. Login page domain detection
7. Tier gating (`horizon_enterprise` only)

### Phase B: SAML 2.0 SSO (5 pts)
1. Add `samael` crate
2. SAML AuthnRequest generation
3. SAML Response parsing + validation at ACS endpoint
4. SP metadata endpoint
5. Org admin UI for SAML configuration (certificate upload, entity ID)

### Phase C: Domain Verification (2 pts)
1. DNS TXT record generation
2. Verification check endpoint
3. Admin UI for verification flow

### Phase D: Polish (3 pts)
1. SSO test connection (dry-run)
2. Org downgrade handling
3. "Set a password" flow for SSO-only users
4. Audit logging for SSO events

**Total estimated: 15 pts across 2-3 sprints**

## Dependencies

| Crate | Version | Purpose |
|---|---|---|
| `openidconnect` | 4.0.1 | OIDC provider communication (shared with social login) |
| `samael` | 0.0.17 | SAML 2.0 SP implementation |

Both are additive — no existing dependency conflicts.

## Existing Infrastructure to Leverage

| What exists | How it helps |
|---|---|
| `organizations` table with `org_type: 'clinic', 'enterprise'` | SSO connections belong to orgs |
| `org_members` with roles (`org_owner`, `org_admin`, `org_member`) | Permission model for SSO admin |
| `user_oauth_accounts` (design 001) | Stores provider identities for SSO users |
| `data_shares` table | Already supports org-scoped data sharing |
| `audit_log` with `org_id` column | SSO events auditable per org |
| `product_features` + tier gating | SSO feature flags per tier |
| JWT + refresh token infrastructure | SSO users get the same token pair |

## Open Questions

- [ ] Domain verification: DNS TXT record vs email to `admin@domain`? DNS is stronger but more technical for clinic admins.
- [ ] Allow multiple domains per org? (e.g., `clinic-berlin.de` + `clinic-muenchen.de`)
- [ ] SAML SLO (Single Logout): implement in MVP or defer? Most customers don't use it.
- [ ] Should SSO bypass MFA? (The IdP handles authentication — if the IdP enforces MFA, requiring it again in BrickOS is redundant. But some compliance frameworks require app-level MFA regardless.)
- [ ] SCIM provisioning: defer entirely or build the endpoint stubs?
- [ ] WorkOS as a shortcut? Handles SAML/OIDC/SCIM complexity but adds SaaS dependency.
- [ ] Horizon Enterprise pricing model: per-seat monthly, annual contract, or both? Need to define Stripe product structure for per-seat billing.
- [ ] Should base Horizon have a seat upgrade path (e.g., $9.99/additional seat beyond 10) or is the jump to Enterprise the only growth option?

## References

- [001-oauth-social-login.md](001-oauth-social-login.md) — Social login design (shared infrastructure)
- [openidconnect crate](https://crates.io/crates/openidconnect) — Rust OIDC client
- [samael crate](https://crates.io/crates/samael) — Rust SAML 2.0 SP
- [OASIS SAML 2.0 spec](http://docs.oasis-open.org/security/saml/v2.0/)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [WorkOS SSO](https://workos.com/docs/sso) — SaaS alternative reference
- [#91](https://github.com/sovereignbrick/brickos/issues/91) — OAuth social login issue
- [#70](https://github.com/sovereignbrick/brickos/issues/70) — Nostr NIP-98 login
- [#69](https://github.com/sovereignbrick/brickos/issues/69) — WebAuthn/FIDO2
