# Design 025 -- Domain Realignment: SHI White-Label on sovereignhealth.io

**Status:** Draft
**Date:** 2026-04-19
**Supersedes:** Parts of Design 015 (§domain matrix) and Design 021 (§10b, §15.4)
**Related:** ADR-049 (white-label org resolution)
**Sprint:** 045 (Domain Realignment)

## The rule

- **brickos.io** is the **admin plane**. Platform admins and org admins only.
- **sovereignhealth.io** is the **SHI end-user app**. Patients, practitioners, org members.
- White-label orgs get `{slug}.sovereignhealth.io`, not `{slug}.brickos.io`.
- Custom domains (`health.acme.com`) continue to resolve via `domain_mappings`.

## Why now

Sprint 044 built `*.brickos.io` + `*.demo.brickos.io` wildcards that serve the SHI end-user app at root. This violates the plane separation above. The user flagged the mismatch during RC1 on 2026-04-19 after login was verified working -- shipping it to production even temporarily would bake the wrong URLs into bookmarks, email templates, and customer memory.

Sprint 044 is being **closed early** with white-label available on staging only (`test-clinic.demo.brickos.io`). v0.42.0 does **not** ship to production. Sprint 045 re-plumbs the routing and ships the combined result.

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
| Wildcard nginx block | `apps/platform/brickos-website/ops/nginx-brickos-app.conf` | Remove `*.brickos.io` + `*.demo.brickos.io` blocks, or 302-redirect to sovereignhealth.io |
| Wildcard nginx block | `apps/health/sovereign-health/ops/nginx-sovereignhealth.conf` | **Add** `*.sovereignhealth.io` + `*.demo.sovereignhealth.io` blocks with #556 Accept-header fix |
| Org resolver | `apps/health/sovereign-health/api/src/middleware/org_resolver.rs` | Invert: resolve `{slug}.sovereignhealth.io`, stop special-casing `{slug}.brickos.io` |
| Frontend cookie domain | `src/lib/api.ts:70-77` | Add `.sovereignhealth.io` branch alongside `.brickos.io` |
| Frontend API_BASE | `src/lib/api.ts:55-63` | Same-origin for `*.sovereignhealth.io` |
| RC checklist | `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md` | URL search/replace `demo.brickos.io` -> `demo.sovereignhealth.io` for org subdomain rows |
| Design docs | `docs/design/015`, `docs/design/021`, `docs/design/ADR-049` | Rewrite domain matrix + §10b + §15.4 + resolution priority |
| Memory | `reference_brickos_domains.md` | New rule + updated domain map |

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

### Decommission path for Sprint 044 additions

- `*.brickos.io` -> choose one at Sprint 045 kickoff:
  - **Option A**: remove the server block entirely, Cloudflare DNS wildcard returns default upstream (probably 404). Clean.
  - **Option B**: keep the server block but `return 302 https://$1.sovereignhealth.io$request_uri;` for 90 days so any bookmark of `test-clinic.brickos.io/...` redirects gracefully, then remove.
- `*.demo.brickos.io` -> same decision, applied symmetrically. Staging doesn't have customer bookmarks, so Option A is fine regardless.

Recommend **Option B for prod** (`*.brickos.io`), **Option A for staging** (`*.demo.brickos.io`).

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

### Phase 5 -- Decommission brickos.io wildcards
- Apply the Option A/B decision from above
- If Option B: add `return 302` server blocks in `nginx-brickos-app.conf`
- Remove Sprint 044 wildcards from `nginx-brickos-app.conf`
- Cloudflare: leave `*.brickos.io` wildcard A record in place if Option B, remove if Option A

### Phase 6 -- RC + docs
- Migrate RC checklist URLs
- Re-run 71-item checklist on `test-clinic.demo.sovereignhealth.io`
- Update Design 015, Design 021, ADR-049, `reference_brickos_domains.md`

### Phase 7 -- Production ship
- `bash ops/deploy.sh production` for backend, frontend, nginx
- Verify platform admin at app.brickos.io, org admin at app.brickos.io/org, end user at `{slug}.sovereignhealth.io`
- Announce go-live

## Acceptance (Sprint 045 success criteria)

- `app.brickos.io/login` -- platform admin + org admin login works
- `app.brickos.io/platform/orgs` -- platform admin can create orgs
- `app.brickos.io/org/{slug}/*` -- org admin manages their org
- `{slug}.sovereignhealth.io/login` -- end-user login with org branding
- `{slug}.sovereignhealth.io/dashboard`, `/measurements`, `/doctor-chat` etc. end-to-end
- `{slug}.sovereignhealth.io/admin`, `/settings` -- frontend pages render (no regex trap)
- Custom domain (`health.acme.com`) still works via `domain_mappings`
- `test-clinic.brickos.io` 302-redirects to `test-clinic.sovereignhealth.io` (if Option B)
- 71-item RC checklist passes on new staging URLs
- Design docs updated

## Open questions

1. **Option A or B** for `*.brickos.io` decommission? Recommend B (prod) / A (staging).
2. **`app.sovereignhealth.io`** -- migrate to same-origin, or keep legacy api-subdomain pattern? Recommend same-origin for consistency, separate sub-issue.
3. **Org admin on sovereignhealth.io?** A human who is both an org admin and an end user gets two sessions (one per plane). Acceptable per #559.

## Out of scope

- Start9 / self-hosted white-label deployments
- Onion subdomain routing for white-label
- i18n of org admin role labels (already handled in Sprint 044)
