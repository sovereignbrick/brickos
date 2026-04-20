---
number: 581
title: "bug: /settings Account tab on admin plane shows health data (units, etc.)"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [bug, frontend, p1]
created: 2026-04-20
priority: P1
estimate: 0.5d
---

Reported during Sprint 046 RC #25 on 2026-04-20. On
`https://test-clinic.demo.brickos.io/settings` (admin plane), the tab
list correctly hides Health profile / Devices / Thresholds /
Medications (SHI extension tabs). But the Account tab content itself
still renders health data (unit preferences: mmol/L vs mg/dL, etc.)
because `AccountTab` takes `settings.units` as a prop and renders the
unit selector inline.

## Root cause

`AccountTab` was built as the "brickos master tab" but embeds SHI-specific
unit preferences because the pre-Sprint-040 production layout put them
there. Plane-filtering the tab list (Sprint 046 hotfix) didn't filter
the Account tab's internal sections.

## Fix options

1. Split AccountTab into a pure brickos-account component (just
   profile + email + MFA) and a separate units section that only
   renders on the end-user plane
2. Pass `plane` into AccountTab and conditionally render the units
   section
3. Move unit preferences out of Account entirely -- maybe onto the
   Health profile tab (end-user only) or /platform/org/apps/sovereign-health

Recommend option 2 for the quickest RC unblock. Option 3 is the
longer-term cleanup tied to #577 (multi-app URL routing).

## Acceptance

- `test-clinic.demo.brickos.io/settings` Account tab shows: profile,
  notifications, billing, MFA. NO unit selector, NO health-specific content.
- `test-clinic.demo.sovereignhealth.io/settings` Account tab unchanged.
