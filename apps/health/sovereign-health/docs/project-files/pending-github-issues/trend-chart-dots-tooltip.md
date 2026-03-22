---
title: "feat: Always show data point dots on trend chart with hover tooltip"
milestone: "User Experience & Onboarding"
milestone_number: 17
status: pending
issue_number: null
---

## Context

The marker detail trend chart (`src/components/trend-chart.tsx`) hides data point dots when there are 30+ points (line 182: `showDots = chartData.length < 30`). This makes it hard to see individual measurements and hover for details in the 3M/6M/1Y/ALL views.

The Recharts `<Tooltip>` is configured and works, but without visible dots it's hard to know you can interact with the chart.

## Current Behavior

- Dots visible: only when < 30 data points (7D, 30D views)
- Dots hidden: 3M, 6M, 1Y, ALL views
- Tooltip: works on hover but not obvious without dots
- Click popover: shows date, value, status, protocol — works but requires clicking empty line

## Proposed Improvement

- Always show dots (reduce size for dense charts, e.g., r=2 for 30+ points)
- Make hover tooltip more prominent with measurement details (date, value, unit, status, protocol, device)
- Consider using `activeDot` with larger radius for hover state

## Files

- `apps/health/sovereign-health/frontend/src/components/trend-chart.tsx` (line 182, 312-333)
