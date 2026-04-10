---
number: 478
github_number: 419
title: "feat: platform admin Org detail (Overview + Members tabs)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui]
created: 2026-04-10
priority: P1
sprint: 040
phase: D
design: 022
estimate: 1d
blocked_by: [477]
---

The org detail page with the first two tabs. License/Branding/Invoices/Audit tabs are separate issues.

## Scope -- Overview tab

- [ ] Org metadata: name, slug, type, billing_email, created_at
- [ ] Current license summary card (read-only): tier, expires_at, seat usage bars
- [ ] Quick actions: "Generate license", "View invoices", "Edit branding"
- [ ] Stripe customer link (if billing_model is stripe_invoice)

## Scope -- Members tab

- [ ] Table: User, Email, Role, Joined, Last active
- [ ] Filter by role: org_owner / practitioner / member
- [ ] Add member form: email lookup + role dropdown (calls #469 seat enforcement)
- [ ] Edit member role (with seat cap check)
- [ ] Remove member with confirmation
- [ ] Display labels respect `branding.role_labels` overrides

## Verification

- [ ] Loads details for any org
- [ ] Add 11th practitioner on max=10 → blocked with seat limit error
- [ ] Role label override displays "Doctor" instead of "Practitioner" for orgs with override

## References

- design 022 §7.2 Screen 2
