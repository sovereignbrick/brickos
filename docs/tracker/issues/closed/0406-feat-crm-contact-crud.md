---
number: 406
github_number: 528
title: "feat: Contact CRUD endpoints + frontend pages"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, feature]
created: 2026-04-08
sprint: 036
points: 5
blocked_by: [404, 405]
---

Implement full CRUD for contacts (API + frontend).

## API Endpoints

- `GET    /api/v1/contacts`       -- list (paginated, sortable by name/last_seen/interaction_count, filterable by tags)
- `POST   /api/v1/contacts`       -- create (validate email uniqueness per org)
- `GET    /api/v1/contacts/:id`   -- detail (includes companies via junction, tags)
- `PUT    /api/v1/contacts/:id`   -- update
- `DELETE /api/v1/contacts/:id`   -- delete (cascade taggings)

## Frontend Pages

- `/crm/contacts` -- contact list (card grid, sortable, tag filter bar)
- `/crm/contacts/[id]` -- contact detail (name, role, companies, tags, notes)
- `/crm/contacts/new` -- create form
- `/crm/contacts/[id]/edit` -- edit form

## Requirements

- All PII fields encrypted/decrypted via brickos-crypto
- Org-scoped (filter by auth.org_id)
- Update `crm_search_index` on create/update/delete
- Dark theme, no white backgrounds
- All strings via useContent() (EN + DE)

## Acceptance Criteria

- Create contact -> appears in list -> detail page shows all fields
- Edit contact -> changes persisted and encrypted
- Delete contact -> removed from list, taggings cascade deleted
- Search index updated on every mutation
