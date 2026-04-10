---
number: 479
github_number: 420
title: "feat: Org License tab + multi-app feature picker + JWT generation form"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui]
created: 2026-04-10
priority: P0
sprint: 040
phase: D
design: 022
estimate: 1.5d
blocked_by: [478, 466]
---

The heart of the admin GUI -- where brickos staff issue and renew custom org packages.

## Scope -- License tab UI

- [ ] Current license card: tier, features (chips), seat caps + current usage bars, expires_at countdown
- [ ] Actions: "Renew", "Revoke", "Generate new"
- [ ] License history (collapsible): all past licenses with issued_at, expires_at, revoked_at, issued_by
- [ ] Generate-new form:
  - Tier dropdown (glimpse / focus / insight / clarity / horizon / custom)
  - **Multi-app feature picker** -- features grouped by app namespace (`shi.*`, `crm.*`, `link.*`, `branding.*`, `support.*`); checkbox per feature
  - Seat caps: `max_owners`, `max_practitioners`, `max_members` number inputs
  - Expires picker (1 / 6 / 12 months or arbitrary)
  - Notes textarea
  - JSON preview of the resulting JWT claims
  - "Generate JWT" button → calls #466
- [ ] After generation:
  - Copy-to-clipboard JWT
  - "Email to customer" → uses manual send flow #476
  - "Download .jwt file" button

## Scope -- API endpoints

- [ ] `POST /platform/admin/orgs/{id}/license` -- generate new (uses #466)
- [ ] `POST /platform/admin/orgs/{id}/license/revoke` -- revoke current
- [ ] `GET /platform/admin/orgs/{id}/license/history` -- all past licenses

## Verification

- [ ] Generate license, JWT round-trip validates
- [ ] Multi-app picker shows features from all registered apps
- [ ] Old license auto-revoked when new one issued
- [ ] License history shows full timeline
- [ ] Email-to-customer sends a real email with JWT attached

## References

- design 022 §7.2 Screen 2 (License tab), §3.4
