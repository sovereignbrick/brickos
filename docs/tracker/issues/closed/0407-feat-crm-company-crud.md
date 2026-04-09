---
number: 407
title: "feat: Company CRUD endpoints + frontend pages"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, feature]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [404, 405]
---

Implement full CRUD for companies (API + frontend).

## API Endpoints

- `GET    /api/v1/companies`       -- list (paginated, sortable)
- `POST   /api/v1/companies`       -- create (unique domain per org)
- `GET    /api/v1/companies/:id`   -- detail (includes member contacts via junction)
- `PUT    /api/v1/companies/:id`   -- update
- `DELETE /api/v1/companies/:id`   -- delete

## Frontend Pages

- `/crm/companies` -- company list (sortable, tag filter)
- `/crm/companies/[id]` -- company detail with member contacts list
- `/crm/companies/new` -- create form
- `/crm/companies/[id]/edit` -- edit form

## Requirements

- Notes field encrypted via brickos-crypto
- Org-scoped queries
- Company detail shows all linked contacts (via crm_contact_company)
- Update search_index on mutations
- Dark theme, useContent() for all strings

## Acceptance Criteria

- Create company with domain -> unique per org enforced
- Company detail shows linked contacts with roles
- Delete company -> taggings cascade, contact links removed
