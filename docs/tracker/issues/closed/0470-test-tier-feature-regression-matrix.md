---
number: 470
github_number: 411
title: "test: tier × feature regression matrix (~60 tests) + Stripe webhook contract tests"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, test, critical-path]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 1.5d
blocked_by: [465]
---

The gold-standard regression suite that protects the Phase B refactor (#467). **Must be written and green before #467 starts.**

## Scope -- tier × feature matrix (M3)

For each (tier, feature) combination, write a test that:
1. Creates a test user on tier X
2. Calls each gated endpoint
3. Asserts the expected pass/fail

Approximate matrix: 5 tiers × ~12 gated features = ~60 tests.

Gated features to cover:
- shi.csv_export (handlers/export.rs)
- shi.json_export (handlers/export.rs)
- shi.pdf_reports (handlers/reports.rs, 2 callers)
- shi.custom_thresholds (settings)
- shi.lifestyle_presets
- shi.protocol_comparison
- shi.body_composition
- shi.supplement_marker_impact (influence_factors.rs)
- shi.ai_dashboard_insights
- shi.cohort_comparison
- shi.smart_import (import.rs)
- shi.measurement_cap (measurements.rs)
- shi.template_count (templates.rs)
- shi.medication_count (medications.rs)
- shi.markers_active (max active markers)
- shi.ai_chat_quota (per-agent)

## Scope -- Stripe webhook contract tests (M4)

Catches F1 (silent revenue loss) at the test level.

For each Stripe webhook event, recorded payload fixture + assertion:
- `customer.subscription.created` -> user_licenses upserted with tier, status='active'
- `customer.subscription.updated` (tier upgrade) -> tier_id updated
- `customer.subscription.updated` (tier downgrade) -> tier_id updated
- `customer.subscription.deleted` -> grace period started
- `payment_intent.payment_failed` -> grace period started, email sent
- `invoice.paid` (org-level, future) -> org_licenses extended
- `invoice.payment_failed` (org-level, future) -> grace flagged

## Verification

- [ ] All ~60 tier × feature tests pass against the OLD tier.rs (baseline before #467)
- [ ] All ~60 pass against the NEW facade after #467
- [ ] Stripe webhook tests pass with recorded payloads
- [ ] Tests run in `cargo test --test integration` and complete < 60s

## References

- design 022 §13.5 M3, M4, §13.2 F1
