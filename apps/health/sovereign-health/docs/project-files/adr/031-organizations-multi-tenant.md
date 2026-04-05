# ADR 031: Organization-based multi-tenancy with role hierarchy

**Status:** Accepted
**Date:** 2026-03-16 (documented 2026-04-05)
**Context:** Sprint 016 -- organizations and multi-tenancy

## Context
The platform needs to support different organizational structures: individual users (personal), clinics with practitioners and patients, families sharing health data, and enterprise deployments. Each organization type has different needs for data sharing, billing, and access control.

## Decision
Organization-based multi-tenancy with automatic personal org creation:

- **`organizations` table**: name, slug, org_type (personal, clinic, family, enterprise, demo), tier_id, billing_email
- **`org_members` table**: user_id + org_id + role (org_owner, org_admin, org_member)
- **`app_roles` table**: per-app roles within an org (practitioner, patient, viewer, user) -- keyed by (org_id, user_id, app_key)
- **`data_shares` table**: explicit data sharing permissions between users within an org (owner -> granted_to, scope: read/read_write/full, with expiry)
- **Auto-created personal org**: Every new user gets a personal organization. Their `default_org_id` points to it. This means all users are always "in an org" -- simplifies billing and permission checks.
- **Tier lives on the org**: `organizations.tier_id` is the billing entity. Users inherit tier from their org.

## Alternatives Considered
- **Flat user model (no orgs)**: Rejected -- can't support clinic/family sharing or org-level billing
- **Row-level security (RLS)**: Considered for future -- current volume doesn't justify the complexity. Data isolation is enforced in application code via user_id/org_id filters.
- **Separate databases per org**: Rejected -- massive ops overhead for a solo-developer operation

## Consequences
- Every user is in at least one org (personal) -- no special-casing for individual users
- Org-level billing: one subscription per org, not per user. Clinics pay once for all practitioners.
- Data sharing is explicit and auditable (data_shares table with expiry)
- Affiliate tracking can be scoped to org level (Sprint 023: org owners see their members' referral stats)
- Future: RLS can be layered on top for defense-in-depth without schema changes
