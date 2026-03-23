# BrickOS Issue Tracker (Local-First)

Sovereign issue tracking that works offline and syncs to GitHub when API access is restored.

## Why

GitHub's API rate limits can block us from managing our own issues. This local tracker ensures we can always plan, track, and close work — then sync back when the API is available.

## Structure

```
docs/tracker/
├── README.md              # This file
├── milestones/            # One file per milestone (logical grouping)
│   └── _archive/          # Closed milestones
├── issues/
│   ├── open/              # Active issues (NNNN-slug.md)
│   └── closed/            # Completed issues
└── sync/
    ├── last-sync.json     # Sync state for diffing
    └── sync.sh            # Push/pull script (gh api REST)
```

## File Format

### Issue (`issues/open/0185-feature-name.md`)

```yaml
---
github_number: 185
title: "Issue title"
milestone: milestone-slug
labels: [feat, backend]
points: 5
---

## Description
What needs to be done.
```

### Milestone (`milestones/milestone-slug.md`)

```yaml
---
github_number: 12
title: "Milestone Title"
state: open
---

## Description
What this milestone groups.

## Issues
- #0185 feature-name
- #0186 other-feature
```

## Workflow

### Create an issue
1. Add file in `issues/open/NNNN-slug.md`
2. Reference it in the appropriate milestone file

### Close an issue
```bash
git mv docs/tracker/issues/open/0185-slug.md docs/tracker/issues/closed/
```

### Board view
```bash
# All open issues
ls docs/tracker/issues/open/

# Open issues for a milestone
grep -rl "milestone: health-intelligence" docs/tracker/issues/open/

# Count by milestone
grep -rh "^milestone:" docs/tracker/issues/open/ | sort | uniq -c | sort -rn
```

### Sync to GitHub
```bash
bash docs/tracker/sync/sync.sh push   # Create/update issues on GitHub
bash docs/tracker/sync/sync.sh pull   # Fetch latest state from GitHub
bash docs/tracker/sync/sync.sh status # Show what's changed since last sync
```

## Conventions

- Issue numbers are zero-padded to 4 digits: `0185`
- Slugs use kebab-case derived from the title
- `git mv` to close (directory = status)
- Frontmatter is the sync contract — maps 1:1 to GitHub API fields
- Git history = audit trail
