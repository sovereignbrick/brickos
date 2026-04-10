---
number: 480
github_number: 421
title: "feat: Org Branding tab + role label overrides + custom domain"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui, branding]
created: 2026-04-10
priority: P1
sprint: 040
phase: D
design: 022
estimate: 0.75d
blocked_by: [478]
---

Per-org branding configuration. Builds on existing `organizations.branding` JSONB column and `domain_mappings` table.

## Scope

- [ ] Logo upload (PNG/SVG, base64 stored in `branding.logo_url` or `branding.logo_base64`)
- [ ] Primary color picker (hex)
- [ ] Accent color picker (hex)
- [ ] Role label overrides (per design 022 §3.2):
  - org_owner display label
  - practitioner display label
  - member display label
  - Stored in `branding.role_labels` JSONB key
- [ ] Custom domain field (creates `domain_mappings` row, ssl_status='pending')
- [ ] Preview pane: shows logo + colors with sample components
- [ ] Save button → updates `organizations.branding`

## Verification

- [ ] Logo uploads and persists
- [ ] Color changes reflected in preview
- [ ] Role labels saved and read by org member display elsewhere
- [ ] Custom domain creates `domain_mappings` row

## References

- design 022 §7.2 Screen 2 (Branding tab), §3.2
- Existing migration: `crates/brickos-db/migrations/007_org_branding.sql` (already applied)
