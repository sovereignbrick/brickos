# Sprint 049 Retrospective -- Anonymous Demo + Carry-overs + RC Follow-ups

**Date:** 2026-04-22
**Release:** v0.46.0
**Duration:** 1 day (same day as v0.45.0 shipped)
**Branch:** develop → main at v0.46.0

## Planned scope vs delivered

From sprint-049.md, 7 phases, 4.75d budget:

| Phase | Planned items | Delivered | Deferred |
|---|---|---|---|
| A -- demo surface | 9 | 9 | -- |
| B -- hardening | 4 | 4 | -- |
| C -- prod smoke | 3 | 3 | -- |
| D -- signup_source | 3 | 3 | -- |
| E -- carry-overs | 4 | 2 (049-21, 049-22) | 049-20 (impersonate-as-org-admin), 049-23 (domain reverify) |
| F -- RC follow-ups | 6 | 3 (049-24, 049-25, 049-26) | 049-27/28/29 (vitest + fixture hygiene) |
| G -- observability | 2 | 2 | -- |

**25 of 31 items shipped.** 6 deferred with documented rationale:
- 049-20: too-complex UX for a single session; needs double-banner iteration.
- 049-23: requires DNS-probe infrastructure that doesn't exist yet.
- 049-27/28/29: P2 test hygiene; not deploy-blocking.
- Frontend button for 049-22: backend endpoint live; UI polish next sprint.

## What went well

- **Design 029 v0.3 worked end-to-end on first deploy.** DNS, nginx, frontend flag, banner, server-side noindex, sign-up cross-plane link, governor rate limit -- each landed and was verified directly on prod within minutes of the deploy. Credit to having `eval.sovereignhealth.io` as a dedicated host with clear boundaries: every change was isolated to a single new surface.
- **Phase C prod-smoke pattern is repeatable.** `eval-smoke.spec.ts` runs against real prod data via `/demo/*`, no auth, no customer risk. The nightly cron catches drift the platform-smoke doesn't (certificate renewal, DNS moves, third-party API regressions). Worth adopting as standard practice for future hosts.
- **ADR-053 refactor took 15 minutes** once we had the pattern documented (export shared helper, import in 3 call sites, delete IIFEs). The Sprint 048 point-fix already proved the mechanism; Sprint 049 just consolidated.
- **Grafana JSON-based dashboards are low-overhead.** Writing the panel spec in JSON + committing to the repo means the observability setup is reviewable alongside the code change that motivated it (ADR-052's follow-up specifically).
- **Bundled migrations + handler + lib change + test in one commit.** Each Phase came in as a self-contained diff with matching migration, code, and test. No split-brain across develop commits.
- **Memory pattern "don't switch branches while a deploy is queued"** (saved at Sprint 049 #049 after the second recurrence) was the direct result of hitting it twice today. Pattern now tracked.

## What didn't go well

- **Demo password lock broke platform smoke on prod.** Sprint 049 #049-11 locked `optimized@/average@/atrisk@sovereignhealth.io` passwords. Platform smoke uses `optimized@` as its login canary on production. First prod deploy hit "1 failed" on the login check. Had to update the smoke to accept "401 with structured JSON" as a success signal. Lesson: before locking seed credentials, grep for every script that uses those credentials and update them in the same commit.
- **Hit the deploy.sh branch check twice.** `deploy.sh production --confirm` requires the working tree to be on `main`. Started the first prod deploy while I'd already switched to develop for parallel Phase C work -- failed pre-flight. Re-ran, then switched to develop during the Phase B/C prep -- failed pre-flight again. Saved a memory explicitly noting: once a prod deploy is queued, don't toggle branches until it reports done.
- **049-20 (impersonate-as-org-admin) deferred.** This is a user-facing feature that was carried forward from Sprint 048 and I didn't get to it. The complexity is real (two-step UI with double banner stacking, two audit rows per hop) but the customer value was supposed to be delivered. Sprint 050 picks it up.
- **Domain reverify cron (049-23) turned out to be a spec-only item.** Discovered mid-sprint that the DNS-probe implementation doesn't exist; a cron alone would be a no-op. Closed it as "needs prior work" rather than shipping a scaffolding stub. Should have caught this earlier when we first scoped Sprint 049.

## Lessons learned

- **"Small" hardening changes can break smoke tests.** The 049-11 password lock changed the semantics of a signal the smoke script was relying on. Always grep your smoke scripts AND CI config AND runbooks for anything that depends on the thing you're about to change.
- **Multi-deploy days are workable with careful state management.** Sprint 049 had 4 successful prod deploys (v0.45.0 from yesterday's work, v0.46.0 initial Phase A, +B, +B/C fix, final Phase E+F+G). Each took ~15 min. The cost was real branching discipline: always commit on develop, promote explicitly, checkout main only when actively deploying, don't leave the deploy tree in a weird branch state.
- **Dedicated host > conditional rendering for separation of concerns.** The v0.1 design of Design 029 put the anonymous demo on `app.sovereignhealth.io` with runtime flags. The v0.2 revision (dedicated `eval.sovereignhealth.io`) was cleaner and unlocked the prod-smoke use case that v0.1 couldn't. Worth remembering: when in doubt about "same surface, different mode", separating the surfaces is often the cleaner answer.
- **Playwright against real prod with read-only data is a powerful monitoring tool.** eval-smoke is the first time we run integration tests against prod automatically after every deploy. Previously we only had platform-smoke (small curl-based checks) and manual RC.

## Action items for Sprint 050

- **#049-20 impersonate-as-org-admin** -- ship the two-step UI + double banner. Budget: 0.8d. First priority.
- **#049-23 domain reverify cron** -- requires 0.5d of DNS-probe implementation first, then the cron itself. Sprint 050 full package.
- **Frontend bulk-reminder button** -- 0.2d; surfaces 049-22's endpoint on `/platform/org/members`.
- **#049-27/28/29 test hygiene** -- triage the 3 excluded vitest specs; backfill the demo-profile seed fixture for localhost; ship `localhost-stack.sh reset-clinic` subcommand.
- **Install the Grafana dashboards** from `docs/ops/grafana/`; configure alerts on the panels per the `__runbook` fields.
- **Wire the nightly cron** `ops/eval-smoke-cron.sh` via systemd timer on the deploy runner host.
- **Redirect external demo links** from `app.sovereignhealth.io/sovereign-health/dashboard` to `https://eval.sovereignhealth.io/` (task #78 in the tracker).

## By the numbers

- **Commits on develop since v0.45.0:** ~13 (Phase A + B + C + D + E/F/G + version bump + smoke fix + docs)
- **New migrations:** 3 (password lock, signup_source, invite reminder tracking)
- **New backend handlers / endpoints:** 2 (`bulk_consent_reminder`, `invite_reminder_cron`)
- **New frontend components:** 1 (`<EvalConversionBanner>`)
- **New infra:** 1 subdomain (`eval.sovereignhealth.io`), 1 nginx server block, 1 systemd cron (pending install)
- **New test files:** 2 Playwright specs (`eval-smoke.spec.ts`), 1 integration test (`test_demo_namespace_has_no_write_handlers`)
- **New docs:** 2 Grafana JSON dashboards, 1 design doc (Design 029 v0.3 from Sprint 048), this RETRO
- **Prod deploys:** 4 (all green after platform-smoke fix)
- **Sprint days spent:** 1 calendar day (heavy)
- **Scope delivered:** 25 of 31 items (81%); 6 deferred to Sprint 050 with written rationale

## Sign-off

v0.46.0 live in production. Eval surface verified at `https://eval.sovereignhealth.io/`. Platform smoke 16/16 + 1 skipped. Eval smoke 10/10 passing in deploy.sh verify().
