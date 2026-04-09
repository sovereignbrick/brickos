---
number: 408
title: "feat: Project CRUD endpoints + frontend pages"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, feature]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [404, 405]
---

Implement full CRUD for projects with contact assignment (API + frontend).

## API Endpoints

- `GET    /api/v1/projects`                          -- list (paginated)
- `POST   /api/v1/projects`                          -- create
- `GET    /api/v1/projects/:id`                      -- detail (includes assigned contacts)
- `PUT    /api/v1/projects/:id`                      -- update
- `DELETE /api/v1/projects/:id`                      -- delete
- `POST   /api/v1/projects/:id/contacts`             -- assign contact `{ contact_id }`
- `DELETE /api/v1/projects/:id/contacts/:contact_id` -- unassign contact

## Frontend Pages

- `/crm/projects` -- project list with color indicators
- `/crm/projects/[id]` -- project detail with assigned contacts
- `/crm/projects/new` -- create form (name, description, color picker)
- `/crm/projects/[id]/edit` -- edit form
- Contact assignment UI: search + add from project detail page

## Requirements

- Color-coded project indicators in lists and contact detail
- Notes field encrypted
- Org-scoped queries
- Update search_index on mutations
- Dark theme, useContent()

## Acceptance Criteria

- Create project with color -> color shows in list
- Assign contact to project -> contact appears on project detail
- Unassign contact -> removed from project, contact not deleted
- Delete project -> contact assignments removed, contacts preserved
