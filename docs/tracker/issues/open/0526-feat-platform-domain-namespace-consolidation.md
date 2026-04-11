---
number: 526
title: "feat: [P1] consolidate all apps under brickos.io platform namespace (staging + production)"
milestone: "Sprint 043 -- SHI Production Push"
labels: [feature, platform-admin-gui, architecture, p1, staging, production]
created: 2026-04-11
priority: P1
discovered_by: 525
related: [523, 525]
---

## Summary

The current staging URLs surface a structural inconsistency: the platform admin GUI lives under the SHI consumer domain (`demo.sovereignhealth.io/platform/orgs`), the API is on `api-demo.sovereignhealth.io` and even ends in `/health`, the marketing site is on `www-demo.sovereignhealth.io`, and the brickos.io platform namespace -- which is supposed to be the elevated, app-agnostic home for everything -- is partially wired but incomplete. This is confusing now and gets worse with every new app we add (sovereign-crm, sovereign-link, sovereign-vote, sovereign-signal, sovereign-almanac, ...).

We need a coherent **brickos.io-first URL concept** that works for staging *and* production, treats sovereignhealth.io as the special-case consumer domain it is, and gives every future BrickOS app a home under `brickos.io/<app>` without each one needing its own domain.

## Current state (confusing)

| Surface | What I had to use for Sprint 041 staging | Problem |
|---|---|---|
| Platform admin (brickos.io is the platform) | `https://demo.sovereignhealth.io/platform/orgs` | Mounted under the SHI consumer domain |
| API (now serves auth, admin, licensing, links, ... not just SHI) | `https://api-demo.sovereignhealth.io/health` | Domain implies "health-only", path `/health` reinforces it |
| SHI marketing site | `https://www-demo.sovereignhealth.io` | OK as the SHI consumer site, but inconsistent with how brickos itself markets |
| brickos.io marketing | (no demo URL) | -- |
| sovereign-crm staging | `crm.brickos.io` | Sub-domain per app -- doesn't scale to 7 apps |

The VPS already has partial brickos.io routing wired (`server_name app.brickos.io demo.brickos.io api.brickos.io`) but `demo.brickos.io` is missing the `/api/`, `/auth/`, `/admin/` location blocks that `app.brickos.io` has, so the staging API is *not actually reachable* on `api-demo.brickos.io` today. That's why the Sprint 041 smoke had to fall back to `api-demo.sovereignhealth.io`.

The reference memory `reference_brickos_domains.md` already captured the *intent* three days ago:
- `app.brickos.io` -> Platform admin (`/platform/`) + SHI (`/sovereignhealth/`) via :3000
- `api.brickos.io` -> API
- `demo.brickos.io` -> Same as app.brickos.io but staging

...so the design exists; the implementation is half-done.

## Why this matters

1. **Onboarding clarity for new apps.** Sprint 042+ is the white-label SHI architecture cluster, which means more apps land in the monorepo. Each new app needs a deterministic answer to "where does it live in the URL space?" without inventing a new subdomain per app. brickos.io/<app> is the coherent answer.
2. **API namespace honesty.** The API today serves auth, admin orgs, licensing, sovereign-link, billing, and SHI -- it is not a "health" API any more. `api.brickos.io` reflects reality; `api.sovereignhealth.io` lies by name.
3. **Platform admin discoverability.** A clinic operator going to `brickos.io` should land in a place where they understand they are on the **platform** (the elevated namespace). Right now we land them on the SHI consumer site, which sends the wrong message.
4. **Staging/production parity.** Manual testers, e2e tests, deploy.sh smoke checks, OAuth callbacks, basic auth, and monitoring dashboards all hardcode URLs. If staging and production use *different* URL shapes, every test that's authored against staging has to be re-authored for production. That's a permanent tax on every sprint.
5. **sovereignhealth.io is the white-label model.** It is the *consumer-facing* domain for one specific BrickOS app. That's correct -- and it's the model for any future white-label customer who buys their own domain. But the operator/admin/API plane should never be on the consumer domain. Today that line is not drawn.

## Proposed target structure

### Production

| Surface | URL | Notes |
|---|---|---|
| brickos marketing | `brickos.io`, `www.brickos.io` | static site, the front door |
| Platform admin | `app.brickos.io/platform/...` | the operator/admin plane |
| SHI app (within platform) | `app.brickos.io/sovereignhealth/...` | path-mounted, shares JWT with platform |
| Future: CRM | `app.brickos.io/sovereigncrm/...` | same pattern |
| Future: Vote | `app.brickos.io/sovereignvote/...` | same pattern |
| Future: Signal | `app.brickos.io/sovereignsignal/...` | same pattern |
| Future: Almanac | `app.brickos.io/sovereignalmanac/...` | same pattern |
| Future: Link | `app.brickos.io/sovereignlink/...` | same pattern (already partly redirected) |
| API (one API for all of it) | `api.brickos.io/v1/...` | scopes per resource: `/auth`, `/admin`, `/licensing`, `/health`, `/crm`, ... |
| Status / monitoring | `status.brickos.io` | gatus |
| Sovereign Link short-URL | `brickos.io/r/{slug}` | redirect proxy |
| **White-label consumer domain (special case)** | `app.sovereignhealth.io` | a CNAME / proxy to `app.brickos.io/sovereignhealth/...` for users who only know the SHI brand. Same for any white-label customer who buys their own domain. |
| SHI marketing (consumer brand) | `sovereignhealth.io`, `www.sovereignhealth.io` | the SHI front door, separate from brickos.io |

### Staging (mirror, different host prefix only)

| Surface | URL |
|---|---|
| brickos marketing | `demo.brickos.io` (or `staging.brickos.io`) -- decide one |
| Platform admin | `demo.brickos.io/platform/...` |
| SHI app within platform | `demo.brickos.io/sovereignhealth/...` |
| API | `api-demo.brickos.io/v1/...` (or `demo.brickos.io/api/...`, decide one) |
| White-label consumer URL | `demo.sovereignhealth.io` -> proxies to `demo.brickos.io/sovereignhealth/...` |
| Marketing demo | `www-demo.brickos.io` and `www-demo.sovereignhealth.io` |

### Decision points to resolve in this issue

1. **api subdomain vs path mount.** `api.brickos.io/v1/admin/organizations` (cleaner, current) vs `app.brickos.io/api/admin/organizations` (one-domain-cookie-simpler). Both currently exist on the VPS for `app.brickos.io`. Pick one as canonical and remove the other.
2. **Staging prefix.** `demo.brickos.io` vs `staging.brickos.io` -- pick one. Current usage mixes both.
3. **White-label consumer domain.** Is `sovereignhealth.io` a true CNAME at the DNS level, a Cloudflare worker proxy, or an nginx server-block reverse proxy? Each has different SSL + cookie + auth implications.
4. **JWT cookie scope.** If `app.brickos.io` and `app.sovereignhealth.io` are both reachable, the JWT cookie has to be valid on both. Either: (a) re-auth per domain (worst UX), (b) shared subdomain cookies impossible across registered eTLD+1, so (c) whichever domain hosts the actual session, the other is a *passthrough* and the user logs in once on the canonical domain. Decide.

## Acceptance criteria

- [ ] **Concept doc** authored at `docs/design/015-brickos-platform-namespace.md` covering the four decision points above and the target tables for staging + production
- [ ] **Memory** `reference_brickos_domains.md` updated to match the final concept (today it's already 50% there)
- [ ] **nginx** `brickos-app.conf` extended so `demo.brickos.io` has the same `/api/`, `/auth/`, `/admin/` locations as `app.brickos.io`. Or whichever pattern the concept doc picks.
- [ ] **deploy.sh staging** updated so the verification block hits the brickos.io URLs, not the sovereignhealth.io ones
- [ ] **Frontend env vars** (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`) updated for staging and production builds to point at the new canonical hosts
- [ ] **Backend dev CORS allow-list** + `Cookie::Domain` settings updated to match
- [ ] **Playwright e2e specs** that hardcode hosts updated; one parametric `BASE_URL` env var instead of two
- [ ] **Smoke test scripts** (e.g. `/tmp/sprint041_staging_smoke.py`) updated to use the new canonical URLs
- [ ] **Status page** (gatus) checks updated to the new URLs
- [ ] **OAuth / magic-link redirect URIs** in any third-party config updated (Mailgun, Stripe, ntfy, etc.)
- [ ] **HTTP basic auth** files (`/etc/nginx/.htpasswd*`) consolidated -- one per environment, not per host
- [ ] **Cloudflare DNS** -- add any missing A/AAAA/CNAME records for the new shape; document each
- [ ] **Manual smoke** on staging: log in via `app.brickos.io` *and* `app.sovereignhealth.io`, verify same session, verify the API responds at the canonical URL only
- [ ] **Migration plan** for sovereignhealth.io users currently bookmarked at the consumer domain -- 301 vs 302, monitoring of broken links

## Out of scope for this issue

- The actual Sprint 042 white-label customer-domain feature (`life-algorithm.brickos.io` etc.). That's a separate ADR. This issue is about the *internal* operator/admin/API plane.
- Renaming any database / table / crate name (`sovereign_health_*`, `sovereign-crm-*`). The code stays; only the URL shape changes.
- Splitting the API into microservices. One API binary, multiple URL scopes.

## Why not just defer

Because every sprint that ships against the wrong URL shape produces test code, monitoring config, and customer-facing screenshots that have to be retrofitted later. The cost of a one-sprint pause to nail this down is much smaller than the compounding cost of every Sprint 042+ deliverable being authored against `*.sovereignhealth.io`. It is the kind of thing that *must* be decided before Sprint 042 white-label work starts, not after.

## Related

- #523 (`/platform/orgs` New Organization button -- the immediate UX bug that surfaced this)
- #525 (audit `/platform/*` admin pages -- companion of #523)
- ADR-015 candidate: BrickOS Platform Namespace
- design 014 BrickOS Platform GUI (the umbrella for the admin plane)
- memory `reference_brickos_domains.md` (the existing partial intent)
- memory `project_sprint041_staging_verified.md` (where the URL inconsistency was first felt)
