# ADR-048: PR-based sprint flow (no direct pushes to main)

**Status:** Accepted
**Date:** 2026-04-10
**Sprint:** 040 (close-out)

## Context

Through Sprint 039 and including the Sprint 040 close-out, sprint work landed on `main` via direct fast-forward merge from a sprint branch (`sprint-NNN/phase-X`). The pattern was: do all the work on the branch, ff-merge locally, push `main` to origin. No pull request, no review gate on GitHub, no CI trigger.

On 2026-04-10 when Sprint 040 was pushed to `origin/main`, GitHub returned:

```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
```

The push succeeded because the brickos-apps token has admin bypass, but the rule exists and is already flagging direct pushes. The rule was configured at some earlier point and has been silently bypassed for every direct push since.

Meanwhile:
- The monorepo is growing (7+ apps, 20+ crates, two mirrors).
- Sprint work can now span hundreds of commits and thousands of lines.
- No live customers yet, but there will be soon.
- No GitHub Actions auto-deploy (memory: `feedback_ci_actions_disabled.md`). A PR merge does NOT trigger a deploy; deploys are still manual via `deploy.sh`.
- GitLab mirror is also in play, and the push to GitLab is a separate step that can drift from GitHub if one side fails and the other succeeds silently.

Direct pushes have worked fine when it's a solo operator moving fast. But the branch protection rule has value even in a solo workflow: a PR produces a durable record (title, description, diff, checks status) for every sprint landing, which is more useful than `git log` when auditing "what actually shipped on what date" six months later.

## Decision

**Starting with Sprint 041, every sprint's work lands on `main` via a Pull Request from the sprint branch, not via direct push.**

The sprint close-out flow becomes:

1. Work on `sprint-NNN/phase-X` branches as before.
2. At sprint close, commit tracker backfills, move issue files to closed/, write retrospective + review + ADRs (same as Sprint 040 close-out).
3. `git push origin sprint-NNN/phase-X` (the sprint branch, not main).
4. `gh pr create --base main --head sprint-NNN/phase-X --title "Sprint NNN: <name>" --body "$(cat sprint-NNN-review.md)"` -- body references the review doc.
5. PR description includes the scorecard from the review, carry-over list, link to retrospective, link to design doc, checklist of what was verified locally.
6. Wait for any self-review notes, then merge the PR via the GitHub UI or `gh pr merge --merge`.
7. GitLab mirror gets pushed AFTER the GitHub merge so both remotes stay in lockstep.
8. `git pull origin main` locally to fast-forward the local `main` to the merged state.
9. Close tracker milestone on GitHub (should also happen via the auto-sync cron once it has rate budget).

**Hotfixes** (not sprint work, single small commits) may still land via direct push if they bypass the PR flow -- but the expectation is that sprint-sized changes go through PR.

**GitHub branch protection rules** for `main`:
- Require pull request before merging (already configured, previously bypassed)
- Dismiss stale reviews on new commits -- optional, not enabled today
- Require status checks to pass before merging -- not enabled today (GitHub Actions disabled)
- Require branches to be up to date before merging -- recommended, not enabled today
- Include administrators -- **NOT enabled**, and should stay NOT enabled so hotfixes + close-out bypasses remain possible for the solo operator

## Alternatives Considered

- **Keep direct push, ignore the rule warning.** The rule would stay permanently "bypassed" which is noise in the audit log and defeats the point of having a rule. Rejected: either enable the rule and honor it, or disable the rule.
- **Disable the branch protection rule.** Simplest. Loses the audit trail and PR diff view entirely. Rejected: the PR view is genuinely useful for reviewing a big sprint's worth of changes in one place, and for future-you auditing "what shipped when".
- **Require reviews on PRs (1+ approval before merge).** Nice-to-have but no reviewer exists today (solo operator, Claude Code not counted as a GitHub reviewer). Rejected: premature. Revisit when a second human joins.
- **Require CI checks to pass before merging.** GitHub Actions is disabled for brickos-apps, so there are no checks to gate on. Rejected: would block all merges until Actions is re-enabled.

## Consequences

**What becomes easier:**
- Every sprint landing has a durable record on GitHub: title, description, diff, merge commit. Better than `git log | grep` for "what shipped in Sprint 037?" six months later.
- The PR description is the natural place to link the sprint review, retrospective, and design doc. One-stop for "why did this sprint exist, and what did it deliver".
- External reviewers (once we have them) can read the PR and comment inline without needing a local checkout.
- The GitLab mirror stays in sync more reliably because GitHub is the single source of truth; GitLab gets pushed only after the GitHub merge lands.

**What becomes harder:**
- Sprint close-out adds 2-3 minutes (push sprint branch, create PR, merge PR, push mirror). This is a fixed cost, not per-commit.
- Local `main` has to be explicitly pulled after a merge instead of already being at the right commit. Mitigation: add `git pull` to the sprint close-out memory checklist.
- Hotfixes that bypass the PR flow will show up in the "bypassed rule" log and should be documented in the hotfix commit message (e.g. `[hotfix]` prefix) so they're easy to identify.

**What we learned in Sprint 040:**
- The direct push worked (81 commits landed fine) but the "Bypassed rule violations" warning is a smell. The rule exists for a reason; ignoring it is worse than either honoring it or removing it.
- Memory: `feedback_pr_based_sprint_flow.md` captures the 5-step close-out flow for future sprints.
- Sprint 041 will be the first sprint to land via PR. Its close-out commit will validate the new workflow and the `feedback_pr_based_sprint_flow.md` memory.

## Applies to

- Every sprint starting from Sprint 041
- Not retroactive -- Sprint 040 already landed via direct push and is staying that way
- Hotfixes are out of scope (they may still land direct, but are expected to be single small commits, not sprint-sized changes)

## Open questions

- **PR body template.** Today the close-out writes a review doc at `docs/sprint-planning/reviews/YYYY-MM-DD_sprint-NNN-review.md`. Sprint 041 should include a step to copy the review body into the PR description (or reference it via a short PR body + link). Decide which is cleaner after Sprint 041's first PR.
- **PR labels.** Should each sprint PR get a `sprint-NNN` label for easy filtering? Probably yes, but not enforced for Sprint 041 -- we'll see if it's useful.
- **Mirror push timing.** Today the memory says "deploy.sh pushes to both GitHub + GitLab automatically". That memory is from a different workflow. For sprint PRs, the mirror push should happen manually after the GitHub merge. Update `feedback_gitlab_mirror.md` if this changes.
