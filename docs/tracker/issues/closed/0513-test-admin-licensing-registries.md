---
number: 513
title: "test: [manual] /platform/licensing + /platform/features + /platform/licensing/revocations"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: F
estimate: 0.2d
---

Walk the 3 read-only licensing screens from Sprint 040 #483.

## Checklist -- /platform/licensing (Tier configuration)

- [ ] Page loads
- [ ] Shows tier cards for core, glimpse, focus, insight, clarity, horizon
- [ ] Feature catalogue section groups features by app namespace
- [ ] Links to Feature registry + Revocation list at the top

## Checklist -- /platform/features (Feature registry)

- [ ] Page loads
- [ ] Tables grouped by app_slug: sovereign-health (28 rows), sovereign-crm (8 rows), sovereign-link (5 rows), _platform (8+ rows)
- [ ] Hovering a slug chip shows the EN/DE tooltip
- [ ] Category column correct (data/reporting/ai/branding/security/integrations/support)
- [ ] Active dot (green) for all entries unless is_active=false

## Checklist -- /platform/licensing/revocations

- [ ] Page loads (expect empty on dev since no revocations yet)
- [ ] To populate: from Life Algorithm License tab, click Revoke with a test reason -- comes back to the revocations page and shows the row
- [ ] Click Restore -- confirm dialog -- confirm -- row disappears
- [ ] Navigate back to Life Algorithm License tab -- verify the license is back to active

## Who

User (manual).

## Verification

Green/bug. The revocation restore test is the only state-mutating step here -- run it last.
