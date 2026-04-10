---
number: 476
github_number: 417
title: "feat: in-app subscription banner + manual send flow for templates"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-c, feature, ux]
created: 2026-04-10
priority: P1
sprint: 040
phase: C
design: 022
estimate: 0.75d
---

The user-facing banner that warns about subscription expiry, plus the admin escape hatch to send any template manually.

## Scope -- in-app banner

- [ ] Banner component in SHI frontend
- [ ] Shows when `user_licenses.status = 'downgrade_grace'`
- [ ] Message: "Your subscription failed. You have N days until you are downgraded to Glimpse."
- [ ] CTA: "Update payment method" → Stripe billing portal
- [ ] Dismissible per session, returns next session
- [ ] i18n (DE + EN)

## Scope -- manual send flow

- [ ] Admin GUI button on user/org detail: "Send template"
- [ ] Modal: pick template, preview with substituted variables, edit text if needed, "Send" button
- [ ] Templates dropdown lists all 9+ templates from #473 + #474
- [ ] Send via existing email service
- [ ] Logs to `admin_audit_log` action `email.template.sent`

## Verification

- [ ] Banner appears for a test user in grace state
- [ ] Banner does not appear for users not in grace
- [ ] Manual send delivers a real email with edited variables
- [ ] Audit log row created

## References

- design 022 §1.3, §2.5
