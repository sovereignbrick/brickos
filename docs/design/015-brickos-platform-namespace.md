---
title: 015 -- BrickOS Platform Namespace
status: draft (Sprint 043 Phase C decides)
sprint: 043
related: [#526, sprint-041, sprint-042, ADR-048]
---

# Design 015 -- BrickOS Platform Namespace

> **Status:** DRAFT. Sprint 043 Phase C resolves the four decision points
> below and flips this to "shipped". Until then this document captures the
> recommended options for each decision so the operator can sign off in
> one review pass.

## Problem

Sprint 041 + 042 surfaced a recurring class of bug rooted in URL/origin
inconsistency:

- The platform admin GUI lives at `demo.sovereignhealth.io/platform/orgs`
  (mounted under the SHI consumer domain, even though it's the *brickos*
  admin plane)
- The API ends in `/health` (`api-demo.sovereignhealth.io/health`) even
  though it serves auth, admin, licensing, sovereign-link, billing, and
  more -- it's not a "health" API anymore
- The newsletter Export CSV broke (#534) because raw `fetch()` with an
  Authorization header from `demo.sovereignhealth.io` to
  `api-demo.sovereignhealth.io` triggered a CORS preflight that failed
- The service worker cached old JS for 4h (#538) -- partly because of
  the cross-origin setup forcing per-app PWA installs to share one
  Cloudflare-cached `sw.js`
- Per-app PWA installation (one PWA per origin) is impossible until each
  app has its own origin

The `reference_brickos_domains.md` memory captured the *intent* of the
brickos.io platform namespace 3+ days ago. Sprint 043 Phase C makes that
intent real.

## Goals

1. **One canonical home for the operator/admin/API plane**, separate from
   any consumer-facing white-label domain
2. **Each BrickOS app installs as its own PWA** without colliding with
   other apps
3. **Zero CORS preflight surface** for admin operations -- same-origin or
   simple-request only
4. **Staging and production share the same URL shape** (different host
   prefix only) so tests + monitoring don't need parallel implementations
5. **Existing sovereignhealth.io bookmarks survive** with 301/302 redirects

## Decision points

### D1 -- API: subdomain vs path mount

**Option A: API on its own subdomain.** `api.brickos.io/v1/auth/login`,
`api.brickos.io/v1/admin/organizations`, etc. The current production
state.

**Option B: API path-mounted under the app domain.** `app.brickos.io/api/v1/auth/login`,
`app.brickos.io/api/v1/admin/organizations`, etc. Currently exists IN
PARALLEL on the VPS for `app.brickos.io` (via the nginx `/api/`,
`/auth/`, `/admin/` location blocks).

| | A (subdomain) | B (path mount) |
|---|---|---|
| CORS surface | ✗ Cross-origin from app -> api, every fetch is preflighted unless headers are CORS-safelisted | ✓ Same-origin, zero preflight |
| Cookie scope | Subdomain wildcard works (`Domain=.brickos.io`) | ✓ Same domain, no special config |
| URL aesthetics | ✓ Cleanest -- the API is its own thing | Slightly nested |
| Current state | Working (the existing setup) | Half-working (nginx blocks exist for app.brickos.io but not demo.brickos.io) |
| Migration cost | None (already done) | Update every fetch URL in the frontend; remove the api.brickos.io server block |
| Future apps | Each future app can use the same API subdomain or its own | Each app needs its own /api/ proxy block |

**Recommendation: B (path mount)** -- the CORS surface and cookie scope
benefits are operationally significant (Sprint 041 #534 + Sprint 042 #538
both rooted in the cross-origin setup), and the migration cost is bounded
(one frontend env var change + nginx block additions on the staging side
that's currently missing them).

### D2 -- Staging prefix: `demo.` vs `staging.`

**Option A: `demo.brickos.io`, `demo.sovereignhealth.io`, `api-demo.brickos.io`**
-- the current state. Mixes "demo" and "staging" semantics.

**Option B: `staging.brickos.io`, `staging.sovereignhealth.io`, `api.staging.brickos.io`**
-- consistent "staging" naming. The "demo" use-case is a separate
fixture, not a separate environment.

**Recommendation: A (demo.)** because:
1. Existing bookmarks, tests, and `.htpasswd` files reference `demo.*` --
   migration cost is real
2. The "demo" semantics genuinely match the use case: this is the URL
   the operator points new prospects at, not just a CI staging env
3. "staging" is the deployment target (`deploy.sh staging`); "demo" is
   the consumer-facing label. Both are fine.

Action: rename nothing. Update memory + reference docs to make the
distinction clear (deploy target == staging, public URL == demo).

### D3 -- White-label consumer domain mechanism

When a clinic buys SHI as their own white-label product (e.g.
`life-algorithm.brickos.io` or `app.life-algorithm.com`), how does
the request actually reach the SHI app?

**Option A: Cloudflare DNS CNAME + nginx server block per customer.**
The customer adds a CNAME from `app.life-algorithm.com` to
`white-label.brickos.io` (or directly to the VPS IP). Nginx has a
server block matching the customer's hostname that proxies to the SHI
frontend, with the org's branding pre-injected via headers.

**Option B: Cloudflare worker that rewrites the host header.** Customer
adds a CNAME, Cloudflare worker intercepts, looks up the org by
hostname in a worker KV, sets a custom header, forwards to the canonical
brickos.io app domain.

**Option C: nginx reverse proxy with a wildcard `*.brickos.io` server
block.** Customer can use `<their-name>.brickos.io` only (no own
domain). The wildcard server block extracts the slug from `Host` and
maps to the org. No DNS work for the customer.

| | A (per-customer block) | B (CF worker) | C (wildcard) |
|---|---|---|---|
| Custom apex domain (`app.theirname.com`) | ✓ | ✓ | ✗ |
| Configuration cost per customer | Medium (nginx block + reload) | Low (one KV row) | Zero |
| SSL cert per customer | Manual (Let's Encrypt per hostname) | ✓ Cloudflare proxied | ✓ Cloudflare wildcard |
| Operational complexity | Higher | Higher (CF worker code) | Lowest |
| Cost | Free | Free at small scale, paid above | Free |
| Vendor lock-in | None | Cloudflare | Light Cloudflare |

**Recommendation: C for the default + A for premium customers.** The
wildcard `*.brickos.io` is the zero-friction default; clinics that want
their own apex domain can pay a setup fee for the per-customer nginx
block.

For Sprint 043 Phase C: ship Option C (the wildcard). Option A is a
follow-up when the first paying customer asks for it.

### D4 -- JWT cookie scope across registered eTLD+1 boundaries

When `app.brickos.io` and `app.sovereignhealth.io` both serve the same
SHI session, the JWT cookie can't be scoped to both -- they're separate
registered eTLDs, browser security forbids sharing cookies.

**Option A: Re-auth per domain.** Worst UX. Rejected.

**Option B: SSO via redirect.** User logs in on `app.brickos.io`,
session cookie set there. Visiting `app.sovereignhealth.io` triggers
a redirect to `app.brickos.io/sso/handoff?return=...` which sets a
short-lived JWT cookie on `.sovereignhealth.io` and redirects back.

**Option C: One canonical domain, the other is a passthrough.** Pick
`app.brickos.io` as the canonical session domain. `app.sovereignhealth.io`
becomes a server-side proxy that forwards every request (including the
session cookie) to `app.brickos.io`. The user appears to be on
sovereignhealth.io but the cookie is actually on brickos.io.

**Recommendation: C (passthrough proxy).** Simplest from the cookie
perspective, no SSO ceremony, no double login. The cost is one extra
nginx hop for sovereignhealth.io requests, which is negligible.

For implementation: the existing nginx config on the VPS already does
this for `app.sovereignhealth.io` -> `127.0.0.1:3000`. Sprint 043 Phase C
just needs to:
1. Make sure the session cookie is set with `Domain=app.brickos.io` only
2. The sovereignhealth.io server block sets a `Host: app.brickos.io`
   header on the upstream proxy so the backend's CORS allow-list doesn't
   reject it
3. Document that sovereignhealth.io is a *consumer-facing alias*, not a
   separate session domain

## Recommended target structure

### Production

| Surface | URL |
|---|---|
| brickos marketing | `brickos.io`, `www.brickos.io` |
| Platform admin | `app.brickos.io/platform/...` |
| SHI app under platform | `app.brickos.io/sovereignhealth/...` |
| Future apps | `app.brickos.io/sovereigncrm/...` etc. |
| API | `app.brickos.io/api/v1/...` (path mount, D1 option B) |
| Status | `status.brickos.io` |
| White-label customer apex | `<slug>.brickos.io` (D3 option C wildcard) |
| Consumer-facing SHI alias | `app.sovereignhealth.io` (passthrough to brickos.io, D4 option C) |
| SHI marketing (separate brand) | `sovereignhealth.io` |

### Staging mirror

| Surface | URL |
|---|---|
| brickos marketing | `demo.brickos.io` (current) |
| Platform admin | `demo.brickos.io/platform/...` |
| SHI app under platform | `demo.brickos.io/sovereignhealth/...` |
| API | `demo.brickos.io/api/v1/...` (NEW: nginx blocks need adding) |
| Consumer alias | `demo.sovereignhealth.io` (current) |

## Implementation checklist (Sprint 043 Phase C)

- [ ] Operator signs off on D1-D4 recommendations OR picks alternatives
- [ ] Update nginx `brickos-app.conf` to add `/api/`, `/auth/`, `/admin/` location blocks to `demo.brickos.io` (currently only `app.brickos.io` has them)
- [ ] Update nginx `brickos-app.conf` to add a wildcard server block matching `*.brickos.io` for the white-label customer case
- [ ] Update Cloudflare DNS: add wildcard A/AAAA record `*.brickos.io -> VPS IP`
- [ ] Update `deploy.sh` verification: check that `demo.brickos.io/api/v1/health` returns 200 (currently only checks `api-demo.sovereignhealth.io/health`)
- [ ] Update frontend env vars: `NEXT_PUBLIC_API_URL=/api/v1` (relative, not absolute) so it works on any origin
- [ ] Update backend dev CORS allow-list to include `app.brickos.io`, `demo.brickos.io`, `*.brickos.io`
- [ ] Update Playwright specs to read `BASE_URL` env (default to current demo.sovereignhealth.io for backward compat)
- [ ] Update memory `reference_brickos_domains.md` with the final shape
- [ ] Migration plan: 301 redirect from `api-demo.sovereignhealth.io/*` to `demo.brickos.io/api/v1/*` for any existing bookmarks
- [ ] Migration plan: 301 redirect from `api.sovereignhealth.io/*` to `app.brickos.io/api/v1/*`
- [ ] Verify SHI consumer URLs (`/zones`, `/trends`, `/measurements`, etc.) still work via the sovereignhealth.io passthrough

## Out of scope for design 015

- Per-customer custom domain billing/subscription model
- Cloudflare worker implementation (Option B not chosen)
- Multi-region routing (Frankfurt + Singapore) -- separate Sprint 044+ design

## Related

- #526 (the issue this design closes)
- Memory: `reference_brickos_domains.md`, `feedback_admin_panel_testing.md`
- Sprint 041 #534 (the newsletter Export CSV NetworkError, the first concrete operational bug rooted in cross-origin)
- Sprint 042 #538 (SW cache, partially rooted in the cross-origin PWA situation)
- ADR-048 (PR-based sprint flow) -- governs the design + impl flow
