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
| 1.1 | https://demo.brickos.io/api/v1/health | GET (browser or curl) | `{"status":"ok", "version":"0.48.0", ...}` -- must show `0.48.0` |
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
| 2.2 | `/platform/organizations` | open | list shows `test-clinic`, `sovereign-health`, and the `demo` org; no 500 |
| 2.3 | `/platform/organizations` -> click on `test-clinic` | open detail | page shows `seats` + `consent` sections with `granted` / `revoked` counts (Sprint 048 feature still present) |
| 2.4 | `/platform/users` | open | user list paginates, search works |
| 2.5 | `/platform/audit-log` | open | rows visible, filter by org works, no 404 on API call (Sprint 048 RC regression check) |
| 2.6 | `/platform/org/emails` | open | email template preview renders; verify the SHI logo IMAGE appears in the preview (not a broken-image icon). This is the exact case our fixed unit test was asserting. |
| 2.7 | navigate to `/sovereign-link/dashboard` | | Sovereign Link app dashboard loads; no regression from v0.46.0 |

**Key regression to check:** #2.5 audit-log 404 was a Sprint 048 RC bug; confirm it still works post-v0.48.0.

---

## Layer 3 -- org owner (test-clinic-admin@clinic.com)

Login: https://test-clinic.demo.brickos.io/login -- `test-clinic-admin@clinic.com` / `TestClinicAdmin1`

| # | URL (after login) | Action | Expected |
|---|---|---|---|
| 3.1 | `/sovereign-health/dashboard` | land here | dashboard renders, "Your Health Overview" heading visible, no hook-error red page |
| 3.2 | `/settings` | open | profile tab selected by default; click thru Security, Billing, Integrations, Data tabs -- no crash (Sprint 048 #527 hook-order regression check) |
| 3.3 | `/platform/org/general` | open | org name + slug + settings editable; save -> success toast |
| 3.4 | `/platform/org/members` | open | roster lists at least 2 users (admin + practitioner + patient); each row shows `role` and `consent_state` columns |
| 3.5 | `/platform/org/members` -> "Send reminders to pending patients" | click the bulk reminder button if present; otherwise skip | either 200 toast "Sent N reminders" OR "No pending invites" OR the button isn't wired yet (still backend-only, OK either way) |
| 3.6 | `/platform/org/invites` | open | pending invites list; "Resend" button on each row |
| 3.7 | `/platform/org/branding` | open | logo/color form; submit unchanged -> no error |
| 3.8 | `/platform/org/emails` | open | per-org email templates editor; locale switcher works (EN / DE) |
| 3.9 | `/platform/org/domains` | open | custom domain list loads with shape `{id, domain, verified_at}` per row |

**Key regression to check:** #3.2 settings hook-order crash was Sprint 048 #527 and the most common regression source.

---

## Layer 4 -- practitioner (test-clinic-practitioner@clinic.com)

Login: https://test-clinic.demo.brickos.io/login -- `test-clinic-practitioner@clinic.com` / `TestClinicPract1`

| # | URL | Action | Expected |
|---|---|---|---|
| 4.1 | `/sovereign-health/practitioner` (or whatever the caseload page is) | open | caseload table lists Anna Meier + any other patients |
| 4.2 | click on Anna Meier | open patient detail | patient profile + recent measurements visible |
| 4.3 | click "View as patient" / impersonation button | start impersonation | redirects to patient's dashboard; yellow "Impersonating Anna Meier" banner sticks at top; dashboard shows Anna's data |
| 4.4 | click "Exit impersonation" | | returns to practitioner view; banner disappears |
| 4.5 | `/data-access-log` (or the in-app audit view) | open | recent rows show the impersonation-start event with `actor_user_id` = practitioner (NOT patient) |

---

## Layer 5 -- patient (anna.meier@patients.clinic.com)

Login: https://test-clinic.demo.brickos.io/login -- `anna.meier@patients.clinic.com` / `TestPatient1`

| # | URL | Action | Expected |
|---|---|---|---|
| 5.1 | `/sovereign-health/dashboard` | land here | zones render (possibly empty state OK); no console errors |
| 5.2 | `/sovereign-health/measurements` | open | measurement list (possibly empty); "Add measurement" button works |
| 5.3 | `/sovereign-health/measurements/new` | fill form + submit | measurement saved; redirects back to list |
| 5.4 | `/settings` | open | profile editable; doesn't crash |
| 5.5 | `/data-access-log` or consent page | open | recent rows include the admin/practitioner impersonation if you did Layer 4 |
| 5.6 | `/sovereign-health/consents` | open | consent toggles for practitioner/admin visible |

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
| 9.1 | https://test-clinic.demo.brickos.io/login?lang=de | open | login form labels in German (e.g. "Anmelden" not "Sign in"); no `{{`...`}}` raw keys anywhere |
| 9.2 | switch to DE in navbar language picker (if present) | | page content swaps to German; no untranslated `.` fragments (e.g. `organizationAccess.title`) |
| 9.3 | open `/settings` with DE locale | | consent toggles labelled in German; proper umlauts (ü, ö, ä) render not as `ue`/`oe`/`ae` |

---

## What to report back

For each layer, tell me: all pass / which numbers failed. For failures, include:
1. The URL you were on
2. What you did
3. What happened (screenshot if there's a crash page or error banner)
4. Any red console errors (devtools -> Console, take a screenshot)

If you get stuck on basic-auth, let me know -- I can help recover the password.

If you find 3+ P1/P0 bugs, we pause promote-to-prod and add a Phase F fix cycle. If 0-2 small issues, we can fix-forward after promote.
