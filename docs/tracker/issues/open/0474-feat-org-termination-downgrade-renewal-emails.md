---
number: 474
github_number: 415
title: "feat: org termination + downgrade + license renewed email templates (DE+EN)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-c, feature, i18n]
created: 2026-04-10
priority: P1
sprint: 040
phase: C
design: 022
estimate: 1d
blocked_by: [473]
---

The remaining transactional email templates beyond the payment failure cadence.

## Scope

Per template: HTML + text + DE + EN.

- [ ] **Downgraded to Glimpse** -- "Your subscription has ended. You're now on Glimpse with N markers preserved. Reactivate with one click."
- [ ] **Org terminated, switch to individual** (sent to org members on org termination) -- "Acme Clinic's subscription has ended. Continue with a free Glimpse account or upgrade. You have 30 days to choose."
- [ ] **Org terminated, staff notification** (sent to org_owner / practitioner) -- "Your role at Acme Clinic has ended. If you have other org memberships they continue."
- [ ] **License renewed** (sent to org_owner) -- "Your Horizon subscription is renewed for another year. Invoice attached."
- [ ] **License expiring soon** (sent 30 days before exp) -- "Your license expires in 30 days. Contact us for renewal."
- [ ] **Inactivity warning** (sent on dormant flag) -- "We haven't seen you in a year. Your data is safe. Tell us if you'd like to keep your account."

## Verification

- [ ] All 6 templates × 2 languages render with sample data
- [ ] Variables substitute correctly
- [ ] Brickos.io branding consistent with #473
- [ ] Renderable in Gmail, Outlook, mobile

## References

- design 022 §3.7, §3.8, §2.5
