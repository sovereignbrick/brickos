# Sprint 041 Review -- Staging Quality Gate

**Date:** 2026-04-11
**Sprint:** 041
**Duration:** 2 days (started end of day 2026-04-10, closed 2026-04-11)
**Focus:** Validate the Sprint 040 licensing foundation end-to-end on staging via the Life Algorithm walkthrough; produce the production-push decision

This review is the **external-facing** summary of what Sprint 041 delivered. For the internal "what worked / what didn't / what to change" analysis, see the retrospective at `../retrospectives/2026-04-11_sprint-041-retro.md`.

---

## Sprint Goal

Get brickos.io + sovereignhealth.io staging to a state where a real white-label customer could be onboarded end-to-end. Production push conditional on zero-doubt staging validation.

**Outcome: staging green, production push deferred to Sprint 042.** The bake monitor and the manual walkthrough surfaced 9 issues that need to land before SHI is genuinely production-ready -- the most important being a P0 schema cleanup and a P1 ops gap that silently breaks every future deploy.

---

## What Was Delivered

### Phase A -- Cold-boot bring-up + #491 + #522 (carry-over from Sprint 040)

| Issue | Scope |
|---|---|
| #491 | Cold-boot brickos schema for dev (a 12-table bootstrap migration with 41-feature seed, idempotent reconciliation block, 4 broken-since-forever migrations defensively guarded) |
| #522 | Migration runner silent skip P0 -- `tokio::spawn` swallowed migration errors, backend served `/health` 200 with a half-applied schema. Now awaits inline + `std::process::exit(1)` on error. |
| #492 | Dev stack cold boot test: 177/177 migrations applied, 0 silently skipped, 23/23 brickos-licensing embedded_runtime tests passing, sprint-040-smoke 7/7 |

5 cold-boot iterations to debug. Each iteration revealed a new latent bug masked by the spawn-and-swallow. Final state: dev cold-boots clean from a fresh database every time.

### Phase B -- Existing test suite baseline (#493)

| Item | Result |
|---|---|
| `cargo test --workspace --lib` | 136/136 backend pass |
| `cargo clippy --workspace --all-targets -- -D warnings` | clean |
| `cargo fmt --check` | clean |
| Playwright `sprint-040-smoke.spec.ts` | 7/7 pass |
| Playwright `sprint-041-life-algorithm.spec.ts` | 21/21 pass after the platform admin UX rounds 1+2+3 landed |

### Phase C -- Platform admin UX rounds 1, 2, 3 (manual feedback loops, #523-#525, PRs #571 #572)

Three rounds of "user clicks staging, finds gaps, Claude fixes them, redeploys, Playwright covers the new flow". Net delivery:

- `/platform/orgs` -- New Organization button (#523): create org with `admin_email` auto-create + invited-user state, sticky header, real status tags, scoping context filters
- `/platform/orgs/[id]` -- delete preview + hard-delete (round 2): SHI_MODE-aware soft-delete vs hard-delete, dependency counts, cascade across `brickos.*` + `public.*`
- `/platform/orgs/[id]` -- members tab (round 3): seat enforcement on add, role-change, remove, audit log entries
- 21 Playwright e2e tests in `sprint-041-life-algorithm.spec.ts` covering the full Life Algorithm walkthrough

### Phase D -- Staging deploy + smoke (#516-#519, deploys to demo VPS)

| Issue | Scope |
|---|---|
| #516 | SHI api deploy to staging via `deploy.sh staging`. 17 verification checks all green. v0.41.0. |
| #517 | All 177 migrations applied on staging without intervention. |
| #518 | Manual Life Algorithm walkthrough on staging. Found 4 staging-only bugs that hadn't shown up on dev (see "Bugs found in this sprint" below). |
| #519 | Sprint 041 staging API smoke test: login -> create org -> issue license -> delete preview -> audit -> hard delete -> 404. 7/7 green. |

### Phase E -- Bake monitor (#520)

Background script ran for 1h45m (8 of 16 windows -- stopped early on user signal to start fixing the manual-test findings). Recorded:

| Window | Errors | Panics | LICENSING DIVERGENCE |
|---|---|---|---|
| 1-5 (15:19-16:19) | 0 | 0 | 0 |
| 6 (16:34) | 3 | 0 | 0 |
| 7 (16:49) | 5 | 0 | 0 |
| 8 (17:04) | 0 | 0 | 0 |

The 8 errors in windows 6-7 correlated exactly with the manual session triggering #527's `product_features` 500s. Window 8 (post-staging-hotfix) was back to zero. **Zero panics and zero LICENSING DIVERGENCE events across the entire run.**

### Phase F -- Dependabot triage (#521)

Resolved all 10 open Dependabot alerts (7 high `next` DoS + 3 medium `next-intl` open redirect):

- `next` 16.2.1 / 16.2.2 -> **16.2.3** (CVE GHSA-q4gf-8mx6-v5v3, DoS via Server Components)
- `next-intl` `^4.9.0` -> **`^4.9.1`** (open redirect)

Affected manifests: SHI frontend, SHI website, brickos website, sovereign-crm frontend (npm). All four built clean. Verified the deployed staging frontend has `next 16.2.3` + `next-intl ^4.9.1` via `docker exec sh-staging-frontend grep`.

GitHub alerts will auto-close when develop merges to main.

### Phase G -- Manual session findings + in-session fix batch

The Sprint 041 manual walkthrough uncovered **13 distinct bugs**, of which **6 were fixed and shipped to staging in the same session** and **7 were filed as Sprint 042 carry-overs**.

#### Fixed in Sprint 041 (commit `2172ccb`)

| # | Severity | Title |
|---|---|---|
| #532 | P1 frontend nav | `/platform/ai/config` is a static mockup -- hidden from nav until #529 rebuilds it |
| #533 | P2 ux | User-avatar dropdown collapsed to `Settings` + `Logout` (was `Settings` + `Security & MFA` + `Logout`) |
| #534 | P1 frontend api | Newsletter Export CSV NetworkError -- dropped Authorization header from `newsletterExport`, matches the cookie-auth pattern of every other admin call |
| #535 | P2 frontend nav | `/platform/content/strings` "Coming soon" stub -- hidden from nav |
| #536 | P1 backend filter | `/platform/links` Individual User filter -- special-cased the UUID to use IS NULL semantics in `affiliate.rs:admin_list_links` |
| #537 | P1 dual fix | `/platform/users` Individual User filter (same backend bug) + shared filter bar dropdown value mismatch (`shi` -> `sovereign-health` in `platform/layout.tsx`) |

API verification post-deploy:

| Filter | Result | Expected |
|---|---|---|
| `/admin/users` no filter | 25 | 25 |
| `/admin/users?org_id=Individual User` | **2** (was 0) | 2 (orphan users) |
| `/admin/users?org_id=test22` | 1 | 1 (`t@t.com`) |

Plus the full Sprint 041 smoke test still passes 7/7 post-redeploy.

### Phase H -- Sprint 041 close-out (this commit)

- 9 carry-over issues reassigned to Sprint 042 milestone
- 40 Sprint 041 issues moved from `open/` to `closed/`
- Sprint 042 milestone doc bootstrapped with phase plan
- Retrospective + review + lessons doc updated
- Memory updated: `project_sprint041_completed.md` + `project_sprint042_ready.md`

---

## Sprint Scorecard

| Metric | Value |
|---|---|
| Planned points | ~30 (33 issues #491-#525) |
| Completed in sprint | 26 issues |
| Carry-over to Sprint 042 | 9 issues (#490, #524, #526, #527, #528, #529, #530, #531, #538) |
| **Bugs found during the sprint** (#526-#538) | **13 new issues filed** |
| **Bugs fixed in-sprint** | 6 (#532, #533, #534, #535, #536, #537) -- shipped commit `2172ccb` |
| Bugs hotfixed on staging only | 2 (#527 schema rename, #530 license re-issue) |
| Bugs deferred to Sprint 042 | 7 (#526, #527, #528, #529, #530, #531, #538) |
| Commits this sprint | ~25 |
| Files touched | ~50 |
| Releases / RCs | 0 (staging deploys only -- production push deferred) |
| Deploys to staging | 4 (one cold-boot fix, one dep upgrade, one bug-fix batch, one verification) |
| Deploys to production | **0** (per the milestone gate) |
| Bake monitor windows | 8 of 16 (stopped on user signal to start fixing bugs) |
| Bake monitor panics | **0** |
| Bake monitor LICENSING DIVERGENCE | **0** |

---

## Bugs found during the sprint

A bug discovered during Sprint 041 testing fell into one of three buckets per the milestone's triage rules:

### Bucket 1 -- Sprint 040 latent bugs (P0/P1, fixed inside Sprint 041)

| # | Title |
|---|---|
| #522 | Migration runner silent skip (the master P0 that hid 4+ other latent bugs) |
| #532 | `/platform/ai/config` static mockup (Sprint 040 #483 left it as a placeholder) |
| #534 | Newsletter Export NetworkError (Sprint 040 #481 wrote raw fetch with Bearer auth) |
| #535 | `/platform/content/strings` "Coming soon" stub (Sprint 040 #483) |
| #536 | `/platform/links` filter strict equality (Sprint 040 #361 + #467 left this gap) |
| #537 | `/platform/users` filter strict equality + shared dropdown value mismatch (same root) |

### Bucket 2 -- New requirements / architecture (filed against the right milestone, deferred to Sprint 042)

| # | Title |
|---|---|
| #526 | Consolidate apps under brickos.io platform namespace |
| #528 | Settings page brickos master + per-app tab extensions |
| #529 | Dr. Alex consume brickos system AI defaults |
| #530 | License issuance defaults to 0 seats |
| #531 | Glucose unit confusion (multi-file, needs #528 first) |

### Bucket 3 -- Operational gaps

| # | Title |
|---|---|
| #527 | Feature-gating handlers query missing `product_features` (Sprint 040 #467 left the slug-based redesign half-finished). Staging hotfix in place. |
| #538 | Service worker caches old JS for 4h, blocks deploy rollouts. |

---

## Production push decision

**Production push DEFERRED to Sprint 042.**

Per the milestone's gate criterion, ALL of these must be true to ship to production:

| Gate | State |
|---|---|
| Every phase A-H green | ✅ in-sprint phases green; carry-overs explicit |
| Staging baked clean for 4h with new licensing path | ⚠️ partial (1h45m bake, then user-driven manual session began) |
| Zero P0/P1 bugs open from the Life Algorithm walkthrough | ❌ **9 carry-overs**, including 1 P0 (#527) |
| Zero regressions in existing test suites | ✅ 136/136 backend, 21/21 Playwright |
| Operator explicitly confirms "ship it" | ❌ explicitly chose to defer |

**Decision:** Sprint 042 picks up the production push. Sprint 041 succeeded in its actual purpose -- which was to **find every bug before production**, not to push to production blindly.

---

## Carry-over to Sprint 042

| # | Severity | Title | Why deferred |
|---|---|---|---|
| **#527** | **P0** | feature-gating handlers query missing legacy `product_features` | Schema cleanup migration, not Rust changes. Staging hotfix in place. Sprint 042 Phase A. |
| #530 | P1 bug | License issuance defaults to 0 seats | Two-part fix (schema + form). Sprint 042 Phase C. |
| #531 | P1 bug | Glucose unit confusion | Multi-file, depends on #528. Sprint 042 Phase F. |
| #538 | P1 ops | Service worker caches old JS for 4h | Two-line fix (nginx + serwist) but needs deploy.sh verification step. Sprint 042 Phase B. |
| #528 | P1 arch | Settings master + per-app tabs | Needs design 016 first. Sprint 042 Phase D. |
| #529 | P1 arch | Dr. Alex consume brickos AI defaults | Depends on #528 + the rebuilt #532 page. Sprint 042 Phase E. |
| #526 | P1 arch | brickos.io URL namespace consolidation | Needs design 015 first. Sprint 042 Phase G. |
| #524 | P2 test | DEMO_ADMIN Playwright fixture | Test infra cleanup. Sprint 042 Phase H. |
| #490 | P3 chore | Licensing dead code cleanup | Long-standing carry from Sprint 040. After #527 lands. |

## Verification

- [x] `cargo test --lib -p sovereign-health-backend` -- 136/136 pass
- [x] `cargo clippy -p sovereign-health-backend -- -D warnings` -- clean
- [x] `pnpm --filter sovereign-health-frontend build` -- clean
- [x] `pnpm --filter website build` -- clean (SHI marketing site)
- [x] `pnpm --filter brickos-website build` -- clean
- [x] `npm run build` (sovereign-crm-frontend) -- clean, 0 npm audit vulns
- [x] Sprint 041 API smoke (`/tmp/sprint041_staging_smoke.py`) -- 7/7 green post final redeploy
- [x] Individual User filter probe -- 25/2/1 (was 25/0/1)
- [x] Bake monitor 1h45m run -- 0 panics, 0 LICENSING DIVERGENCE
- [x] Deployed staging frontend confirmed running `next 16.2.3` + `next-intl ^4.9.1`

## Related

- Predecessor: [Sprint 040 Review](2026-04-10_sprint-040-review.md) -- the licensing foundation under test
- Successor: [Sprint 042 milestone](../../tracker/milestones/sprint-042-shi-production-readiness.md) -- the production push
- Retrospective: [2026-04-11_sprint-041-retro.md](../retrospectives/2026-04-11_sprint-041-retro.md)
- Lessons doc: [sprint-041-lessons.md](../sprints/sprint-041-lessons.md)
- Memory: `project_sprint041_completed.md`, `project_sprint042_ready.md`, `feedback_dual_schema_fk_cleanup.md`
