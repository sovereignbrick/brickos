# Sprint 047 RC -- v0.44.0 Candidate

**Sprint:** 047 -- Multi-App URL Routing + Stability
**Branch:** develop
**Candidate commits (latest first):**
- `d3444ee` feat(sprint-047): per-locale email templates per org (#583)
- `37a1e53` test(sprint-047): update E2E specs for new routes + add admin coverage
- `a1b09d5` docs(sprint-047): design annotations for multi-app URL routing (#577 phase E)
- `ab66860` feat(sprint-047): sovereignhealth.io apex rewrite keeps URL bar clean (#577 phase C)
- `af7abf8` feat(sprint-047): 308 redirects for legacy SHI paths (#577 phase B)
- `57157cb` feat(sprint-047): move SHI end-user routes under /sovereign-health/* (#577 phase A+D)
- `9910264` fix(sprint-047): disable zod v4 JIT to silence CSP unsafe-eval (#584)
- `608fcbe` feat(sprint-047): rc-smoke build-id assertion + extra routes (#589)
- `bb155f0` feat(sprint-047): build-ID cache invalidation + SW reload banner (#586 #588)

**Scope:**
- #577 multi-app URL routing (Phases A-E)
- #584 CSP unsafe-eval fix (zod jitless)
- #586 + #588 build-ID cache invalidation + SW reload banner
- #589 rc-smoke in deploy.sh (build-id assertion + extra route probes)
- #583 per-locale email templates (EN/DE)

## Test environments

| Host | Plane | What it serves |
|---|---|---|
| https://demo.brickos.io | admin (default) | Platform admin (DEMO_ADMIN) |
| https://test-clinic.demo.brickos.io | admin (org) | Org-owner self-service |
| https://demo.sovereignhealth.io | end-user (default) | SHI app (DEMO_ADMIN) |
| https://test-clinic.demo.sovereignhealth.io | end-user (org) | SHI app for test-clinic |

Staging basic-auth header is required on all four. Credentials per Sprint 045 memo.

---

## A -- URL routing (#577)

### A1. New SHI routes render on brickos.io (prefixed)

For each path, navigate and confirm the page renders (no 404/5xx):

- [ ] https://demo.brickos.io/sovereign-health/dashboard
- [ ] https://demo.brickos.io/sovereign-health/measurements
- [ ] https://demo.brickos.io/sovereign-health/measurements/new
- [ ] https://demo.brickos.io/sovereign-health/doctor-chat
- [ ] https://demo.brickos.io/sovereign-health/markers/iron
- [ ] https://demo.brickos.io/sovereign-health/trends
- [ ] https://demo.brickos.io/sovereign-health/zones/energy_metabolic
- [ ] https://demo.brickos.io/sovereign-health/practitioner (requires org_owner)

### A2. Legacy root paths 308 on brickos.io

Open DevTools Network. For each, confirm response is 308 with Location header pointing at /sovereign-health/*:

- [ ] https://demo.brickos.io/dashboard -> /sovereign-health/dashboard
- [ ] https://demo.brickos.io/measurements -> /sovereign-health/measurements
- [ ] https://demo.brickos.io/doctor-chat -> /sovereign-health/doctor-chat
- [ ] https://demo.brickos.io/markers/iron -> /sovereign-health/markers/iron
- [ ] https://demo.brickos.io/trends -> /sovereign-health/trends
- [ ] https://demo.brickos.io/zones/energy_metabolic -> /sovereign-health/zones/energy_metabolic
- [ ] https://demo.brickos.io/practitioner -> /sovereign-health/practitioner

### A3. sovereignhealth.io keeps URL bar clean (nginx rewrite)

The branded domain MUST NOT 308; URL bar stays at /dashboard etc. while the moved page renders:

- [ ] https://demo.sovereignhealth.io/dashboard renders, URL bar stays `/dashboard`
- [ ] https://demo.sovereignhealth.io/measurements renders, URL bar stays `/measurements`
- [ ] https://demo.sovereignhealth.io/doctor-chat renders, URL bar stays `/doctor-chat`
- [ ] https://test-clinic.demo.sovereignhealth.io/dashboard renders with test-clinic branding
- [ ] Direct hit on https://demo.sovereignhealth.io/sovereign-health/dashboard ALSO renders (identical content)

### A4. API calls unaffected

Backend fetches that share path prefixes with frontend routes must keep hitting the backend (not 308):

- [ ] From a logged-in /platform session, open DevTools Network; visit /platform/org/general -> the GET /org-settings/general request returns JSON 200 (not 308 HTML)
- [ ] /practitioner/members API (authed) returns JSON not redirect
- [ ] Post-login flow works: login form at /login -> landing page renders

### A5. Cross-plane link

- [ ] On an admin session at demo.brickos.io, click profile avatar -> "Open Sovereign Health ↗" -> lands on https://demo.sovereignhealth.io/dashboard (nginx rewrite)

---

## B -- Cache invalidation + refresh banner (#586 + #588)

### B1. /health exposes build id

- [ ] `curl -s -u admin:<pw> https://demo.brickos.io/api/v1/health | jq .build` returns a short git SHA (not "dev" or missing)
- [ ] `curl -s -u admin:<pw> https://demo.brickos.io/health | jq .build` returns the same value
- [ ] The SHA matches `git rev-parse --short HEAD` on develop

### B2. Refresh banner absent on fresh load

- [ ] Open DevTools Console on demo.brickos.io/login in an incognito window; wait 70s; no `/health` mismatch; no banner appears; no console errors

### B3. Refresh banner fires on stale bundle (optional, hard to stage locally)

- [ ] (Manual, optional) With the staging tab open, deploy a new backend; within 60s the banner "A newer version of the app is available. [Refresh now]" appears

---

## C -- CSP unsafe-eval fix (#584)

- [ ] Open demo.brickos.io/login, DevTools Console -> zero `Content-Security-Policy` violations mentioning `unsafe-eval`
- [ ] Navigate to /sovereign-health/doctor-chat -> still zero CSP violations
- [ ] Submit the login form -> validation works (correct error shown for empty email)

---

## D -- Per-locale email templates (#583)

Acting as test-clinic-admin on https://test-clinic.demo.brickos.io/platform/org/apps/shi/email:

- [ ] Page shows two tabs: "English" and "Deutsch"
- [ ] Enter English copy in all 5 fields, click Save -> toast "Email settings saved (English)"
- [ ] Switch to Deutsch tab -> fields are empty, NOT the English values
- [ ] Enter German copy in all 5 fields, click Save -> toast "Email settings saved (Deutsch)"
- [ ] Reload the page -> both tabs retain their respective copy
- [ ] (API spot check) `curl -s -H "Authorization: Bearer <org_owner>" https://test-clinic.demo.brickos.io/org-settings/apps/shi/email | jq '.data.locales'` shows both `en` and `de` objects populated

---

## E -- Admin surface coverage (#577 E2E)

Run the playwright suites against staging:

```
E2E_BASE_URL=https://demo.brickos.io STAGING_AUTH_PASS=... \
  npx playwright test sprint-047-url-routing sprint-047-admin-coverage --project=chromium
E2E_BASE_URL=https://test-clinic.demo.brickos.io STAGING_AUTH_PASS=... \
  npx playwright test sprint-047-admin-coverage --project=chromium
```

- [ ] `sprint-047-url-routing.spec.ts` -- all tests pass
- [ ] `sprint-047-admin-coverage.spec.ts` against demo.brickos.io -- every /platform/* page renders
- [ ] `sprint-047-admin-coverage.spec.ts` against test-clinic.demo.brickos.io -- every /platform/org/* page renders

---

## F -- RC smoke automation (#589)

- [ ] The deploy.sh staging run reported "Build-id assertion passed" in the verification section
- [ ] /login and /api/v1/hello smokes passed in verify()

---

## Sign-off

- [ ] All boxes above checked OR explicit known-issue ticket filed
- [ ] Retro scheduled / notes started
- [ ] Promote to main + production deploy decision made (go / no-go)
