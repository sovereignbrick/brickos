# Design 027 -- Multi-App URL Routing Under brickos.io

**Status:** Accepted 2026-04-20 -- shipped in Sprint 047 #577 (phases A/B/C/D)
**Date:** 2026-04-20
**Related:** 015 (Unified App Routing), 025 (Domain Realignment), 026 (Unified Admin Home)
**Sprint:** 047 (Multi-App URL Routing)

## Decisions ratified at Sprint 047 kickoff

Three open questions resolved before implementation (all options A per
pro/con review on 2026-04-20):

1. **Tenant root `/` on `{slug}.brickos.io`** -> redirects to `/platform`
   (admin plane default). Launcher grid deferred until app #2 ships.
2. **`/settings` split** -> BrickOS account tabs at `/settings`, SHI
   extension tabs at `/sovereign-health/settings`. Notifications, billing,
   locale stay master-level; health profile / thresholds / markers go
   under the app prefix.
3. **Session cookies** -> keep per-plane cookies, no app-level claim.
   URL is the app signal; no server-side context needed yet.

## Problem

Today every app served by the BrickOS platform shares the same URL tree under a tenant subdomain:

```
test-clinic.demo.brickos.io/dashboard          <- which app?
test-clinic.demo.brickos.io/measurements       <- SHI
test-clinic.demo.brickos.io/doctor-chat        <- SHI
test-clinic.demo.brickos.io/settings           <- ambiguous (SHI or other?)
```

`/dashboard`, `/settings`, `/measurements` are all SHI routes today, but the URLs don't say so. As BrickOS adds Sovereign Link, Sovereign Voice, and future apps, collisions and ambiguity compound:

- Sovereign Link needs a `/links` or `/l` UI. Currently `/platform/links` is the **admin** management of links (short-link catalog, analytics). What does the **end-user** experience look like? Another `/links` at the root?
- Sovereign Voice will have a recorder UI, a library, settings. Where do they live?
- `/settings` today mixes BrickOS master tabs with SHI extension tabs. Sprint 046 plane-filters them, but the URL still doesn't name the app.

Without explicit per-app prefixes, every new app either collides with existing routes or bloats a shared tree.

The user also flagged that "Open Sovereign Health ->" in the profile menu jumps to `/dashboard` -- the URL doesn't say which app is being opened.

## Decision

**Each app owns a URL prefix under brickos.io tenant subdomains.** End users reach an app via `{slug}.brickos.io/{app-slug}/*`. Apps with a dedicated public domain (sovereignhealth.io today) also serve the same UI at the apex, but internally route to `/sovereign-health/*` so the routing is consistent.

## Target URL matrix (tenant subdomain on brickos.io)

```
test-clinic.demo.brickos.io/                           -> app launcher / tenant home (new)
test-clinic.demo.brickos.io/login                       -> shared auth (plane-aware post-login destination)
test-clinic.demo.brickos.io/platform                    -> admin home (Design 026)
test-clinic.demo.brickos.io/platform/org/*              -> org admin
test-clinic.demo.brickos.io/platform/apps/*             -> per-app admin
test-clinic.demo.brickos.io/sovereign-health/           -> SHI app home (was /dashboard)
test-clinic.demo.brickos.io/sovereign-health/measurements
test-clinic.demo.brickos.io/sovereign-health/doctor-chat
test-clinic.demo.brickos.io/sovereign-health/trends
test-clinic.demo.brickos.io/sovereign-health/markers
test-clinic.demo.brickos.io/sovereign-health/zones
test-clinic.demo.brickos.io/sovereign-health/settings   -> SHI-specific settings (SHI extension tabs)
test-clinic.demo.brickos.io/sovereign-link/             -> Sovereign Link end-user home (future)
test-clinic.demo.brickos.io/sovereign-voice/            -> Sovereign Voice end-user home (future)
test-clinic.demo.brickos.io/settings                    -> BrickOS account settings (master tabs only)
test-clinic.demo.brickos.io/profile                     -> BrickOS account profile (global)
```

### Specialised public domains (optional branded entry)

Orgs can opt into a branded public domain for a specific app, which is aliased to the canonical app prefix:

```
sovereignhealth.io/*                       -> internally routes to test-clinic.brickos.io/sovereign-health/*
                                              (or its equivalent custom-domain mapping)
```

`sovereignhealth.io` stays as a branded entry for the SHI end-user app. Its internal routing gets folded so `/dashboard` on sovereignhealth.io = `/sovereign-health/` on brickos.io = same Next.js routes.

## Migration scope (Sprint 047)

### Phase A -- route move (2-3d)

Move SHI end-user routes from root to `/sovereign-health/`:

| From | To |
|---|---|
| `src/app/dashboard/*` | `src/app/sovereign-health/dashboard/*` (or keep root-level but add a route group `(shi)`) |
| `src/app/measurements/*` | `src/app/sovereign-health/measurements/*` |
| `src/app/doctor-chat/*` | `src/app/sovereign-health/doctor-chat/*` |
| `src/app/markers/*` | `src/app/sovereign-health/markers/*` |
| `src/app/trends/*` | `src/app/sovereign-health/trends/*` |
| `src/app/zones/*` | `src/app/sovereign-health/zones/*` |
| `src/app/practitioner/*` | `src/app/sovereign-health/practitioner/*` |

**Approach options:**
- **Option 1 (rename):** physically move each page to its new path. Touches 30+ files.
- **Option 2 (route group):** use Next.js route groups `(sovereign-health)` which affect only file structure, not URL. Doesn't solve the user's ask.
- **Option 3 (middleware rewrite):** `src/middleware.ts` rewrites `/sovereign-health/:path*` internally to `/:path*`. The browser URL stays `/sovereign-health/...`, the app sees `/...`. Lowest churn. But the URL bar would say one thing and `pathname` would say another -- risk of subtle bugs.

Recommend **Option 1** for clarity + correctness. It's 2 days of mechanical work and leaves the codebase self-explanatory.

### Phase B -- legacy redirects (0.25d)

308 permanent redirects from the old root paths to the new prefixed paths:
- `/dashboard` -> `/sovereign-health/dashboard`
- `/measurements/*` -> `/sovereign-health/measurements/*`
- `/doctor-chat/*` -> `/sovereign-health/doctor-chat/*`
- etc.

Handled in `next.config.ts` redirects. Keep for 90 days then audit logs and remove.

### Phase C -- sovereignhealth.io apex aliasing (0.5d)

Update sovereignhealth.io nginx to internally rewrite `/(.+)` -> `/sovereign-health/$1` so the legacy branded domain keeps working. Custom domains that already point to SHI also need this alias in their nginx server blocks.

Alternatively: sovereignhealth.io frontend just navigates to `/sovereign-health/` on first load. But then bookmarks like `sovereignhealth.io/dashboard` need a client-side redirect. Nginx rewrite is cleaner.

### Phase D -- plane gate + cross-plane links (0.5d)

- `src/lib/plane.ts` END_USER_ONLY_PREFIXES -- replace `/dashboard`, `/measurements`, etc. with `/sovereign-health`, `/sovereign-link`, `/sovereign-voice`.
- "Open Sovereign Health ->" cross-plane link (Sprint 046 #573) points at `/sovereign-health/` not `/dashboard`.
- Login post-login landing: on end-user plane -> `/sovereign-health/dashboard` instead of `/dashboard`.

### Phase E -- docs (0.25d)

- Design 025 updated: domain matrix reflects the new per-app prefix structure.
- Design 026 updated: APPS nav sub-items under each app point at the new prefixes.
- RC checklist URLs.

## Acceptance

- `test-clinic.demo.brickos.io/sovereign-health/dashboard` renders the SHI dashboard.
- `test-clinic.demo.brickos.io/dashboard` -> 308 to `/sovereign-health/dashboard`.
- `sovereignhealth.io/dashboard` (apex branded domain) renders the same dashboard (via nginx rewrite internally to `/sovereign-health/dashboard`).
- `test-clinic.demo.brickos.io/settings` (BrickOS account settings) is distinct from `test-clinic.demo.brickos.io/sovereign-health/settings` (SHI-specific settings).
- "Open Sovereign Health ->" cross-plane link opens `/sovereign-health/` on the target plane.
- Existing RC suite on staging passes unchanged after the move + redirects.

## Out of scope

- App marketplace / installer UX (licensing stays controlled by BrickOS platform admin per Design 026).
- App-level custom domains beyond sovereignhealth.io.
- Mobile deep links (unchanged until app marketplace ships).

## Open questions

1. **Tenant home (`/`)**: today root redirects to `/platform` (admin) on admin subdomains. Should it become an "app launcher" grid of the licensed apps? File as follow-up.
2. **`/settings` vs `/sovereign-health/settings`** split: some settings cross apps (notifications, billing). Who owns the source of truth? Current Sprint 046 compromise: brickos master tabs at `/settings`, SHI extension tabs at `/sovereign-health/settings`. Confirm at Sprint 047 kickoff.
3. **Session context** on `/sovereign-health/*`: do we carry the same cookie (yes, per-plane scoping already does this) or add an app-level claim? Probably not needed.
