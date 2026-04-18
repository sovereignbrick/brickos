# ADR-049: White-Label Org Resolution Architecture

**Date:** 2026-04-18
**Status:** Accepted
**Sprint:** 044

## Context

BrickOS needs to support white-label deployments where a clinic operator's
users access the platform through the clinic's branded subdomain (e.g.
`sovereign-wellness.brickos.io`). The system must resolve which org a
request belongs to, load the org's branding, scope data access, and issue
org-aware JWTs -- all without requiring separate infrastructure per customer.

## Decision

### Domain Resolution

A new actix-web middleware (`org_resolver.rs`) resolves the request's Host
header to an org context on every request:

1. `{slug}.brickos.io` -- lookup by `organizations.slug`
2. Custom domain (e.g. `app.custom-clinic.com`) -- lookup by `domain_mappings.domain`
3. Known platform domains (`app.brickos.io`, `demo.brickos.io`) -- no org context
4. Legacy domains (`*.sovereignhealth.io`) -- no org context

Results are cached in-memory with a 5-minute TTL to avoid per-request DB queries.

### JWT Org Claims

When a user logs in through an org subdomain:
- The login handler detects OrgContext from the middleware
- Queries `org_members` for the user's role in that org
- Issues a JWT with `org_id` and `org_role` claims (fields already exist in Claims struct)
- Non-members receive 403

When a user logs in through a platform/legacy domain:
- JWT issued without org claims (existing behavior, unchanged)

### Frontend Branding

- A public (unauthenticated) endpoint `GET /api/v1/org/branding` returns the org's
  branding JSONB based on the OrgContext middleware
- An `OrgContextProvider` React component wraps the app:
  - Pre-login: fetches branding for login page theming
  - Post-login: decodes JWT for org_id + org_role
- CSS custom properties (`--brand-primary`, `--brand-accent`) injected at document root
- Replaces the current `useBrand()` hostname-only detection

### Data Isolation

- RLS middleware extended to set `app.current_org_id` from JWT claims
- Data tables (measurements, markers, etc.) get an `org_id` column
- RLS policies enforce org boundaries with `IS NULL` fallback for individual users
- Backfill migration assigns org_id from org_members lookup

### Email Branding

- Template variables `{{org_logo_url}}`, `{{org_name}}` added to email wrappers
- Org branding populated from the org's JSONB when sending in org context
- Billing/license emails always use BrickOS branding (operator plane, not customer plane)

## Consequences

### Positive
- Zero per-customer infrastructure (shared containers, shared DB)
- New customer onboarding is a platform admin operation (create org + set branding + assign domain)
- Wildcard SSL via Cloudflare origin cert (already covers `*.brickos.io`)
- Individual (non-org) users unaffected by all changes

### Negative
- Every request pays the middleware cost (mitigated by 5-min cache)
- org_id column addition requires backfill migration on existing data
- Two branding systems coexist temporarily: `useBrand()` (hostname) and `useOrg()` (DB-driven)

### Risks
- RLS org_id backfill could break individual users if IS NULL fallback is wrong
- Wildcard DNS could interfere with specific subdomain records (Cloudflare prioritizes specific)
- OrgSwitcher cookie-based approach may conflict with new OrgContext provider

## Alternatives Considered

1. **Separate frontend per customer** -- rejected (doesn't scale, N deployments)
2. **Query parameter for org context** -- rejected (leaks org_id, ugly URLs)
3. **Subdomain-only, no custom domains** -- accepted as MVP; custom apex domains are Phase 5
4. **Client-side org detection only** -- rejected (backend must enforce data isolation)
