# Project Documentation Guide — Sovereign Health Intelligence

**Audience:** New team members, contributors, and AI assistants
**Last updated:** 2026-03-20

---

## What Is This Folder?

`apps/health/sovereign-health/docs/project-files/` is the **project home** — the single source of truth for how we plan, decide, build, release, and audit Sovereign Health Intelligence. Everything in here is Markdown (AI-readable, git-tracked, no binary formats) and organized by purpose, not by date.

```
docs/project-files/
├── PROJECT_DOCUMENTATION_GUIDE.md   ← you are here
├── sprint-planning/                 ← how we plan and track work
│   ├── SPRINT_PLANNING.md           ← process guide (the "how")
│   ├── GITHUB_PROJECT_SETUP.md      ← board setup instructions
│   └── sprints/
│       ├── 000-sprint-NNN-TEMPLATE.md
│       └── sprint-001.md            ← one file per sprint
├── design/                          ← feature specifications
│   ├── 000-TEMPLATE.md
│   ├── 001-oauth-social-login.md
│   ├── 002-data-sovereignty.md
│   ├── ...
│   ├── 009-onboarding-and-learn-content.md
│   └── old-design/                  ← archived specs from pre-monorepo era
├── adr/                             ← architecture decision records
│   └── 000-TEMPLATE.md
├── releases/                        ← release audit artifacts (per version)
│   ├── RELEASE_TEMPLATE.md          ← workflow + artifact templates
│   ├── v0.20.0-rc3/                 ← legacy RC format (pre-0.21.0)
│   │   ├── release-audit.json
│   │   ├── RELEASE_v0.20.0-rc3.md
│   │   ├── testing-report.md
│   │   └── manual-testing-checklist.md
│   └── v0.21.0/                     ← current format: full releases, no RCs
│       ├── release-audit.json
│       ├── RELEASE_v0.21.0.md
│       ├── 2026-03-20_testing-report_v0.21.0.md
│       └── 2026-03-20_manual-testing-checklist_v0.21.0.md
└── reports/                         ← standalone reports (weekly, audits, etc.)
    ├── YYYY-MM-DD_weekly-project-summary.md  ← Fridays only
    └── YYYY-MM-DD_topic-report.md
```

---

## Folder Reference

### `sprint-planning/` — Planning and Tracking Work

**What it is:** Our sprint management system, documented in code rather than locked inside a SaaS tool.

**Key files:**
- **`SPRINT_PLANNING.md`** — The process bible. Describes our sprint model, GitHub Project board setup, naming conventions, and linking rules. Read this first.
- **`GITHUB_PROJECT_SETUP.md`** — Step-by-step guide for configuring the GitHub Projects v2 board (custom fields, views, automations).
- **`sprints/sprint-NNN.md`** — One file per sprint. Contains the goal, planned issues, completed work, carried-over items, velocity metrics, and decisions made during the sprint.

**Sprint model:** Sprints are **named and numbered** (e.g., `Sprint 001 — Go-Live`), not time-boxed. A sprint ends when its goal is met or priorities shift. Each issue belongs to one **milestone** (product theme) and one **sprint** (work batch).

**How to use:**
1. Read `SPRINT_PLANNING.md` to understand the workflow
2. Open the current sprint file (e.g., `sprint-001.md`) to see what's planned and in progress
3. When starting a new sprint, copy `000-sprint-NNN-TEMPLATE.md` and fill it in
4. Update the sprint file as work completes — this is the historical record

---

### `design/` — Feature Specifications

**What it is:** Detailed design documents for features before and during implementation. Each design doc describes **what** we're building and **how**, including data model changes, API endpoints, and UI mockups.

**Naming:** `NNN-kebab-case.md` — sequential number + descriptive name (e.g., `001-oauth-social-login.md`).

**Template fields:**
- **Issue** — links to the GitHub issue(s) this design covers
- **Status** — `Draft` → `In Review` → `Accepted` → `Implemented`
- **Problem** — what problem this solves and why now
- **Approach** — technical strategy and key decisions
- **Data Model** — new tables, columns, migrations
- **API Changes** — new or modified endpoints
- **UI Changes** — affected screens
- **Open Questions** — unresolved decisions (checkboxes)
- **References** — links to ADRs, external resources, related issues

**How to use:**
1. Before building a non-trivial feature, create a design doc from `000-TEMPLATE.md`
2. Use the design doc as the working spec — update it as decisions are made
3. Reference it in PR descriptions and commit messages
4. After implementation, update the status to `Implemented`

**The `old-design/` subfolder** contains specs from the pre-monorepo era (migrated from GitLab). These are kept for historical reference but should not be used as active specs. New work should always use the numbered template format.

**Current design docs:**

| # | Feature | Status |
|---|---------|--------|
| 001 | OAuth social login (Google, Apple) | Draft |
| 002 | Data sovereignty (local vendor mirrors) | Draft |
| 003 | Health Connect (Android) integration | Draft |
| 004 | Anti-nutrient analysis engine | Draft |
| 005 | Extended measurement types | Draft |
| 006 | Allergy tracker | Draft |
| 007 | Symptom journal | Draft |
| 008 | Admin panel rewrite | Draft |
| 009 | Onboarding flow + Learn page content | Ready for content |

---

### `adr/` — Architecture Decision Records

**What it is:** A log of significant architectural and technical decisions. ADRs capture **why** something was decided, not just what. They prevent the team from revisiting the same questions and help new members understand the reasoning behind the codebase.

**When to write an ADR:**
- Choosing between competing libraries or approaches (e.g., `openidconnect` vs `oauth2` crate)
- Changing a fundamental pattern (e.g., switching from REST to gRPC for a service)
- Making a tradeoff that future developers might question (e.g., "why is X done this way?")
- Adopting or dropping a third-party service

**Template fields:**
- **Status** — `Proposed` → `Accepted` → (optionally `Superseded by ADR-NNN` or `Deprecated`)
- **Context** — the situation or problem that prompted the decision
- **Decision** — what was decided and why
- **Alternatives Considered** — what else was evaluated
- **Consequences** — tradeoffs: what becomes easier, what becomes harder

**Key rule: ADRs are immutable.** Once accepted, an ADR is never edited. To change a decision, write a new ADR that supersedes the old one. This preserves the decision history.

**How to use:**
1. When making an architectural choice, copy `000-TEMPLATE.md` to `NNN-kebab-case.md`
2. Fill in Context, Decision, Alternatives, Consequences
3. Reference the ADR from the related design doc or sprint notes
4. If a decision is later reversed, create a new ADR with status `Superseded by ADR-NNN`

---

### `releases/` — Release Audit Artifacts

**What it is:** Versioned folders containing the audit trail for each release. These are the formal records generated during the release process.

**Versioning strategy (since v0.21.0):**
- **No RC tags.** Every version is a full release (e.g., `v0.21.0`, not `v0.21.0-rc1`).
- **Minor bump** (0.21.0 → 0.22.0): sprint releases with new features, migrations, or significant changes.
- **Patch bump** (0.21.0 → 0.21.1): bug fixes, small improvements, dependency updates.
- Deploy to staging first, verify, then promote to production.

**Contents per version folder (4 required artifacts):**
- **`release-audit.json`** — Machine-readable audit: total checks, pass/fail counts, test counts, migrations, key changes.
- **`RELEASE_vX.Y.Z.md`** — Release notes: summary, key changes by category, migrations, issues, audit table, known issues.
- **`YYYY-MM-DD_testing-report_vX.Y.Z.md`** — Test results: backend/frontend suites, change coverage, theme/security audits, docker build status.
- **`YYYY-MM-DD_manual-testing-checklist_vX.Y.Z.md`** — Manual QA checklist: feature tests, regression tests, post-deploy infra checks, sign-off table.

**How to use:**
1. When preparing a release, create a new version folder (e.g., `v0.21.0/`)
2. Follow `RELEASE_TEMPLATE.md` for the full deployment workflow (Phases 1–7)
3. Generate the 4 artifacts, review, fix any failures
4. The completed artifacts serve as the release's permanent audit trail

---

### `reports/` — Standalone Reports

**What it is:** Standalone reports that are not tied to a specific release version. Release-specific testing reports and checklists now live in `releases/vX.Y.Z/` alongside the other release artifacts.

**Naming convention:** Files are prefixed with the date: `YYYY-MM-DD_description.md`

**Report types:**
- **`YYYY-MM-DD_weekly-project-summary.md`** — Weekly project summary. **Generated on Fridays only.** Covers what was shipped, what's in progress, blockers, and next week's priorities.
- **`YYYY-MM-DD_topic-report.md`** — Ad-hoc reports on specific topics (architecture reviews, value propositions, installation guides, etc.)

**How to use:**
1. Weekly summaries are generated every Friday as part of the end-of-week routine
2. Topic reports are created as needed when a deep-dive or audit is warranted
3. Reports are referenced from sprint notes when relevant

---

## User Journey: How to Use These Folders Day-to-Day

### Scenario 1: Starting a new feature

```
1. Check sprint-planning/sprints/sprint-NNN.md
   → Is this feature planned for the current sprint?

2. Create design/NNN-feature-name.md from design/000-TEMPLATE.md
   → Define the problem, approach, data model, API and UI changes

3. If an architectural decision is needed, create adr/NNN-decision.md
   → Document context, decision, alternatives, consequences

4. Implement the feature, referencing the design doc in PRs

5. Update the design doc status to "Implemented"
6. Update the sprint file's "Completed" section
```

### Scenario 2: Preparing a release

```
1. Check sprint-planning/sprints/sprint-NNN.md
   → Are all blockers resolved? What's the velocity?

2. Run pre-deployment checks (Phase 1 in RELEASE_TEMPLATE.md)
   → cargo test, fmt, clippy, pnpm lint/test, theme audit, cargo audit

3. Bump version: bash ops/bump-version.sh X.Y.Z

4. Create releases/vX.Y.Z/ folder with 4 required artifacts:
   → release-audit.json, RELEASE_vX.Y.Z.md,
   → testing-report, manual-testing-checklist

5. Commit, deploy to staging, verify, promote to production
```

### Scenario 3: Onboarding a new team member

```
1. Read this file (PROJECT_DOCUMENTATION_GUIDE.md)
   → Understand the folder structure and purpose of each area

2. Read sprint-planning/SPRINT_PLANNING.md
   → Understand the sprint model, GitHub board setup, conventions

3. Read the current sprint file (sprint-planning/sprints/sprint-NNN.md)
   → See what's actively being worked on

4. Browse design/ docs for features you'll work on
   → Understand the technical approach and open questions

5. Check adr/ for any architectural decisions relevant to your area

6. Review the latest reports/vX.Y.Z-rcN/ for current quality status
```

### Scenario 4: Investigating "why was X built this way?"

```
1. Check adr/ for an architecture decision record
   → ADRs explain the reasoning behind non-obvious choices

2. Check design/NNN-*.md for the feature's design doc
   → Design docs show the intended approach and alternatives considered

3. Check sprint-planning/sprints/ for the sprint where it was built
   → Sprint notes capture context and decisions made during implementation

4. Check the git log and PR history for implementation details
   → git log --grep="#ISSUE_NUMBER"
```

---

## Conventions

### File Naming
- Templates are always `000-TEMPLATE.md`
- Numbered documents use zero-padded sequential IDs: `001-`, `002-`, ...
- Reports use date prefixes: `YYYY-MM-DD_description.md`
- Release folders use semver: `vX.Y.Z/`
- All names are `kebab-case` (lowercase, hyphens)

### Writing Style
- **Markdown only** — no PDFs, Word docs, or proprietary formats
- **Front-load context** — put "what and why" in the first 3 lines of any document
- **Use structured headings** — `## Context`, `## Decision` — both humans and AI scan by heading
- **Cross-reference with relative paths** — `[ADR-002](../adr/002-i18n-strategy.md)`
- **Link to GitHub issues** — `[#42](https://github.com/sovereignbrick/brickos/issues/42)`
- **One topic per file** — smaller files are easier to find, read, and maintain

### Relationship Between Folders

```
  sprint-planning/        design/              adr/
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Sprint NNN   │───→│ Design Doc   │───→│ ADR-NNN      │
  │ "what & when"│    │ "what & how" │    │ "why"        │
  └──────┬───────┘    └──────────────┘    └──────────────┘
         │
         │ sprint completes
         ▼
  releases/               reports/
  ┌──────────────┐    ┌──────────────┐
  │ Audit trail  │    │ Test results │
  │ "proof"      │    │ "evidence"   │
  └──────────────┘    └──────────────┘
```

- **Sprints** reference **design docs** for planned features
- **Design docs** reference **ADRs** for architectural decisions
- **Releases** are generated at the end of a sprint when cutting a version
- **ADRs** are referenced from anywhere — design docs, sprint notes, code comments

### AI-Assisted Workflow

These docs are specifically structured for AI pair programming with Claude Code:

| Folder | How Claude Code uses it |
|--------|------------------------|
| `design/` | Reads the design before implementing — no need to re-explain the approach |
| `adr/` | Understands *why* things are built a certain way, avoids contradicting past decisions |
| `sprint-planning/` | Knows what was recently shipped, what's in progress, what's blocked |
| `releases/` | Uses `RELEASE_TEMPLATE.md` to generate complete release artifact sets |
| `reports/` | Generates weekly summaries (Fridays) and ad-hoc topic reports |

The brainstorming workflow for complex features:
1. Create a design doc with initial thoughts
2. Reference the GitHub issue URL
3. Each conversation, Claude reads the design doc, refines the approach
4. When ready, the design doc becomes the implementation spec
5. After implementation, write an ADR for any architectural decisions made

---

## Quick Reference

| "I want to..." | Go to |
|-----------------|-------|
| See what we're working on right now | `sprint-planning/sprints/sprint-NNN.md` |
| Understand the sprint process | `sprint-planning/SPRINT_PLANNING.md` |
| Set up the GitHub project board | `sprint-planning/GITHUB_PROJECT_SETUP.md` |
| Read or write a feature spec | `design/NNN-feature.md` |
| Record an architecture decision | `adr/NNN-decision.md` |
| Prepare a release | `releases/RELEASE_TEMPLATE.md` |
| Check test results for a release | `releases/vX.Y.Z/` |
| Find old pre-monorepo specs | `design/old-design/old specs/` |
| Start a new document from template | Copy `000-TEMPLATE.md` from the relevant folder |
