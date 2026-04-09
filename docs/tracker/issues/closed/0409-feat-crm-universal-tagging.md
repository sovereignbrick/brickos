---
number: 409
title: "feat: Universal tagging system (API + UI)"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, feature]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [406, 407, 408]
---

Implement the universal tagging system from Design 017 section 3.3.

## API Endpoints

- `GET    /api/v1/tags`               -- list all org tags with usage counts
- `POST   /api/v1/tags`               -- create tag (auto-lowercase, trim)
- `DELETE /api/v1/tags/:id`           -- delete tag (cascades all taggings)
- `POST   /api/v1/tags/:id/assign`    -- `{ entity_type, entity_id }` assign tag to entity
- `DELETE /api/v1/tags/:id/unassign`  -- `{ entity_type, entity_id }` remove tag

## Entity Types

Tags can be assigned to: `contact`, `company`, `project`
(Future: `interaction`, `meeting`, `capture`)

## Frontend Components

- Tag cloud view: all tags with usage count + color
- Tag filter bar: on contacts, companies, projects list pages (`?tags=vip,partner`)
- Inline tag editor: add/remove tags directly on entity detail pages
- Tag creation: inline from tag editor (type new name -> create)

## Query Pattern

All list endpoints support `?tags=vip,partner` query param:
```sql
SELECT c.* FROM crm_contacts c
JOIN crm_taggings t ON t.entity_type = 'contact' AND t.entity_id = c.id
JOIN crm_tags tg ON tg.id = t.tag_id
WHERE c.org_id = $1 AND tg.name = ANY($2)
GROUP BY c.id
HAVING COUNT(DISTINCT tg.name) = $3  -- AND logic: must match all tags
```

## Acceptance Criteria

- Create tag -> appears in tag cloud with count 0
- Assign tag to contact -> tag cloud count increments
- Filter contacts by tag -> only tagged contacts shown
- Delete tag -> all assignments removed, entities preserved
- Tags are org-scoped (org A's tags invisible to org B)
