# Design 025 -- Domain Realignment: SHI White-Label on sovereignhealth.io

**Status:** Draft
**Date:** 2026-04-19
**Supersedes:** Parts of Design 015 (§domain matrix) and Design 021 (§10b, §15.4)
**Related:** ADR-049 (white-label org resolution)
**Sprint:** 045 (Domain Realignment)

## The rule

Each tenant gets **two entry points**, one per plane:

- **`{slug}.brickos.io`** = per-tenant **org admin** interface (branding, members, billing, domains, app toggles). Only org admins and platform admins reach meaningful content here.
- **`{slug}.sovereignhealth.io`** = per-tenant **SHI end-user** app (login, dashboard, measurements, doctor-chat, settings). Patients, practitioners, and org members live here.
- **`app.brickos.io`** = platform admin landing (create orgs, list tenants). Not tenant-scoped.
- **`app.sovereignhealth.io`** = SHI end-user default / no-org fallback.
- Custom domains (`health.acme.com`) continue to resolve via `domain_mappings` (end-user plane by default; admin plane is only for `*.brickos.io` tenants).

Sprint 044 built `*.brickos.io` wildcards that served the end-user app at root. Sprint 045 keeps those wildcards but **restricts them to the admin plane** and adds parallel `*.sovereignhealth.io` wildcards for the end-user plane.

## Why now

Sprint 044 built `*.brickos.io` + `*.demo.brickos.io` wildcards that serve the SHI end-user app at root. This violates the plane separation above. The user flagged the mismatch during RC1 on 2026-04-19.

Sprint 044 is being **closed early** with white-label available on staging only (`test-clinic.demo.brickos.io`). v0.42.0 does **not** ship to production. Sprint 045 repurposes the brickos.io wildcards for the admin plane, adds sovereignhealth.io wildcards for the end-user plane, and ships the combined result as **v0.43.0**.

**RC checklist handling:** edit `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md` in place to add the v0.43.0 URL split; do not rename the file.

## What moves, what stays

### Stays (Sprint 044 work that is domain-agnostic)

| Component | File(s) | Status |
|---|---|---|
| JWT org claims (`org_id`, `org_role`) | `apps/health/sovereign-health/api/src/handlers/auth.rs` | Keep |
| `/api/v1/org/branding` public endpoint | backend handler | Keep |
| `OrgContextProvider` + `useOrg()` hook | `src/lib/org-context.tsx` | Keep |
| Login page org branding (#549, #557 fix) | `src/app/login/page.tsx` | Keep |
| Navbar org branding (#550) | `src/components/layout/navbar.tsx` | Keep |
| Per-org email templates (#551) | backend emailer + templates | Keep |
| RLS data isolation (#552) | migrations + policies | Keep |
| Practitioner dashboard (#553) | `src/app/practitioner/` | Keep |
| Per-org AI model override (#554) | backend AI handler | Keep |
| Org admin settings UI | `src/app/org/*` | Keep, stays on brickos.io |

### Moves (Sprint 045 work)

| Component | File(s) | Change |
|---|---|---|
| Wildcard nginx block (brickos.io) | `apps/platform/brickos-website/ops/nginx-brickos-app.conf` | **Keep** `*.brickos.io` + `*.demo.brickos.io` blocks, but restrict to admin plane (see Phase 5) |
| Wildcard nginx block (sovereignhealth.io) | `apps/health/sovereign-health/ops/nginx-sovereignhealth.conf` | **Add** `*.sovereignhealth.io` + `*.demo.sovereignhealth.io` blocks with #556 Accept-header fix |
| Org resolver | `apps/health/sovereign-health/api/src/middleware/org_resolver.rs` | Resolve BOTH `{slug}.sovereignhealth.io` and `{slug}.brickos.io` (brickos.io already works post-Sprint 044); still return None for `app.*` and `demo.*` platform hosts |
| Frontend plane detection | `src/lib/plane.ts` (new) or inline in layout | When host is `*.brickos.io`, render admin plane only (login + `/org/*` + `/platform/*`); when `*.sovereignhealth.io`, render end-user plane only |
| Frontend cookie domain | `src/lib/api.ts:70-77` | Already scopes cookie to `.brickos.io`; ADD `.sovereignhealth.io` branch so sessions work across both planes with separate cookies |
| Frontend API_BASE | `src/lib/api.ts:55-63` | Same-origin for all of `*.sovereignhealth.io` (after #562) and unchanged for `*.brickos.io` |
| RC checklist | `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md` | Edit in place: split tests into admin-plane (`*.demo.brickos.io`) and end-user-plane (`*.demo.sovereignhealth.io`) sections |
| Design docs | `docs/design/015`, `docs/design/021`, `docs/design/ADR-049` | Rewrite domain matrix + §10b + §15.4 + resolution priority to reflect two-plane model |
| Memory | `reference_brickos_domains.md` | Two-plane rule + updated domain map |

## Target domain matrix

| Domain | Serves | Ports | Cert | SSL |
|---|---|---|---|---|
| brickos.io, www.brickos.io | Marketing site | static | CF origin | |
| app.brickos.io | Platform admin + org admin (path-mount backend) | 3000/8080 | CF origin | |
| demo.brickos.io | Staging of app.brickos.io (basic auth) | 3001/8081 | CF origin | |
| api.brickos.io, api-demo.brickos.io | Legacy API subdomains | 8080/8081 | CF origin | |
| status.brickos.io | Gatus | 8082 | CF origin | |
| sovereignhealth.io, www.sovereignhealth.io | SHI marketing site | static | LE | |
| **app.sovereignhealth.io** | SHI end-user app, no-org / default fallback | 3000 | LE | frontend only, legacy api-subdomain pattern |
| **`*.sovereignhealth.io`** | **SHI end-user app, org-scoped (new)** | 3000/8080 | LE wildcard (DNS-01) | same-origin path-mount like app.brickos.io today |
| **`*.demo.sovereignhealth.io`** | **Staging of the above (new)** | 3001/8081 | LE wildcard (DNS-01) | same as above |
| api.sovereignhealth.io | Legacy SHI backend subdomain | 8080 | LE | |
| **`*.brickos.io`** | **Per-tenant ORG ADMIN UI (kept, scoped)** | 3000/8080 | CF origin | admin plane only |
| **`*.demo.brickos.io`** | **Staging of the above (kept, scoped)** | 3001/8081 | LE wildcard | admin plane only |

### `*.brickos.io` restriction (formerly "decommission")

Decision 2026-04-19: `*.brickos.io` is **kept**, but the frontend and nginx only serve admin-plane pages on those hostnames. Paths like `/dashboard`, `/measurements`, `/doctor-chat` render the end-user app on `*.sovereignhealth.io` and redirect / 404 / hide on `*.brickos.io`.

Admin-plane paths on `{slug}.brickos.io`:
- `/login` -> org admin login
- `/org/*` -> org admin dashboard, settings, members, branding, billing, domains, etc.
- `/platform/*` -> visible only to users with the `platform_admin` role (created-from-any-org for management)
- Everything else -> 404 or redirect to the sovereignhealth.io equivalent

End-user-plane paths on `{slug}.sovereignhealth.io`:
- `/login` -> end-user login (same backend, org-scoped)
- `/dashboard`, `/measurements`, `/doctor-chat`, `/settings`, etc. -> full SHI app
- `/org/*` and `/platform/*` -> not exposed; if visited, redirect to brickos.io equivalent or 404

## Phases

### Phase 0 -- Sprint 044 closeout
- Mark Sprint 044 as closed with this caveat: "features built, wildcard routing on wrong domain, ship deferred to Sprint 045"
- Do NOT deploy v0.42.0 to production
- Leave staging on `*.demo.brickos.io` as-is (RC testing can continue on it informally, but the 71-item checklist is paused)

### Phase 1 -- DNS + SSL
- Cloudflare: add `*.sovereignhealth.io` A record (proxy on)
- Cloudflare: add `*.demo.sovereignhealth.io` A record (grey cloud, DNS-only)
- Cloudflare: extend or create a new API token scoped to `DNS:Edit` on the `sovereignhealth.io` zone (currently only brickos.io is covered, per #555 context)
- Certbot: DNS-01 wildcard for `*.sovereignhealth.io`
- Certbot: DNS-01 wildcard for `*.demo.sovereignhealth.io`
- Renewal hooks in place (same pattern as current `*.demo.brickos.io`)

### Phase 2 -- Nginx
- Add `*.sovereignhealth.io` server block in `nginx-sovereignhealth.conf` -- same-origin path-mount, with #556 Accept-header fix baked in from the start
- Add `*.demo.sovereignhealth.io` staging block
- `sites-enabled/sovereignhealth.conf` must be a symlink to `sites-available/` (audit now, don't repeat the #558 silent-no-op bug)

### Phase 3 -- Backend
- `org_resolver.rs`: invert the `.sovereignhealth.io` short-circuit at line 113 -- resolve instead
- `PLATFORM_DOMAINS`: remove `sovereignhealth.io` (or at least `app.sovereignhealth.io` stays as platform domain; `{slug}.sovereignhealth.io` resolves)
- `PLATFORM_DOMAINS`: keep `app.brickos.io`, `demo.brickos.io` as platform
- Add integration test: `resolve_domain("test-clinic.sovereignhealth.io", pool, cache)` returns the correct OrgContext

### Phase 4 -- Frontend
- `api.ts:55-63` API_BASE: `{slug}.sovereignhealth.io` -> same-origin (`return ''`)
- `api.ts:70-77` cookie domain: `.sovereignhealth.io` branch
- No other frontend changes needed (OrgContext is relative-path already, login + navbar already use `useOrg()`)

### Phase 5 -- Restrict `*.brickos.io` to the admin plane
- Add plane detection in the frontend (new `src/lib/plane.ts` helper or inline in root layout) that reads `window.location.hostname` and determines `admin` (`.brickos.io`) vs `end-user` (`.sovereignhealth.io`)
- Hide admin-only or end-user-only routes from the opposite plane (via middleware, layout check, or route guards -- decide at implementation)
- On the backend, the same data model works for both planes; only the frontend gates what's shown
- Nginx: no changes needed beyond what's already in `nginx-brickos-app.conf` post-Sprint 044 (with my #556 Accept-header fix); the frontend plane detection does the gating
- Cloudflare: keep `*.brickos.io` wildcard A record (still needed for admin-plane tenant subdomains)

### Phase 6 -- RC + docs
- Migrate RC checklist URLs
- Re-run 71-item checklist on `test-clinic.demo.sovereignhealth.io`
- Update Design 015, Design 021, ADR-049, `reference_brickos_domains.md`

### Phase 7 -- Production ship as v0.43.0
- Bump version to v0.43.0 in `apps/health/sovereign-health/api/src/lib.rs` and package.json for frontend (see `feedback_version_bump_production.md`)
- `bash ops/deploy.sh production` for backend, frontend, nginx
- Verify:
  - Platform admin at `app.brickos.io/platform/orgs`
  - Org admin at `{slug}.brickos.io/org/*`
  - End user at `{slug}.sovereignhealth.io/dashboard`
  - Cross-plane redirects / hiding works
- Announce go-live

## Acceptance (Sprint 045 success criteria)

- `app.brickos.io/login` + `app.brickos.io/platform/orgs` -- platform admin can create orgs
- `{slug}.brickos.io/login` + `{slug}.brickos.io/org/*` -- org admin manages their org (branding, members, billing, domains, etc.)
- `{slug}.sovereignhealth.io/login` -- end-user login with org branding
- `{slug}.sovereignhealth.io/dashboard`, `/measurements`, `/doctor-chat`, `/settings` -- end-to-end SHI app
- Visiting `/dashboard` on `{slug}.brickos.io` redirects to `{slug}.sovereignhealth.io/dashboard` (or 404s)
- Visiting `/org/*` on `{slug}.sovereignhealth.io` redirects to `{slug}.brickos.io/org/*` (or 404s)
- Custom domain (`health.acme.com`) still works via `domain_mappings` (end-user plane)
- RC checklist (edited in place) passes all admin-plane and end-user-plane items on staging
- Design docs updated
- v0.43.0 tag lands on prod

## Resolved decisions (2026-04-19)

1. `*.brickos.io` disposition: **keep**, restricted to admin plane (not decommissioned)
2. `app.sovereignhealth.io`: **migrate to same-origin path-mount** (#562)
3. Version: **v0.43.0**
4. RC checklist: **edit in place**, don't rename
5. Org admin + end user is the same human: they get two sessions (one per plane), each with cookies scoped to its parent domain. Acceptable.

## Out of scope

- Start9 / self-hosted white-label deployments
- Onion subdomain routing for white-label
- i18n of org admin role labels (already handled in Sprint 044)
