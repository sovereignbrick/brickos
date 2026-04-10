---
number: 477
github_number: 418
title: "feat: platform admin Orgs list view + filters + bulk actions"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui]
created: 2026-04-10
priority: P1
sprint: 040
phase: D
design: 022
estimate: 1d
blocked_by: [466]
---

First admin GUI screen at `platform.brickos.io/admin/orgs`.

## Scope

- [ ] Route + page shell
- [ ] Table columns: Name, Type, Tier, Members (current/max), Expires, Status, MRR, Stripe customer
- [ ] Filters: Type (clinic/enterprise/family/individual), Status (active/grace/expired/revoked), Expires within (7/30/90 days)
- [ ] Sort by any column
- [ ] Bulk actions: Export CSV, Send renewal reminder
- [ ] Pagination (50 per page)
- [ ] Search by name or billing_email
- [ ] i18n (EN + DE)

## API endpoint

- [ ] `GET /platform/admin/orgs?status=&type=&expires_within=&q=&page=&per_page=`
- [ ] Returns paginated list with summary fields

## Verification

- [ ] Loads all orgs in staging
- [ ] Filters work (test each filter)
- [ ] Bulk send renewal triggers manual send flow #476
- [ ] CSV export contains all visible columns

## References

- design 022 §7.2 Screen 1
