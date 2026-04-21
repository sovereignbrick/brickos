# ADR-051: Practitioner Impersonation-Only Model (no parallel clinical record)

**Date:** 2026-04-21
**Status:** Accepted (planned for Sprint 048 implementation)
**Sprint:** 047 (decision), 048 (implementation)
**Design:** 028

## Context

The Sprint 044 practitioner dashboard (#553) shipped a two-pane MVP: a
caseload list + a minimal health summary (measurement count + 10 recent
markers) fetched from `/practitioner/members/{id}/summary`. Sprint 047
RC polished it (role filter, i18n, nav entry, column-name fix) but left
open the question of what a practitioner's full workflow should look
like for Sprint 048.

A "full" practitioner workbench could include: SOAP notes / anamnesis
questionnaires, care plans, messaging, lab uploads, cohort dashboards,
impersonation, audit, etc. Each adds data-plane, schema, auth, audit,
retention, and compliance complexity.

Product direction at 2026-04-21 sprint kickoff: we are one clinic and
do not want to become a clinical record system. We want the
practitioner to be able to understand and support a patient using the
patient's own SHI records.

## Decision

**The practitioner has no parallel clinical record store.** Every
practitioner action that reads patient data is served via a read-only
impersonation session that fully swaps the effective user to the
patient's. No notes, no anamnesis, no care plan, no separate chart, no
messaging UI.

The caseload page (`/sovereign-health/practitioner`) shows only:

1. List of consenting patients (filtered by the new `patient_consents`
   table, scoped to the practitioner's org).
2. Basic profile + measurement count + 10-marker preview per selected
   patient.
3. One button: **"View as {patient} (read-only)"**.

Clicking the button starts an impersonation session (scoped token,
30-min inactivity timeout). The practitioner lands on the patient's
own `/sovereign-health/dashboard` with a persistent top banner
indicating read-only mode. All mutating endpoints server-side 403 with
code `impersonation_readonly`. Doctor Chat and billing/licensing
endpoints are hard-excluded (`impersonation_out_of_scope`). Every
read writes one `audit_log` row; every blocked write writes one too.

Consent is granted patient-side via a single toggle in
`/settings/organization-access` (end-user plane, visible only to users
who are `org_member` of an org other than the default platform org).
Flipping the toggle OFF immediately kills active impersonation tokens
for that (patient, org) pair.

## Consequences

### Positive

- **No parallel record layer.** The patient's own measurements,
  markers, and trends are authoritative. No dual store to migrate,
  export, or reconcile.
- **No new clinical schema.** One tiny table (`patient_consents`) plus
  new audit action codes. No notes table, no questionnaire schema.
- **Minimal compliance surface.** The practitioner only reads data the
  patient could read themselves. GDPR subject-access requests resolve
  to "see the patient's own data." Retention is whatever the patient's
  record retention is. Right-to-be-forgotten cascades automatically
  (delete patient → their data goes → practitioner can't reach it any
  more).
- **UI surface stays small.** Caseload list + detail pane + impersonate
  button. No tab-heavy workbench to build and maintain.
- **Clear mental model.** Practitioner sees exactly what the patient
  sees. No "wait, is that value what I typed last week or what the
  patient logged?" ambiguity.

### Negative

- **No practitioner-authored annotations.** A clinician can't jot
  "BG trending up, call me" attached to Anna's record. If we decide
  we need this, we're adding a `practitioner_notes` table in a future
  sprint -- not free.
- **No clinical-specific views.** There's no "only markers flagged red"
  cohort view or "HbA1c trend across all patients" aggregation. Each
  patient must be visited individually.
- **Impersonation friction.** Practitioner-to-patient navigation has a
  click (start impersonation) and a click (exit). Fine for deep
  review, awkward for quick "did Anna add anything new?" checks.
- **Audit-log volume.** One row per read. A practitioner scrolling
  through Anna's 60-day trend chart can generate 20-30 rows per
  visit. Need to size `audit_log` retention accordingly.

### Neutral

- **Dr. Alex chat privacy.** The hard-excluded endpoint list preserves
  patient-AI conversation privacy. If clinicians ever want to "review
  Anna's chat history," that needs explicit patient opt-in at a
  finer grain -- out of scope for this ADR.
- **Patient trust.** The UX makes it clear what's happening: banner,
  explicit opt-in, one-click revoke, audit log visible to patient. If
  a clinic wants a heavier workflow, they'll ask -- and we'll know
  which parts of this ADR to revisit.

## Alternatives considered

1. **Full clinical workbench** (original Design 028 v1 / v2): notes,
   anamnesis, care plan, messaging, labs, impersonation. Rejected --
   scope too large for a solo-clinic pilot; every feature adds auth +
   audit + UI cost.
2. **Read-only records viewer** (Option A alternative from Design
   028): fetch patient data via a dedicated read endpoint, render in
   a practitioner-styled UI. Rejected -- duplicates the patient's own
   UI, and we'd still need to build the "practitioner view" layer for
   each page. Impersonation reuses the patient's UI verbatim.
3. **Notes only, no impersonation.** Practitioner writes observations,
   patient data surfaced via a summary endpoint. Rejected -- the
   summary endpoint's field choices pre-bake what a practitioner
   cares about, and we'd extend it forever. Impersonation lets the
   practitioner use any existing view.
4. **Scope-unlimited impersonation** (v2 Design 028 open question):
   full read of everything including Dr. Alex chat. Rejected --
   chat transcripts are private conversations, not clinical
   observations.

## Compliance notes

- **Legal basis** (GDPR Art. 6(1)(a) + Art. 9(2)(a)): explicit
  patient consent for processing health data. Consent record is the
  `patient_consents` row.
- **Right of access** (GDPR Art. 15): patient's own /user/audit-log
  shows every practitioner view with timestamp + endpoint.
- **Right to erasure** (GDPR Art. 17): patient consent revoke is
  instant; account deletion cascades to consents + nullifies audit
  rows.
- **For DE/EU pilot clinics**: the persistent read-only banner +
  server-enforced write 403s + exclusion of Doctor Chat satisfy the
  "viewing, not acting on behalf of" boundary.

## Implementation handoff

Design 028 v3 (accepted 2026-04-21) has the full spec: layout
(Option B master-detail), allowed/blocked/hard-excluded endpoint
buckets, data model, endpoint sketch, acceptance criteria. Sprint 048
issue numbers will be assigned at Sprint 048 kickoff.
