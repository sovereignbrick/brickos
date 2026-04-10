---
number: 465
github_number: 406
title: "feat: effective tier resolver + has_feature API"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 1d
blocked_by: [464]
---

The core API that every BrickOS app calls to check whether a user can use a feature in a given org context.

## Scope

- [ ] `EffectiveTier { tier_slug, features: Vec<String>, max_owners, max_practitioners, max_members, source: TierSource }`
- [ ] `LicensingProvider::resolve_effective(user_id, org_context) -> EffectiveTier`
  - If `org_context == 'individual'` (or no org_members row): read user_licenses, apply admin_override
  - Else: load active org_licenses for the org, validate JWT, return claims
- [ ] `LicensingProvider::has_feature(ctx, feature_slug) -> bool`
- [ ] Cache key: `(user_id, org_id)` -- never `user_id` alone (M2 risk mitigation per design 022 §13.5)
- [ ] Cache invalidated on org membership change
- [ ] Admin override short-circuit honored (with expiry check)
- [ ] Unit tests covering all paths: individual, org, admin override, expired override, dormant

## Verification

- [ ] Test fixture: user in 0/1/2 orgs returns expected effective tier
- [ ] Admin override with expired `admin_override_expires_at` falls through to normal tier
- [ ] `has_feature("shi.csv_export")` returns true for Focus, false for Glimpse

## References

- design 022 §3.5, §2.6, §13.5 R5 mitigation
