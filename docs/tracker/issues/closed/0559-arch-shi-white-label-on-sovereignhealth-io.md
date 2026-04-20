---
number: 559
title: "arch: move SHI white-label end-user app to *.sovereignhealth.io (brickos.io becomes admin-only)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [architecture, p0, white-label, multi-domain, design-first]
created: 2026-04-19
priority: P0
estimate: 2d
blocked_by: []
supersedes: []
---

## The rule (decided 2026-04-19)

- **brickos.io** is the **admin plane**. Only BrickOS platform admins (who
  create new orgs) and org admins (who manage their own org settings) use
  it. No SHI end-user pages on brickos.io.
- **sovereignhealth.io** is the **SHI end-user app**. Patients,
  practitioners, and org members log in, view their dashboard, record
  measurements, and chat with Dr. Alex on sovereignhealth.io.
- **White-label orgs** get a subdomain under **sovereignhealth.io**:
  `test-clinic.sovereignhealth.io`, not `test-clinic.brickos.io`.
- **Custom domains** (e.g. `health.acme.com`) continue to CNAME to the
  platform and resolve via `domain_mappings` as today.

Sprint 044 built the wildcard on the wrong parent domain. This issue
captures the realignment plan. **No code changes until this plan is
reviewed and approved** -- design-first per memory
`feedback_design_first_sprints.md`.

## Why this is wrong today

Sprint 044 added `*.brickos.io` + `*.demo.brickos.io` wildcards that
serve the SHI frontend at root. That puts end-user pages
(/login, /dashboard, /measurements, /doctor-chat) on the admin domain,
blurring the plane separation.

Design 021 §10b and Design 015 both frame brickos.io as the admin plane.
Sprint 044 did technically mention `*.brickos.io` in Design 021 §15.4 as
an option alongside custom domains, but the implementation landed
without explicitly designating it as the end-user channel -- the user
flagged this mismatch during RC1.

## Target domain matrix

| Domain | Serves | Role |
|---|---|---|
| `brickos.io`, `www.brickos.io` | BrickOS marketing site | Public |
| `app.brickos.io` | Platform admin (`/platform/*`) + org admin (`/org/*`) | Admin |
| `api.brickos.io` | Platform admin API (deprecated alias for path-mount) | Admin |
| `demo.brickos.io` | Staging of app.brickos.io (basic auth) | Admin |
| `status.brickos.io` | Gatus | Monitoring |
| **`sovereignhealth.io`** | SHI marketing site (unchanged) | Public |
| **`app.sovereignhealth.io`** | SHI end-user app -- default / no-org fallback | End-user |
| **`*.sovereignhealth.io`** | SHI end-user app, org-scoped via subdomain | End-user |
| `api.sovereignhealth.io` | Legacy api subdomain (kept for cross-origin BC) | End-user |
| **`*.demo.sovereignhealth.io`** | Staging of `*.sovereignhealth.io` (LE DNS-01 wildcard) | End-user |

Org admins can **still** log in on `app.brickos.io` to manage their org
(branding, members, domains, billing) -- brickos.io is not turned off
for them. But their end users go to `{slug}.sovereignhealth.io`.

## What changes

### 1. Nginx (`nginx-sovereignhealth.conf`)

Add two new server blocks mirroring the Sprint 044 structure but on
sovereignhealth.io:

- `server_name *.sovereignhealth.io` -> SHI frontend :3000 + backend
  same-origin, with the #556 Accept-header fix for /admin, /settings,
  etc. Passes `X-Org-Domain $host`.
- `server_name *.demo.sovereignhealth.io` -> staging variant, :3001 +
  :8081. LE wildcard cert via DNS-01 (same pattern as the existing
  `*.demo.brickos.io` cert).

The existing `app.sovereignhealth.io` block is special-cased to use the
legacy api-subdomain pattern (cross-origin). To keep behaviour
consistent, `{slug}.sovereignhealth.io` will use **same-origin** path
mount (like `*.brickos.io` does today). Two API base URLs coexisting
is acceptable -- the frontend already branches on hostname.

### 2. Nginx (`nginx-brickos-app.conf`) -- revert Sprint 044 wildcards

- Remove the `*.brickos.io` and `*.demo.brickos.io` server blocks from
  Sprint 044 #544 (the ones I added the Accept-header fix to in #556).
- Alternative: keep them but return a 302 redirect to the
  sovereignhealth.io equivalent (e.g.
  `test-clinic.brickos.io -> test-clinic.sovereignhealth.io`). Decide
  based on whether we want to catch bookmarks / old links gracefully.
  Recommend **302 redirect for 90 days, then remove**.
- `app.brickos.io` stays as today (platform admin + org admin UI).

### 3. Backend (`org_resolver.rs`)

- `PLATFORM_DOMAINS` currently includes `sovereignhealth.io` and the
  code at line 113 explicitly returns `None` for any
  `*.sovereignhealth.io`. Invert: resolve
  `{slug}.sovereignhealth.io` and `{slug}.demo.sovereignhealth.io` to
  the matching org.
- `brickos.io` subdomains should stop resolving to orgs. Treat
  `app.brickos.io`, `demo.brickos.io` as platform domains (already the
  case). If we keep 302 redirects for `{slug}.brickos.io`, no resolver
  change needed for those since nginx handles the redirect before the
  request reaches the backend.
- Cache keys, Cache-Control on `/api/v1/org/branding`: unchanged.

### 4. Frontend (`src/lib/api.ts`)

- Cookie `domain` scope at lines 70-77: currently `.brickos.io` on
  brickos.io hosts. Add a parallel branch for `.sovereignhealth.io` so
  cross-subdomain session sharing works for org end users too.
- `API_BASE` detection at lines 55-63: `*.sovereignhealth.io`
  (including org subdomains) becomes **same-origin** (`return ''`).
  `app.sovereignhealth.io` can either migrate to same-origin or keep
  using `api.sovereignhealth.io` -- decide based on whether we want one
  behaviour across all sovereignhealth.io hosts.

### 5. Frontend (`src/lib/org-context.tsx`, `src/app/login/page.tsx`, navbar)

No logic changes. The branding fetch is already relative-path and
works on any host. The login page already shows org branding when
`org.isOrg` is true. The navbar already renders org logo when
applicable.

### 6. Org admin UI on `app.brickos.io`

Sprint 044 already added `/org/*` pages under
`apps/health/sovereign-health/frontend/src/app/org/`. These remain, but
they should now be mentally scoped to brickos.io:

- Org admin logs in at `app.brickos.io/login`
- Lands on `app.brickos.io/org/{slug}/dashboard` (or similar)
- Manages branding, members, domains, billing, app toggles
- A "Visit your SHI app" link takes them to
  `{slug}.sovereignhealth.io/login`

The backend should allow `org_admin` role users to authenticate on
brickos.io AND on sovereignhealth.io subdomains (they may need both).
Confirm this is already the case or file a sub-issue.

### 7. DNS (Cloudflare, `sovereignhealth.io` zone)

- Add `*.sovereignhealth.io` A record -> VPS IP (proxy on / orange cloud)
- Add `*.demo.sovereignhealth.io` A record -> VPS IP (grey cloud / DNS-only;
  Cloudflare free Universal SSL doesn't cover deeper wildcards per memory
  `feedback_cloudflare_universal_ssl_wildcard_depth.md`)
- Keep existing `app`, `api`, `demo`, `api-demo`, `www-demo`, `dev`
  A records as-is (specific subdomains take priority over wildcard).
- Remove `*.brickos.io` wildcard from Cloudflare `brickos.io` zone
  (if we go the "remove" route for brickos.io org subdomains) -- OR
  keep it so the 302 redirect in nginx works. Recommend **keep** for the
  redirect window.

### 8. SSL

- `*.sovereignhealth.io` -- Cloudflare Universal SSL covers single-label
  wildcards on the free tier. Origin cert at
  `/etc/letsencrypt/live/sovereignhealth.io/fullchain.pem` currently has
  specific SAN names; either reissue with a `*.sovereignhealth.io` SAN
  (via LE DNS-01, not HTTP-01, since the wildcard can't be validated via
  HTTP) or keep it non-wildcard and serve the wildcard block with a
  separate LE wildcard cert (mirrors what we did for
  `*.demo.brickos.io`). Recommend **separate LE wildcard cert** for
  symmetry with staging.
- `*.demo.sovereignhealth.io` -- LE wildcard cert via DNS-01.
  The existing Cloudflare API token (issue #555, scheduled for rotation)
  already has DNS:Edit on brickos.io. **Need to extend or add a
  separate token for sovereignhealth.io zone**. File as sub-issue.
- Certbot renewal hooks: already reload nginx.

### 9. RC checklist

All 71 RC items for Sprint 044 RC1 currently use
`test-clinic.demo.brickos.io`. They need to migrate to
`test-clinic.demo.sovereignhealth.io` (staging). Generate a
find-and-replace of the markdown file, re-run the manual test session.

### 10. Docs to update

- `docs/design/015` -- add explicit rule "brickos.io = admin plane,
  sovereignhealth.io = SHI end-user plane"
- `docs/design/021` -- rewrite §10b and §15.4 to specify
  `{slug}.sovereignhealth.io` as the white-label channel
- `docs/design/ADR-049` -- revise domain resolution priority
- Memory `reference_brickos_domains.md` -- add sovereignhealth.io subdomain map
- README / onboarding docs -- any mention of brickos.io white-label subdomains

### 11. Cookie / auth cross-domain concerns

Today a user logged in on `test-clinic.demo.brickos.io` has a cookie
scoped to `.brickos.io`. After the move, end-user cookies live on
`.sovereignhealth.io`, and org admin cookies live on `.brickos.io`.

Open question: what if one human is both an org admin AND an end user
of their own SHI? They'd need two sessions (one per domain). That's
acceptable and matches the plane separation.

## Acceptance

- `{slug}.sovereignhealth.io/login` shows org branding, org-scoped login
- `{slug}.sovereignhealth.io/dashboard`, `/measurements`, `/doctor-chat`
  etc. all work end-to-end for org members
- `app.brickos.io/login` -- both platform admins and org admins can log
  in; org admins land on their `/org/*` dashboard
- `app.brickos.io/platform/orgs` -- platform admin can still create orgs
- `{slug}.brickos.io` 302-redirects to `{slug}.sovereignhealth.io`
  (during the 90-day BC window), or 404s after that
- All RC checklist items pass on the new staging URLs
- Design docs updated, memory updated
- Production deploy after RC passes

## Sequencing

This is a minimum of 2 days of work once Sprint 044 RC1 closes. Options:

- **Option 1 (cleanest):** Stop Sprint 044 now, close it as "scope
  descoped", re-plan Sprint 045 as "Domain Realignment". No RC testing
  on brickos.io subdomains -- they're throwaway.
- **Option 2 (momentum):** Finish Sprint 044 RC on
  `{slug}.demo.brickos.io` as it exists (since login and admin/settings
  already work after #556 + #557), ship v0.42.0 to prod with the
  understanding that `*.brickos.io` is temporary. Follow up immediately
  with Sprint 045 to move everything to sovereignhealth.io.

Recommend **Option 1**. Shipping `*.brickos.io` as a white-label channel
to production -- even temporarily -- locks in URLs in bookmarks, email
templates, and customer memory. Cheaper to reroute now before v0.42.0
ships.

## Out of scope for this issue

- Start9 / self-hosted white-label deployments (separate distribution)
- Onion routing subdomains for white-label (future)
- i18n of org admin UI role labels (Sprint 044 #550 covers this)
