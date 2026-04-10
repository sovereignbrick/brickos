---
number: 482
github_number: 423
title: "feat: platform admin Users list + detail + admin override + dormant accounts review"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui]
created: 2026-04-10
priority: P1
sprint: 040
phase: D
design: 022
estimate: 1.25d
blocked_by: [469, 475]
---

The user-side admin GUI: list, detail, override, dormant cohort.

## Scope -- Users list

- [ ] Route: `/admin/users`
- [ ] Columns: Email, Tier, Source (Stripe / Strike / admin_override / grace), Status, Last active, Org memberships
- [ ] Filters: tier, payment_method, status, last_active range, **dormant**
- [ ] Sort by any column
- [ ] Search by email
- [ ] Bulk action: send re-engagement email

## Scope -- User detail

- [ ] Tabs: Overview, License, Activity, Payments
- [ ] **License tab:**
  - Current tier card
  - Source indicator (Stripe / Strike / admin_override / grace)
  - "Admin override" panel: dropdown to pick a tier, optional expires_at picker, notes textarea, "Apply" button
  - Override applies via PUT /platform/admin/users/{id}/license, sets `admin_override_tier_slug` + `admin_override_expires_at`
  - Audit log entry written automatically
  - "Clear override" button
- [ ] Payment history list

## Scope -- Dormant accounts review

- [ ] Route: `/admin/users/dormant`
- [ ] Filtered list of users with `lifecycle_status = 'dormant'`
- [ ] Columns: email, tier (always glimpse here), last_active, account_age, member_of_orgs
- [ ] Bulk actions: send re-engagement email (uses #476), schedule for manual deletion (sets a flag, does NOT actually delete per locked decision)
- [ ] Reset to 'active' on user activity (handled in middleware)

## Verification

- [ ] List loads, filters work
- [ ] Apply admin override → user effective tier changes
- [ ] Override expires → user reverts to Stripe tier
- [ ] Dormant list shows test fixture user
- [ ] Bulk re-engagement sends real email

## References

- design 022 §7.2 Screens 3-4, Screen 8
