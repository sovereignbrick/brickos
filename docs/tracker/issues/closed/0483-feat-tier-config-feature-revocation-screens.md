---
number: 483
github_number: 424
title: "feat: tier config / feature registry / revocation list screens (read-only)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui]
created: 2026-04-10
priority: P2
sprint: 040
phase: D
design: 022
estimate: 0.75d
blocked_by: [466]
---

Three small read-only admin screens that surface the licensing data model.

## Scope -- Tier configuration screen

- [ ] Route: `/admin/tiers`
- [ ] Read-only view of all tier_definitions
- [ ] For each tier: included features grouped by category, with limit values
- [ ] No edit affordance in this sprint (editing tiers requires super_admin + confirmation; deferred to a follow-up sprint)

## Scope -- Feature registry screen

- [ ] Route: `/admin/features`
- [ ] Read-only list of all entries in feature_registry
- [ ] Grouped by app namespace (`shi.*`, `crm.*`, `link.*`, `branding.*`, `support.*`)
- [ ] Columns: slug, app, category, name (EN + DE), is_active

## Scope -- Revocation list

- [ ] Route: `/admin/licenses/revocations`
- [ ] List of revoked org_licenses with: jti, org_name, revoked_at, reason, "Restore" button
- [ ] Restore action: clear `revoked_at`, remove from `org_licenses_revoked`

## Verification

- [ ] All three screens load
- [ ] Restore actually un-revokes a test license

## References

- design 022 §7.2 Screens 5, 6, 7
