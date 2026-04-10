# Runbook — Sprint close-out (PR-based flow)

> Per ADR-048. Every sprint from Sprint 041 onward lands on `main` via a
> Pull Request from the sprint branch, not via direct push. This runbook is
> the step-by-step that replaces the direct-push close-out used through
> Sprint 040.

## When

Run this at the end of every sprint, after the last code commit on the
sprint branch and before starting the next sprint's kickoff. Typical
elapsed time: 10-20 minutes.

## Prerequisites

- Sprint branch exists: `sprint-NNN/phase-X` (or similar)
- All sprint work is committed to the branch
- The owner has approved "this sprint is done"
- GitHub CLI (`gh`) is installed and authenticated
- Local `main` is clean (no uncommitted changes)

## Steps

### 1. Close-out commits on the sprint branch

Still on the sprint branch, not `main`. These are the maintenance commits
that bring the repo into "sprint closed" state.

```bash
# 1a. Commit tracker backfills from cron runs (if any)
git status --short | grep "docs/tracker/issues/" | head
# Review; then:
git add docs/tracker/issues/closed/*.md docs/tracker/sync/last-sync.json
git commit -m "chore(tracker): backfill github_number on synced issues + last-sync.json"

# 1b. Move sprint issue files from open/ -> closed/
for f in docs/tracker/issues/open/0NNN-*.md; do
  git mv "$f" "docs/tracker/issues/closed/$(basename $f)"
done
git commit -m "chore(tracker): move N Sprint NNN issues to closed/"

# 1c. Close the milestone file
# Edit docs/tracker/milestones/<name>.md:
#   status: active -> closed
#   add: closed_at: YYYY-MM-DD
#   add: outcome: <one-line summary>
git add docs/tracker/milestones/<name>.md

# 1d. Mark design doc as shipped (if applicable)
# Edit docs/design/NNN-<name>.md frontmatter:
#   status: draft -> shipped (Sprint NNN)
#   add: sprint: NNN
#   add: shipped_commits: "..."
#   add: carry_over: [...]
git add docs/design/NNN-*.md

# 1e. Update sprint-NNN.md + sprint-NNN-lessons.md
# Edit sprint-NNN.md header: add "Status: SHIPPED YYYY-MM-DD"
# Edit sprint-NNN-lessons.md header: add "Status: CLOSED YYYY-MM-DD"
# Fill in the "Promoted to memory at sprint end" section of the lessons doc
git add docs/sprint-planning/sprints/sprint-NNN*.md

# 1f. Write the retrospective (internal: what worked / didn't / change)
# docs/sprint-planning/retrospectives/YYYY-MM-DD_sprint-NNN-retro.md
# Follow the TEMPLATE.md in the same dir.
git add docs/sprint-planning/retrospectives/YYYY-MM-DD_sprint-NNN-retro.md

# 1g. Write the review (external-facing: what was delivered)
# docs/sprint-planning/reviews/YYYY-MM-DD_sprint-NNN-review.md
# Follow the 2026-04-10_sprint-040-review.md pattern.
git add docs/sprint-planning/reviews/YYYY-MM-DD_sprint-NNN-review.md

# 1h. ADRs for key sprint decisions (if any)
# docs/adr/NNN-<name>.md, status: Accepted
git add docs/adr/NNN-*.md

# 1i. Single close-out commit bundling the above (or multiple commits if that
#     keeps the history cleaner)
git commit -m "chore(sprint-NNN): retrospective + review + ADRs + milestone closed"
```

### 2. Memory promotions (on disk, not in git)

Write stable lessons learned to `~/.claude/projects/-home-dev-comp-Projects-brickos/memory/`.
These files are NOT in the git repo -- they're Claude's persistent context.

- `project_sprint0NN_completed.md` -- close-out summary + file index
- `feedback_*.md` -- any new stable lessons from the sprint
- `reference_*.md` -- new references for subsystems that shipped
- Update `MEMORY.md` index in the same dir

See `feedback_sprint_close_checklist.md` in the memory dir for the canonical list.

### 3. Push the sprint branch to GitHub

```bash
git push origin sprint-NNN/phase-X
```

### 4. Create the Pull Request

```bash
REVIEW_PATH=docs/sprint-planning/reviews/YYYY-MM-DD_sprint-NNN-review.md
gh pr create \
  --base main \
  --head sprint-NNN/phase-X \
  --title "Sprint NNN: <sprint name>" \
  --body "$(cat <<EOF
Sprint NNN close-out.

## What shipped

See [$REVIEW_PATH]($REVIEW_PATH) for the full scorecard, delivered issues,
and metrics.

## Carry-over to Sprint NNN+1

<list from review>

## Verification

- [ ] cargo clippy --workspace --all-targets -- -D warnings clean
- [ ] cargo fmt --all -- --check clean
- [ ] cargo test --workspace clean
- [ ] npx tsc --noEmit clean (frontend)
- [ ] pnpm build clean (frontend + website)
- [ ] localhost smoke + E2E suite passing

## Related

- Retrospective: docs/sprint-planning/retrospectives/YYYY-MM-DD_sprint-NNN-retro.md
- Design doc: docs/design/NNN-<name>.md
- ADRs: <list any new ADRs>

Closes #<epic or milestone issue if any>
EOF
)"
```

### 5. Review the PR

Even solo, scroll through the GitHub diff view in the browser. This is the
single best pass to catch:
- Accidentally committed secrets (grep the diff for `sk_live_`, `api_key`, etc.)
- Accidentally committed large binary files
- Unexpected files (node_modules/, .next/, build artifacts)
- Pre-commit hooks that should have caught issues but didn't

If something looks wrong, fix it on the branch, push again; the PR updates
automatically.

### 6. Merge the PR

```bash
# Option A: merge commit (preserves branch topology)
gh pr merge --merge

# Option B: fast-forward (linear history, same as the old direct-push flow)
gh pr merge --rebase
# or
gh pr merge --squash   # not recommended for sprint PRs; loses per-issue commits
```

**Recommendation:** `--merge` for sprint PRs so there's a clear "Sprint NNN landed here" merge commit in `main`'s history. `--rebase` is cleaner but harder to audit.

### 7. Push to the GitLab mirror

The mirror does NOT auto-sync -- it's a manual push.

```bash
git fetch origin main
git push gitlab main
```

### 8. Local sync

```bash
git checkout main
git pull origin main
git branch -d sprint-NNN/phase-X   # delete local branch
git push origin :sprint-NNN/phase-X  # optional: delete remote branch
```

### 9. Close the milestone on GitHub

```bash
# Find the milestone number (it's in docs/tracker/milestones/<name>.md frontmatter)
gh api repos/sovereignbrick/brickos/milestones/NN -X PATCH -f state=closed
```

Or wait for the auto-sync cron to detect the `status: closed` in the local
milestone file and flip the GitHub state automatically. The cron usually
catches up within 1-2 fires.

### 10. Announce (optional)

If there are stakeholders to notify, the sprint review doc is the one-stop
link. Paste its markdown into a Slack/Signal message or just link to the
PR.

## What this flow does NOT do

- **Deploy to staging or production.** Merging the PR does NOT trigger a
  deploy. Deploys are always manual via `deploy.sh staging` or
  `deploy.sh production --confirm`. Per ADR-009 (Docker-only development)
  and ADR-039 (Platform Deployment Workflow).
- **Auto-merge or auto-review.** The PR always waits for a manual merge
  action, even with admin bypass. This is intentional.
- **Tag a release.** Release tagging is a separate step handled at the
  deploy time, not at the sprint close.

## When the flow breaks

- **"Changes must be made through a pull request" error on `git push`.**
  You tried to push directly to `main`. That's the rule working. Create a
  PR from your branch instead.
- **"This branch is out of date" on the PR.** `main` moved while your
  sprint was in flight. Rebase or merge `main` into the sprint branch,
  push again, then merge the PR.
- **GitLab mirror diverged.** Someone pushed to GitLab out-of-band. Fix
  the divergence manually; do not force-push without understanding what
  the mirror contains.
- **PR body template gets stale.** Edit this runbook + ADR-048, then
  update the template. Don't leave stale templates lying around.

## References

- ADR-048 (this workflow's rationale)
- ADR-039 (platform deployment workflow -- `deploy.sh` still manual)
- ADR-032 (GitLab backup mirror)
- memory: `feedback_pr_based_sprint_flow.md`
- memory: `feedback_sprint_close_checklist.md`
- memory: `feedback_gitlab_mirror.md`
