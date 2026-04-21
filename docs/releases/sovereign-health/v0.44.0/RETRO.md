# Sprint 047 Retrospective -- Multi-App URL Routing + Stability

**Date:** 2026-04-21
**Release:** v0.44.0
**Duration:** 2 days (2026-04-20 to 2026-04-21)
**Branch:** develop → main at v0.44.0

## Planned scope

From `project_sprint047_planned.md` (2026-04-20 kickoff):

| # | What | Estimate | Status |
|---|---|---|---|
| #577 | Multi-app URL routing (Design 027, five phases A-E) | 3.5d | ✅ shipped |
| #584 | CSP unsafe-eval trace + fix | 0.5d | ✅ shipped |
| #586 + #588 | Build-ID cache invalidation + SW controllerchange reload | 1d | ✅ shipped |
| #589 | rc-smoke build-id assertion in deploy.sh | 0.5d | ✅ shipped |
| #583 | Per-locale org email templates | 1.5d (stretch) | ✅ shipped |
| #582 | `/platform/org` members count | verify-only | ✅ confirmed self-resolved |
| #578 | test-clinic E2E fixture + plane-aware auth.setup | already on develop | ✅ |
| #585 | Accept-header fallback on app/demo brickos.io | already on develop | ✅ |

Sprint planned at ~7 days of work ended up landing in 2 calendar days.
The estimate was conservative; the actual mechanical work compressed
because the fixes were well-scoped.

## What went well

- **Single coherent release theme.** v0.44.0 tells one story:
  "URLs describe themselves." Every feature (route move, CSP,
  cache invalidation, per-locale email, practitioner polish)
  reinforces that story or clears rubble from the route move.
- **Sub-agent for the A+D route sweep.** The 30-file internal-link
  sweep that would have taken 2h of tedious Edits went to a
  subagent and came back correctly-scoped with 22 files touched +
  a detailed report. This pattern works really well for
  mechanical-but-careful work.
- **Design doc drove the implementation.** Design 027 sat on the
  issue for days before Sprint 047 started; when work began, the
  five phases were already clear. Zero rework compared to
  improvise-as-you-go sprints.
- **Pro/con Q&A before commitment.** User asked for the 3 open
  questions in Design 027 to be explained with pros/cons; I
  provided them; user said "1A, 2A, 3A" and implementation was
  unblocked. Fast cycle, no wasted branches.
- **RC checklist drove RC coverage.** Writing the RC checklist
  early (before staging was even live) surfaced the items that
  needed automated-test parity; by the time staging was up, the
  Playwright coverage was comprehensive.
- **Backend clippy + tsc after every change.** Caught the
  `AppError::BadRequest` vs `AppError::Validation` mismatch
  immediately and every subsequent type drift.

## What didn't go well

- **Refresh banner design was wrong on first ship.** The initial
  design (bb155f0) had the client bundle poll `/health`, which
  is the backend's build id. When frontend and backend deploy in
  different cycles, the mismatch is a false positive that no
  reload can clear. Took a live staging session (user running
  into the banner loop) to realise the flaw. Shipped fix in
  cb4229b (new `/app-build-id` Next.js route). Serwist SW also
  needed a NetworkOnly rule to prevent cached stale JSON
  (626cb71). Three commits to land correctly instead of one.
- **`demo.sovereignhealth.io` had latent login breakage.** The
  Sprint 045 decision to skip path-mount on this specific host
  (for a `/admin` collision that was resolved in Sprint 046) was
  never revisited. `fetch('/auth/login')` same-origin hit the
  frontend 404 page. Sat broken for ~2 days until an RC tester
  typed a login. Fix shipped in 894f9da + 06250de. Lesson: when
  a nginx block grows a "no X here because Y" note, add a
  follow-up task to revisit once Y resolves.
- **Public-demo mode scope was too wide.** `isDemo = user === null
  || isDemoOnly` let any unauth visit on any host trigger demo
  mode. On `demo.sovereignhealth.io` this leaked empty demo data
  to anyone who guessed the URL. Fixed in 06250de by narrowing
  to `isDemoOnly && user === null` + adding `<AuthGate />`.
  Lesson: "or"-style gates on authentication default to leak.
- **Sprint 044 practitioner endpoint had column-name drift.** SQL
  queried `measurements.measured_at`, `m.value`, `m.unit`, `mk.name`
  -- none of which match the live schema. Any patient click 500'd.
  Shipped a fix (dad41ca) in Sprint 047 RC. Lesson: column-name
  refactors need a full-repo grep, not just the migration files.
- **Deploy verify URL was wrong since #526.** `VERIFY_API_STAGING`
  pointed at `/api/v1/health`, which 404s because there is no v1
  prefix on the health contract. Reported as `ERR API` in every
  deploy report for months; we ignored it as deploy noise. Fix
  in 546ed99.
- **Deploy verify flagged expected image-size diff as FAIL.**
  `docker save` + `docker load` produces a different `.Size` on
  each side for the same source image (layer metadata churn).
  Old verify flagged this on every deploy. Fixed in 546ed99
  (existence check only; build-id assertion is the real identity
  proof).
- **Test-clinic-admin account couldn't login on staging.** The
  seed password wasn't known + email_verified was false. DB reset
  + email verified flipped true in a DB one-liner -- but this
  should have been scripted in the test-clinic fixture from
  Sprint 045. Lesson: pilot fixtures need a "how to reset" doc.

## Lessons learned

- **Frontend and backend can deploy independently; code must
  tolerate this.** Cache-invalidation logic that compares frontend
  bundle to backend SHA is structurally wrong. Any "is my client
  stale?" check has to compare client to the currently-served
  frontend, not the backend.
- **Service workers need explicit no-cache rules for
  infrastructure endpoints.** Default serwist caching is aggressive.
  Anything health-check / build-id-check / auth-check must be
  `NetworkOnly` or the cache makes you lie to yourself.
- **Follow-up tasks for "revisit when X" comments.** The
  `demo.sovereignhealth.io` no-path-mount comment referenced a
  problem that Sprint 046 fixed. Without a tracked follow-up, the
  no-longer-needed restriction survived and broke login. Filed
  issue template: when adding a "no X here because Y" config
  comment, open an issue "revisit after Y resolves."
- **Authentication gates default to deny, not allow.** The old
  `isDemo = user === null || isDemoOnly` accidentally allowed
  the public-demo behaviour on every host where the check
  happened. Use AND-style guards for auth (user !== null AND
  on-correct-host) rather than OR-style fallbacks.
- **Column names drift silently.** The 500 in practitioner
  summary sat in the code for months. Add grep-all-call-sites to
  the migration checklist when renaming a column.
- **Pro/con tables unblock product decisions fast.** User asked
  for explicit pros/cons on three open design questions; two
  paragraphs of structured comparison per question yielded a
  decision the same day. This pattern saves more time than it
  costs.
- **Run the real test host, not a mock.** `curl`-based route
  probes caught the 308 behaviour correctly but missed the
  Basic+Bearer header collision that only shows up in a real
  browser. Playwright running against live staging caught the
  latter. Both layers needed.
- **Smaller design docs, accepted and revised.** Design 028
  shipped in three versions (v1 full workbench, v2 simplified
  impersonation, v3 with all open questions resolved). Each
  revision narrowed scope. The habit of "write it broad, narrow
  it to what actually ships" is cheap and lets Sprint 048 start
  with a crisp spec.

## Action items for future sprints

- **Sprint 048**: implement Design 028 (practitioner impersonation)
  with ADR-051 as the architectural anchor.
- **Sprint 048 or 049**: 90-day audit of legacy URL bookmarks;
  if `/dashboard` hits on brickos.io are near-zero by 2026-07-20,
  remove the 14 308 entries from `next.config.ts`.
- **Sprint 048 or 049**: emailer integration for the per-locale
  org templates (#583 data plumbing is in place; wire the sender
  to pick `users.locale`).
- **Sprint 048**: script the test-clinic fixture reset (password
  + email_verified + consent seed rows) so RC walk-throughs
  don't rely on ad-hoc DB surgery.
- **Standing**: the "revisit when X" config-comment pattern
  should always produce a tracked issue.

## By the numbers

- **Commits on develop since v0.43.0**: 23
- **New ADRs**: 2 (050 multi-app URL prefix, 051 impersonation-only)
- **New / amended Design docs**: 2 (028 practitioner; 027 amended in A1b9d5 annotation)
- **Files physically moved**: 18 (SHI route pages)
- **Files updated for the route sweep**: 33
- **New Playwright tests added**: 47 (25 url-routing + 22 admin-coverage)
- **Sprint 047 RC hotfixes on staging**: 6
- **Sprint days spent**: 2 calendar days
- **Production issues surfaced and fixed during RC**: 6 (none reached prod)

## Sign-off

RC signed 2026-04-21. Ready for promote → main + production deploy
as `v0.44.0`.
