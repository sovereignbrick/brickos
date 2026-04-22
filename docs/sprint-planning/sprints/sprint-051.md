# Sprint 051 -- Carry-over Burn-down + UX Polish

**Start:** 2026-04-23 (morning after v0.48.0 ship) -- 2026-04-30 (est. close)
**Goal:** Close the 12 open carry-overs from Sprints 043-050 that accumulated over six sprints, plus the 4 UX bugs found during Sprint 050 manual RC. Target: one P1 down, the P2 GDPR-transparency regression fixed, and the `/app-build-id` console-noise chain finally quiet. Ship as v0.49.0.
**Previous:** Sprint 050 (v0.48.0 -- Tests-First Stabilization -- shipped 2026-04-22)
**Estimated duration:** 5-7 working days
**Previous sprint close:** `project_sprint050_completed.md` (to be written)

## Sprint goal (one sentence)

Burn down the six-sprint backlog of P1 / P2 carry-overs + the 4 RC-surfaced UX bugs in one focused sprint, so Sprint 052 starts with a clean tracker instead of inheriting drift.

## Why this sprint matters

The last six sprints (043 -> 050) shipped a lot of infrastructure (two-plane architecture, eval surface, impersonation + consent, ADRs 050-053) while deferring the "small but visible" items:

- `#0582 /org redirect -> empty members page` has been reported since Sprint 047 and still lands users on a broken-looking screen.
- `#0586 build-ID cache invalidation` has caused the "Newer version available" banner confusion in every RC since Sprint 047.
- `#0592 Privacy tab data-access-log` actively tells patients "No data access recorded" while their data HAS been accessed -- a GDPR Art. 15 transparency regression.
- The "SHI" abbreviation in org-admin UI (heading fix landed in develop post-RC, ships with v0.49.0).

Sprint 050 ran the tests-first discipline that caught these via manual RC. Sprint 051 executes the fixes.

## Non-goals

- No new customer-facing features (exception: `#0587 Sovereign Link skeleton` which unblocks APPS tiles -- counts as stability, not feature).
- No test-infrastructure additions beyond what's needed to pin today's fixes (Sprint 050 already built the pyramid).
- No performance work (defer to Sprint 052 if a specific regression surfaces).
- No new design docs unless a fix requires one.
- **Do not touch `#0576` SSO implementation.** It's an evaluation gate only -- we decide in Phase E whether to scope it for Sprint 052.

---

## Phase A -- P1 visibility fixes (~1.25 days)

Close the two P1 items that users hit as "broken-looking" screens, plus their UX companions. These move the needle on trust.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| 051-01 | P1 | **#0582** fix `/org` -> `/platform/org` redirect so the landing page actually shows members (currently 0) | 0.25d | -- |
| 051-02 | P3 | **#0590** platform admin "Members" sidebar shows "Could not load" with no org in host context -> either hide the link or show a friendly empty state + "pick an org from the dropdown" prompt | 0.5d | Pair with 051-01 |
| 051-03 | P1 | **#0526** consolidate remaining apps under brickos.io platform namespace (finish Sprint 043 carry-over -- audit what's still on sovereign-health.io vs brickos.io and close the gap) | 0.5d | Investigation-heavy; scope may shrink once we grep actual state |

**Phase A exit:** `/org` path and `/platform/org/members` on admin plane both show useful UI (even when empty). No more red-toast surprises for platform admins. Issue #0526 either closed or re-scoped with concrete remaining items.

---

## Phase B -- P2 GDPR transparency + stability chain (~2 days)

The cluster of P2s that have been carrying forward together because they interact.

### B1. GDPR transparency regression (0.5d)

| # | P | Title | Est |
|---|---|-------|-----|
| 051-10 | P2 | **#0592** Privacy tab data-access-log card -> unify with `/sovereign-health/data-access-log` backend endpoint. Card shows recent-5 rows + "See all" link to full page. | 0.5d |

Implementation: swap `api.settings.getAccessLog()` to call `/user/data-access-log` (Sprint 048 endpoint), keep existing `/settings/access-log` handler alive for backcompat but deprecate. Add link-out button.

### B2. Service worker + build-ID chain (1.0d)

These three are coupled -- fixing one without the others leaves the UX fragile. Do them together.

| # | P | Title | Est |
|---|---|-------|-----|
| 051-20 | P2 | **#0586** Build-ID cache invalidation signal -- pin the client bundle's compile-time `NEXT_PUBLIC_BUILD_ID` to match the server's `/app-build-id` at deploy time. Eliminates the "Newer version available" banner on first load of a fresh session. | 0.5d |
| 051-21 | P2 | **#0588** SW post-deploy reload flow -- wrap the refresh-banner fetch in `.catch()` so failed `/app-build-id` polls don't bubble to Uncaught promise rejections in the console. Related: the React #418 hydration error on eval that Layer 6 of Sprint 050 RC reported. | 0.5d |
| 051-22 | P2 | **#0589** automated post-deploy smoke via `deploy.sh verify()` -- make the eval-smoke spec run automatically after every production deploy, fail the deploy report on red. | 0.5d |

Note: 051-22 is 0.5d but only if B2 items 20 + 21 land first, since the smoke was flaky due to the console-noise these fix.

### B3. Leftover Sprint 043 cleanup (1.25d)

| # | P | Title | Est |
|---|---|-------|-----|
| 051-30 | P2 | **#0539** migrate remaining SHI handlers from `public.tier_features` -> `brickos.tier_features` | 1d |
| 051-31 | P2 | **#0543** platform audit-logs endpoint 404 -- the partial fix in Sprint 044 missed one code path. Close it. | 0.25d |

**Phase B exit:** `pnpm exec playwright test eval-smoke --project=unauth` green against staging AND production post-deploy. Privacy card shows the same data as the full page. No more "Newer version available" on fresh sessions.

---

## Phase C -- Sovereign Link skeleton (~2 days)

| # | P | Title | Est |
|---|---|-------|-----|
| 051-40 | P2 | **#0587** Sovereign Link end-user skeleton pages (so the APPS nav tiles route to real pages instead of 404s) | 2d |

Scope:
- `/sovereign-link` landing page (authed, org-scoped)
- `/sovereign-link/links` (list)
- `/sovereign-link/new` (create short link form)
- Uses the existing `brickos-licensing` crate for feature gating (no new API surface)
- EN + DE copy, dark theme, responsive
- One vitest for the nav tile visibility logic, one Playwright spec for the create-link flow

This unblocks the org-owner view where right now clicking "Sovereign Link" in APPS just errors.

---

## Phase D -- fixture + cosmetic polish (~0.75 days)

The low-priority but trust-affecting items.

| # | P | Title | Est |
|---|---|-------|-----|
| 051-50 | P3 | **#0591** seed Anna's fixture data -- ~20 measurements across 90 days + caseload_assignment row linking practitioner to Anna. Write `ops/fixtures/003_test_patient_data.sql` + document in fixtures README. | 0.25d |
| 051-51 | P3 | **#0593** `/demo/zones` SQL UNION fix to count calculated markers with computable values toward zone summary counts. Update integration test accordingly. | 0.5d |

The "SHI" -> "Sovereign Health Intelligence" email templates heading fix is already in develop (1aa29ba) and ships automatically with v0.49.0. No separate item needed.

---

## Phase E -- RC + v0.49.0 promote (~1 day)

Repeat Sprint 050's disciplined process. We now have a 9-layer RC checklist that works; re-run it.

| # | Action | Est |
|---|--------|-----|
| 051-90 | Version bump: lib.rs + Cargo.toml + package.json + deploy.sh all to 0.49.0; regenerate snapshots | 0.1d |
| 051-91 | Full suite run: cargo test (lib + integration + smoke) + vitest + Playwright staging + eval | 0.2d |
| 051-92 | Write `docs/releases/sovereign-health/v0.49.0-rc/RELEASE_NOTES.md` | 0.2d |
| 051-93 | Deploy to staging | 0.1d |
| 051-94 | Manual RC walkthrough (re-use the Sprint 050 checklist with URL updates) -- 30 min browser pass | 0.2d |
| 051-95 | Promote to production: git_promote + deploy.sh production --confirm + tag v0.49.0 + push | 0.2d |
| 051-96 | Write `docs/releases/sovereign-health/v0.49.0/RETRO.md` | 0.1d |

**Phase E exit:** v0.49.0 live on app.brickos.io, tagged, release notes + retro committed.

---

## Phase F (stretch, deferred by default) -- #0576 SSO evaluation

**Only if Phases A-E land in 4 days or less.** If so:

| # | P | Title | Est |
|---|---|-------|-----|
| 051-F1 | P3 | **#0576** write the evaluation write-up for shared SSO across planes -- decision document only, NO implementation. Deliverable: `docs/design/sprint-051-sso-plane-evaluation.md` with recommendation (go/no-go) + estimated implementation scope if go. | 1.5d |

If Phase F doesn't fit, #0576 stays open for Sprint 052.

---

## Summary by priority

| Priority | Items | Total estimate |
|---|---|---|
| **P1 (must land)** | 051-01, 051-03 | 0.75d |
| **P2 (should land)** | 051-10, 051-20, 051-21, 051-22, 051-30, 051-31, 051-40 | 5.25d |
| **P3 (nice to have)** | 051-02, 051-50, 051-51 | 1.25d |
| **Stretch** | 051-F1 | 1.5d |
| **RC + release** | 051-90 through 051-96 | 1.1d |

**Realistic path:** P1 + P2 + P3 + RC = **~8.4 days**. Pushes slightly over the 7-day target; trim by scoping 051-03 smaller (`#0526` may close after investigation with less work than estimated) and skipping the 051-F1 stretch.

**Conservative path (6 days):** skip the stretch + compress 051-03 to 0.25d after audit = **6.35 days**. Hits target.

---

## What's NOT in this sprint (and why)

| Deferred | Why |
|---|---|
| `#0069` WebAuthn/FIDO2 | P2 research, 2+ weeks |
| `#0070` NOSTR NIP-98 | P2 research |
| `#0091` OAuth social login | Conflicts with current privacy-first stance |
| `#0227-0263` dev-env / WSL / Hetzner POCs | Infra experiments, not user-facing |
| `#0317-0326` GDPR/NIS2/Data Act compliance items | Separate compliance sprint needed (12+ items) |
| `#0576` SSO (unless Phase F fires) | Evaluation gate; needs decision first |
| Visual regression (Sprint 050 B5 stretch) | Optional; revisit Sprint 052 |

---

## Entry criteria (check before starting Phase A)

- [x] v0.48.0 live on production with `{"version":"0.48.0","build":"b8ea62e"}` at /health
- [x] main tagged v0.48.0 + pushed to origin
- [x] develop has the email heading fix (1aa29ba) queued for next deploy
- [x] All 4 Sprint 050 RC bugs filed (#0590-#0593)
- [ ] User confirms sprint scope (this doc)
- [ ] `bash apps/health/sovereign-health/ops/localhost-stack.sh up` green
- [ ] Full test suite green on develop tip

## Exit criteria

- [ ] v0.49.0 shipped to production
- [ ] 9 open tracker issues closed (#0526, #0539, #0543, #0582, #0586, #0587, #0588, #0589, #0590, #0591, #0592, #0593)
- [ ] No new P1/P2 regressions surfaced during RC
- [ ] Retro committed, memory index updated
- [ ] Sprint 052 plan bootstrapped (even if just backlog re-prioritization)

---

## Risk notes

- **#0587 Sovereign Link skeleton (2d)** is the single largest item; if blocked on the `brickos-licensing` crate surface, de-scope to just the landing page + "Coming soon" cards (0.5d) and re-open for Sprint 052.
- **#0526 platform namespace consolidation** is estimated at 0.5d but has been carrying since Sprint 043 -- if Phase A investigation reveals it's actually 2d+ of cross-app coordination, re-file as design-first and defer.
- **Merge freeze risk**: if the mobile team (separate repo) cuts a release branch mid-sprint, any ops/shared changes pause until they're cut.

---

## Related memory

- `feedback_production_deploy_workflow.md` -- 5-step promote pattern (applied successfully in Sprint 050)
- `feedback_deploy_branch_lock.md` -- don't switch to develop while prod deploy queued
- `feedback_stash_before_promote.md` -- stash untracked before deploy.sh promote
- `feedback_manual_rc_finds_real_bugs.md` -- the RC walk-through is worth the 30 minutes
- `feedback_nginx_regex_per_sprint.md` -- Sprint 051 may add `/sovereign-link/` (check both nginx configs)
