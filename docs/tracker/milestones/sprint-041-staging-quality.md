---
name: Sprint 041 -- Staging Quality Gate
description: Get brickos.io + sovereignhealth.io staging to a state where a real white-label customer could be onboarded end-to-end, using "Life Algorithm" as a demo fixture. Production push is conditional on zero-doubt staging validation.
status: closed
sprint: 041
closed_at: 2026-04-11
outcome: |
  Staging deployed end-to-end (brickos platform admin GUI + SHI api/frontend/website on demo VPS) with v0.41.0. Manual walkthrough surfaced 13 new issues: 6 fixed in-session and shipped to staging (all green), 9 carried to Sprint 042 SHI Production Readiness (one P0 with staging hotfix in place, four P1 architecture issues, three P1 SHI bugs, one ops gap). Staging bake monitor ran 1h45m with zero panics + zero LICENSING DIVERGENCE events; the only errors recorded were the #527 product_features hits, fully suppressed once the staging hotfix landed. Production push deferred to Sprint 042 per the milestone gate criterion -- not zero doubt yet.
constraint: No production deployments unless zero doubt after complete staging bake. When in doubt, defer to Sprint 042. (Triggered: Sprint 042 picks up the production push.)
---

# Sprint 041 -- Staging Quality Gate

Implementation-free sprint focused on **testing the work from Sprint 040** across dev -> staging -> demo environments. The goal is flawless staging of `brickos.io` and `sovereignhealth.io` domains, validated by walking through a real customer onboarding end-to-end. No new features unless they surface as bugs during testing.

**Design basis:** Sprint 040's licensing foundation is the code under test. This sprint produces no new code paths; it drives every existing path through a realistic use case and fixes whatever breaks.

**Sprint doc:** [sprint-041.md](../../sprint-planning/sprints/sprint-041.md)
**Previous:** Sprint 040 (SHI Licensing Foundation, shipped 2026-04-10)

## The production push decision

**Default: no production deploy this sprint.**

Production happens only if ALL of these are true at Phase I close-out:
1. Every phase A-H green
2. Staging has baked clean for at least 4 hours with the new licensing path
3. Zero bugs still open from the Life Algorithm walkthrough
4. Zero regressions in the existing test suites
5. Operator (Helmut) explicitly confirms "ship it"

If any of these is uncertain, production defers to Sprint 042. This sprint is not graded on whether production ships; it is graded on whether staging is in a shippable state.

## The Life Algorithm test case

Sprint 041 uses a single fictional white-label customer as the fixture for every manual test:

- **Org:** Life Algorithm (health coaching company)
- **Contract:** Horizon tier, 3 practitioners, 50 patients, 12 months
- **Brand:** primary #10b981 (emerald), accent #6366f1 (indigo)
- **Role labels:** practitioner -> "Coach", member -> "Client"
- **Custom domain:** `life-algorithm.brickos.io` (staging only)
- **Billing email:** `billing@life-algorithm.test`
- **Admin email:** `admin@life-algorithm.test`
- **Test practitioners:** `coach1@life-algorithm.test`, `coach2@life-algorithm.test`
- **Test clients:** `client1@life-algorithm.test` through `client10@life-algorithm.test`

Every phase of this sprint exercises some slice of this use case. The user can manually walk the onboarding; Claude Code can run automated equivalents against the same fixture.

## Sprint 041 phases

### Phase A -- Dev environment bring-up (automated + quick manual)
Verify the dev stack boots cleanly and all existing tests pass before any new work. Establishes the baseline.

### Phase B -- Two-pool E2E env (#491 carry-over)
The Sprint 040 P2 carry-over. Unblocks Playwright licensing journeys 3+4. Also required for the brickos schema to exist in local dev without manual migration application.

### Phase C -- Life Algorithm org creation + branding (dev)
Walk the admin GUI end-to-end for org creation, branding configuration, and license JWT generation against the **local dev stack**. Catches any bug in the happy path before staging bakes.

### Phase D -- Life Algorithm member onboarding (dev)
Add practitioners and clients to Life Algorithm. Test seat enforcement, role labels, grace banner, multi-org switcher. Still on dev.

### Phase E -- Single-user flow: new user -> joins Life Algorithm (dev)
A new SHI user signs up, gets invited to Life Algorithm, switches context, sees Life Algorithm branding, adds a measurement, exports data. Covers the customer-facing path from signup to active use.

### Phase F -- brickos.io admin pages sanity pass (dev)
Click-through checklist across every platform admin screen. Verify every button, form, filter, sortable column, and bulk action actually works with the new admin GUI. Catches any Sprint 040 Phase D regression.

### Phase G -- Staging deploy + staging smoke
Deploy SHI api + frontend + website to staging. Run the full E2E suite against staging URLs (`api.staging.brickos.io`, `app.staging.brickos.io`, `sovereignhealth.io`). Walk the Life Algorithm onboarding on staging. Monitor logs for any staging-only bugs.

### Phase H -- Dependabot + #490 dead code cleanup
Triage the 6 high Dependabot vulnerabilities flagged on `origin/main`. Apply #490 dead code cleanup now that staging shadow mode has baked (per ADR-046).

### Phase I -- Sprint close + production decision
Retrospective, review, self-eval, memory. Production push only if every gate is green and zero doubt. Otherwise defer to Sprint 042 and carry over.

## Sprint 041 issues

Issues are numbered #492-#5NN (continuing from #491 carry-over). Every issue is **small** -- estimates 0.1d to 0.5d. Tests are either **[manual]** (user runs and reports) or **[automated]** (Claude runs). Some tests have both a manual and an automated variant.

**Carry-over to work:**
- #490 (dead code cleanup) -- Phase H
- #491 (two-pool E2E env) -- Phase B

**New issues:** #492 through #521 (30 issues, see `docs/tracker/issues/open/` filenames `0492-*` through `0521-*`).

## Feature request triage

Any feature request that surfaces during Sprint 041 testing:
- **Is a bug in Sprint 040 code?** File against this milestone (sprint-041-staging-quality) with a P0/P1/P2/P3 label. Fix in the current sprint.
- **Is a new feature request?** File against the `platform-admin-gui` milestone (brickos.io admin GUI scope). Do NOT block Sprint 041 on it; triage in Sprint 042 kickoff.
- **Is a non-blocking polish item?** File against `infrastructure` as a chore. Same triage.

## References

- Previous sprint: [sprint-040.md](../../sprint-planning/sprints/sprint-040.md) -- the code under test
- Deployment workflow: [ADR-048](../../adr/048-pr-based-sprint-flow.md) + [runbook](../../runbooks/sprint-close-out.md) -- first sprint to dogfood the PR-based flow
- Admin onboarding runbook: [issue-org-license.md](../../runbooks/issue-org-license.md) -- the step-by-step the Life Algorithm test case follows
- Memory: `project_sprint040_completed.md`, `feedback_sprint_close_checklist.md`, `feedback_pr_based_sprint_flow.md`
