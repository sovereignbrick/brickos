---
number: 468
github_number: 409
title: "feat: active vs preserved markers (schema + read path + UI picker)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature, ux]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 2.5d
blocked_by: [467]
---

Implements the locked decision: Glimpse users get 10 active markers of their choice; preserved markers are visible read-only with full history.

## Scope -- backend

- [ ] Add `user_markers.is_active` BOOLEAN NOT NULL DEFAULT true
- [ ] **Migration safety (M7):** set `is_active=true` for ALL existing rows. No user is silently demoted.
- [ ] Update `check_marker_access`: active markers full read/write; preserved markers read-only (allow GET, deny POST/PUT/DELETE for new measurements)
- [ ] New endpoint: `PUT /api/v1/markers/{id}/active` to swap active state (with seat cap enforcement)
- [ ] Read path returns `is_active` field on marker objects
- [ ] Cap enforcement: cannot activate an 11th marker on Glimpse without deactivating one first
- [ ] Snapshot tests updated for new field

## Scope -- frontend

- [ ] "Preserved markers" section in markers list page (dimmed, with "Activate" button when within seat cap)
- [ ] Marker picker UI: 10 slots for active markers, drag-drop or click-to-swap
- [ ] Read-only history view for preserved markers (charts render but no entry form)
- [ ] Upgrade CTA: "You have N preserved markers -- upgrade to Focus to activate all"
- [ ] i18n strings (EN + DE)

## Verification

- [ ] Existing user with 50 markers pre-migration sees all 50 as active (no demotion)
- [ ] New Glimpse signup can pick any 10 markers
- [ ] Activating an 11th marker prompts to deactivate one
- [ ] Preserved marker page shows charts but no entry form
- [ ] Snapshot tests reviewed and committed

## References

- design 022 §2.2, §13.5 M7
