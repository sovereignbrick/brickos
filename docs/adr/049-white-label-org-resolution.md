# ADR-049: White-Label Org Resolution Architecture

**Date:** 2026-04-18 (original), amended 2026-04-19
**Status:** Amended (see note below, Design 025 covers Sprint 045 changes)
**Sprint:** 044 (original), 045 (amendment)

## Amendment 2026-04-19 -- two-plane tenant model

Sprint 045 (Design 025) splits each tenant across two planes:
- `{slug}.brickos.io` = per-tenant admin plane (org admin UI)
- `{slug}.sovereignhealth.io` = per-tenant end-user plane (SHI app)

Both hostnames resolve to the **same OrgContext** via the middleware described below. The frontend decides which UI surface to render based on the hostname (plane detection in `src/lib/plane.ts`).

The Domain Resolution list in §Decision is updated to match (see inline below).

## Context

BrickOS needs to support white-label deployments where a clinic operator's
users access the platform through the clinic's branded subdomain (e.g.
`sovereign-wellness.brickos.io`). The system must resolve which org a
request belongs to, load the org's branding, scope data access, and issue
org-aware JWTs -- all without requiring separate infrastructure per customer.

## Decision

### Domain Resolution (amended 2026-04-19)

A new actix-web middleware (`org_resolver.rs`) resolves the request's Host
header to an org context on every request:

1. `{slug}.sovereignhealth.io` or `{slug}.demo.sovereignhealth.io` -- lookup by `organizations.slug` (end-user plane, Sprint 045)
2. `{slug}.brickos.io` or `{slug}.demo.brickos.io` -- lookup by `organizations.slug` (admin plane, Sprint 044+045)
3. Custom domain (e.g. `app.custom-clinic.com`) -- lookup by `domain_mappings.domain` (end-user plane by default)
4. Known platform domains (`app.brickos.io`, `demo.brickos.io`, `app.sovereignhealth.io`, `api.sovereignhealth.io`, `sovereignhealth.io`, etc.) -- no org context
5. Any remaining hostname not matching above -- no org context

Results are cached in-memory with a 5-minute TTL to avoid per-request DB queries.

**Plane decision is made in the FRONTEND, not the resolver.** The resolver returns the same OrgContext regardless of which plane subdomain was used; `src/lib/plane.ts` decides what UI to render.

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
