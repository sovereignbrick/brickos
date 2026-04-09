---
number: 402
title: "feat: CRM migrations -- contacts, companies, projects, contact_company"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, database]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [390]
---

Create initial SQLx migrations for the core CRM entity tables in the `scr` database.

## Tables

- `crm_contacts` -- people (email, name, phone, role, notes, lead_stage, interaction_count)
- `crm_companies` -- organizations by domain (name, domain, website, notes)
- `crm_projects` -- user-created groupings (name, description, color, notes)
- `crm_contact_company` -- M:N junction with role history (role_title, is_primary, started_at, ended_at)

## Conventions

- All tables use `IF NOT EXISTS` (per CLAUDE.md)
- UUID primary keys via `gen_random_uuid()`
- `org_id UUID NOT NULL` on all entity tables (org-scoping, no FK to platform DB)
- PII fields (email, phone, notes) stored as encrypted text (`v1:{iv}:{ciphertext}`)
- `created_at` + `updated_at` TIMESTAMPTZ on all tables
- Indexes on `org_id` for all entity tables

## Acceptance Criteria

- `sqlx migrate run` succeeds against `scr` database
- All tables created with correct columns and constraints
- UNIQUE(org_id, domain) on crm_companies
