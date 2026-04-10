---
number: 463
github_number: 404
title: "chore: roles 5→3 migration + seed canonical tier data (Glimpse=10, calc unlimited)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-a, migration, breaking-change]
created: 2026-04-10
priority: P0
sprint: 040
phase: A
design: 022
estimate: 0.75d
---

Two coupled changes that close out Phase A:
1. Consolidate org_members roles from 5 (`owner`, `tech_admin`, `commercial_admin`, `editor`, `consumer`) to 3 (`org_owner`, `practitioner`, `member`)
2. Seed canonical tier definitions and tier_features rows -- Glimpse 10 markers, calculated markers unlimited for all tiers, no hardcoding

## Scope -- roles

- [ ] **Code first, schema second** (per M8). Update 7 files with role string literals: `middleware/auth.rs`, `public_chat.rs`, `payment_gateways.rs`, `services/licensing.rs`, `doctor_chat.rs`, `admin_orgs.rs`, `services/doctor_chat.rs`. Replace `"owner"` -> `"org_owner"`, `"editor"` -> `"practitioner"`, `"consumer"` -> `"member"`. `tech_admin` and `commercial_admin` collapse to `org_owner`.
- [ ] Run all SHI tests after code edit, before schema migration
- [ ] Schema migration: `UPDATE org_members SET role = 'org_owner' WHERE role IN ('owner', 'tech_admin', 'commercial_admin')`, etc.
- [ ] Add CHECK constraint: `role IN ('org_owner', 'practitioner', 'member')`
- [ ] `organizations.branding` JSONB: add `role_labels` key support (optional override per org)

## Scope -- tier seed

- [ ] Seed `tier_definitions`: glimpse, focus, insight, clarity, horizon, core
- [ ] Seed `feature_registry` with all current SHI features under `shi.*` namespace + cross-app `branding.*` and `support.*`
- [ ] Seed `tier_features` with the canonical limits from design 022 §2.2:
  - Glimpse: 10 active markers, 30d history, 3/mo AI chat, 1 template, calc unlimited
  - Focus: 75 markers, unlimited history, 5/mo chat, 3 templates, csv/json export
  - Insight: 200 markers, 15/mo chat, 5 templates, lifestyle/body/supplement
  - Clarity: unlimited everything, cohort, api_access
  - Horizon: unlimited + white-label, multi-user, dedicated support
  - Core: unlimited everything (self-hosted)
- [ ] Drop legacy boolean columns from `license_tiers` (or leave dead with comment for one sprint, then drop)
- [ ] Drop `max_calculated_markers` -- calculated markers are unlimited per locked decision

## Verification

- [ ] All SHI tests green after roles edit
- [ ] All SHI tests green after schema migration
- [ ] `SELECT DISTINCT role FROM org_members` returns only the 3 new roles
- [ ] `SELECT COUNT(*) FROM tier_features WHERE tier_slug='glimpse'` matches expected feature count

## References

- design 022 §3.2, §2.2, §13.5 M8
- Memory: `feedback_no_hardcoded_values.md`
