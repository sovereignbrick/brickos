---
number: 262
github_number: 480
title: "fix: URGENT — demo mode calculated markers show no values"
labels: [fix, backend, demo, priority-critical, sprint-014]
milestone: health-intelligence
---

## Description

**URGENT**: The demo mode calculated markers are not displaying any values. This is a critical issue as demo mode is used for showcasing the product.

## Current Behavior

- Calculated/computed markers (e.g., ratios, derived values) show blank/no values in demo mode
- Basic markers may display correctly, but calculated ones are empty

## Likely Causes

1. **Missing enrichment call** — `enrich_with_latest_values()` not called before computed marker calculation in demo context
2. **Demo seed data** — calculated markers may lack the prerequisite base marker values
3. **Demo user context** — computed marker logic may not have access to demo user's data

## Investigation Steps

- [ ] Check demo seed data: do base markers (needed for calculations) have values?
- [ ] Verify `enrich_with_latest_values()` is called in the demo data pipeline
- [ ] Check if computed marker formulas reference the correct marker IDs in demo context
- [ ] Compare demo mode vs regular user data flow for calculated markers
- [ ] Test with known calculation: if marker A=100 and B=50, does A/B show 2.0?

## Requirements

- [ ] Fix calculated markers to display values in demo mode
- [ ] Verify all computed markers produce correct results with demo data
- [ ] Add test coverage for demo mode computed markers
- [ ] Test on staging before production deploy

## References

- Related feedback: always call `enrich_with_latest_values` before computed markers
- Related: #243 (markers directory include all markers calculated)
