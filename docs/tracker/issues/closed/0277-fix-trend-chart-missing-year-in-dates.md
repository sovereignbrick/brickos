---
number: 277
title: "fix: trend charts and tooltips must show year in dates"
labels: [fix, frontend, ux, sprint-016]
milestone: ux-and-onboarding
---

## Description

Trend charts on the Trends page and marker detail pages show dates without the year (e.g., "22 Mar", "28 Dec"). When viewing data that spans multiple years or when the year is ambiguous, this is confusing.

## Current Behavior

- X-axis labels: "22 Mar", "28 Dec", "7 Jan" (no year)
- Tooltips: "22 Mar" with value + status dot (no year)
- No way to tell if "28 Dec" is 2025 or 2026

## Expected Behavior

### X-axis labels
- Short periods (7D, 30D): "22 Mar" is fine (year implied by recency)
- Medium periods (3M, 6M): show year on first label of each new year, e.g., "28 Dec '25", "7 Jan '26"
- Long periods (1Y, ALL): always show year, e.g., "Jun '25", "Dec '25", "Mar '26"

### Tooltips (always show full date with year)
- "22 Mar 2026" instead of "22 Mar"
- "28 Dec 2025" instead of "28 Dec"
- Keep the value + status dot + fasting label below

## Files to Modify

- Trend chart component (Recharts XAxis tickFormatter)
- Tooltip component (date formatting)
- Marker detail trend chart (same pattern)

## Requirements

- [ ] Tooltips always include year: "22 Mar 2026"
- [ ] X-axis: show year when period is 6M+ or when data spans multiple years
- [ ] X-axis: use abbreviated year format "'25", "'26" to save space
- [ ] Test with ALL period to verify multi-year display
- [ ] Test with 7D period to verify short dates still look clean
