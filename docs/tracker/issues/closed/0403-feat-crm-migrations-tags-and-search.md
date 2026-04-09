---
number: 403
title: "feat: CRM migrations -- tags, taggings, search_index"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, database]
created: 2026-04-08
sprint: 036
points: 2
blocked_by: [390]
---

Create SQLx migrations for the tagging and full-text search tables.

## Tables

- `crm_tags` -- first-class tag objects (org-scoped, name, color, usage_count)
- `crm_taggings` -- polymorphic tag assignments (tag_id, entity_type, entity_id)
- `crm_search_index` -- tsvector full-text search (SHI pattern, bilingual EN/DE)

## Key Indexes

- `GIN(tsv_document)` on search_index for full-text search
- `(org_id, entity_type)` on search_index for scoped queries
- `(entity_type, entity_id)` on taggings for reverse lookups
- `UNIQUE(org_id, name)` on tags

## Acceptance Criteria

- Migrations run cleanly after 001_core_tables.sql
- tsvector index created and functional
- Tag uniqueness enforced per org
