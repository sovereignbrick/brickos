# Sovereign Health v0.43.0 Release Notes

**Release date:** 2026-04-20 (staging RC pass), 2026-04-2X (production)
**Sprints:** 045 (Domain Realignment) + 046 (Unified Admin Home)
**Git:** commit `develop` @ release tag `v0.43.0`

## Highlights

- **Two-plane white-label architecture.** Tenants now have two domains:
  `{slug}.brickos.io` for the admin plane (org-admin UI, scope banner
  for BrickOS platform admins) and `{slug}.sovereignhealth.io` for the
  SHI end-user app. Wildcard nginx blocks + LE wildcard certs cover
  both.
- **Unified admin home at `/platform`.** The old `/org/*` silo has been
  folded into `/platform/org/*`. `/admin/*` has been removed. A
  role-aware + plane-aware + context-aware sidebar now drives all
  BrickOS admin flows.
- **Declarative APPS nav registry.** Each BrickOS app contributes its
  org-scoped settings via a single file under
  `src/lib/admin-nav/apps/{app}.ts`. Sovereign Health ships licensed
  with Email + AI Config; Sovereign Link + Sovereign Voice ship as
  greyed "Licensed by BrickOS" placeholders.
- **Naming consistency.** User-facing labels use `Sovereign Health` (not
  `SHI`), aligning with `Sovereign Link` and `Sovereign Voice`.
- **Plane-aware sessions.** Cookies scope to `.brickos.io` OR
  `.sovereignhealth.io` per plane (two sessions for users who use both).
  Cross-plane profile-menu entries (`Admin ↗` / `Open Sovereign Health ↗`)
  open the other plane in a new tab so the current session stays intact.

## Architecture

- **Design 025** -- SHI white-label domain realignment
- **Design 026** -- Unified admin home
- **Design 014, 015, 021, ADR-049** -- amended to cross-reference 025 + 026
- **Design 027 (Sprint 047)** -- multi-app URL prefixes (`/sovereign-health/*`)
  planned as follow-up; not in this release

## What changed (by area)

### Backend (`sovereign-health-backend` v0.43.0)

- `org_resolver.rs`: resolves orgs on both planes
  (`{slug}.brickos.io`, `{slug}.sovereignhealth.io`, plus their
  `.demo.*` staging variants). `PLATFORM_DOMAINS` extended to include
  all specific sovereignhealth.io hosts.
- `/org-settings/apps` returns canonical app_keys
  (`sovereign-health`, `sovereign-link`, `sovereign-voice`) matching
  `short_links.app_key` / `brickos.org_apps.app_key`.
- No database migrations. No breaking JSON changes.

### Frontend (`sovereign-health-frontend` v0.43.0)

- `src/lib/plane.ts` -- new. `getPlane`, `isAdminOnlyPath`,
  `isEndUserOnlyPath`, `swapPlaneHost`, `planeRedirectTarget`.
- `src/components/plane-gate.tsx` -- client component mounted in the
  root layout. Redirects across planes when the current path doesn't
  belong.
- `src/lib/admin-nav/` -- new declarative registry for the APPS
  sidebar section (see Design 026 §App plugin model).
- `src/lib/use-org-entitlements.ts` -- read the org's licensed apps.
- `src/app/login/page.tsx` -- post-login landing is plane-aware:
  admin plane -> `/platform/org`, end-user plane -> `/dashboard`.
  Checks `!user` before `isDemoOnly` (Sprint 046 round 7 fix).
- `src/app/settings/page.tsx` -- plane-filtered tab list + plane-aware
  default tab.
- `src/app/platform/layout.tsx` -- ORGANIZATION + PEOPLE + APPS
  sections, JWT-sourced org_role via `useOrg()`, scope banner for
  platform_admin on an org subdomain.
- `/org/*` -> `/platform/org/*` redirects; `/admin/*` -> `/platform`
  (308 permanent, no BC window -- no users on v0.42).

### Nginx

- `nginx-sovereignhealth.conf`: new wildcard server blocks for
  `*.sovereignhealth.io` and `*.demo.sovereignhealth.io` with the
  Accept-header + `RSC: 1` header frontend routing fix.
- `app.sovereignhealth.io` migrated to same-origin path-mount
  (backend regex with Accept-header fix), aligning with `app.brickos.io`.
- `nginx-brickos-app.conf` wildcards kept but now the admin plane
  per Design 026.

### DNS + SSL

- Cloudflare: `*.sovereignhealth.io` (proxied) and
  `*.demo.sovereignhealth.io` (DNS-only) records added.
- Let's Encrypt wildcard certs issued via DNS-01 (separate
  `certbot-sovereignhealth-dns01` API token -- rotation tracked in
  #569).

## Upgrade path

This release requires coordinated backend + frontend + nginx deploy
because the two-plane model touches all three. Order:

1. Cloudflare DNS + LE wildcard certs (if not already done via #560 on
   staging)
2. `bash apps/health/sovereign-health/ops/deploy.sh production backend --confirm`
3. `bash apps/health/sovereign-health/ops/deploy.sh production frontend --confirm`
4. Nginx syncs as part of the deploy script; verify with
   `nginx -t && nginx -s reload` on the VPS if needed.
5. Smoke-test the production URLs (admin plane + end-user plane +
   cross-plane redirects + profile-menu links).

## Known issues / follow-ups

- **#569 P1** -- rotate the staging `certbot-sovereignhealth-dns01`
  Cloudflare API token (pasted in chat during #560 bootstrap)
- **#577 P1 (Sprint 047)** -- multi-app URL routing:
  `/sovereign-health/*`, `/sovereign-link/*`, `/sovereign-voice/*`
  prefixes. Design 027 captures the plan.
- **#576 P3 (deferred)** -- shared SSO across planes. Currently two
  cookies per user (one per plane); revisit if telemetry shows
  repeat cross-plane logins.
- **#578 P2** -- Playwright test-clinic member fixture so the authed
  regression tests can run without a `DEMO_ADMIN` that's also a
  test-clinic member.
- **#583 P2 (backlog)** -- multi-language email templates per org.
- **#584 P2** -- CSP `unsafe-eval` console warning from a bundled
  library. Non-breaking; needs source-map trace.

## Deprecations

- `/admin` -- hard-removed. 308 redirects to `/platform`.
- `/org/*` -- folded into `/platform/org/*`. 308 redirects.
- Legacy `app_key` values `shi`, `link` in `/org-settings/apps` JSON
  replaced by canonical `sovereign-health`, `sovereign-link`
  (plus new `sovereign-voice`). Any external consumers of that
  endpoint should update accordingly.

## Acknowledgements

RC testing by the user surfaced 15+ bugs across 8 rounds of hotfixes;
all P0s fixed before this release. Pre-existing `test_logo_present`
test flake in the backend email-templates module remains (unrelated to
Sprint 045/046 scope, Sprint 041+ drift).
