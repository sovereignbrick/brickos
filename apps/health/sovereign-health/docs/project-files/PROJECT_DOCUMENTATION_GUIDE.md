# Project Documentation Guide — Sovereign Health Intelligence

**Audience:** New team members, contributors, and AI assistants
**Last updated:** 2026-03-18

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
│   ├── v0.20.0-rc1/
│   │   ├── release-audit.json       ← machine-readable audit results
│   │   ├── gdpr-audit.json          ← GDPR compliance data
│   │   ├── gdpr-audit-report.md     ← human-readable GDPR report
│   │   ├── testing-report.md        ← test results snapshot
│   │   ├── tier-matrix-audit.md     ← license tier feature audit
│   │   ├── user-role-model-report.md
│   │   └── RELEASE_TEMPLATE.md      ← reusable prompt for generating release artifacts
│   ├── v1.0.0-rc1/
│   └── v1.0.0-rc2/
└── reports/                         ← per-RC testing and QA reports
    ├── v0.20.0-rc1/
    │   ├── RELEASE_v0.20.0-rc1.md   ← release notes
    │   ├── 2026-03-16_testing_report_v0.20.0-rc1.md
    │   └── 2026-03-16_gdpr-audit-report_v0.20.0-rc1.md
    └── v0.20.0-rc2/
        ├── RELEASE_v0.20.0-rc2.md
        ├── 2026-03-17_testing-report_v0.20.0-rc2.md
        └── 2026-03-17_manual-testing-checklist_v0.20.0-rc2.md
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

**Contents per version folder:**
- **`release-audit.json`** — Machine-readable audit: total checks, pass/fail counts, severity breakdown, test counts. Used for tracking quality trends across releases.
- **`release-audit.md`** — Human-readable security and quality audit (when generated): executive summary, critical/high/medium/low findings, and their fixes.
- **`gdpr-audit.json` / `gdpr-audit-report.md`** — GDPR Article 30 compliance records: processing activities, legal bases, sub-processors, data subject rights. Required for EU data protection compliance.
- **`testing-report.md`** — Test pyramid snapshot: unit, integration, property, DB, and E2E test results.
- **`tier-matrix-audit.md`** — Verifies that license tier features (Free, Focus, Focus+, Horizon) are correctly gated.
- **`user-role-model-report.md`** — Documents the user/admin/demo role permissions model.
- **`RELEASE_TEMPLATE.md`** — A reusable prompt template: paste version parameters, hand to Claude Code, and it generates all release artifacts (release notes, CHANGELOG, GDPR record, security report, version bumps, git tag, deploy commands, smoke test checklist).

**How to use:**
1. When preparing a release, create a new version folder (e.g., `v0.21.0-rc1/`)
2. Copy `RELEASE_TEMPLATE.md` from a previous release, update the parameters
3. Run the template through Claude Code to generate all artifacts
4. Review the generated audit results, fix any failures, re-run until clean
5. The completed artifacts serve as the release's permanent audit trail

---

### `reports/` — Per-RC Testing and QA Reports

**What it is:** Detailed testing reports and release notes for each release candidate (RC). While `releases/` holds formal audit artifacts, `reports/` holds the narrative: what was tested, what passed, what was manually verified.

**Naming convention:** Files are prefixed with the date: `YYYY-MM-DD_description_version.md`

**Typical contents:**
- **`RELEASE_vX.Y.Z-rcN.md`** — Full release notes: what's new, what was fixed, infrastructure changes, migration list.
- **`YYYY-MM-DD_testing-report_vX.Y.Z-rcN.md`** — Automated test results: test counts, pass rates, test pyramid visualization, per-suite breakdown.
- **`YYYY-MM-DD_manual-testing-checklist_vX.Y.Z-rcN.md`** — Manual QA checklist: browser testing, mobile responsiveness, i18n verification, payment flows.
- **`YYYY-MM-DD_gdpr-audit-report_vX.Y.Z-rcN.md`** — GDPR compliance check for that specific RC.

**How to use:**
1. After building an RC, run automated tests and generate the testing report
2. Walk through the manual testing checklist on staging
3. Document any issues found and their fixes
4. These reports are referenced in the sprint summary when closing a sprint

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

2. Create releases/vX.Y.Z-rcN/ folder
   → Copy and fill in RELEASE_TEMPLATE.md with version parameters
   → Generate audit artifacts (release-audit.json, gdpr-audit, etc.)

3. Create reports/vX.Y.Z-rcN/ folder
   → Run tests → write testing report
   → Walk manual checklist → write manual testing report
   → Generate release notes (RELEASE_vX.Y.Z-rcN.md)

4. Fix any audit failures, re-generate until clean

5. Deploy using ops/deploy.sh, run smoke tests
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
- Release folders use semver: `vX.Y.Z-rcN/`
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
- **Releases** and **reports** are generated at the end of a sprint when cutting an RC
- **ADRs** are referenced from anywhere — design docs, sprint notes, code comments

### AI-Assisted Workflow

These docs are specifically structured for AI pair programming with Claude Code:

| Folder | How Claude Code uses it |
|--------|------------------------|
| `design/` | Reads the design before implementing — no need to re-explain the approach |
| `adr/` | Understands *why* things are built a certain way, avoids contradicting past decisions |
| `sprint-planning/` | Knows what was recently shipped, what's in progress, what's blocked |
| `releases/` | Uses `RELEASE_TEMPLATE.md` to generate complete release artifact sets |
| `reports/` | Generates testing reports and manual checklists automatically |

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
| Prepare a release | `releases/vX.Y.Z-rcN/RELEASE_TEMPLATE.md` |
| Check test results for an RC | `reports/vX.Y.Z-rcN/` |
| Find old pre-monorepo specs | `design/old-design/old specs/` |
| Start a new document from template | Copy `000-TEMPLATE.md` from the relevant folder |
