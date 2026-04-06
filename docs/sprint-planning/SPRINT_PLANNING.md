# Sprint Planning — BrickOS

How we plan, track, and preserve knowledge for sprints using GitHub + in-repo docs.

## GitHub Setup

### Projects v2 (Sprint Board)

Create **one GitHub Project** at org level (`sovereignbrick`) with these views:

| View | Type | Filter | Purpose |
|------|------|--------|---------|
| Current Sprint | Board | `sprint:@current` | Active work (Backlog → Todo → In Progress → In Review → Done) |
| Backlog | Table | `sprint:none` | Unscheduled work, sorted by priority |
| Roadmap | Roadmap | group by milestone | Timeline view across milestones |

**Custom fields on the Project:**

| Field | Type | Values |
|-------|------|--------|
| Priority | Single select | P0-critical, P1-high, P2-medium, P3-low |
| Points | Number | 1, 2, 3, 5, 8 (Fibonacci) |
| Sprint | Single select | Sprint 001, Sprint 002, ... (ongoing, no fixed duration) |
| Area | Single select | API, Frontend, Platform, Ops, Docs |

### Sprint Model

Sprints are **named and numbered**, not time-boxed:

- **Format:** `Sprint NNN — Name` (e.g., `Sprint 001 — Foundation & Release`)
- **No fixed duration** — a sprint ends when its goal is met or priorities shift
- **Each sprint has a theme/goal** that gives focus without rigid deadlines

### Milestones vs Sprints

- **Milestones** = product themes / feature groups ("Auth Modernization", "AI & Smart Features")
- **Sprints** = named work batches with a goal (`Sprint 001 — Foundation & Release`)

An issue belongs to **one milestone** (what) and **one sprint** (when).

### Automation (Built-in, No Code)

Enable these under Project Settings > Workflows:

1. **Auto-add** — new issues in `sovereignbrick/brickos` auto-added to project
2. **Item closed → Status: Done**
3. **PR merged → Status: Done**
4. **Item reopened → Status: Todo**
5. **Auto-archive** — items in "Done" for 14 days get archived

### Linking Convention

**PR → Issue:** Always use closing keywords in PR body:
```
Closes #42
```

**Branch naming:**
```
feat/42-oauth-google-login
fix/85-stripe-upgrade-button
```

**Commit messages:** Already using conventional commits — append issue number:
```
fix: translate marker names in trends dropdowns (#42)
```

---

## In-Repo Knowledge Preservation

### Directory Structure

```
apps/health/sovereign-health/docs/project-files/
├── sprint-planning/
│   ├── SPRINT_PLANNING.md          <- this file (process guide)
│   ├── sprints/
│   │   ├── 000-sprint-NNN-TEMPLATE.md
│   │   ├── sprint-001.md           <- one file per sprint
│   │   └── sprint-006.md
│   └── retrospectives/
│       ├── TEMPLATE.md
│       ├── 2026-03-21_rc-testing-retro.md  <- after RC testing sessions
│       └── 2026-03-20_sprint-005-retro.md  <- after every sprint
├── design/                         <- feature design docs
│   ├── 000-TEMPLATE.md
│   ├── 001-oauth-social-login.md
│   └── 015-smart-import-tabular-data.md
├── adr/                            <- architecture decisions (019 so far)
│   ├── 000-TEMPLATE.md
│   └── 019-marker-translations-source-of-truth.md
├── deployment/
│   └── README.md                   <- full CI/CD and deployment docs
├── releases/
│   ├── RELEASE_TEMPLATE.md
│   └── v0.23.0/
│       └── RELEASE_v0.23.0.md
└── reports/
    └── 2026-03-21_weekly-project-summary.md  <- weekly (Fridays)
```

### Sprint Summary Template

File: `sprints/sprint-NNN.md`

```markdown
# Sprint NNN — Name

**Started:** YYYY-MM-DD
**Completed:** YYYY-MM-DD (or "ongoing")
**Goal:** One sentence describing the focus.

## Planned
| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| #42 | feat: OAuth Google login | 5 | Auth Modernization |

## Completed
- #42 feat: OAuth Google login (5 pts) — [PR #55](https://github.com/sovereignbrick/brickos/pull/55)

## Carried Over → Sprint NNN+1
- #48 feat: CSV export — blocked on API design decision

## Unplanned Work
- #99 fix: hotfix for login crash (2 pts)

## Velocity
| Metric | Value |
|--------|-------|
| Planned | 15 pts |
| Completed | 13 pts |
| Carried over | 5 pts |
| Unplanned | 2 pts |

## Notes / Decisions
- Decided to use `openidconnect` crate over `oauth2` — see [ADR-003](../../adr/003-oauth-crate-choice.md)
```

### Design Doc Template

File: `design/NNN-kebab-case.md`

```markdown
# Design: Feature Name

**Issue:** [#N](https://github.com/sovereignbrick/brickos/issues/N)
**Status:** Draft | In Review | Accepted | Implemented
**Date:** YYYY-MM-DD

## Problem
What problem does this solve? Why now?

## Approach
How will we solve it? Key technical decisions.

## Data Model
New tables, columns, or schema changes.

## API Changes
New or modified endpoints.

## UI Changes
Screens affected, wireframe links if any.

## Open Questions
- [ ] Question 1?

## References
- [ADR-NNN](../adr/NNN-relevant-decision.md)
```

### ADR Template

File: `adr/NNN-kebab-case.md`

```markdown
# ADR-NNN: Decision Title

**Status:** Proposed | Accepted | Superseded by ADR-NNN | Deprecated
**Date:** YYYY-MM-DD

## Context
What situation or problem prompted this decision?

## Decision
What did we decide and why?

## Alternatives Considered
- **Alternative A:** ...
- **Alternative B:** ...

## Consequences
What becomes easier? What becomes harder? What are the tradeoffs?
```

**Rule:** ADRs are immutable. To change a decision, write a new ADR that supersedes the old one.

---

## Why In-Repo Docs Matter (Especially with AI)

### For Claude / AI Assistants

| What to store | Why it helps |
|---------------|-------------|
| **Design docs** | Claude reads the design before implementing — no need to re-explain the approach every conversation |
| **ADRs** | Claude understands *why* things are built a certain way, avoids contradicting past decisions |
| **Sprint summaries** | Claude knows what was recently shipped, what's in progress, what's blocked |
| **CLAUDE.md** | Already in use — conventions, commands, structure |

### Best Practices for AI-Readable Docs

1. **Markdown only** — no PDFs, no Word docs, no binary formats
2. **Front-load context** — put "what and why" in the first 3 lines
3. **Use structured headings** — `## Context`, `## Decision` — AI scans by heading
4. **Cross-reference with relative paths** — `[ADR-002](../adr/002-i18n-strategy.md)`
5. **Link to GitHub issues** — full URLs: `https://github.com/sovereignbrick/brickos/issues/42`
6. **One topic per file** — smaller files = AI reads exactly what it needs
7. **Consistent naming** — predictable `NNN-kebab-case.md` patterns

### Brainstorming Workflow

For features that need extended thinking across multiple conversations:

1. Create a **design doc** in `docs/design/NNN-feature.md` with initial thoughts
2. Reference the **GitHub issue** URL — clickable for both humans and Claude
3. Each conversation, Claude reads the design doc, adds to it, saves progress
4. When ready, the design doc becomes the implementation spec
5. After implementation, write an ADR for any architectural decisions made

---

## Sprint Workflow (Solo Dev)

### Planning a Sprint

1. Pick a theme/goal from the backlog and milestones
2. **Scope check:** max ~25 pts for single-day sprints; feature work needs multi-day
3. Create `sprints/sprint-NNN.md` with the goal and planned issues
4. Assign the sprint label/field on the GitHub Project board
5. Run `cargo fmt` as a separate commit before sprint work

### During a Sprint

- Move items on the board (Todo -> In Progress -> In Review -> Done)
- Link PRs to issues with `Closes #N`
- Update design docs as decisions are made
- Run `pnpm build` locally before committing frontend changes (catches TS errors)

### Closing a Sprint

1. Complete the sprint summary in `sprints/sprint-NNN.md`
2. Move unfinished items to next sprint or back to backlog
3. Note velocity and decisions
4. Write retrospective in `retrospectives/YYYY-MM-DD_sprint-NNN-retro.md`

### RC Testing & Release

1. Deploy to staging: `bash ops/deploy.sh staging`
2. Walk through manual testing checklist (18 sections)
3. Fix issues found, redeploy, re-test
4. Write release notes in `releases/vX.Y.Z/RELEASE_vX.Y.Z.md`
5. Write RC testing retrospective
6. Promote to production (see `deployment/README.md` Phase 7)
7. Weekly report on Fridays in `reports/`

### Retrospective (after every sprint)

- What went well? What didn't? What to change?
- Save in `retrospectives/YYYY-MM-DD_sprint-NNN-retro.md`
- Also write a retro after RC testing sessions if significant issues found

### Documentation Checklist (end of sprint)

- [ ] Sprint summary updated (`sprints/sprint-NNN.md`)
- [ ] Retrospective written (`retrospectives/`)
- [ ] ADRs for any architectural decisions (`adr/`)
- [ ] Release notes (`releases/vX.Y.Z/`)
- [ ] Weekly report if Friday (`reports/`)
- [ ] Deployment docs updated if process changed (`deployment/README.md`)

---

## Quick Reference

| Action | Where |
|--------|-------|
| Create/prioritize work | GitHub Issues |
| Group by product theme | GitHub Milestones |
| Plan a sprint | GitHub Project → Sprint field + `sprints/sprint-NNN.md` |
| Track daily progress | GitHub Project → Board view |
| Record a decision | `docs/adr/NNN-title.md` |
| Design a feature | `docs/design/NNN-title.md` |
| Summarize a sprint | `docs/sprint-planning/sprints/sprint-NNN.md` |
| Preserve for AI context | All of the above (markdown, structured, cross-linked) |
