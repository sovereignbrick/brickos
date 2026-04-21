# Design 028 -- Practitioner Impersonation (read-only patient view)

**Status:** Accepted 2026-04-21 (v3 -- open questions resolved, ready for Sprint 048 implementation)
**Date:** 2026-04-21
**Related:** Sprint 044 #553 (practitioner scaffold), Sprint 047 #577 (URL routing + polish)
**Sprint:** 048 (proposed)

## The rule

A practitioner has **no separate clinical record store.** When a
practitioner reviews a patient, they view the patient's own SHI data
exactly as the patient sees it -- through a read-only impersonation
session. Consent is granted by the patient from their own settings.
There are no practitioner notes, no anamnesis questionnaires, no
separate patient chart. The source of truth is the patient's own
/sovereign-health/* records, read through a gate.

This is a deliberate simplification of v1. A medical record store
introduces auth, audit, retention, export, HL7/FHIR, GDPR subject-
access, and versioning complexity that we do not have budget for and
that a single-clinic pilot does not need. Impersonation gives the
practitioner every view the patient has, without doubling the data
plane.

## What the practitioner can do

Three things, nothing more:

1. **See the caseload** -- the list of patients who have consented to
   share their records with this org.
2. **Preview a patient's basic profile** -- name, email, join date,
   last-active date, measurement count, latest measurement date.
3. **Impersonate** -- open the patient's own SHI interface in
   read-only mode. Specifically: biomarkers overview, the
   measurement list, individual marker details, and trends charts.
   **Doctor Chat is explicitly excluded** (see "Impersonation scope"
   below).

What is explicitly out of scope:

- No practitioner notes / SOAP / anamnesis.
- No separate clinical chart.
- **No Dr. Alex chat access during impersonation.** Chat transcripts
  are a private conversation between the patient and the AI, not a
  clinical observation the practitioner should review.
- No messaging UI (emails go through the existing per-org email
  templates at /platform/org/apps/shi/email; no in-app inbox).
- No care plan / prescribed-markers feature.
- No cohort grid / at-risk dashboards.
- No lab-upload workflow beyond what the patient already has.
- No practitioner-to-practitioner chat.
- No time-limited consent grants. Grants are indefinite; the patient
  revokes by toggling a button in their own profile.

## Layout

Option B from design v1 -- master/detail. Caseload list on the left,
patient preview + actions on the right. Ditches the tiled cohort grid
(v1 Option C) and the deep tab workbench (v1 Option A).

```
+-----------------------------------------------------------------------+
| STAGING banner                                     [TC ▼ user menu ]  |
+-----------------------------------------------------------------------+
| SHI nav: Overview  Doctor Chat  + Add  History  Trends  [Patients]    |
+-----------------------------------------------------------------------+
|                                                                       |
|  Test Clinic -- Patients                                              |
|  2 patients                                                           |
|                                                                       |
|  +----------------+  +----------------------------------------------+ |
|  | 🔍 search...   |  |  Anna Meier                                  | |
|  |                |  |  anna.meier@patients.clinic.com              | |
|  | ● Anna Meier   |  |  Joined 4/19 · Last active 4/21              | |
|  |   Patient      |  |                                              | |
|  |   last: 4/21   |  |  Measurements     12                         | |
|  |                |  |  Latest           4/18                       | |
|  | ○ Bert Schmidt |  |  Primary language DE                         | |
|  |   Patient      |  |                                              | |
|  |   never active |  |  Recent markers                              | |
|  |                |  |    HbA1c   5.4 %    green    3 days ago     | |
|  | [+ invite]     |  |    Glucose 92  mg/dL orange  3 days ago     | |
|  +----------------+  |    ApoB    78  mg/dL green   2 wks ago      | |
|                      |                                              | |
|                      |  ┌─────────────────────────────────────┐     | |
|                      |  │  🔓 View as Anna (read-only) →      │     | |
|                      |  └─────────────────────────────────────┘     | |
|                      |                                              | |
|                      |  ✓ Anna consented on 4/19.                   | |
|                      |  [ revoke my access ]                        | |
|                      +----------------------------------------------+ |
|                                                                       |
+-----------------------------------------------------------------------+
```

When the selected patient has NOT consented:

```
|  +----------------+  +----------------------------------------------+ |
|  | ○ Bert Schmidt |  |  Bert Schmidt                                | |
|  |   Patient      |  |  bert.schmidt@patients.clinic.com            | |
|  |   never active |  |  Joined 4/19 · Never active                  | |
|  |                |  |                                              | |
|  |                |  |  Bert has not granted this clinic access to  | |
|  |                |  |  their health records. They can opt in from  | |
|  |                |  |  Settings → Organization access.             | |
|  |                |  |                                              | |
|  |                |  |  [ 📩 Send opt-in reminder ] (1x per 24h)    | |
|  |                |  +----------------------------------------------+ |
```

The preview section ("Recent markers") is populated from the same
`/practitioner/members/{id}/summary` endpoint that's already in place
(Sprint 044, fixed in Sprint 047 RC). No schema change required.

## Impersonation scope

During impersonation, the practitioner's client sends every request
with the `X-Impersonation-Token` header. The middleware classifies the
request into one of three buckets based on URL path:

| Bucket | Paths | During impersonation |
|---|---|---|
| **Allowed (read)** | `/zones`, `/markers` + `/markers/*`, `/measurements` + `/measurements/{id}`, `/trends` + `/trends/*`, `/user-markers`, `/sync/changes`, `/v1/content/*` | Effective user swapped to patient. Data returned. Audit row written. |
| **Blocked (write)** | any POST/PUT/PATCH/DELETE on the above read paths, plus `/measurements/new`, `/user-markers/*` writes, `/settings/*` writes | 403 with code `impersonation_readonly`. Audit row written for the blocked attempt. |
| **Hard-excluded** | `/doctor-chat` and `/doctor-chat/*`, `/doctor-chat/quota`, any AI chat endpoint, `/billing/*`, `/license/*` | 403 with code `impersonation_out_of_scope` regardless of method. The UI hides the Doctor Chat nav entry and disables the `+ Add` / edit buttons. |

The read bucket covers everything a practitioner legitimately needs to
review biomarker state. The hard-excluded set protects patient-AI
conversation privacy, billing PII, and licensing state that has no
clinical relevance. Any new endpoint added to the SHI app must be
categorised into one of the three buckets in its initial review --
"unknown" defaults to hard-excluded.

## Impersonation semantics

When the practitioner clicks **"View as Anna (read-only)"**:

1. Frontend POSTs to `/practitioner/impersonate/start` with
   `patient_user_id`. Backend returns a scoped session token.
2. Frontend stores the token in a session cookie
   `impersonation_token` (HttpOnly, SameSite=Lax, scoped to the org
   subdomain, no expires = session cookie).
3. Frontend redirects to `/sovereign-health/dashboard` (same path the
   patient sees). On every authed XHR, the app client sends **two**
   headers: the practitioner's regular `Authorization: Bearer <jwt>`
   AND the `X-Impersonation-Token: <scoped>`.
4. Backend middleware, when it sees both, swaps the effective user ID
   to the patient's for read paths. Write paths (POST/PUT/PATCH/DELETE
   on measurement/profile/preference endpoints) return 403 with code
   `impersonation_readonly`.
5. A persistent top banner says: `👁 Viewing as Anna Meier (read-only)
   · Exit impersonation`. Clicking Exit clears the impersonation_token
   cookie and returns to `/sovereign-health/practitioner/{id}`.
6. Session is time-boxed: the scoped token expires after **30
   minutes** of inactivity (no API request). The frontend refreshes
   the token on each read; expiry shows a toast and clears the cookie.
7. Every read during an impersonation session writes one audit_log
   row: `actor_user_id = practitioner`, `target_user_id = patient`,
   `action = 'impersonation.read:<endpoint>'`, plus a
   `impersonation_session_id` (uuid) so we can correlate all reads in
   one viewing.

Hard rules enforced server-side (never trusted to the client):

- Write endpoints 403 when X-Impersonation-Token is present.
- The scoped token is tied to one (practitioner, patient, org) tuple
  and cannot be reused for a different patient.
- Revoking consent (patient-side) invalidates active impersonation
  tokens immediately.
- Practitioner role is re-checked on every call; downgrading role
  mid-session drops subsequent reads.

## Patient opt-in

The patient controls access entirely via a single toggle button on
their profile. No scope pickers, no time-limited grants -- one switch
per org, flipped on or off.

### Settings profile (Sprint 046's `/settings` with plane-aware filtering)

Add one new tab **"Organization access"** to the end-user-plane tab
list, visible only if the patient is an `org_member` of an org other
than the default platform org. The tab has one row per org the
patient is a member of, each with a single toggle:

```
  Organization access
  --------------------------------------------------------------
  Your health records are private. Orgs you join can request
  read-only access so their practitioners can review your
  biomarkers, measurements, and trends. They cannot edit your
  data or see your Dr. Alex chat history. You can toggle access
  at any time.

  Test Clinic                                      [ ●  ON ]
    Joined 4/19 via invite · test-clinic.sovereignhealth.io
    Access granted 4/19.

  Other Clinic                                     [    OFF ]
    Joined 4/20 via invite · other-clinic.sovereignhealth.io
    Access has never been granted.

  (no other orgs)
```

Flipping ON writes/updates a `patient_consents` row with
`revoked_at = NULL` and `granted_at = NOW()`. Flipping OFF sets
`revoked_at = NOW()` and invalidates any active impersonation token
for that (patient, org) pair. Re-flipping ON later creates a new
grant entry (audit history preserved).

For a solo-platform user (only member of the default platform org),
the whole tab is hidden. That keeps the existing minimal settings
shape for 99 % of users.

### Email / onboarding nudge

When a patient is newly added to an org (invite accepted), their first
login lands on `/settings/organization-access` with a one-time prompt:

```
  +-----------------------------------------------------+
  | Test Clinic would like access to your health        |
  | records.                                            |
  |                                                     |
  | This lets their practitioners view your biomarkers, |
  | trends, and measurement history in read-only mode.  |
  | They cannot edit your data. You can toggle access   |
  | off at any time from Settings.                      |
  |                                                     |
  |  [ Deny ]                       [ Grant access ]    |
  +-----------------------------------------------------+
```

Skipping the prompt = deny. Closing the tab = deny. Explicit click =
grant, persisted to `patient_consents`. The invite email and this
prompt are both rendered from the org's SHI email templates (Sprint
047 #583), keeping the voice branded and consistent across the
onboarding flow.

## Data model

One new table. Very small.

```sql
CREATE TABLE IF NOT EXISTS patient_consents (
    patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    PRIMARY KEY (patient_user_id, org_id)
);

CREATE INDEX IF NOT EXISTS patient_consents_org_active_idx
    ON patient_consents (org_id)
    WHERE revoked_at IS NULL;
```

`audit_log` already exists; we only add new action codes:

- `patient_consent.granted`
- `patient_consent.revoked`
- `impersonation.start`
- `impersonation.exit`
- `impersonation.read:<endpoint>`
- `impersonation.write_blocked:<endpoint>`

No practitioner-notes table. No SOAP. No anamnesis schema.

## Endpoints

### Practitioner-facing

| Method | Path | Purpose |
|---|---|---|
| GET | /practitioner/members | Caseload. **Filtered by `patient_consents` -- only consenting patients are returned.** Non-consenting members still exist but are hidden from the practitioner; the org-admin "Members" view on brickos.io lists everyone. |
| GET | /practitioner/members/{id}/summary | Already exists (Sprint 047 RC fix). Unchanged. |
| POST | /practitioner/impersonate/start | Body: `{ patient_user_id }`. Returns `{ impersonation_token, session_id, expires_at }` if consent exists; 403 otherwise. |
| POST | /practitioner/impersonate/exit | Invalidates the scoped token. |
| POST | /practitioner/invite-reminder | Body: `{ patient_user_id }`. Sends the org's opt-in email template to the patient (uses Sprint 047 #583 per-locale template). Rate-limited to 1 per patient per 24h. |

### Patient-facing

| Method | Path | Purpose |
|---|---|---|
| GET | /user/organization-access | Returns `[{ org_id, org_name, granted_at, revoked_at }]` for every org the user is a member of. |
| POST | /user/organization-access/{org_id}/grant | Grants consent (upsert; sets `revoked_at = NULL`). |
| POST | /user/organization-access/{org_id}/revoke | Sets `revoked_at = NOW()`. Invalidates any active impersonation tokens on this patient for this org. |

### Infrastructure (shared)

Middleware that inspects `X-Impersonation-Token` on every request to
`/sovereign-health/*` data endpoints:

- If present: validate token, swap effective user ID, write audit row.
- If present on a write endpoint: 403 `impersonation_readonly`, write
  audit row anyway.
- Token is validated against (practitioner_id, patient_id, org_id,
  still-consenting). Any mismatch = 401, cookie cleared.

## Acceptance criteria

Sprint 048 ships when:

- Patient can grant + revoke consent to an org from
  `/settings/organization-access`. Page hidden for solo users.
- Practitioner caseload list filters out non-consenting patients.
- Clicking "View as {patient}" starts a scoped session, redirects to
  `/sovereign-health/dashboard`, and shows a persistent top banner
  "Viewing as {name} -- read-only · Exit".
- Every SHI page that the patient can see renders identically in
  impersonation mode, with edit affordances hidden / buttons
  disabled.
- Every write attempt during impersonation 403s with a clear error
  toast.
- Exiting the banner drops the cookie and returns to
  `/sovereign-health/practitioner/{id}`.
- Revoking consent (patient-side) immediately kills any active
  impersonation session for that patient+org.
- Audit log records at least `impersonation.start`,
  `impersonation.exit`, one `impersonation.read:...` per API call, and
  `impersonation.write_blocked:...` per blocked write.
- EN + DE strings for every user-visible label: caseload empty state,
  consent prompt, revoke confirmation, impersonation banner, exit
  button, "read-only" toast.

## Privacy / compliance notes

- **Legal basis**: patient consent + legitimate interest (healthcare
  provider). Both recorded.
- **GDPR subject access**: a patient requesting their audit log can
  download every view the practitioner made. `/user/audit-log` already
  exists from Sprint 026.
- **Retention**: audit rows are immutable. `patient_consents` rows
  stay after revoke (with `revoked_at` set) so the history of access
  is preserved. Hard-deleting a patient (right to be forgotten)
  cascades to consents.
- **Jurisdictional**: for DE/EU deployments, impersonation UI strings
  must make clear that the practitioner is viewing, not editing. The
  persistent banner + the 403 on writes satisfy this.

## Resolved decisions (2026-04-21)

The four open questions from v2 were resolved at the Sprint 048
kickoff; the answers are inlined into the spec above. Recap:

1. **Scope-granular impersonation** -- **YES, partially.** The allow-
   list is biomarkers (zones/markers/user-markers), measurements,
   measurement list, and trends. Doctor Chat is hard-excluded
   (private patient-AI conversation). Billing and licensing are
   hard-excluded (no clinical relevance). See "Impersonation scope"
   table.
2. **Time-limited grants** -- **DEFERRED.** Grants are indefinite.
   The patient revokes at any time via a single toggle button on
   their profile (`/settings/organization-access`). We may revisit
   if a real clinic requests timed access.
3. **Practitioner's own SHI data during impersonation** --
   **FULLY SWAPPED.** The session user context is the patient's;
   the practitioner's own records are inaccessible until they exit
   the impersonation session. No edge-case accommodation for
   practitioner-as-own-patient.
4. **Invite / reminder template source** -- **ORG TEMPLATE.** Uses
   the per-org SHI email templates shipped in Sprint 047 #583. Keeps
   branded voice + localisation consistent with the rest of the
   patient onboarding flow.
