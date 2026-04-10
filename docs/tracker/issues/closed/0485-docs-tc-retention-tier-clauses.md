---
number: 485
github_number: 426
title: "docs: update T&C with retention + tier change + dormant clauses (sovereignhealth.io + brickos.io)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-e, docs, legal]
created: 2026-04-10
priority: P1
sprint: 040
phase: E
design: 022
estimate: 0.75d
---

T&C updates that legally back the locked decisions: tier changes affect existing customers, dormant accounts may be deleted after notice, etc.

## Scope -- sovereignhealth.io/terms

- [ ] **Account Inactivity clause** (full text in design 022 §2.5):
  > Free-tier (Glimpse) accounts that show no activity for 365 consecutive days may be flagged as dormant. Sovereign Brick reserves the right to delete dormant free-tier accounts and their associated data after written notice to the email on file. Paid-tier accounts are not subject to inactivity-based deletion as long as the subscription is active. Users may export their data at any time via the in-app export feature.
- [ ] **Tier change clause:** "Sovereign Brick may modify tier definitions, feature inclusions, and pricing. Changes apply to all users immediately, including users on existing subscriptions. Users may cancel before the next billing cycle if they disagree."
- [ ] **Org termination clause:** "When an organization's subscription ends, members are offered a grace period of 30 days to switch to an individual plan or export and delete their data."
- [ ] **Data export clause:** "Users may export their full data at any time via the export feature. Export is available even on the free tier."

## Scope -- brickos.io/terms

- [ ] Mirror the same clauses on the brickos.io T&C (when domain ready)
- [ ] Add: "BrickOS reserves the right to update licensing model and feature gating across the platform."

## Verification

- [ ] Both T&C pages updated and reviewed
- [ ] Diff committed and dated
- [ ] Reviewed for plain language

## References

- design 022 §2.5, §10.2, §11
