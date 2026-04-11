---
number: 511
title: "test: [manual] /platform/orgs/[id] -- Overview, Members, License, Branding, Invoices tabs"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: F
estimate: 0.3d
---

Systematic tab-by-tab walk of Life Algorithm's detail page. Covers Sprint 040 #478-#481 screens.

## Checklist

### Overview tab
- [ ] Org metadata card: all fields populated correctly
- [ ] Current license card: tier=horizon, issued/expires dates present, seats with current/max
- [ ] Seat bars: color-coded (green / amber / red at cap)
- [ ] Quick actions: 3 disabled placeholder buttons (Generate license / View invoices / Edit branding) with correct tooltips
- [ ] Status badge in header matches license state ("active")

### Members tab
- [ ] Role filter dropdown works
- [ ] Role labels display as Coach/Client (not practitioner/member)
- [ ] Add member inline form opens/closes
- [ ] Row actions: role dropdown + Remove button

### License tab
- [ ] Current license card shows the Horizon license + features + seat caps
- [ ] License history collapsible expands, shows at least the active + any prior from #500 test
- [ ] "Generate new license" form opens
- [ ] "Renew" button is visible when active
- [ ] "Revoke" button is visible when active
- [ ] Revoke reason input works

### Branding tab
- [ ] Logo preview renders
- [ ] Color pickers work
- [ ] Role labels inputs populated from save
- [ ] Preview pane live-updates when you change colors
- [ ] Custom domains list shows the added domain
- [ ] Remove domain confirm dialog works

### Invoices tab
- [ ] List shows any invoices (if none, shows empty state)
- [ ] "New invoice" button opens the form
- [ ] Currency dropdown (EUR/USD/CHF) works
- [ ] Product dropdown shows all 7 canonical Horizon line items
- [ ] Subtotal updates live
- [ ] "Save draft" works without Stripe customer ID
- [ ] "Save and sync to Stripe" errors gracefully if Stripe key not set OR succeeds if Stripe test mode is configured

## Who

User (manual).

## Verification

Per-checkbox green/bug. Any tab that throws a 500 or blank-renders is P0.
