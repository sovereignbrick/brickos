# Sprint 048 Retrospective -- White-Label Completion + Practitioner Workbench

**Date:** 2026-04-20
**Release:** v0.45.0
**Duration:** 1 calendar day (planned 3-4 days of work)
**Branch:** develop (not yet promoted to main)

## Planned scope

From `project_sprint048_ready.md` (2026-04-20 kickoff):

| # | What | Phase | Status |
|---|---|---|---|
| #048-01..05 | Localhost-first test pipeline + fixtures | 0 | ✅ shipped |
| #048-10..12 | Patient consent model + caseload filter | 1 | ✅ shipped |
| #048-13..16 | Impersonation session + scope gate + audit | 2 | ✅ shipped |
| #048-17..24 | Consent toggle UI + impersonation banner + E2E | 2 | ✅ shipped |
| #048-30..33 | Org admin members page + invite flow | 3 | ✅ shipped |
| #048-41..44 | Patient onboarding polish | 3 | ✅ shipped |
| #048-51 | Platform admin consent dashboard | 4 | ✅ shipped |
| #048-52 | Cross-org audit viewer impersonation polish | 4 | ✅ shipped |
| #048-53 | Impersonate-as-org-admin | 4 | ⏭️ deferred |
| #048-22 | Invite reminder email | follow-up | ⏭️ deferred |
| #048-34 | Bulk consent reminder | follow-up | ⏭️ deferred |
| #048-35 | Custom domain reverify cron | follow-up | ⏭️ deferred |

Five phases landed; three follow-ups carry to Sprint 049.

## What went well

- **ADR-051 held.** Writing the impersonation-only ADR in Sprint 047
  turned "what does a practitioner see?" from an open product
  question into a closed-form problem. Implementation became
  mechanical: one consent table, one session table, one middleware,
  one scope gate. No rework, no architectural surprises.
- **Effective-user swap pattern saved the read-path surface.**
  ADR-052 captures this: making impersonation a middleware-level
  swap of `AuthenticatedUser.user_id` meant every existing patient
  reader became impersonation-safe without an edit. Zone rollup,
  marker detail, trend chart -- all just worked. If we had gone
  the "dedicated /practitioner/read/*" route, Sprint 048 would
  have doubled in size.
- **Localhost-first paid off.** `ops/localhost-stack.sh` let every
  feature hit a full integration (Playwright + cargo test + vitest)
  before staging. Zero RC iterations needed -- contrast Sprint 047
  which burned six RC hotfixes.
- **Consent-as-UPDATE-RETURNING is atomic.** The middleware's one
  statement (UPDATE impersonation_sessions JOIN patient_consents
  ... RETURNING) means revoking consent kills impersonation on
  the next request with zero cache-invalidation dance. This
  pattern deserves to be reused anywhere a capability is
  conditional on a live DB row.
- **Fixture determinism.** The five-patient risk-profile fixture
  (Anna, Bert, Carla, Dieter, Eva) with deterministic UUIDs meant
  E2E tests could hard-code targets. No "find me a patient id"
  setup step in any spec.
- **Async FromRequest, boxed future.** The middleware swap needed
  an async DB hit inside `AuthenticatedUser::from_request`. Boxing
  the future was mechanically a small change, but it was the kind
  of thing that could have derailed a morning if we'd hesitated.
  We committed to it early and moved on.
- **Governor scope correction was the right call.** Moving
  `/auth/me` and `/auth/me/orgs` out of the governor scope fixed
  the Playwright 429s, and also removed a latent footgun for any
  client that polls these endpoints. Ten minutes of investigation
  saved hours of test-suite whack-a-mole.

## What didn't go well

- **org_members role CHECK constraint collision on fresh DBs.**
  Sprint 040 and 041 each added a CHECK without dropping the
  previous. Fresh localhost DBs failed the first migration run.
  Needed a reconciliation migration
  (`20260421000001_sprint048_reconcile_org_members_role_check.sql`).
  Lesson reinforces `feedback_grep_schema_before_migration.md`:
  grep both migrations dirs before any CREATE or ALTER TABLE.
- **Verify-email vs direct-create signup has two invite paths.**
  The invite-acceptance branch had to be added twice, and the
  first attempt landed on only one path. Silent no-op on mismatch
  saved us from a crash but not from "tested one flow, other is
  broken." Lesson: for signup flows, always trace both the
  verify-email-required and verify-email-skipped code paths in
  the same change.
- **Playwright 429s from the login rate limiter.** The governor
  caps at 10 logins/hour; a full E2E run wanted ~15. Hit us hard
  on the first CI attempt. Two fixes in series: (1) move
  `/auth/me` out of governor, (2) `test.describe.configure({
  mode: 'serial' })` + module-level cached token. Second fix
  only works because the first made `/auth/me` cheap. Lesson:
  rate limiters need a "local dev / CI" mode, or tests need to
  cache aggressively, or both.
- **vitest pre-existing flakes weren't addressed.** Three specs
  (date-format TZ, dark-theme grep, i18n-completeness) were
  excluded in `ops/localhost-stack.sh` rather than fixed. Leaves
  a documented exclusion list that the next sprint has to keep
  honouring. Sprint 049 should triage or delete.
- **Shell ate an argon2 `$`.** Resetting `test-clinic-admin`
  password via DB with an inline hash let the shell expand `$2`.
  Fixed with stdin piping. Lesson reinforces
  `feedback_ssh_dollar_escaping.md` -- applies locally, not just
  over SSH.
- **AuthenticatedUser constructor changes broke unused test
  builders.** Added two fields (`original_user_id`,
  `impersonating_session_id`); had to add `None` defaults in
  every test `extract_user()` helper. No surprise, but the
  ergonomic cost of struct-vs-builder showed up. If we add a
  fifth field we should refactor to a builder.

## Lessons learned

- **Design ADRs that commit before implementation save time.**
  ADR-051 decided the shape in Sprint 047; Sprint 048 executed
  mechanically. ADR-052 documents the effective-user swap after
  implementation; it captures a pattern we'll re-use rather
  than a decision we were weighing. Both are worth their ink.
- **Middleware-level effective-user swap is reusable.** If we
  ever ship multi-profile (e.g. caregiver account managing a
  dependent's records), the same pattern slots in -- just a
  different table join in `resolve_impersonation()`.
- **UPDATE ... RETURNING with a JOIN for liveness is a
  first-class pattern.** Any time a capability is conditional on
  "and this consent/license/feature row is still valid,"
  bundling the validity check into the same statement that
  consumes the capability eliminates a class of TOCTOU bugs.
- **Signup has two paths; always edit both.** When a flow has a
  "required" branch and an "optional" branch (verify email,
  confirm phone, MFA), assume features land in both.
- **Grep-both-migration-dirs is a ritual, not a suggestion.** The
  role CHECK collision was the second time this pattern has bit
  us. Consider a pre-commit hook that greps the file structure
  for conflicting CHECK constraints on the same column.
- **Localhost-first is a force multiplier for confidence.** Six
  RC hotfixes in Sprint 047 vs. zero-so-far in Sprint 048.
  Whatever the localhost stack costs to maintain, it pays back
  in not re-deploying staging.
- **Excluding flaky tests is debt.** Every excluded vitest spec
  is a small lie. Either fix, or delete. Letting them sit
  compounds.

## Action items for Sprint 049

- **#048-53 impersonate-as-org-admin.** Two-step UX ("become
  org_owner, then pick patient"); two audit rows per hop.
- **#048-22 / #048-34** invite and consent reminder emails.
- **#048-35** custom domain reverify cron (UI is wired, job
  isn't scheduled).
- **Triage the three excluded vitest specs.** Fix or delete.
- **Test-clinic fixture reset script.** Carried over from Sprint
  047 action items -- same fixture, same need.
- **Monitor impersonation UPDATE latency on staging.** ADR-052
  flagged this as a follow-up. If p50 > 5 ms we consider the
  short-lived cache.
- **Audit bulk-email consent prompt.** Orgs may have patients who
  existed before v0.45.0 with no `patient_consents` row. Give
  org admins a one-click "email all pending patients" button
  (#048-34).

## RC day-2 reflection (2026-04-21 / 2026-04-22)

The initial "11/11 localhost + 17/17 platform smoke" gave a false
sense of completeness. A ~30-minute manual walk-through on staging
surfaced 8 distinct bugs (see RELEASE_NOTES "RC findings"):

- 1 backend migration (schema-unaware hardcoded `public.`)
- 1 nginx regex (new routes weren't in the allow-list)
- 1 React hooks violation (hook after early return)
- 1 UX (empty Doctor Chat page during impersonation)
- 1 layout (banner clipped by `h-screen`)
- 2 front-end fetch infrastructure (misclassify codes, hand-rolled
  fetch helpers with wrong base URL)
- 1 cross-plane swap across staging/prod boundary
- 1 conditional rendering (consent cards nested inside license
  check)

### What this tells us

1. **Automated + platform smoke is floor, not ceiling.** The
   Playwright suite asserted API shape and state transitions but
   never rendered a page or clicked a link. Every bug above except
   the migration one was invisible to those layers.

2. **Manual testing against staging is non-optional.** The
   refactored spec passing on localhost AND on staging proved the
   happy-path API flows. It didn't prove the UI renders correctly.
   Both layers are needed.

3. **Hand-rolled patterns drift from the canonical one.** The
   AuditLogsTab / ContactTab fetch helper predates `api.ts`'s
   runtime-aware `API_BASE`, never got updated, and shipped a 404
   on staging for months unnoticed (pre-Sprint-048 bug; Sprint 048
   RC testing exposed it). Rule: a second copy of a fetch helper
   is a code smell; refactor toward the shared one.

4. **Demo host edge cases bite cross-environment.** The plane-swap
   logic assumed every `.brickos.io` has a `.sovereignhealth.io`
   twin in the same environment. `demo.*` breaks that
   symmetry (staging platform vs prod public demo share no
   environment boundary). Add null-returns for single-plane hosts,
   document the asymmetry, and cover with unit tests.

5. **RC2 round turnaround matters.** Each staging fix → deploy
   → retest cycle took ~6-8 minutes. Over 8 iterations that was
   ~1 hour of wall time. Future sprints should batch small
   frontend-only fixes into a single redeploy when possible.

6. **Service worker caching defeats naive hard-refresh.** During
   RC, "hard refresh" wasn't enough — the SW kept serving the
   broken bundle. Guide testers to **Application > Clear site
   data** explicitly. Consider shortening SW cache TTL on admin
   routes (they change per release, users accept reload cost).

7. **RC checklists should explicitly list the URL + the user for
   each step.** My first checklist used unqualified paths like
   "/platform/audit" which the user couldn't copy-paste. Second
   version listed absolute URLs + credentials in a table -- every
   subsequent step was faster.

### Process improvements to adopt immediately

- Every new sprint adds backend routes? Check the nginx location
  regex in both configs BEFORE deploy. Grep: `git diff
  'apps/health/sovereign-health/ops/nginx-sovereignhealth.conf'
  'apps/platform/brickos-website/ops/nginx-brickos-app.conf'`.
- Every new sprint uses fixture UUIDs? Write fixtures with
  business-key lookups from the start (CROSS JOIN on
  email/slug), not hardcoded UUIDs.
- Every new React component with state + early return? Put the
  hooks at the top of the component, above any `if (condition)
  return ...` guard.
- A new "demo" or "app" or subdomain-scoped special host added?
  Update `swapPlaneHost` to either pair or null-return it, with
  a unit test.

## By the numbers

- **Commits on develop since v0.44.0:** 24 (16 feature + 7 RC fix + 1 release-notes doc)
- **New migrations:** 4
- **New backend handlers:** 4 files
  (`consent.rs`, `impersonation.rs`, `org_invites.rs`,
  extensions to `org_settings.rs`)
- **New middleware:** 1 (`impersonation.rs`)
- **New frontend pages:** 2 (`/sovereign-health/data-access-log`,
  `/platform/org/members`)
- **New frontend components:** 3 (welcome banner, consent
  onboarding prompt, impersonation banner)
- **New Playwright specs:** 11 (`sprint-048-impersonation.spec.ts`)
- **New ADRs:** 2 (ADR-052 effective-user swap, ADR-053 shared
  API base URL helper)
- **New memory lessons:** 5 (hooks ordering, shared API helpers,
  demo host plane boundary, nginx regex per sprint, manual RC
  surfaces real bugs)
- **Sprint days spent:** 2 calendar days (1 feature, 1 RC + fix)
- **Staging deploys:** 7 (1 initial + 6 RC fix redeploys)
- **Production deploys:** 1 (planned)
- **RC bugs caught + fixed pre-prod:** 9 (8 discovered in RC,
  1 discovered by Sprint 048 spec refactor)
- **Production bugs escaped:** target 0 (tbd by prod deploy)

## Sign-off

Feature work + RC fixes complete on develop. Promote → main +
production deploy as `v0.45.0` proceeding 2026-04-22.
