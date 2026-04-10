---
number: 473
github_number: 414
title: "feat: brickos.io email branding + payment failure templates (day 0/7/13, DE+EN)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-c, feature, branding, i18n]
created: 2026-04-10
priority: P1
sprint: 040
phase: C
design: 022
estimate: 1.5d
---

Rebrand all billing/license transactional emails from SHI/Stripe branding to brickos.io. Add the day 0/7/13 payment failure reminder cadence.

## Scope -- branding

- [ ] Email layout component (HTML + text) with brickos.io header, logo, footer
- [ ] Sender domain `billing@brickos.io` (DNS + SPF/DKIM if needed)
- [ ] Color scheme matches brickos.io brand
- [ ] CTA buttons styled per brickos.io brand
- [ ] All existing billing emails ported to new layout

## Scope -- payment failure templates

Three templates per language (DE + EN), so 6 files:
- [ ] Day 0: "Your payment failed. We'll try again. You have N days until downgrade."
- [ ] Day 7: "Reminder: still no payment. N days remaining."
- [ ] Day 13: "Last reminder: tomorrow you will be downgraded to Glimpse."

Each template:
- Variables: `{user_name}`, `{tier_name}`, `{grace_days_remaining}`, `{update_payment_url}`
- HTML + text versions
- Manual send flow first (admin clicks "send template" in admin GUI #476)
- Automation comes via scheduled jobs in #475

## Verification

- [ ] All 6 templates render with sample variables in DE and EN
- [ ] Footer links work
- [ ] No SHI branding remains in billing emails
- [ ] Manual send to a test inbox renders correctly in Gmail, Outlook, mobile

## References

- design 022 §1.3, §2.5
- Memory: `feedback_umlaut_utf8.md` -- proper UTF-8 umlauts in German
