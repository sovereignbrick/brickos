# Sprint 048 -- White-Label Completion + Practitioner Workbench

**Start:** 2026-04-22 (proposed)
**Goal:** Take the white-label flow end-to-end: every role (platform admin, org admin, practitioner, patient) has a complete, tested path from onboarding through daily use. All work tested on localhost containers before staging.
**Previous:** Sprint 047 (v0.44.0 -- Multi-App URL Routing + Stability)
**Estimated duration:** 5-7 working days
**Design anchors:** Design 028 v3, ADR-050, ADR-051, Design 025/026
**Previous sprint close:** `project_sprint047_completed.md`

## Sprint goal (one sentence)

Ship v0.45.0 with a fully functional white-label flow for all four
roles, backed by realistic multi-profile test fixtures and a
localhost-first test pipeline that must pass before any staging
deploy.

## Non-goals

- No new apps (Sovereign Link, Voice skeletons stay deferred).
- No cohort-level practitioner dashboards (ADR-051 defers that).
- No payment / Stripe changes (billing UX stays as-is).
- No mobile-specific UX polish (responsive works, native wrapper later).

---

## Phase 0 -- Test fixtures + localhost pipeline (Day 1)

Foundation for everything that follows. Work ONLY on localhost
containers until this phase is green.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 048-01 | P0 | Fixture: seed 5 patient users with risk-profile variations in a reset-able migration | 0.5d | Clone demo-profile data: 1 `optimized`, 1 `average`, 2 `at_risk` (metabolic + cardiovascular), 1 `average` with missing recent data. Seeded into localhost + staging test-clinic org. |
| 048-02 | P0 | `ops/localhost-stack.sh up / down / reset / seed` | 0.5d | Single script that brings up the Docker compose stack, waits for health, runs migrations, seeds fixtures. `--reset` drops + recreates the DB. Idempotent. |
| 048-03 | P0 | `ops/localhost-stack.sh test` runs full suite | 0.4d | cargo test (unit + smoke + integration + property) + clippy + pnpm tsc + pnpm vitest + playwright against localhost. Single command, fails fast. |
| 048-04 | P0 | Playwright config can target `http://localhost:3000` | 0.2d | Skip basic-auth when baseURL is localhost. Reuse the 47 sprint-047 specs unchanged. |
| 048-05 | P1 | CI-style localhost checklist doc | 0.2d | `docs/ops/localhost-test-runbook.md` lists the commands + expected timings. |

**Phase 0 exit:** `ops/localhost-stack.sh test` returns 0 against a
freshly-reset DB with seeded fixtures. No flakes.

### Fixture patient profiles (048-01 detail)

5 patients seeded into the `test-clinic` org on both localhost and
staging. Each has a display name, locale, and a pre-populated 90-day
measurement history generated from the demo-profile data:

| Patient | Locale | Risk profile | Key markers | Purpose |
|---|---|---|---|---|
| Anna Meier | DE | optimized | HbA1c 5.0, glucose 85, ApoB 60, LDL 80 | Healthy baseline |
| Bert Schmidt | DE | average | HbA1c 5.5, glucose 95, ApoB 85, LDL 120 | Typical |
| Carla Schulz | EN | at_risk (metabolic) | HbA1c 6.8, glucose 140, fasting insulin 18 | Pre-diabetic |
| Dieter König | DE | at_risk (cardiovascular) | ApoB 130, LDL 180, ApoA1 low, TG 220 | Lipid risk |
| Eva Lange | EN | average (missing data) | 15-day gap, only 3 markers | Edge case: sparse |

Each patient also has a different `email_verified` / `onboarding_step`
state so we can exercise the opt-in flow (048-10) without resetting.

---

## Phase 1 -- Practitioner workbench (Day 2-4)

Implements Design 028 v3 / ADR-051.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 048-10 | P0 | DB migration: `patient_consents` table | 0.2d | -- |
| 048-11 | P0 | Backend: `/user/organization-access` GET/POST endpoints | 0.4d | 048-10 |
| 048-12 | P0 | Backend: `/practitioner/members` consent-filtered (drop non-consenting) | 0.2d | 048-10 |
| 048-13 | P0 | Backend: impersonation middleware (swap effective user on `X-Impersonation-Token`) | 0.8d | 048-10 |
| 048-14 | P0 | Backend: `/practitioner/impersonate/start` + `/exit` endpoints | 0.3d | 048-13 |
| 048-15 | P0 | Backend: impersonation scope table (allowed/blocked-write/hard-excluded) enforced on every `/sovereign-health/*` data endpoint | 0.5d | 048-13 |
| 048-16 | P0 | Backend: audit-log rows for every impersonation read + blocked write | 0.3d | 048-13 |
| 048-17 | P0 | Frontend: Settings `/settings/organization-access` tab (toggle button per org, hidden for solo users) | 0.5d | 048-11 |
| 048-18 | P0 | Frontend: practitioner caseload -- "View as {patient} (read-only)" button + impersonation session start | 0.4d | 048-14 |
| 048-19 | P0 | Frontend: persistent read-only banner + Exit button during impersonation | 0.3d | 048-18 |
| 048-20 | P0 | Frontend: hide edit affordances during impersonation (+Add, form submits, chat composer, settings edits) | 0.5d | 048-18 |
| 048-21 | P0 | Frontend: consent onboarding prompt on first login after org invite | 0.4d | 048-17 |
| 048-22 | P1 | Frontend + Backend: `/practitioner/invite-reminder` + UI button (uses org SHI email templates from #583) | 0.3d | 048-17 |
| 048-23 | P0 | i18n: EN + DE strings for consent UI, impersonation banner, caseload empty states | 0.3d | 048-17-22 |
| 048-24 | P0 | Playwright: consent grant/revoke, start/exit impersonation, write-block 403, Doctor Chat hard-excluded | 0.5d | 048-14 to 048-20 |

**Phase 1 exit:** Full round-trip test works on localhost:
grant consent -> see patient in caseload -> impersonate -> view
biomarkers/measurements/trends -> try to edit (blocked 403) -> try to
visit Doctor Chat (blocked 403) -> exit -> revoke consent -> patient
disappears from caseload. All 24 tests green.

---

## Phase 2 -- Org admin gaps (Day 4-5)

The pieces a real clinic owner needs that we don't yet ship.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 048-30 | P0 | Org admin: invite-patient flow from `/platform/org/members` (sends branded email with onboarding link) | 0.5d | 048-17 |
| 048-31 | P0 | Org admin: promote member -> practitioner / org_owner (role change with audit log) | 0.3d | 048-30 |
| 048-32 | P0 | Org admin: remove member (soft-delete + revoke consents + kill active impersonation tokens) | 0.3d | 048-30 |
| 048-33 | P1 | Org admin: members list shows consent state column (granted / pending / revoked) | 0.2d | 048-30, 048-17 |
| 048-34 | P1 | Org admin: invite-reminder bulk action (select 3 pending patients -> send reminders) | 0.3d | 048-22 |
| 048-35 | P1 | Org admin: custom domain reverify button (re-run DNS/cert check for `{slug}.customerdomain.com` -- Sprint 044 #544 carry-over) | 0.4d | -- |

**Phase 2 exit:** An org admin can onboard a patient end-to-end from
scratch (invite -> email sent -> patient confirms consent -> appears
in practitioner caseload) without shell access.

---

## Phase 3 -- Patient onboarding polish (Day 5-6)

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 048-40 | P0 | Patient invite email template (per-org, EN + DE) renders through SHI email template system #583 | 0.3d | 048-30 |
| 048-41 | P0 | Patient lands on `/signup?invite={token}` -> form pre-fills email, on submit creates user + consents to inviting org in one step | 0.4d | 048-11, 048-40 |
| 048-42 | P0 | Patient post-signup: dashboard shows a one-time "welcome to {org_name}" banner pointing at Dr. Alex + measurements | 0.3d | 048-41 |
| 048-43 | P1 | Patient: audit-log page at `/settings/data-access-log` showing every practitioner view of their records | 0.4d | 048-16 |
| 048-44 | P2 | Patient: revocation confirmation modal ("revoking will stop all access for {org_name}. Continue?") | 0.2d | 048-17 |

**Phase 3 exit:** The "first login after being invited" flow is
smooth: email lands -> signup form -> consent granted in the same
step -> dashboard with orientation banner.

---

## Phase 4 -- BrickOS platform admin (Day 6)

Smaller scope -- platform admin is already mostly wired from Sprint 046/047.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 048-50 | P1 | Platform admin: `/platform/orgs` gains a "create org" form (currently scripted) | 0.5d | -- |
| 048-51 | P1 | Platform admin: `/platform/orgs/{id}` detail page shows seat usage (org_owners + practitioners + patients separately), consent state counts | 0.3d | 048-33 |
| 048-52 | P2 | Platform admin: cross-org audit trail viewer (filter by org, actor, action) | 0.4d | 048-16 |
| 048-53 | P2 | Platform admin: "impersonate as org admin" for support (same ADR-051 mechanism, scoped to org_admin role) | 0.5d | 048-13 |

**Phase 4 exit:** Provisioning a new org from scratch is a 30-second
UI click-through instead of a shell script. Support can trace any
action across any org via the audit viewer.

---

## Phase 5 -- RC + Deploy (Day 6-7)

Identical flow to Sprint 047 close-out.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 048-60 | P0 | Full localhost test pass: `ops/localhost-stack.sh test` | 0.2d | Phase 1-4 |
| 048-61 | P0 | RC checklist against staging | 0.5d | 048-60 |
| 048-62 | P0 | RC sign-off + promote + production deploy as v0.45.0 | 0.5d | 048-61 |
| 048-63 | P1 | ADR-052 (impersonation middleware design, if substantially different from Design 028) | 0.2d | Phase 1 |
| 048-64 | P1 | ADR-053 (patient consent model, if scope grew) | 0.2d | Phase 1 |
| 048-65 | P0 | Sprint 048 retro + memory update | 0.2d | 048-62 |

---

## Localhost-first workflow (applies to every phase)

Before any commit lands on develop:

```
# In one terminal
bash apps/health/sovereign-health/ops/localhost-stack.sh up

# In another
bash apps/health/sovereign-health/ops/localhost-stack.sh seed  # fixtures
bash apps/health/sovereign-health/ops/localhost-stack.sh test  # full suite
```

Only after `test` returns 0:
- `git commit` + `git push`

Before any staging deploy:
- Full `test` pass on the PR branch against a freshly-reset DB.

Before any production deploy:
- Full RC walk-through on staging (see Sprint 047's checklist).

---

## Definition of Done (Sprint 048)

All four roles can complete their canonical workflows end-to-end on
localhost:

- **BrickOS platform admin:** provision a new org via UI, see its seat
  usage, audit its actions.
- **Org admin:** invite a patient, promote a member to practitioner,
  monitor consent state.
- **Practitioner:** see caseload (consenting patients only), click a
  patient, impersonate (read-only), review biomarkers/measurements/
  trends, exit.
- **Patient:** receive invite email, sign up, grant consent in the
  same step, see dashboard, review their own access audit log,
  revoke consent at will.

Shipped on staging and production as **v0.45.0**. Test fixtures
reproducible on localhost in one command. All 24 Phase 1 Playwright
tests + 47 carry-over Sprint 047 tests green against localhost + staging.

## Estimated total

~15-18 dev-days of work across 5-7 calendar days if we move fast.
Phase 0 + Phase 1 are the must-ship minimum (~8-10 dev-days). Phase
2-4 can slip to Sprint 049 if RC reveals issues.

## Risks

- **Impersonation middleware surface area.** Every existing SHI data
  endpoint must respect the scope-table. Easy to miss one. Mitigation:
  central middleware that bucket-classifies requests by path prefix
  rather than per-endpoint check.
- **Audit log volume.** One row per impersonation read; a practitioner
  scrolling the trends chart can create 30 rows per visit. Size the
  table, add a TTL or archival job as a follow-up.
- **Consent revocation race.** If a patient revokes mid-impersonation,
  we need to drop the active token within seconds, not at next token
  refresh. Handled by a DB check in the middleware on every request,
  not just at session start.
- **Test fixture idempotence.** `ON CONFLICT DO UPDATE` on the patient
  seeds must not clobber in-progress RC state. Use deterministic UUIDs
  so re-seeding is a no-op.
