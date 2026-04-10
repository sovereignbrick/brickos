# Sprint 041 -- Staging Quality Gate

**Status:** Planned -- ready to start
**Started:** 2026-04-11 (planned)
**Goal:** Verify Sprint 040's licensing foundation works flawlessly on dev -> staging -> demo through a complete white-label customer onboarding walkthrough. Ship to production only if zero doubt. Otherwise defer.
**Design basis:** Sprint 040 (all 5 phases shipped). No new code paths; this sprint tests what exists.
**Previous:** Sprint 040 (SHI Licensing Foundation, shipped 2026-04-10)
**Milestone:** [sprint-041-staging-quality](../../tracker/milestones/sprint-041-staging-quality.md)
**Mode:** Test-driven sprint. Many small issues. Some user-manual, some Claude-automated. Production push is conditional.

---

## Sprint goal (one sentence)

**Get staging of brickos.io + sovereignhealth.io to a state where I can confidently onboard a real Horizon customer tomorrow morning, validated by walking the "Life Algorithm" fictional customer end-to-end.**

---

## Critical constraints

### 🚫 Production push is conditional, not default

Production deploys only if ALL of these are true at Phase I close-out:
1. Every Sprint 041 phase A-H green
2. Staging has baked clean with the new licensing path for 4+ hours
3. Zero bugs still open from the Life Algorithm walkthrough
4. Zero regressions in the existing test suites
5. Operator (Helmut) explicitly confirms "ship it"

**Default: no production deploy this sprint.** If any gate is uncertain, defer to Sprint 042. This sprint is graded on whether staging is in a shippable state, not on whether production ships.

### 🟢 Small issues, test-first

Every issue in Sprint 041 is a test, not a feature. Feature requests that surface go to the `platform-admin-gui` milestone as new issues and do NOT block Sprint 041. Bugs found by tests become new issues in this milestone with priority labels.

### 📣 Daily user check-in

Unlike Sprint 040 (compressed single day), Sprint 041 expects the user to do manual testing slices daily. The user tests, Claude automates what can be automated, and they synchronize on findings. Daily note in `sprint-041-lessons.md`.

### 🔒 PR-based workflow (first dogfood of ADR-048)

Every phase that involves code changes (bug fixes found during testing) lands on `main` via Pull Request per ADR-048 + `docs/runbooks/sprint-close-out.md`. Hotfixes use the `[hotfix]` prefix direct-push exception.

---

## The Life Algorithm test case

One fictional customer that every manual test exercises.

```
Organization:        Life Algorithm
Contract:            Horizon tier, 12 months
Seats:               1 owner, 3 practitioners, 50 clients (members)
Branding:            primary #10b981 (emerald), accent #6366f1 (indigo)
                     logo: TBD by user (user provides during Phase C)
                     role labels: practitioner -> "Coach", member -> "Client"
Custom domain:       life-algorithm.brickos.io (staging only)
Billing email:       billing@life-algorithm.test
Admin email:         admin@life-algorithm.test
Test practitioners:  coach1@life-algorithm.test, coach2@life-algorithm.test, coach3@life-algorithm.test
Test clients:        client1@life-algorithm.test .. client10@life-algorithm.test
Stripe customer:     cus_LifeAlgorithmTest (created in Stripe test mode)
```

The test domains (`life-algorithm.test`, `...brickos.io`) never collide with real customer data. The Stripe customer is test-mode only. The walkthrough is fully reversible -- at sprint close the org can be deleted from the staging DB and the Stripe customer archived.

**Full onboarding procedure lives at:** `docs/runbooks/issue-org-license.md` (Sprint 040 #487). Sprint 041 manual tests follow that runbook step-by-step against a real environment.

---

## Sprint 041 phases

```
A (Dev bring-up) → B (#491 two-pool E2E) → C (Life Algo org)
  → D (members) → E (single user) → F (admin pages sanity) → G (staging)
  → H (cleanup + deps) → I (close + conditional prod)
```

### Phase A -- Dev environment bring-up (2 issues)
Prove the local dev stack boots from scratch without manual SQL surgery. Run the existing test suites. Establishes the baseline.

### Phase B -- #491 two-pool E2E env (3 issues)
The Sprint 040 P2 carry-over. docker-compose.e2e.yml with two postgres services (SHI app DB + brickos platform DB), bootstrap script, Playwright journey suite runs to completion.

### Phase C -- Life Algorithm org + branding on dev (5 issues)
Create org, upload logo, set colors + role labels, custom domain, generate license JWT. Every step is a separate issue so bugs are localized. Manual + automated variants where possible.

### Phase D -- Life Algorithm member onboarding on dev (5 issues)
Add practitioners, add clients up to limit, test seat enforcement, grace banner, multi-org switcher. Focus: the licensing + seat enforcement + audit log path from Sprint 040 #469.

### Phase E -- Single user -> Life Algorithm (dev) (4 issues)
New user signup, add to org, switch context, see org branding, add measurement, export data. Focus: the customer-facing journey from signup to active use.

### Phase F -- brickos.io admin pages sanity pass (dev) (6 issues)
Click every button on every platform admin screen. Verify every filter, sort, bulk action works. Grouped by page.

### Phase G -- Staging deploy + staging smoke (5 issues)
Deploy, walk the Life Algorithm onboarding on staging URLs, run the full E2E suite, monitor logs. The moment of truth for whether the sprint's gate is met.

### Phase H -- Cleanup (2 issues)
- #490 dead code cleanup (now safe per ADR-046 shadow bake)
- 6 high Dependabot vulnerability triage

### Phase I -- Sprint close + conditional production (3 issues)
Retrospective, review, self-eval, memory. Production decision. If ship: deploy + smoke. If defer: document gates not met and move to Sprint 042.

---

## Issue index (by phase)

See individual files in `docs/tracker/issues/open/0492-*.md` through `0521-*.md`. 30 new issues plus the 2 carry-over (#490, #491) = 32 total.

| Phase | Issues | Who |
|---|---|---|
| A | #492-#493 | Claude (automated) |
| B | #491, #494-#495 | Claude (automated) |
| C | #496-#500 | User (manual) + Claude (automated) |
| D | #501-#505 | User (manual) + Claude (automated) |
| E | #506-#509 | User (manual) + Claude (automated) |
| F | #510-#515 | User (manual) |
| G | #516-#520 | User (manual) + Claude (automated) |
| H | #521, #490 | Claude (automated) |
| I | sprint-close-out | Both |

---

## Daily rhythm

Morning (Claude):
- Pull `origin/main`
- Check which issues are ready to claim
- Run automated tests for any newly green-gated issues
- Report findings in `sprint-041-lessons.md`

User session (Helmut):
- Pick the next unblocked manual test
- Walk the steps from the issue body
- Report results (green / bug found / new feature request) in the issue or lessons doc
- Claude turns any bug into a new issue with repro steps

End of day (Claude):
- Sync tracker state
- Commit any test fixture additions as PRs per ADR-048
- Update lessons doc with the day's findings

---

## Git workflow

**First sprint to use ADR-048 PR-based flow.**

- Branch per phase: `sprint-041/phase-a`, `sprint-041/phase-b`, etc.
- Bug fixes and test additions land on phase branches
- At phase gate, PR from phase branch to `main` via REST API (not `gh pr create`, see the runbook hotfix `bed42f0`)
- Hotfixes may use `[hotfix]` prefix for direct-push

Close-out follows `docs/runbooks/sprint-close-out.md` step-by-step. Sprint 040 dogfooded the runbook on a docs-only commit; Sprint 041 is the first real-code dogfood.

---

## Communication

- Daily standup-style note in `sprint-041-lessons.md`
- User testing findings get inline comments in the relevant issue OR a note in the lessons doc
- Blockers surface immediately (not batched to end of day)

---

## Out of scope

- Any new feature development (non-test work). Feature requests -> `platform-admin-gui` milestone.
- Sprint 040 #490 Item 8 (chat quota analytics) -- separate investigation, not in this cleanup pass.
- Production push unless zero doubt.
- Adding new apps to the feature registry -- stays in Sprint 040 #486 scope (CRM + Link already registered, runtime enforcement is per-app sprint work).
- Design 021 §13 Phase 1 visual branding rollout -- tracked separately as a follow-up sprint.
