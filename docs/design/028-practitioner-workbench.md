# Design 028 -- Practitioner Workbench

**Status:** Draft
**Date:** 2026-04-21
**Related:** Sprint 044 #553 (practitioner dashboard scaffold), Sprint 047 #577 (URL routing + polish)
**Sprint:** 048 (proposed)

## Problem

The Sprint 044 practitioner page (`/sovereign-health/practitioner`) is a
two-pane caseload MVP: a list of org members on the left, a minimal
health summary on the right (measurement count, latest date, last 10
distinct markers). Sprint 047 polished it -- role-filter patients,
translated strings, nav entry, column-name fix.

It's not yet a workbench. A real clinician needs to do more than read a
10-marker list: take anamnesis notes, track a care plan, message the
patient, review labs longitudinally, occasionally see what the patient
sees in their app. This doc specifies the full surface.

## Who uses it

Two roles access the workbench via `/sovereign-health/practitioner` on a
tenant's `{slug}.sovereignhealth.io` subdomain:

| Org role | Caseload visible | Actions available |
|---|---|---|
| `practitioner` | Patients assigned to them (future: direct assignment) OR full patient list of the org (current) | Review + annotate + message |
| `org_owner` | All patients in the org | Review + annotate + message + administrative (reassign patient, export record) |

Patients (`member` role) never see this UI -- no Patients nav entry, and
`/sovereign-health/practitioner` redirects them to `/sovereign-health/dashboard`.

## What a practitioner needs (feature set)

Grouped by priority:

### P0 -- Reliable baseline (ship in Sprint 048)

1. **Patient overview** -- profile, active tier, date joined, last active, primary language.
2. **Recent labs & markers** -- last N markers with values, units, trend arrow vs previous reading, status (green/orange/red) vs reference range. Clickable to marker detail.
3. **Measurements timeline** -- scrollable table, filterable by marker, date range.
4. **Notes pane** -- free-form practitioner notes per patient, private to the org's clinical team. Plain markdown, auto-saved, timestamped, attributed to the author.

### P1 -- Clinical workflow (Sprint 049)

5. **Structured anamnesis (intake)** -- questionnaire for the first patient meeting: chief complaint, history, allergies, meds, family history, lifestyle. Stored as a versioned JSON blob per patient.
6. **Care plan** -- list of targets the practitioner wants the patient to track (e.g. "glucose fasting weekly", "ApoB quarterly"). Surfaces as reminders in the patient's SHI dashboard.
7. **Patient message** -- composer that sends a templated email (using the org's SHI email templates from Sprint 047 #583) or an in-app note the patient sees on next visit.

### P2 -- Advanced (Sprint 050+)

8. **Labs management** -- practitioner uploads a lab PDF; extraction pipeline (#450 / licensing) runs; resulting markers attach to the patient's timeline with a "reviewed by practitioner" flag.
9. **Impersonation (read-only)** -- for support/debugging, open the patient's dashboard in a locked-down view. Audit-logged; session-bound; no writes. UI clearly indicates "viewing as {patient}".
10. **Care events** -- visit log (in-person, telehealth, async review) with duration + billable code for insurance workflows.
11. **Cohort view** -- instead of one patient at a time, see a grid: "who's overdue for HbA1c?" "patients whose ApoB worsened 10%+ this quarter?"

## Privacy, audit, consent

Not negotiable for any of the above:

- **Consent gate.** A patient must explicitly consent to share their health
  data with the org's practitioner team. Consent is recorded in
  `patient_consents(patient_user_id, org_id, granted_at, revoked_at,
  scope)`. The practitioner endpoints must join on this table and return
  empty/403 for patients who have not consented.
- **Audit log.** Every practitioner view of patient data writes an
  `audit_log` row: `action='practitioner.view_summary'`, `actor_user_id`,
  `target_user_id`, `org_id`, `timestamp`, `ip`, `route`. Patients can
  review their own audit log on a dedicated settings page.
- **Impersonation separation.** The impersonation view is served from a
  special session flag that disables all writes server-side. Leaving the
  patient scope clears the flag. The URL bar always reads
  `/sovereign-health/practitioner/{id}/impersonate` -- never the patient's
  own `/dashboard`.
- **Notes scope.** Practitioner notes are visible only to users with
  `org_role in ('practitioner', 'org_owner')` of the same org. Never
  visible to the patient themselves (they're a clinical record, not a
  conversation).

## UI -- three layout options

The current page is Option B at minimum fidelity. Options A and C are
alternative paths if we want a different mental model.

### Option A -- Tabbed patient workbench (deep work on one patient)

Each patient has its own URL: `/sovereign-health/practitioner/{patient_id}`.
Tabs switch between Overview / Notes / Labs / Messages / Plan. The
caseload list is a sidebar that collapses on small screens.

```
+------------------------------------------------------------------+
| STAGING banner                               [ DA ▼ user menu ]  |
+------------------------------------------------------------------+
| SHI nav: Overview  Doctor Chat  + Add  History  Trends [Patients]|
+------------------------------------------------------------------+
|                                                                  |
|  +--------+  +----------------------------------------------+    |
|  | Case-  |  | Anna Meier                                   |    |
|  | load   |  | anna.meier@patients.clinic.com · since 4/19  |    |
|  |        |  | tier: glimpse · last active: 4/21            |    |
|  | □Anna  |  +----------------------------------------------+    |
|  |  Meier |  | [Overview] [Notes] [Labs] [Messages] [Plan]  |    |
|  | □Bert  |  +----------------------------------------------+    |
|  |  Schm. |  |                                              |    |
|  |        |  |  HbA1c   5.4%   ↓0.2   [green]   3 days ago  |    |
|  | [+inv] |  |  Glucose 92    ↑3     [orange]  3 days ago  |    |
|  |        |  |  ApoB    78    ↓4     [green]   2 wks ago   |    |
|  |        |  |  ...                                         |    |
|  |        |  |                                              |    |
|  |        |  |  Recent measurements           [see all →]   |    |
|  |        |  |  ---------------------------------------     |    |
|  |        |  |  4/18  HbA1c   5.4%                         |    |
|  |        |  |  4/11  Glucose 92 mg/dL                     |    |
|  |        |  |  ...                                         |    |
|  +--------+  +----------------------------------------------+    |
|                                                                  |
+------------------------------------------------------------------+
```

**Pros:** Each patient gets a stable URL (shareable, bookmarkable, can
open two patients in two tabs). Tabs are deep-workable. Scales to P1/P2
features cleanly (each tab is its own route segment).

**Cons:** Switching patients requires going back to the caseload list
(or collapsing/clicking sidebar). "What did I just write for Bert?"
needs an extra click.

### Option B -- Master-detail (current pattern, extended)

Single URL `/sovereign-health/practitioner` with a caseload on the left
and a detail pane on the right that shows the selected patient's tabs
inline.

```
+------------------------------------------------------------------+
| STAGING banner                               [ DA ▼ user menu ]  |
+------------------------------------------------------------------+
| SHI nav                                           [Patients]     |
+------------------------------------------------------------------+
|                                                                  |
|  Test Clinic -- Patients                                         |
|  2 patients                                                      |
|                                                                  |
|  +----------------+  +----------------------------------------+  |
|  | 🔍 search...   |  |  ► Anna Meier · Overview               |  |
|  |                |  |  ----------------------------------   |  |
|  | ● Anna Meier   |  |  [Overview][Notes][Labs][Msg][Plan]   |  |
|  |   Patient      |  |                                        |  |
|  |   last: 4/21   |  |  HbA1c   5.4% ↓0.2  green              |  |
|  |                |  |  Glucose 92    ↑3   orange             |  |
|  | ○ Bert Schmidt |  |  ApoB    78    ↓4   green              |  |
|  |   Patient      |  |                                        |  |
|  |   never        |  |  Measurements (42) · latest 4/18       |  |
|  |                |  |  [see all →]                           |  |
|  | [+ invite]     |  |                                        |  |
|  +----------------+  +----------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

**Pros:** No navigation penalty to switch patients -- click a name and
the detail updates. Compact on a single screen. Matches the current
implementation.

**Cons:** Can't share a URL to a specific patient without query params.
Mobile becomes a stacked view (list → detail → back). Tabs inside the
detail pane compete for horizontal space with the caseload list.

### Option C -- Cohort dashboard (grid)

Grid of patient cards with headline metrics and quick actions. Click a
card to drill into the patient's Option-A-style tabs.

```
+------------------------------------------------------------------+
| STAGING banner                               [ DA ▼ user menu ]  |
+------------------------------------------------------------------+
| SHI nav                                           [Patients]     |
+------------------------------------------------------------------+
|                                                                  |
|  Test Clinic · 2 patients · 1 needs review · 0 overdue           |
|                                                                  |
|  Filters: [all] [review] [overdue] [inactive 30d+]               |
|                                                                  |
|  +-----------------+  +-----------------+  +-----------------+   |
|  | Anna Meier      |  | Bert Schmidt    |  | + invite        |   |
|  |                 |  |                 |  |   patient       |   |
|  | 42 measurements |  | 0 measurements  |  |                 |   |
|  | latest 4/18     |  | never active    |  |                 |   |
|  |                 |  |                 |  |                 |   |
|  | HbA1c 5.4 green |  | -- no data --   |  +-----------------+   |
|  | GLU   92 orange |  |                 |                        |
|  | ApoB  78 green  |  |                 |                        |
|  |                 |  |                 |                        |
|  | [review] [msg]  |  | [invite prompt] |                        |
|  +-----------------+  +-----------------+                        |
|                                                                  |
+------------------------------------------------------------------+
```

**Pros:** At-a-glance triage. "Who needs me today?" is visible without
clicking. Great for a clinic with 20-200 patients.

**Cons:** Over-designed for a 2-patient test clinic. The density of
information per card is hard to get right -- too much and it's noisy,
too little and it's useless.

## Recommendation

**Ship Option B + per-patient URL routing for P0 in Sprint 048.**

Rationale:
- Option B is already the shipped shape; extending it adds features
  without a full rewrite.
- Move from `/sovereign-health/practitioner` (list-only) to:
  - `/sovereign-health/practitioner` -- caseload list + empty detail pane
  - `/sovereign-health/practitioner/{patient_id}` -- caseload list + patient selected (Overview tab)
  - `/sovereign-health/practitioner/{patient_id}/notes` etc. for each tab
- A stable per-patient URL solves the "share a link to a patient" gap in
  current Option B.
- Mobile: collapse the caseload to a hamburger menu; main area is the
  tab-based detail.
- Option C (cohort dashboard) is a follow-up when an org has enough
  patients (10+) to benefit from triage.
- Option A pure (no list) is unlikely to fit most clinics that want to
  flip through patients fast.

## P0 data model changes (Sprint 048 scaffold)

```sql
-- Practitioner notes (P0)
CREATE TABLE IF NOT EXISTS practitioner_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    patient_user_id UUID NOT NULL REFERENCES users(id),
    author_user_id  UUID NOT NULL REFERENCES users(id),
    body_markdown   TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS practitioner_notes_patient_idx
    ON practitioner_notes (patient_user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Patient consent gate (P0)
CREATE TABLE IF NOT EXISTS patient_consents (
    patient_user_id UUID NOT NULL REFERENCES users(id),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    scope           TEXT NOT NULL,  -- 'read_measurements', 'read_notes', ...
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    PRIMARY KEY (patient_user_id, org_id, scope)
);

-- Audit (already exists in platform schema; just need new action rows)
-- action = 'practitioner.view_summary' | 'practitioner.write_note' | ...
```

## P0 endpoint sketch (Sprint 048 scaffold)

| Method | Path | Purpose |
|---|---|---|
| GET | /practitioner/members | Existing, filters to patients (Sprint 047) |
| GET | /practitioner/members/{id}/summary | Existing, fixed in Sprint 047 RC |
| GET | /practitioner/members/{id}/measurements?marker=&from=&to= | Paginated timeline |
| GET | /practitioner/members/{id}/notes | List notes newest-first |
| POST | /practitioner/members/{id}/notes | Create a note |
| PATCH | /practitioner/notes/{note_id} | Edit (author only, within 24h) |
| DELETE | /practitioner/notes/{note_id} | Soft-delete |

Every endpoint asserts patient-consent on entry. Every read writes one
audit_log row.

## Acceptance criteria

Sprint 048 ships as "practitioner workbench P0" when:

- Per-patient URL works (refresh preserves selection).
- Overview tab renders correctly with 0, 1, or many measurements.
- Notes tab: create + list + edit (within 24h) + soft-delete works for
  an authenticated practitioner; non-practitioners 403; patients can
  never read notes.
- Measurements tab: paginated, filterable by marker + date range.
- Consent gate prevents data leak to an org that a patient hasn't
  opted in to. (For Sprint 048, ship with a "legacy consent" flag
  auto-true for existing patients of the two pilot orgs; new patient
  onboarding adds an explicit consent step.)
- Audit log shows one `practitioner.view_summary` row per patient
  click.
- EN + DE strings for every user-visible label.

## Open questions

1. Patient assignment: today every practitioner sees every patient of
   the org. Do we eventually want 1:N or N:N assignments
   (practitioner_id <-> patient_id)? Probably yes for multi-practitioner
   clinics -- defer until we have a 2+ practitioner customer.
2. Note editing window: keep at 24h for accountability (medical record
   culture), or make it unlimited with a full revision history? Defer
   to clinical advisor input.
3. Message UI: in-app (new /sovereign-health/messages inbox) or
   email-only (using org templates)? Probably both eventually; start
   with email-only (cheaper, no new UI).
4. Impersonation (P2): legal/compliance review needed. Some
   jurisdictions require explicit patient re-consent for every
   impersonation session.
