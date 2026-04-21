# Sovereign Health v0.44.0 Release Notes

**Release date:** 2026-04-21
**Sprint:** 047 (Multi-App URL Routing + Stability)
**Git:** develop → main at tag `v0.44.0`

## Highlights

- **Multi-app URL prefix shipped.** End-user SHI routes moved from root
  (`/dashboard`, `/measurements`, ...) to `/sovereign-health/*` on
  brickos.io subdomains. Legacy paths 308-redirect. Branded
  `sovereignhealth.io` keeps clean root URLs via internal nginx rewrite.
  Design 027 + ADR-050.
- **Cache invalidation banner.** A top-of-page "A newer version is
  available -- Reload now" banner surfaces after a new frontend deploy.
  Polls a dedicated frontend-scoped `/app-build-id` endpoint, not
  `/health`, so frontend-only deploys don't falsely flag the client as
  stale.
- **Per-locale org email templates.** Org owners can author EN + DE
  copy independently for welcome, verification, reset, and footer
  templates. Backed by suffixed JSON keys in `organizations.branding`
  -- no schema migration.
- **Auth hardening.** `demo.sovereignhealth.io` no longer served demo
  data to anonymous visitors. A new `AuthGate` component redirects
  unauthed visits to `/login`. Demo mode is now scoped to the
  dedicated public-demo hostname only.
- **CSP unsafe-eval silenced.** Zod v4's JIT parser used
  `new Function(...)` which tripped the strict CSP on every form page.
  Disabled via `z.config({ jitless: true })`. No CSP relaxation.
- **Practitioner caseload polish.** Patient-role filter on the backend
  list, new `practitioner` i18n namespace (EN + DE), "Patients" nav
  entry for org_owner / practitioner roles, and a fix for the Sprint
  044 column-name drift that produced 500s on patient-summary clicks.
- **rc-smoke hardening in deploy.sh.** `verify()` now asserts
  `/health.build == $BUILD_SHA` on backend deploys (catches
  cached-image deploys) and additionally smokes `/login` + `/api/v1/hello`.
  Size-mismatch false-alarm FAILs removed.

## Architecture

- **Design 027** -- Multi-app URL routing
- **Design 028 v3** -- Practitioner impersonation-only model (accepted
  for Sprint 048 implementation)
- **ADR-050** -- Multi-app URL prefix strategy
- **ADR-051** -- Practitioner impersonation-only model (no parallel
  clinical record)

## What changed (by area)

### Backend (`sovereign-health-backend` v0.44.0)

- `/health` response gained a `build` field carrying the short git SHA
  of the image (`BUILD_ID` docker arg). Enables the refresh-banner
  client-side check to distinguish between cached stale JS and live
  frontend.
- `/org-settings/apps/shi/email` GET now returns a `locales` map (EN +
  DE); PUT accepts a `locale` param (default `en`). Unsupported locales
  rejected with `Validation`. Backward-compatible flat fields preserved
  in GET response.
- `/practitioner/members` filters to `role IN ('member', 'consumer',
  'org_member')` -- org_owners + practitioners excluded from the
  clinical caseload.
- `/practitioner/members/{id}/summary` SQL aligned with the real
  schema: `measurements.timestamp`, `measurements.value_canonical`,
  `measurements.unit_canonical`, `markers.marker_name`.

### Frontend (`sovereign-health-frontend` v0.44.0)

- Physical move: `src/app/{dashboard,measurements,doctor-chat,markers,
  trends,zones,practitioner}/*` → `src/app/sovereign-health/*`.
- Every internal `<Link>`, `router.push`, `router.replace`,
  `window.location.href`, nav array entry, service-worker route matcher,
  and push-notification default URL updated in lock-step.
- `lib/plane.ts` `END_USER_ONLY_PREFIXES` collapses seven entries to
  one (`/sovereign-health`).
- New `AuthGate` component in the root layout redirects unauthed
  visits on non-public paths to `/login` with a return URL.
- `auth-context.tsx` -- `isDemo = !loading && isDemoOnly && user === null`
  (scoped to public-demo host). Previously any unauth visit triggered
  demo mode.
- `validators.ts` calls `z.config({ jitless: true })` at import time.
- Frontend exposes `/app-build-id` (Next.js route handler) returning
  `{ build: NEXT_PUBLIC_BUILD_ID }`; `RefreshBanner` polls this
  instead of `/health`.
- `sw.ts` adds NetworkOnly rule for `/app-build-id` (prevents SW from
  caching stale build IDs across deploys).
- New `practitioner` i18n namespace (EN + DE) with 11 keys. The
  practitioner page uses `useTranslations('practitioner')`. "Patients"
  nav entry conditionally shown for org_owner / practitioner /
  platform admin.
- New `/platform/org/apps/shi/email` tab UI: EN + DE tabs above the
  template editor; save button labels the active locale.

### Infrastructure / nginx

- `nginx-sovereignhealth.conf` gains a server-level conditional rewrite
  on all 4 SHI-branded blocks (app., demo., *., *.demo.):
  ```
  set $shi_nav ""; ... if ($http_accept ~* "text/html") { $shi_nav "1"; }
  if ($shi_nav) { rewrite ^/(dashboard|measurements|...)(/.*)?$
                  /sovereign-health/$1$2 last; }
  ```
  Browser nav sees clean URLs; API calls pass through unchanged.
- `demo.sovereignhealth.io` gains a path-mount block (same shape as the
  wildcard block) with `auth_basic off` inside the path-mount. Fixes the
  login 401 loop caused by Basic+Bearer header collision.

### deploy.sh

- `BUILD_SHA` hoisted to script-level; both backend + frontend builds
  stamp the same SHA via `--build-arg BUILD_ID=$BUILD_SHA` /
  `NEXT_PUBLIC_BUILD_ID`.
- `verify()` asserts `/health.build == $BUILD_SHA` -- but only when
  COMPONENT is `all` or `backend` (frontend-only deploys leave the
  backend SHA unchanged, which is correct).
- `VERIFY_API_*` URLs corrected to `/health` (not `/api/v1/health`;
  there is no v1 prefix on the health contract).
- `verify_image_loaded` no longer flags the expected `docker save/load`
  size diff as FAIL. Existence check only.

### Tests

- `sprint-047-url-routing.spec.ts` (25 tests, 50 listings across
  chromium/unauth): reachability + 308 assertions + branded-domain
  clean-URL check + `/health.build` contract + refresh-banner bundle
  presence.
- `sprint-047-admin-coverage.spec.ts` (~120 listings): every
  `/platform/*` and `/platform/org/*` page hit with unauth probe +
  authed render probe + org-subdomain smoke + dynamic [id] route.
- Existing specs (`health.spec`, `sprint-046-rc-smoke`,
  `sprint-046-plane-routing`, `sprint-044-practitioner`,
  `helpers/auth`) updated for the route move.
- `manifest.json` `start_url` + shortcut URLs point at the new
  `/sovereign-health/*` paths.

## RC / deploy notes

Staging RC burned six follow-ups that are all now on develop:

1. `894f9da` -- nginx path-mount on demo.sovereignhealth.io (login was
   falling through to the frontend 404)
2. `06250de` -- `auth_basic off` in path-mount + `AuthGate` + `isDemo`
   scope narrow (XHRs 401'd, demo data leaking)
3. `cb4229b` -- frontend build-id endpoint (banner loop after
   frontend-only deploys)
4. `626cb71` -- SW NetworkOnly for `/app-build-id` (stale cached JSON
   caused banner on every new tab)
5. `ca43e84` -- build-id assertion skips on frontend-only deploys
6. `546ed99` -- correct VERIFY_API URL + remove bogus image-size FAIL

## Upgrade notes / migration

- **No schema migration.** Per-locale email templates use suffixed JSON
  keys in the existing `organizations.branding` JSONB column.
- **Legacy URL bookmarks preserved 90 days.** Old root paths continue
  to resolve via 308; audit 2026-07-20 before removal.
- **Service-worker rollout.** First visit after deploy may show the
  refresh banner once; subsequent visits won't (the `/app-build-id`
  NetworkOnly rule ensures the poll reflects the currently-served
  frontend).
- **`/platform/org/apps/shi/email` clients** will see an extra
  `locales` map in the GET response. Older clients that read only the
  flat fields continue to work unchanged.

## Known issues / deferred

- **Design 028 (practitioner workbench)** -- accepted for Sprint 048.
  Current practitioner caseload is the minimal shape (profile preview
  + recent markers). Impersonation + consent UI lands in Sprint 048.
- **Patient fixtures on staging** -- two seed patients
  (`anna.meier@patients.clinic.com`, `bert.schmidt@patients.clinic.com`)
  were created directly in the staging DB for RC walk-through. They
  have no measurements yet; the summary pane shows "0 measurements"
  for both.
- **#583 emailer integration** -- the backend emailer doesn't yet
  read the per-locale org templates when sending. The data plumbing
  is in place; a later issue wires the emailer to pick user.locale
  and fall back to EN.

## Commits (develop, since v0.43.0)

```
b780841 docs(sprint-048): Design 028 v3 -- resolve open questions
e54483b docs(sprint-048): rewrite Design 028 to impersonation-only
dad41ca fix(sprint-047): practitioner summary column names + Design 028
522b0c1 feat(sprint-047): add Patients nav link for practitioners (#577 polish)
799077f feat(sprint-047): practitioner caseload polish (#577 P1/P2/P3)
626cb71 fix(sprint-047): SW must not cache /app-build-id (RC fix #4)
cb4229b fix(sprint-047): refresh banner compares frontend-to-frontend (RC fix #3)
06250de fix(sprint-047): lock down demo.sovereignhealth.io behind auth (RC fix #2)
894f9da fix(sprint-047): path-mount backend in demo.sovereignhealth.io nginx (RC fix)
ca43e84 fix(deploy): only assert build-id on backend deploys (#589 follow-up)
a8f0b07 docs(sprint-047): RC checklist for v0.44.0
e2a26e2 test(sprint-047): skip /health build-id probe on staging demo.sovereignhealth.io
546ed99 fix(deploy): correct VERIFY_API URL + stop bogus image-size FAILs (#589 follow-up)
d3444ee feat(sprint-047): per-locale email templates per org (#583)
37a1e53 test(sprint-047): update E2E specs for new routes + add admin coverage (#577)
a1b09d5 docs(sprint-047): design annotations for multi-app URL routing (#577 phase E)
ab66860 feat(sprint-047): sovereignhealth.io apex rewrite keeps URL bar clean (#577 phase C)
af7abf8 feat(sprint-047): 308 redirects for legacy SHI paths (#577 phase B)
57157cb feat(sprint-047): move SHI end-user routes under /sovereign-health/* (#577 phase A + D)
9910264 fix(sprint-047): disable zod v4 JIT to silence CSP unsafe-eval (#584)
608fcbe feat(sprint-047): rc-smoke -- build-id assertion + extra routes in deploy verify (#589)
bb155f0 feat(sprint-047): build-ID cache invalidation + SW reload banner (#586 #588)
67db6d8 feat(sprint-047): #578 test-clinic E2E fixture + plane-aware auth.setup
```
