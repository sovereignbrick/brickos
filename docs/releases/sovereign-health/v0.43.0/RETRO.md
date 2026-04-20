# Sprint 045 + 046 Retrospective

**Date:** 2026-04-20
**Release:** v0.43.0
**Duration:** 2026-04-19 → 2026-04-20 (~36 hours of focused work, including 8 hotfix rounds on staging before prod ship)

## What shipped

- Two-plane white-label architecture (Design 025)
- Unified admin home at `/platform` (Design 026)
- APPS plugin registry for multi-app nav extensibility
- Brand-aware metadata (title + favicon per plane)
- Cross-plane profile-menu entries
- Plane-aware login landing
- 8 nginx / frontend / backend hotfixes caught during staging RC

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the full by-area rundown.

## Timeline of the RC rounds

| Round | Delivered | Caught in RC |
|---|---|---|
| 1 (Sprint 045 initial) | DNS + LE certs + `*.sovereignhealth.io` wildcard nginx + backend resolver invert + frontend plane gate | #557 login logo (double data-URI prefix) |
| 2 (Sprint 046 Phase A) | `/org/*` -> `/platform/org/*` sidebar consolidation | A3 ORGANIZATION + PEOPLE nav hidden (predicate excluded isPlatform + JWT org_role not read) |
| 3 (#15 nav visibility hotfix) | Predicate + `useOrg()`-sourced orgRole | -- |
| 4 (Sprint 046 Phase B + C) | APPS registry + Sovereign Health naming + `/admin` hard-remove | #18 /measurements refresh loop, #20 Thresholds logs user out, #25 Account tab shows health data on admin plane |
| 5 (RSC fix) | nginx rule for `RSC: 1` header -> frontend | `/api/health` + `/api/api/config/infobar` 404s from double-`/api/` callsites in footer/info-bar |
| 6 (path fixes) | Same-origin relative paths in footer, info-bar, donate, trends, api.ts | A8/C3 /settings Account tab still showing Health Profile form, /sovereignhealth 404 RSC prefetch, D1 brickos cube not rendering |
| 7 (settings tab default + /sovereignhealth link + useBrand hydration) | Plane-aware default tab, remove legacy /sovereignhealth nav item, useBrand() for no-SSR-mismatch logo | A1 login tab title still "Log In \| Sovereign Health", post-login lands on /dashboard not /platform/org |
| 8 (brand metadata + prod ship) | generateMetadata() per-host title+favicon, production deploy of v0.43.0 | User cleared SW cache -> post-login correctly lands on /platform/org |

## Lessons

### Went well
- Design-first approach (Design 025, 026, 027) gave us a stable spec to iterate against even while hotfixes landed
- Playwright regression suite (`sprint-046-rc-smoke.spec.ts`) caught the shipped-bundle-vs-intent gap early -- especially useful for distinguishing "my code is wrong" from "user's browser has stale cache"
- Feedback memory prevented repeating old mistakes (`feedback_nginx_path_mount_conflicts.md` + `feedback_verify_domain_plane_before_wildcard.md` both referenced during this sprint)
- Chunked scp (Sprint 044 #540) + sites-enabled symlink (Sprint 045 #558 fix applied outside-of-band) made iterations fast -- rebuild + redeploy in ~5 min per hotfix
- Pre-flight checks in deploy.sh (branch, lockfile, version consistency, migration checksums) caught one bug before deploy (deploy.sh VERSION was stale)

### Surprises
- **Next.js RSC prefetches** behave differently from regular fetches: they send `Accept: */*` + `RSC: 1` header, not `Accept: text/html`. The `#556` Accept-header fix missed this at first, causing 401/404/502 cascades that looked like a refresh loop on `/measurements` and a spurious logout on Thresholds. Fix: add `if ($http_rsc = "1") { rewrite ^ /__fe_navigate$uri last; }` alongside the text/html check.
- **Double-`/api/` path prefix bugs** from predating the same-origin API_BASE pattern: 6 callsites in footer, info-bar, donate, trends, api.ts reports/license/export. All built URLs like `${NEXT_PUBLIC_API_URL}/api/...` -> `/api/api/...` on staging/prod because NEXT_PUBLIC_API_URL was `/api`. Fix: use same-origin relative paths OR `API_BASE` from api.ts (which is runtime-detected).
- **SSR/CSR hydration** on brand-aware rendering: `typeof window !== 'undefined' && hostname.endsWith(...)` checks in JSX don't re-evaluate across hydration reliably. Fix: use the existing `useBrand()` hook which reads the brand_context cookie (set by middleware) -- works at both SSR and client.
- **Static metadata** can't be brand-aware at SSR time. Fix: convert to `generateMetadata()` that reads the request host from `next/headers`.
- Service worker caching on the frontend meant users re-testing kept seeing old behavior until they cleared site data. Cost: 2-3 rounds of "this should work but doesn't" before recognizing the pattern.

### Process wins
- Catching the `deploy.sh` VERSION stale during the promote step (step 1) and fixing before step 2 saved us a bad production image tag
- The promote-step branch safety check (`must be on main`) caught us on develop before starting the production deploy
- Breaking the deploy into 6 small, verifiable steps let us continue after each phase instead of bailing on a compound failure

### Process gaps
- **8 hotfix rounds** on staging before prod is too many. Retrospective cause: did not walk the full 25-item RC checklist top-to-bottom in one pass; tested piecemeal, so regressions (like `/sovereignhealth` 404 re-appearing after SW cache cleared) surfaced on the next day instead of same-day.
- **Next.js RSC behavior** not covered by the original `#556` Accept-header fix design. Should have tested prefetch scenarios (hover, Next/Link prefetching) as part of the nginx routing design review.
- **SW cache invalidation** for RC testers: no automated signal on every deploy that "old tabs with cached code will misbehave; hard refresh required." Consider a tiny `/build-id` endpoint + periodic check.

## Action items

- **Sprint 047 (#577 + Design 027)** -- multi-app URL routing: `/sovereign-health/*`, `/sovereign-link/*`, `/sovereign-voice/*` prefixes so every BrickOS app has a clear URL ownership. Fixes the "Open Sovereign Health link goes to `/dashboard`" ambiguity once and for all.
- **Apply the Accept-header + RSC fix to `app.brickos.io` + `demo.brickos.io`** nginx blocks (#585). Currently only the wildcard blocks have it, so `/admin` 404s on those hostnames.
- **Add a `test-clinic` org_owner E2E fixture** (#578) so the 3 authed Playwright regression tests can run and prevent the sidebar-visibility regressions we caught manually.
- **Rotate the Cloudflare API token** (#569) that was pasted in chat during #560 bootstrap.
- **Add a feedback memory** about the RSC prefetch routing gotcha -- fundamental enough that future nginx path-mount fixes should check for it.

## Metrics

- Commits on `develop`: 68 between 2026-04-19 and 2026-04-20
- Design docs: 2 new (025, 026, 027) + 5 amended (014, 015, 021, ADR-049 + references memory)
- Issues filed: 20 (#555 through #585, not all filled)
- Lines changed (approx): 2500 lines across backend, frontend, nginx, docs
- RC checklist items: 25 items walked; ~2-3 iterations per item before fully green on average
- Production downtime during cutover: 0 (rolling deploy via docker compose up -d)

## Replaces

`project_sprint045_paused.md` + `project_sprint046_ready.md` both obsolete; superseded by `project_sprint045_046_shipped.md`.
