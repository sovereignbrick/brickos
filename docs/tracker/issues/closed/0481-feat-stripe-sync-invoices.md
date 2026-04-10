---
number: 481
github_number: 422
title: "feat: Stripe sync (Invoices tab + brickos-billing Stripe API + webhook handler)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, admin-gui, billing]
created: 2026-04-10
priority: P0
sprint: 040
phase: D
design: 022
estimate: 1.5d
blocked_by: [478, 466]
---

Manual invoice generation via Stripe Invoices API (NOT subscriptions). Lets brickos staff click "new invoice for Acme Clinic", configure line items, and trigger Stripe to send the invoice.

## Scope -- Stripe products (one-time setup)

- [ ] Pre-configure 7 Stripe products in dashboard (manual step):
  - SHI Horizon Practice Base (`shi-horizon-base`, €499)
  - Additional patient seats block of 10 (`shi-horizon-patients-10`, €89)
  - Additional practitioner seat (`shi-horizon-practitioner-1`, €39)
  - Custom domain per month (`shi-horizon-domain`, €49)
  - M&E (`shi-horizon-me`, calculated)
  - Onboarding (`shi-horizon-onboarding`, €1500)
  - Priority support SLA (`shi-horizon-priority`, €199)

## Scope -- Invoices tab UI

- [ ] List of past invoices for the org with Stripe link
- [ ] Status (draft, sent, paid, overdue)
- [ ] "New invoice" button → form
- [ ] Form fields:
  - Currency (EUR / USD / CHF)
  - Line items (repeatable rows): product dropdown, quantity, unit price, tax rate auto
  - Due in (7 / 14 / 30 days)
  - Description / memo
  - "Save as draft" or "Sync to Stripe and send"

## Scope -- backend

- [ ] `brickos-billing` service: `create_stripe_invoice(org_id, line_items, currency, due_days, memo) -> stripe_invoice_id`
- [ ] Calls Stripe Invoices API: POST /v1/invoices, POST /v1/invoiceitems, POST /v1/invoices/{id}/finalize, POST /v1/invoices/{id}/send
- [ ] Saves `stripe_invoice_id` in a new `org_invoices` table or directly in `org_licenses.stripe_invoice_id`
- [ ] Webhook handler: `invoice.paid` → mark invoice paid + extend org license JWT (regenerate via #466)
- [ ] Webhook handler: `invoice.payment_failed` → flag, alert
- [ ] BTC alternative: same form but pick "Strike" rail → uses existing Strike service

## Verification

- [ ] Create invoice in test mode for a test org → Stripe sends real email
- [ ] Pay test invoice with test card → webhook fires → org_licenses extended
- [ ] All 7 Stripe products are pickable in line item dropdown

## References

- design 022 §3.9, §7.2 Screen 2 (Invoices tab)
