# Sprint 050 RC -- v0.48.0 Candidate -- Manual Test Checklist

**Sprint:** 050 -- Tests-First Stabilization
**Branch:** develop @ `2c69bc0`
**Staging:** deployed 2026-04-22 14:19 UTC, build=`2c69bc0`, API version `0.48.0`
**Production:** v0.46.0 still live (NOT promoted yet)

**Scope under test:** pure stabilization release. No new user-facing features. What you're looking for is *regressions* from v0.46.0, NOT new behavior. If everything feels identical to v0.46.0, the release is correct.

---

## Environments + access

### Staging Basic-Auth (nginx gate)
All `*.demo.brickos.io` + `*-demo.sovereignhealth.io` hosts require HTTP Basic Auth. Your browser will prompt once per session. Credentials live in `/etc/nginx/.htpasswd` on the VPS (you set these up when the staging env was created). If you've forgotten, `ssh root@72.61.154.115 'cat /etc/nginx/.htpasswd'` will show the hash (not the plaintext).

### Test accounts (fixtures applied on staging)

| Role | Email | Password | Host |
|---|---|---|---|
| Platform admin | `demo@sovereignhealth.io` | `SovereignDemo1` | `https://demo.brickos.io` |
| Org owner | `test-clinic-admin@clinic.com` | `TestClinicAdmin1` | `https://test-clinic.demo.brickos.io` |
| Practitioner | `test-clinic-practitioner@clinic.com` | `TestClinicPract1` | `https://test-clinic.demo.brickos.io` |
| Patient | `anna.meier@patients.clinic.com` | `TestPatient1` | `https://test-clinic.demo.brickos.io` |

If a fixture login returns 401 with a "invalid credentials" JSON body, the fixture hasn't been re-applied to staging DB. Tell me and I'll re-run `ops/fixtures/002_test_users.sql`.

---

## Layer 1 -- smoke (< 5 min)

| # | URL | Action | Expected |
|---|---|---|---|
| 1.1 | https://demo.brickos.io/health | use `curl` (NOT browser -- Sprint 047 nginx rewrites `Accept: text/html` requests to the frontend, so the browser sees a login page, not JSON). `curl -s https://demo.brickos.io/health \| jq .version` | returns `"0.48.0"` -- confirms backend is the v0.48.0 build |
| 1.2 | https://demo.brickos.io/ | open in incognito | redirects to `/login`, no console errors |
| 1.3 | https://www-demo.sovereignhealth.io/ | open | marketing site loads, hero renders, no 500 |
| 1.4 | https://eval.sovereignhealth.io/ | open (NO basic auth here -- public) | 3-profile picker loads; pick any -> dashboard renders with zones; "Sign up" + "Sign in" buttons visible at bottom banner |
| 1.5 | https://demo.brickos.io/manifest.json | open | valid JSON, `"name":"Sovereign Health Intelligence"` |

**Pass criterion:** all 5 must be green before moving to Layer 2.

---

## Layer 2 -- platform admin (demo@sovereignhealth.io)

Login: https://demo.brickos.io/login -- `demo@sovereignhealth.io` / `SovereignDemo1`

| # | URL (after login) | Action | Expected |
|---|---|---|---|
| 2.1 | `/platform` | land here after login | sidebar shows APPS section with SHI + Sovereign Link + whatever else is registered; no red error banner |
| 2.2 | `/platform/orgs` | open | list shows `test-clinic`, `sovereign-health`, and the `demo` org; no 500 |
| 2.3 | `/platform/orgs` -> click on `test-clinic` (lands on `/platform/orgs/{id}`) | open detail | page shows `seats` + `consent` sections with `granted` / `revoked` counts (Sprint 048 feature still present) |
| 2.4 | `/platform/users` | open | user list paginates, search works |
| 2.5 | `/platform/audit` | open | rows visible, filter by org works, no 404 on API call (Sprint 048 RC regression check) |
| 2.6 | `/platform/org/apps/shi/email` | open | email template preview renders; verify the SHI logo IMAGE appears in the preview (not a broken-image icon). This is the exact case our fixed unit test was asserting. |
| 2.7 | `/platform/apps` | open | app registry lists SHI + Sovereign Link + any others; no 500 (Sovereign Link has its own frontend; this page just confirms it's registered) |

**Key regression to check:** #2.5 audit-log 404 was a Sprint 048 RC bug; confirm it still works post-v0.48.0.

---

## Layer 3 -- org owner (test-clinic-admin@clinic.com)

**IMPORTANT:** before starting Layer 3, **log out** from demo.brickos.io and open a fresh private/incognito window. The hostname carries the org context for all `/platform/org/*` routes; staying on `demo.brickos.io` will make every members/domains/etc. page show "Could not load ..." because the backend has no org to scope to.

Login: https://test-clinic.demo.brickos.io/login (note: different host than Layer 2) -- `test-clinic-admin@clinic.com` / `TestClinicAdmin1`

| # | URL (after login) | Action | Expected |
|---|---|---|---|
| 3.1 | `/sovereign-health/dashboard` | land here | dashboard renders, "Your Health Overview" heading visible, no hook-error red page |
| 3.2 | `/settings` | open | profile tab selected by default; click thru Security, Billing, Integrations, Data tabs -- no crash (Sprint 048 #527 hook-order regression check) |
| 3.3 | `/platform/org/general` | open | org name + slug + settings editable; save -> success toast |
| 3.4 | `/platform/org/members` | open | roster lists at least 2 users (admin + practitioner + patient); each row shows `role` and `consent_state` columns |
| 3.5 | `/platform/org/members` -> click "Send reminders to pending patients" (button near top of the table) | trigger the bulk reminder | toast appears: either "Sent N reminders" or "No pending invites" or confirm dialog + success. The button shows a count of pending members. No 500. |
| 3.6 | `/platform/org/members` with `consent_state = pending` filter | look for pending rows | rows with pending consent state are visually distinct; each has a "Resend invite" or similar per-row action (invites are folded into the members page in this build -- no separate `/invites` route) |
| 3.7 | `/platform/org/branding` | open | logo/color form; submit unchanged -> no error |
| 3.8 | `/platform/org/apps/shi/email` | open | per-org email templates editor; locale switcher works (EN / DE); heading reads "Sovereign Health Intelligence -- Email Templates" (we fixed the old "SHI" abbreviation in this release) |
| 3.9 | `/platform/org/domains` | open | custom domain list loads with shape `{id, domain, verified_at}` per row |

**Key regression to check:** #3.2 settings hook-order crash was Sprint 048 #527 and the most common regression source.

---

## Layer 4 -- practitioner (test-clinic-practitioner@clinic.com)

Same host as Layer 3: https://test-clinic.demo.brickos.io/login (log out of the org-admin first). Log in as `test-clinic-practitioner@clinic.com` / `TestClinicPract1`

| # | URL | Action | Expected |
|---|---|---|---|
| 4.1 | `/sovereign-health/practitioner` (or whatever the caseload page is) | open | caseload table lists Anna Meier + any other patients |
| 4.2 | click on Anna Meier | open patient detail | patient profile + recent measurements visible |
| 4.3 | click "View as patient" / impersonation button | start impersonation | redirects to patient's dashboard; yellow "Impersonating Anna Meier" banner sticks at top; dashboard shows Anna's data |
| 4.4 | click "Exit impersonation" | | returns to practitioner view; banner disappears |
| 4.5 | skip -- `/sovereign-health/data-access-log` is patient-facing ("who accessed MY data"). The impersonation event from 4.3 is verified in Layer 5.5 when logged in as Anna. | -- | -- |

---

## Layer 5 -- patient (anna.meier@patients.clinic.com)

Same host as Layer 3+4: https://test-clinic.demo.brickos.io/login (log out of the practitioner first). Log in as `anna.meier@patients.clinic.com` / `TestPatient1`. On this host a patient will typically see the end-user nav (Dashboard / Measurements / Trends / Doctor Chat); the locale picker lives top-right.

| # | URL | Action | Expected |
|---|---|---|---|
| 5.1 | `/sovereign-health/dashboard` | land here | zones render (possibly empty state OK); no console errors |
| 5.2 | `/sovereign-health/measurements` | open | measurement list (possibly empty); "Add measurement" button works |
| 5.3 | `/sovereign-health/measurements/new` | fill form + submit | measurement saved; redirects back to list |
| 5.4 | `/settings` | open | profile editable; doesn't crash (hook-order regression check) |
| 5.5 | `/sovereign-health/data-access-log` | open | recent rows include the admin/practitioner impersonation if you did Layer 4 |
| 5.6 | `/settings` -> click the "Organization Access" tab | open | consent toggles for practitioner/admin visible here (consents UI lives under /settings in this build -- there is no standalone /sovereign-health/consents page) |

---

## Layer 6 -- eval (public, no auth)

Open https://eval.sovereignhealth.io/ in a fresh incognito window (no basic auth prompt -- eval is public).

| # | Action | Expected |
|---|---|---|
| 6.1 | pick "Optimized" profile | dashboard renders with green zones; sample data labelled "Demo data" (or "Evaluation data") |
| 6.2 | pick "Average" profile | different data, amber zones visible |
| 6.3 | pick "At Risk" profile | different data, red zones visible |
| 6.4 | click a marker (e.g. Iron) | detail page renders with range + demo value |
| 6.5 | scroll to any CTA ("Sign up" / "Sign in") | button crosses over to `https://app.sovereignhealth.io/...` (or `/signup` with `?from=demo-*` preserved) |
| 6.6 | try to POST from browser devtools: `fetch('/demo/zones', {method: 'POST'})` | returns 404 or 405 (read-only surface invariant) |
| 6.7 | hit `/demo/zones` 60+ times quickly (refresh / reload storm) | eventually returns 429 Too Many Requests |

---

## Layer 7 -- responsive / mobile

For each of the below, use Chrome devtools -> toggle device toolbar -> "iPhone 13 Pro" or equivalent (375x812).

| # | URL | Expected |
|---|---|---|
| 7.1 | https://demo.brickos.io/login | no horizontal scroll; sign-in form fits |
| 7.2 | https://test-clinic.demo.brickos.io/sovereign-health/dashboard (authed) | no horizontal scroll; zones stack vertically; navbar collapses to hamburger |
| 7.3 | https://eval.sovereignhealth.io/ | profile picker fits; CTA banner at bottom readable |

---

## Layer 8 -- PWA / offline

| # | Action | Expected |
|---|---|---|
| 8.1 | visit https://demo.brickos.io/login, wait 5s | devtools -> Application -> Service Workers shows one registered and `active` |
| 8.2 | devtools -> Network -> set "Offline", reload | `/offline` page renders (or the cached last-view). No raw Chrome error page. |
| 8.3 | devtools -> Application -> Manifest | shows name, start_url = `/sovereign-health/dashboard`, display = `standalone` |
| 8.4 | fetch https://demo.brickos.io/sw.js | response has `Cache-Control: no-cache` header |
| 8.5 | fetch https://demo.brickos.io/app-build-id | returns `"2c69bc0"` plain text (or JSON with that value) |

---

## Layer 9 -- i18n (DE)

| # | URL | Action | Expected |
|---|---|---|---|
| 9.1 | after login, click the "EN v" dropdown in the top-right of the navbar | switch to DE | page content swaps to German; no `{{`...`}}` raw keys; no untranslated dotted fragments (e.g. `organizationAccess.title`) leaking through |
| 9.2 | with DE selected, open `/sovereign-health/dashboard` | | zones + CTAs in German; proper umlauts (ü, ö, ä) render, not as `ue`/`oe`/`ae` |
| 9.3 | with DE selected, open `/settings` -> Organization Access tab | | consent toggles labelled in German; submit labels in German |

---

## What to report back

For each layer, tell me: all pass / which numbers failed. For failures, include:
1. The URL you were on
2. What you did
3. What happened (screenshot if there's a crash page or error banner)
4. Any red console errors (devtools -> Console, take a screenshot)

If you get stuck on basic-auth, let me know -- I can help recover the password.

If you find 3+ P1/P0 bugs, we pause promote-to-prod and add a Phase F fix cycle. If 0-2 small issues, we can fix-forward after promote.
