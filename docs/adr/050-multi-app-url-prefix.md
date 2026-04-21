# ADR-050: Multi-App URL Prefix Strategy

**Date:** 2026-04-21
**Status:** Accepted (shipped in Sprint 047, v0.44.0)
**Sprint:** 047 (Multi-App URL Routing)
**Design:** 027
**Related:** ADR-042 (three-char app prefix convention), Design 025 (domain realignment), Design 026 (unified admin home)

## Context

Sprint 045 (Design 025) gave each tenant two entry points, one per plane:

- `{slug}.brickos.io` -- admin plane
- `{slug}.sovereignhealth.io` -- end-user plane

Both resolve to the same `OrgContext`. Sprint 046 consolidated the admin
plane under `/platform/*`. This left the end-user plane's URL shape
unchanged: the SHI app ran at root-level paths (`/dashboard`,
`/measurements`, `/doctor-chat`, `/markers/*`, `/trends`, `/zones/*`,
`/practitioner`).

As BrickOS scales to multiple apps (Sovereign Link, Sovereign Voice,
future), the root-level shape no longer scaled:

- **Ambiguity.** `test-clinic.brickos.io/dashboard` doesn't say which
  app. An org admin clicking "Open app" in the profile menu can't tell
  what will open.
- **Collisions.** Sovereign Link needs a `/links` root. Sovereign Voice
  needs a recorder UI. Two apps can't both claim `/dashboard` or
  `/settings` at the root.
- **Half-shared pages.** `/settings` already mixes BrickOS account tabs
  with SHI extension tabs via plane-filtering (Sprint 046). This works
  for two levels but won't scale to N apps.

## Decision

**Every BrickOS app owns a URL prefix under a tenant subdomain.** End
users reach an app via `{slug}.brickos.io/{app-slug}/*`. Apps with a
dedicated branded public domain also serve the same UI, but internally
route to `/{app-slug}/*` for routing consistency.

For Sovereign Health:

```
{slug}.brickos.io/sovereign-health/dashboard           -- SHI home
{slug}.brickos.io/sovereign-health/measurements        -- list
{slug}.brickos.io/sovereign-health/measurements/new    -- add
{slug}.brickos.io/sovereign-health/doctor-chat         -- chat
{slug}.brickos.io/sovereign-health/markers/{slug}      -- marker detail
{slug}.brickos.io/sovereign-health/trends              -- trends
{slug}.brickos.io/sovereign-health/zones/{slug}        -- zone detail
{slug}.brickos.io/sovereign-health/practitioner        -- caseload
```

The branded end-user domain `sovereignhealth.io` keeps its clean root
URLs externally:

```
{slug}.sovereignhealth.io/dashboard        -- URL bar stays /dashboard
{slug}.sovereignhealth.io/measurements     -- URL bar stays /measurements
```

Internally, nginx rewrites `/dashboard` -> `/sovereign-health/dashboard`
before the frontend sees the request, conditional on `Accept: text/html`
or `RSC: 1`. API calls (`Accept: */*`) bypass the rewrite and go to the
backend unchanged.

Legacy root paths on brickos.io 308-redirect to the new prefix:
`/dashboard` -> `/sovereign-health/dashboard`, etc. The 308 is
suppressed on `sovereignhealth.io` via `missing: [{ type: 'host',
value: '.*sovereignhealth\\.io' }]` in next.config.ts, so the branded
URL bar stays clean.

Plane gating (`lib/plane.ts`): `END_USER_ONLY_PREFIXES` collapses from
seven entries (`/dashboard`, `/measurements`, ...) to one entry
(`/sovereign-health`). Every new app adds one entry.

## Consequences

### Positive

- **URLs describe themselves.** `/sovereign-health/measurements` names
  the app. Copy-paste a link and the recipient knows what will open.
- **Apps cannot collide.** `sovereign-link/links` and
  `sovereign-health/settings` are distinct even if they share a noun.
- **Plane gate stays tight.** One prefix per app keeps the end-user-only
  rule cheap to check.
- **Branded domain UX preserved.** Users of `sovereignhealth.io` never
  see the `/sovereign-health/` prefix in the URL bar.

### Negative

- **Mass file move.** 18 route files physically moved under
  `src/app/sovereign-health/`. 30+ source files had internal
  `<Link href>`, `router.push`, etc. updated.
- **Legacy redirects must live 90 days.** Users with bookmarks to
  `/dashboard` get a 308; after the audit window we remove the
  redirects from `next.config.ts`.
- **Nginx complexity.** Each SHI server block (app, demo, *, *.demo)
  gets a server-level conditional rewrite (`if $http_accept text/html
  or $http_rsc 1 -> rewrite`). The rewrite must be tested on every
  sovereignhealth.io subdomain after a config change.
- **New-app onramp cost.** Every app from now on must decide: (a) run at
  `/{app-slug}/*` only, or (b) also claim a branded domain with an
  nginx rewrite. Scaffold-app.sh (ADR-043) must encode both paths.

### Neutral

- **Search engine impact.** Old `/dashboard` -> new `/sovereign-health/dashboard`
  via 308. Search engines update their index. No impact expected for
  signed-in-only content.
- **Service worker cache.** New chunk filenames (content-hashed) mean
  old-bundle tabs get the "A newer version available" banner on
  deploy. Independent of the URL move.

## Alternatives considered

1. **Route groups only `(sovereign-health)`.** Keeps file-tree grouping
   without touching URLs. Rejected: doesn't solve the ambiguity problem
   that motivated the change.
2. **Subdomain-per-app** (`health.test-clinic.brickos.io`). Rejected:
   CF free Universal SSL only covers single-label wildcards
   (`*.brickos.io`); two-label wildcards would need ACM / self-managed
   certs. Not worth the ops cost for the clarity win.
3. **Keep root paths forever, add app-disambiguator via header**
   (e.g. `X-BrickOS-App`). Rejected: invisible to users, not
   bookmarkable, not sharable.
4. **Middleware rewrite only (Option 3 in Design 027)**. Keep source
   files at root and have Next.js middleware rewrite requests. Rejected:
   subtle bug surface (pathname vs URL bar diverges) and the codebase
   stops being self-explanatory.

## Implementation notes

Shipped in Sprint 047 (v0.44.0) in five phases:

- **A** -- physical route move + internal link sweep
- **B** -- 308 redirects in `next.config.ts`
- **C** -- nginx rewrites on all 4 `sovereignhealth.io` server blocks
- **D** -- plane-gate + cross-plane link updates (folded into A)
- **E** -- design/doc annotations

Playwright coverage: `sprint-047-url-routing.spec.ts` (25 tests) +
`sprint-047-admin-coverage.spec.ts` (28 admin pages). Both green on
staging against `demo.brickos.io` and `demo.sovereignhealth.io`.

## Follow-ups

- **90-day audit.** Around 2026-07-20, grep access logs for hits on
  legacy `/dashboard`, `/measurements`, etc. root paths. If hits are
  near-zero, remove the 14 308 entries from `next.config.ts` and the
  matching nginx rewrite blocks.
- **Next apps.** When Sovereign Link ships end-user UI, the same
  pattern applies: `/sovereign-link/*` on brickos.io, optionally a
  branded domain with an nginx rewrite to `/sovereign-link/*`.
- **Scaffold update.** `ops/scaffold-app.sh` needs a flag to generate
  the prefix + optional branded-domain rewrite pair.
