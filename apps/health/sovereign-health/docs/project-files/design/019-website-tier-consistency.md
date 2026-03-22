# Design: Website & Tier Consistency Cleanup

**Status:** Draft
**Date:** 2026-03-22

## Problem

Audit on 2026-03-22 found significant inconsistencies between what the website claims, what the backend enforces, and what features actually exist:

1. **Stale `tiers.json`** — contains outdated limits that contradict `features-en.json` and the backend
2. **"Coming Soon" features that are live** — Lab Import, Medication Import, PDF Reports all work but website says "coming_soon"
3. **Missing features on website** — Team Sharing, Measurement Import, Calculated Markers not documented
4. **Tier enforcement gaps** — 8 features have tier limits defined but no runtime enforcement

## Data Sources (Current State)

| Source | Role | Accurate? |
|--------|------|-----------|
| `website/data/tiers.json` | Legacy tier limits for website | STALE — wrong limits |
| `website/src/data/features-en.json` | Feature comparison table | Mostly correct |
| `website/src/data/features-de.json` | DE version of above | Mostly correct |
| `api/migrations/20260315000070_license_tier_v3.sql` | Authoritative tier limits | Source of truth |
| `api/src/services/tier.rs` | Runtime enforcement | Partially implemented |

## Fix Plan

### Phase 1: Website Content Fixes (Immediate)

1. **Update "coming_soon" → active** for features that are live:
   - `lab_import` — Live (AI-powered lab report extraction)
   - `influence_factor_import` — Live (medication/supplement photo import)
   - `pdf_reports` — Live (PDF health report generation)

2. **Remove or replace `tiers.json`** — it contradicts the feature comparison table
   - Either delete it and use `features-en.json` as sole source
   - Or auto-generate it from the backend migration

3. **Add missing features to comparison table:**
   - Measurement Import (tabular ODS/XLSX/CSV)
   - Team Sharing (Clarity: 2 members, Horizon: 10)
   - Calculated Markers (GKI, Dr. Boz, BMI, WHtR, HOMA-IR, TG/HDL, HCT/HB)

### Phase 2: Tier Enforcement (Sprint Work)

| Feature | Current | Fix |
|---------|---------|-----|
| PDF Reports quota | No enforcement | Add `check_chat_quota("pdf_reports")` in reports.rs |
| Calculated markers limit | No enforcement | Add count check in computed markers service |
| History days limit | Query-only | Add `WHERE timestamp > NOW() - interval` based on tier |
| MFA/2FA | Available to all | Consider keeping open (security shouldn't be gated) |
| API Access | No gating | Requires API key system (future feature) |
| Team Sharing | No enforcement | Requires organization model (#46) |
| AI Dashboard Insights | Not implemented | Future feature |
| Cohort/Benchmark | Not implemented | Future feature |

### Phase 3: Single Source of Truth

Long-term: tier limits should be served from the API, not hardcoded in website JSON files.

- `GET /public-api/tiers` — returns all tiers with limits and feature flags
- Website fetches at build time (SSG) or runtime
- Eliminates data duplication

## Tier Limit Reference (Authoritative — from backend migration)

| Feature | Glimpse | Focus | Insight | Clarity | Horizon | Core |
|---------|---------|-------|---------|---------|---------|------|
| Markers | 8 | 20 | 50 | Unlimited | Unlimited | Unlimited |
| History | 30d | 365d | Unlimited | Unlimited | Unlimited | Unlimited |
| Measurements | 100 | 250 | Unlimited | Unlimited | Unlimited | Unlimited |
| Calculated Markers | 1 | 3 | 8 | Unlimited | Unlimited | Unlimited |
| Templates | 1 | 3 | 5 | Unlimited | Unlimited | Unlimited |
| Influence Factors | 2 | 10 | 25 | Unlimited | Unlimited | Unlimited |
| Chat General | 2/mo | 5/mo | 30/mo | Unlimited | Unlimited | Unlimited |
| Chat Trends | 0 | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Chat Labs | 0 | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Chat Diet | 0 | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Chat Supplements | 0 | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Chat Protocols | 0 | 0 | 5/mo | Unlimited | Unlimited | Unlimited |
| Lab Import | 0 | 0 | 3/mo | Unlimited | Unlimited | Unlimited |
| Med Import | 0 | 0 | 1/mo | Unlimited | Unlimited | Unlimited |
| Measurement Import | 0 | 0 | 0 | Unlimited | Unlimited | Unlimited |
| CSV Export | No | Yes | Yes | Yes | Yes | Yes |
| JSON Export | No | Yes | Yes | Yes | Yes | Yes |
| PDF Reports | 0 | 0 | 1/mo | 2/mo | Unlimited | Unlimited |
| Custom Thresholds | No | Yes | Yes | Yes | Yes | Yes |
| Team Members | 0 | 0 | 0 | 2 | 10 | Unlimited |
| API Access | No | No | No | No | Yes | Yes |

## Open Questions

- [ ] Should MFA be tier-gated? Security features arguably should be available to all.
- [ ] Should `tiers.json` be deleted or auto-generated from backend?
- [ ] Should calculated markers be highlighted as a feature on the pricing page?
- [ ] Should Measurement Import be a separate feature row or grouped under "Smart Import"?

## References

- [ADR-016: GDPR & Privacy Architecture](../adr/016-gdpr-privacy-architecture.md)
- [Design-016: Licensing Strategy](016-licensing-strategy.md)
- Migration: `20260315000070_license_tier_v3.sql` (authoritative tier limits)
- Backend: `api/src/services/tier.rs` (enforcement logic)
