# Sovereign Health v0.48.0 Release Notes

**Release date:** 2026-04-22
**Sprint:** 050 (Tests-First Stabilization)
**Git:** develop -> main, tag `v0.48.0`

## Highlights

- **Test pyramid completed.** 9 new Playwright E2E specs (~60 tests), 6 new Rust integration tests, 60 new vitest i18n pins, and expanded platform-smoke coverage. Every sprint from 046 through 049 now has regression coverage on the 3 layers (Rust / vitest / Playwright).
- **Full suite green across all layers for the first time since Sprint 044.**
  - `cargo test --lib`: 150/150 pass
  - `cargo test --test integration`: 13/13 pass
  - `cargo test --test smoke`: 3/3 pass
  - `cargo clippy -D warnings`: clean
  - `pnpm test` (vitest): 341/341 pass
  - `pnpm exec playwright test --project=unauth` against staging: 188 pass + 118 skipped-by-design + 1 flaky-but-retry-passed, 0 hard failures
  - `pnpm exec playwright test --project=unauth` against eval: 24 pass + 50 skipped-by-design
- **3 latent bugs fixed** (surfaced by the expanded suite, not by customers):
  - Email template `{{org_logo_url}}` test was silently passing on a stale hardcoded URL since Sprint 044 #551 -- now verifies the rendered template.
  - `date-format.test.ts` was TZ-dependent; Intl cache quirks made 7 tests flake depending on host TZ. Reconstructing dates via `Date.UTC(...)` makes the suite TZ-independent.
  - `health.spec.ts` had 3 failures baked in since Sprint 048 (hardcoded api.sovereignhealth.io fallback + View Demo CTA on wrong hosts + first-visit SW race). All fixed via baseURL-driven inference + multi-state SW assertion.
- **No new user-facing features.** This is a stabilization release; the story reads boring by design.

## Architecture

- **No new ADRs.** Existing ADRs (050-053) continue to govern.
- `docs/releases/sovereign-health/v0.48.0-rc/test-coverage-baseline.md` documents the entry state; this release notes the exit state.

## What changed (by area)

### Backend (`sovereign-health-backend` v0.48.0)

- **New integration test file `tests/sprint_050_coverage.rs`** (6 tests):
  - `test_signup_source_persists_for_allowed_value`
  - `test_signup_source_dropped_for_bogus_value` (SQL-injection attempt as the source string)
  - `test_demo_user_password_lock_rejects_login`
  - `test_bulk_consent_reminder_rejects_unauth`
  - `test_demo_rate_limit_enforced_under_burst` (governor fires within 61 requests)
  - `test_demo_namespace_read_only_invariant` (no POST/PUT/PATCH/DELETE handlers under /demo/*)
- `templates::emails::test_logo_present`: now renders with `default_email_vars()` so it verifies the actual substituted URL, not the stale hardcoded fallback.
- Snapshot files regenerated for v0.48.0.

### Frontend

- **9 new Playwright spec files (`sprint-050-*`):**
  - `acquisition-funnel` -- eval conversion + signup source attribution
  - `measurement-lifecycle` -- CRUD + trends/zones contracts
  - `billing` -- tier matrix + webhook + upgrade endpoint shape
  - `settings-lifecycle` -- MFA, password reset, GDPR export, account delete
  - `mobile-responsive` -- 3 viewports x 8 pages, no horizontal scroll
  - `pwa-offline` -- manifest, /sw.js no-cache, /app-build-id, SW registration
  - `org-admin-full` -- members/invites/consent-reminders/email templates/admin org detail
  - `practitioner-impersonation` -- caseload scope gate + data-access-log as practitioner
  - `patient-journey` -- /auth/me, measurements, data-access-log, consents
- `health.spec.ts` hardened (see Highlights).
- `date-format.test.ts` TZ-pinned (see Highlights).
- 60 new vitest i18n-completeness assertions across 30 Sprint 048+049 keys (EN+DE).

### Infrastructure / ops

- `tests/platform-smoke.sh` now probes `/demo/zones` (anonymous read) and `/auth/signup` (empty-body 400 shape) alongside the existing checks.

## Deferred to Sprint 051

- **#050-B5 (stretch) visual regression** -- screenshot-baseline suite across key pages. Deferred because B1-B4 already took 3 days and the user-facing value is lower than the remaining Sprint 049 carry-overs (custom-domain reverify cron, practitioner UI polish).
- **E2E flake: sprint-050-org-admin-full GET /org-settings/members** first-attempt flaked once on staging (retry passed). Likely auth rate-limit transient. If it reproduces, share the admin token across the serial describe.

## Upgrade notes

- **No schema changes.** Pure test-and-stabilization release.
- **No env var changes.**
- **No new cron entries.**
- **Deploy is boring.** `bash apps/health/sovereign-health/ops/deploy.sh staging` then `--confirm` to promote.

## Known issues

- Snapshot files now strip the `assertion_line:` metadata to avoid spurious churn on every file edit. Future `cargo insta review` runs may re-add them; if so, strip and re-commit.

## Commits (develop, since v0.47.0)

```
1cfb6e9 test(sprint-050): Phase D -- fix 3 red tests surfaced by Phase C run
53ee811 test(sprint-050): B4 harden health.spec.ts (pre-existing 3 failures fixed)
fe01c15 test(sprint-050): B3b-B3i Playwright E2E coverage (8 specs, ~60 tests)
eda4fa4 test(sprint-050): B3a acquisition funnel E2E (9 specs)
619cc30 test(sprint-050): Phase B2 + B6 -- vitest i18n guards + platform smoke expansion
721d7c2 test(sprint-050): Phase B1 backend integration coverage (6 tests)
77f4d01 docs(sprint-050): test coverage baseline B0
d7f9eb2 release: bump to v0.47.0 for Sprint 050 Phase A
d887e9b docs(sprint-050): v0.2 plan -- tests-first stabilization
e62ec88 docs(sprint-050): plan -- stabilization sprint
```
