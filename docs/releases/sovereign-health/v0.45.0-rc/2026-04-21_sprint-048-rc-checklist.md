# Sprint 048 RC -- v0.45.0 Candidate

**Sprint:** 048 -- White-Label Completion + Practitioner Workbench
**Branch:** develop @ `8ae3038`
**Staging:** https://demo.brickos.io + https://demo.sovereignhealth.io
**Production:** NOT YET (v0.44.0 still live)

**Scope under test:**
- Patient consent model (#048-10/11/12)
- Impersonation session + scope gate + audit (#048-13/14/15/16)
- Consent toggle + impersonation UI (#048-17/18/19/23/24)
- Org admin members page + invite flow (#048-30/31/32/33)
- Patient onboarding polish (#048-41/42/43/44)
- Platform admin consent dashboard (#048-51)
- Cross-org audit viewer polish (#048-52)

## Test environments + roles

| Host | Plane | Who |
|---|---|---|
| https://demo.brickos.io | platform admin | DEMO_ADMIN |
| https://test-clinic.demo.brickos.io | org admin + SHI end-user | `test-clinic-admin@clinic.com` (org_owner) / `anna.meier@patients.clinic.com` (patient) |
| https://www-demo.sovereignhealth.io | marketing website (staging) | anonymous |

**Not a staging host:** `demo.sovereignhealth.io` is PRODUCTION (DNS maps to prod edges). Do not use it for Sprint 048 RC.

Staging Basic-auth required. Fixture credentials in `ops/fixtures/002_test_users.sql`.

---

## A -- Regression: Sprint 047 still works

Fast, cheap checks that v0.44.0 features didn't break.

- [ ] Open https://test-clinic.demo.brickos.io/ -- AuthGate redirects to `/login` (Sprint 047 auth hardening)
- [ ] Log in as `anna.meier@patients.clinic.com`; land on `/sovereign-health/dashboard` with Anna's measurements
- [ ] `/sovereign-health/trends` renders a chart (zod-v4-jit CSP fix still active, no console errors)
- [ ] Legacy 308 redirect works: `/dashboard` → `/sovereign-health/dashboard`
- [ ] Refresh banner does NOT appear on reload (`/app-build-id` polling healthy)

---

## B -- Patient consent model (#048-10/11/12/17)

### B1. Consent tab rendering

- [ ] Log in as `anna.meier@patients.clinic.com` on test-clinic.demo.sovereignhealth.io
- [ ] Go to `/settings` -- "Organization access" tab is visible
- [ ] The tab lists "Test Clinic" with a toggle, role = `member`, joined-on date
- [ ] "View full data access log →" link visible below intro text

### B2. Consent grant (instant, no modal)

- [ ] Anna flips consent toggle ON. No confirm dialog. Toast "Access granted to Test Clinic."
- [ ] Page reloads and shows "Granted on {today}"
- [ ] DB check: `SELECT * FROM patient_consents WHERE patient_user_id = <anna> AND org_id = <test-clinic> AND revoked_at IS NULL` returns one row

### B3. Consent revoke (confirm modal)

- [ ] Anna flips consent toggle OFF. **Modal appears** with title, body, and two bullet points
- [ ] Cancel button → modal closes, state unchanged
- [ ] Flip OFF again → Confirm → toast "Access revoked from Test Clinic."
- [ ] Page shows "Revoked on {today}"
- [ ] DB check: same consents row now has `revoked_at IS NOT NULL`

### B4. Consent toggle only appears for non-default orgs

- [ ] Log in as DEMO_ADMIN on demo.sovereignhealth.io -- "Organization access" tab is hidden (no non-default org membership)

---

## C -- Impersonation (#048-13/14/15/18/19/23/24)

### C1. Caseload shows consenting patients only

- [ ] Log in as `test-clinic-admin@clinic.com` on test-clinic.demo.sovereignhealth.io
- [ ] Go to `/sovereign-health/practitioner`
- [ ] See Anna (consent granted in B2) in the caseload
- [ ] Bert (no consent yet) is NOT in the list
- [ ] Click Anna → right pane loads profile + measurement count + 10 recent markers

### C2. Start impersonation

- [ ] Click "View as Anna Meier (read-only)"
- [ ] URL navigates to `/sovereign-health/dashboard`
- [ ] Amber banner appears at top: "Viewing as Anna Meier (read-only). Exit →"
- [ ] DevTools → Application → Cookies: `impersonation_session` (UUID) + `impersonation_patient` (base64 JSON) present
- [ ] DB check: `SELECT * FROM impersonation_sessions WHERE ended_at IS NULL` shows one row, practitioner = test-clinic-admin, patient = anna

### C3. Effective-user swap verified

- [ ] On the impersonated dashboard, the data shown is Anna's data (matches what Anna saw in B1).
- [ ] Navigate to `/sovereign-health/markers/iron` -- loads Anna's iron history (no 403)
- [ ] Navigate to `/sovereign-health/trends` -- Anna's trends
- [ ] Audit log table rows land: `SELECT action, resource_type FROM audit_log WHERE user_id = <anna> ORDER BY created_at DESC LIMIT 5` -- entries like `impersonation.read:/sovereign-health/trends` visible

### C4. Write-blocked (scope gate)

- [ ] Try `/sovereign-health/measurements/new`, submit a measurement
- [ ] Expect **403** with code `impersonation_readonly`; toast or error surfaces
- [ ] DB: new audit row `impersonation.blocked_write`, resource_type = `measurements`

### C5. Hard-excluded (Doctor Chat)

- [ ] Try to open `/sovereign-health/doctor-chat` during impersonation
- [ ] Expect **403** with code `impersonation_out_of_scope`
- [ ] DB: audit row `impersonation.blocked_out_of_scope`, resource_type = `doctor-chat`

### C6. Exit impersonation

- [ ] Click "Exit →" in the banner
- [ ] Banner disappears, cookies cleared, dashboard now shows practitioner's own view
- [ ] DB: `impersonation_sessions.ended_at` is set, `end_reason = 'manual_exit'`
- [ ] Audit row `impersonation.exit` landed

### C7. Consent revoke kills active session

- [ ] Re-grant Anna's consent (B2), start impersonation (C2)
- [ ] In a second browser, log in as Anna → Settings → flip consent OFF → confirm
- [ ] Back in the practitioner tab, refresh the dashboard
- [ ] Expect banner to disappear and next read to resolve to the practitioner's own data
- [ ] DB: `impersonation_sessions` shows `end_reason = 'consent_revoked'` (or session remains but effective-user swap returns None)

### C8. 30-min idle timeout (skip unless budget allows)

- [ ] Start impersonation, leave tab open 31 min, reload
- [ ] Session times out silently, practitioner returns to their own view

---

## D -- Patient-facing data access log (#048-43)

- [ ] Log in as Anna. Go to `/settings` → click "View full data access log →"
- [ ] Page `/sovereign-health/data-access-log` loads
- [ ] Table lists every impersonation event from C1-C7, newest first
- [ ] Timestamp, prettified action (e.g. "Viewed /sovereign-health/trends"), practitioner name, org name all populated

---

## E -- Org admin members (#048-30/31/32/33)

### E1. Invite flow

- [ ] Log in as `test-clinic-admin@clinic.com`. Go to `/platform/org/members`
- [ ] Click "Invite member" → enter `newbie@patients.clinic.com`, role = `member`, submit
- [ ] Row appears in "Pending invites" with email, role, expiry
- [ ] DB: `SELECT token, expires_at FROM org_invites WHERE email = ...` returns row with unique token
- [ ] (Email sent) Check outbox / logs for email with link `https://test-clinic.demo.sovereignhealth.io/signup?invite={token}`

### E2. Accept invite via signup

- [ ] Open the invite link in an incognito window
- [ ] `/signup` page loads, **email is prefilled and locked**, "Joining Test Clinic" banner visible
- [ ] Complete signup → verify email → land on dashboard
- [ ] DB: `org_members` row for the new user, role = `member`, org_id = test-clinic
- [ ] Audit: `org_invite.accepted` row present

### E3. Invalid token shows graceful banner

- [ ] Open `/signup?invite=deadbeef-invalid-token` → warning banner "Invite not valid"
- [ ] Normal signup (without invite) still works

### E4. Remove member cascade

- [ ] On `/platform/org/members`, click Remove on Anna
- [ ] Confirm dialog → confirm
- [ ] Anna disappears from the table
- [ ] DB:
  - `org_members` row for Anna is gone
  - `patient_consents` row for Anna has `revoked_at IS NOT NULL`
  - any `impersonation_sessions` where `patient_user_id = anna` have `ended_at IS NOT NULL`
  - audit row `org_member.removed` landed

### E5. Consent badge in members table

- [ ] Every row shows a badge: **granted** (green), **revoked** (red), or **pending** (muted)
- [ ] Matches the `consent_state` field returned by `/platform/org/members` API

---

## F -- Patient onboarding polish (#048-41/42/44)

### F1. Welcome banner on first dashboard after signup

- [ ] Complete E2 signup flow fresh. Landing on `/sovereign-health/dashboard`, a one-shot welcome banner shows with CTAs "Add measurement" / "Ask Dr. Alex"
- [ ] Dismiss it. Reload → banner does NOT return
- [ ] localStorage: `shi_welcome_pending` is gone or set to 0

### F2. Consent onboarding prompt on first login

- [ ] Create a brand-new patient via E1/E2 who hasn't touched consent yet. Log out, log back in.
- [ ] On first dashboard view, a **blocking modal** asks to grant consent to Test Clinic
- [ ] Dismiss once → modal does NOT return for this (userId, orgId) pair
- [ ] Revoke consent (B3); log out, log back in -- modal does NOT return (true-pending detection)

---

## G -- Platform admin consent dashboard (#048-51)

- [ ] Log in as DEMO_ADMIN on demo.brickos.io. Go to `/platform/orgs` → open Test Clinic
- [ ] Overview tab, License section: under the seat bars, three cards visible -- **Granted / Revoked / Pending**
- [ ] Numbers match reality after the consent flows in B + E (e.g. 1 granted / 1 revoked / N pending)
- [ ] On an empty org with 0 members, the consent cards are NOT rendered

---

## H -- Cross-org audit viewer (#048-52)

- [ ] DEMO_ADMIN → `/platform/audit` → "App Events" sub-tab
- [ ] Impersonation rows from sections C + E visible
- [ ] Action pill colours:
  - `impersonation.start` / `.exit` = **blue**
  - `impersonation.read:*` = **amber**
  - `impersonation.blocked_write` / `.blocked_out_of_scope` = **red**
- [ ] Filter dropdown has `impersonation.start`, `impersonation.exit`, `impersonation.blocked_write`, `impersonation.blocked_out_of_scope`
- [ ] Selecting one restricts results correctly

---

## I -- i18n (EN + DE)

- [ ] Switch locale to DE on the patient app. Settings → Organisationszugriff / Datenzugriffsprotokoll render in German
- [ ] Org admin `/platform/org/members` page: role labels, consent badge labels in DE
- [ ] Platform admin `/platform/orgs/{id}` Overview: consent cards (Erteilt / Widerrufen / Ausstehend)
- [ ] Impersonation banner text in DE
- [ ] Welcome banner text in DE

---

## J -- Known cosmetic non-blockers

These appear in staging-deploy verification output but are expected:

- `401 Web https://www-demo.sovereignhealth.io/` -- HTTP Basic auth gate on staging-only host
- `401 Login https://demo.brickos.io/login` -- same Basic auth gate

Platform smoke test (17/17) bypasses Basic-auth and confirms real login works.

---

## Sign-off

- [ ] A (regression) PASS
- [ ] B (consent) PASS
- [ ] C (impersonation) PASS
- [ ] D (data access log) PASS
- [ ] E (org admin + invites) PASS
- [ ] F (patient onboarding) PASS
- [ ] G (consent dashboard) PASS
- [ ] H (audit viewer) PASS
- [ ] I (i18n) PASS

All PASS → promote `develop` → `main`, tag `sovereign-health/v0.45.0`, deploy production.

Any FAIL → open issue, fix on develop, redeploy staging, re-test affected section.
