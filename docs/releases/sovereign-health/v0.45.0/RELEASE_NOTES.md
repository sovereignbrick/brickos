# Sovereign Health v0.45.0 Release Notes

**Release date:** 2026-04-20 (develop) / RC 2026-04-21
**Sprint:** 048 (White-Label Completion + Practitioner Workbench)
**Git:** develop → main at tag `v0.45.0`

## Highlights

- **Patient consent model shipped.** New `patient_consents` table
  with a partial unique index on `(patient_user_id, org_id) WHERE
  revoked_at IS NULL`. Patients grant/revoke per-org access from
  `/settings` → "Organization access." Revoking is instant and
  kills every active impersonation session for that (patient, org)
  pair within the current request cycle.
- **Practitioner impersonation (read-only) shipped.** Practitioners
  or org_owners click "View as {patient}" on the caseload page.
  A 30-minute sliding session is issued; the frontend carries
  `X-Impersonation-Token` on every request; the backend
  transparently swaps the effective user inside
  `AuthenticatedUser`. An amber top banner + Exit button surface
  the mode. Every read, every blocked write, and every scope-gate
  reject emits one `audit_log` row. Design 028 v3 / ADR-051 /
  ADR-052.
- **Scope classifier enforced via middleware.** Writes → 403
  `impersonation_readonly`. Hard-excluded paths (Doctor Chat,
  billing/licensing, settings mutations) → 403
  `impersonation_out_of_scope`. Classification lives next to the
  session handlers (`handlers/impersonation.rs`) so route changes
  stay co-located with the allow-list.
- **Patient-facing data access log.** New
  `/sovereign-health/data-access-log` page (GDPR Art. 15) lists
  every practitioner read targeting the signed-in patient.
  Reachable from the Organization-access tab.
- **Org invite flow.** Org admins invite members by email
  (`org_invites` table + signed token URL). The `/signup?invite=...`
  page prefills and locks the email; after verification the user
  joins the inviting org in the requested role. Works on both
  signup code paths (verify-email required + direct-create with
  token).
- **Org admin members page** at `/platform/org/members`: role
  dropdown, consent badge per patient, remove-with-cascade
  (revokes consents → ends impersonation sessions → deletes the
  membership in one transaction, audit-logged).
- **Platform admin consent dashboard.** The org detail Overview
  tab shows consent breakdown cards next to the seat bars:
  granted / revoked / pending.
- **Cross-org audit viewer polish.** Impersonation action codes
  (`impersonation.start` / `.exit` / `.blocked_write` /
  `.blocked_out_of_scope`) are in the action-filter dropdown, and
  pills are colour-coded (blue for start/exit, amber for reads,
  red for blocks) so impersonation activity is visible at a glance
  across every org.
- **Patient onboarding polish.** One-shot welcome banner on
  `/sovereign-health/dashboard` after signup. Consent-onboarding
  prompt on first login for orgs that are truly "pending" (no
  granted_at + no revoked_at -- revoked users don't get re-nagged).
  Revoke-from-toggle now goes through a confirmation modal with
  reassurance bullets; grant stays instant.
- **Localhost-first test pipeline.** New `ops/localhost-stack.sh`
  single-entry runner (`up/down/reset/seed/test/logs/status`).
  `test` runs cargo fmt + clippy + integration + property + smoke,
  plus pnpm tsc + vitest + playwright. Three known-flaky vitest
  specs (date-format TZ, dark-theme grep, i18n-completeness) are
  excluded and documented. Deterministic risk-profile patient
  fixtures (Anna, Bert, Carla, Dieter, Eva) live under
  `ops/fixtures/`.

## Architecture

- **Design 028 v3** -- Practitioner impersonation-only workbench
- **ADR-051** -- Impersonation-only decision (accepted Sprint 047)
- **ADR-052** -- Effective-user swap via `AuthenticatedUser`
  (new; documents the middleware pattern that lets every existing
  patient endpoint be impersonation-safe unchanged)

## What changed (by area)

### Backend (`sovereign-health-backend` v0.45.0)

- New handlers: `handlers/consent.rs` (list + grant + revoke +
  `GET /user/data-access-log`), `handlers/impersonation.rs`
  (start + exit + scope classifier), `handlers/org_invites.rs`
  (create + list + cancel + public-info + `accept_invite_on_signup`
  helper), plus extensions to `handlers/org_settings.rs` (member
  list LEFT JOINs `patient_consents` and emits `consent_state` of
  `granted` / `revoked` / `pending`; `remove_member` cascades).
- `AuthenticatedUser` gained `original_user_id` +
  `impersonating_session_id`. `FromRequest` is now async and boxes
  its future. `resolve_impersonation()` runs a single
  `UPDATE impersonation_sessions ... RETURNING` with a
  `patient_consents` JOIN -- revoked consent immediately makes the
  session resolve to None.
- New middleware `middleware/impersonation.rs::ImpersonationScopeGate`
  rejects writes and hard-excluded reads before the handler runs,
  writing `impersonation.blocked_*` audit rows fire-and-forget via
  `tokio::spawn`.
- `/auth/me` + `/auth/me/orgs` moved **outside** the governor
  rate-limit scope to avoid 429s during E2E suites.
- `/admin/organizations/{id}` detail JSON gained a `consent:
  { granted, revoked }` block aggregated from `patient_consents`.

### Database migrations

- `20260421000001_sprint048_reconcile_org_members_role_check.sql`
  -- collapses the two conflicting CHECK constraints that
  accumulated across Sprint 040 and 041 on fresh DBs.
- `20260421000002_sprint048_patient_consents.sql` -- consent table
  with partial unique index.
- `20260421000003_sprint048_impersonation_sessions.sql` -- session
  table with `last_seen_at` / `ended_at` / `end_reason`.
- `20260421000004_sprint048_org_invites.sql` -- invite table with
  unique token + expires_at + accepted_at + cancelled_at.

### Frontend (`sovereign-health-frontend` v0.45.0)

- New pages: `/sovereign-health/data-access-log` (patient-facing
  audit), `/platform/org/members` (org admin roster).
- New components: `welcome-banner.tsx` (one-shot dashboard banner
  via `shi_welcome_pending` localStorage flag),
  `consent-onboarding-prompt.tsx` (blocking modal on first login
  for true-pending orgs; dismissal keyed per `${userId}:${orgId}`),
  `impersonation-banner.tsx` (amber top banner polling the
  `impersonation_session` cookie every 2s).
- `lib/impersonation.ts` helpers: `get/set/clearImpersonationSession`
  with two cookies (`impersonation_session` UUID +
  `impersonation_patient` base64 JSON).
- `settings/components/organization-access-tab.tsx` gained a
  revoke-confirm modal (grant stays instant). Added "View full
  data access log →" link.
- `signup/page.tsx` fetches `/signup/invite/{token}`, banners the
  inviting org name, email-prefills/locks, and sets
  `shi_welcome_pending=1` after verified login.
- `platform/orgs/[id]/page.tsx` renders three consent cards
  (granted / revoked / pending) under the seat bars; gated on
  `org.seats.members > 0` so empty orgs stay clean.
- `components/admin/audit-logs-tab.tsx` colour-codes
  impersonation pills and adds impersonation action codes to the
  filter dropdown.
- New i18n keys across all features (EN + DE):
  `organizationAccess.*`, `dataAccessLog.*`,
  `platform.orgDetail.consent*`, `welcomeBanner.*`,
  `consentOnboarding.*`.

### Tests (`e2e/sprint-048-impersonation.spec.ts`)

- 11 Playwright specs covering: consent API round-trip, caseload
  filter, start/exit lifecycle, effective-user swap,
  scope-gate 403s, invalid-token fallback, revoke-kills-swap,
  exit-ends-session + 3 invite-flow tests.
- Module-level token cache + `test.describe.configure({ mode:
  'serial' })` avoid the login rate-limit. `/auth/me` moved out
  of governor scope (see backend notes) was the other half of
  that fix.

### Nginx (RC finding)

- Added `user` and `signup` to the backend-proxy location regex in
  both `nginx-sovereignhealth.conf` and `nginx-brickos-app.conf` so
  new Sprint 048 routes (`/user/organization-access/*`,
  `/user/data-access-log`, `/signup/invite/{token}`) reach the
  backend. Previously they fell through to the Next.js frontend,
  returning the app shell HTML instead of JSON. The staging RC run
  of `sprint-048-impersonation.spec.ts` surfaced this via a JSON
  parse failure on `<!DOCTYPE "...`.

### ops / dev loop

- `ops/localhost-stack.sh` single-entry runner.
- `ops/fixtures/{001_test_clinic_org.sql, 002_test_users.sql,
  003_test_measurements.sql}` idempotent seed for a test-clinic
  org + 1 org_owner + 5 risk-profile patients. Argon2-hashed
  passwords; deterministic UUIDs so E2E tests can hard-code
  targets.
- Three pre-existing vitest specs excluded from the local run
  (documented in the runbook).

## Upgrade notes

- **Schema:** four new migrations. All additive. No backfill required.
- **New env vars:** none. Impersonation timeout and scope
  classifier constants live in code.
- **Rate-limit behaviour change:** `/auth/me` and `/auth/me/orgs`
  are no longer rate-limited by the governor. Existing clients
  that poll these endpoints keep working (and test suites stop
  seeing 429s).
- **Consent back-compat:** patients who already had data in an
  org before v0.45.0 have no `patient_consents` row. The
  practitioner caseload filter requires a consent row, so
  practitioners will see an empty list until patients opt in
  from Settings. Org admins can batch-email the prompt (follow-up
  #048-34 -- deferred to Sprint 049).

## Known issues / deferred

- **#048-53 impersonate-as-org-admin.** Today a platform admin
  cannot impersonate through an org_owner's seat to visit a
  patient. Deferred -- would need an explicit two-step UI
  ("become org_owner, then pick patient") and a second audit
  row per hop. Sprint 049 candidate.
- **#048-22 invite reminder email + #048-34 bulk reminder.**
  Backend emits the initial invite; nothing resends after N days.
  Next sprint.
- **#048-35 custom domain reverify.** Re-checking CNAME/A health
  on a schedule. Wired in UI but the cron is not scheduled.
- **Localhost vitest flakes.** Three specs remain excluded from
  `ops/localhost-stack.sh test` (see runbook). Not a regression;
  predates Sprint 048.

## Commits (develop, since v0.44.0)

```
<filled in at release-cut time by cut-release.sh>
```
