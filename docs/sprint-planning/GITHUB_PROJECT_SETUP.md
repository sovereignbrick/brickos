# GitHub Project Board — Setup Guide

The `gh` CLI token is missing `project` + `read:project` scopes. Follow these steps to create the board manually.

## Step 1: Update Token Scopes

Go to https://github.com/settings/tokens and add scopes:
- `project` (read/write)
- `read:project`

Then run: `gh auth refresh -h github.com -s project,read:project`

## Step 2: Create the Project

Go to https://github.com/orgs/sovereignbrick/projects → **New project** → **Board**

- **Name:** BrickOS Sprint Board
- **Visibility:** Private (org only)

## Step 3: Add Custom Fields

Under Project Settings → Custom fields, add:

| Field | Type | Options |
|-------|------|---------|
| Priority | Single select | `P0-critical`, `P1-high`, `P2-medium`, `P3-low` |
| Points | Number | (no options, free number) |
| Sprint | Single select | `Sprint 001`, `Sprint 002`, ... (add as you go) |
| Area | Single select | `API`, `Frontend`, `Platform`, `Ops`, `Docs` |

> **Note:** Using Single select for Sprint (not Iteration) because we use named, non-time-boxed sprints.

## Step 4: Create Views

### View 1: Current Sprint (Board)
- Type: **Board**
- Filter: `sprint:"Sprint 001"` (update per sprint)
- Columns: Backlog, Todo, In Progress, In Review, Done
- Group by: Status

### View 2: Backlog (Table)
- Type: **Table**
- Filter: no sprint assigned
- Sort by: Priority, then Milestone
- Visible columns: Title, Priority, Points, Milestone, Area, Labels

### View 3: Roadmap
- Type: **Roadmap** (or Table grouped by Milestone)
- Group by: Milestone
- Sort by: Priority

## Step 5: Enable Automations

Under Project Settings → Workflows:

- [x] **Auto-add to project** — repo: `sovereignbrick/brickos`
- [x] **Item closed** → Set status to "Done"
- [x] **Pull request merged** → Set status to "Done"
- [x] **Item reopened** → Set status to "Todo"
- [x] **Auto-archive items** → After 14 days in "Done"

## Step 6: Add Existing Issues

After creating the project, bulk-add all open issues:

```bash
# Once token scopes are updated:
gh project item-add PROJECT_NUMBER --owner sovereignbrick --url https://github.com/sovereignbrick/brickos/issues/ISSUE_NUMBER
```

Or use the web UI: Project → **+ Add item** → search for issues.
