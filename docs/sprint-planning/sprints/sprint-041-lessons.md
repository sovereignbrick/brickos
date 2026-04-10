# Sprint 041 -- Lessons Learned (Live Document)

This file is updated **continuously** during the sprint. After each phase, write a brief retro entry. At sprint end, stable lessons get promoted to `~/.claude/projects/-home-dev-comp-Projects-brickos/memory/` per the auto-memory protocol and `feedback_sprint_close_checklist.md`.

**Format:** newest entries at the top. Each entry has a date, phase, and one of: `lesson`, `decision`, `blocker`, `daily-note`, `bug-found`, `feature-request`.

---

## Sprint kickoff -- 2026-04-11

**Type:** daily-note
**Phase:** pre-A

Sprint 041 planned 2026-04-10 after Sprint 040 close-out. Theme: staging quality gate driven by a realistic Life Algorithm customer walkthrough.

Critical constraints set:
- No production unless zero doubt after staging bake
- Many small issues, not a few big ones
- PR-based flow per ADR-048 (first real-code dogfood)
- Manual + automated tests interleave

Kickoff checklist complete:
- [x] Milestone file: `docs/tracker/milestones/sprint-041-staging-quality.md`
- [x] Sprint doc: `docs/sprint-planning/sprints/sprint-041.md`
- [x] Lessons doc (this file): bootstrapped
- [x] 30 issue files bootstrapped in `docs/tracker/issues/open/0492-*` through `0521-*`
- [ ] Auto-sync cron will push new issues to GitHub over next hour or two

Next: user picks the first manual test, Claude claims first automated test. Work begins Phase A.

---

## Lessons template (use this format for new entries)

```
## YYYY-MM-DD -- Phase X -- short title

**Type:** lesson | decision | blocker | daily-note | bug-found | feature-request
**Phase:** A | B | C | D | E | F | G | H | I

What happened.

**Why it matters:** ...
**How to apply:** ...
**Follow-up:** memory file to update / new memory to create / sprint doc edit / bug issue to file / feature request to file
```

---

## Promoted to memory at sprint end

(populated at close-out per `feedback_sprint_close_checklist.md`)

---

## Pre-sprint baseline (for reference)

- Main at `bed42f0` (Sprint 040 close-out hotfix + PR #547 merged)
- Branch protection: PR-based flow per ADR-048 (first sprint to enforce)
- Carry-over issues: #490 (dead code cleanup), #491 (two-pool E2E env)
- Dependabot: 6 high vulnerabilities flagged on origin/main (to triage in Phase H)
- Sprint 040 verification state: 7/7 localhost Playwright smoke passing, backend boot clean, all admin endpoints authenticated successfully
- Known pre-existing migration bug: `20260407000002_reassign_demo_profile_measurements.sql` blocks clean auto-migration on single-DB local dev -- this is exactly what Phase B (#491) fixes
