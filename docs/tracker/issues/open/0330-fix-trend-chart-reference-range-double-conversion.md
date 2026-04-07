---
github_number: 330
title: "fix: trend chart reference range double unit conversion"
milestone: health-intelligence
labels: [fix, P1]
---

## Problem

When the user's preferred unit differs from canonical (e.g., glucose mg/dL vs mmol/L), the trend chart reference range bands display at wildly incorrect values (e.g., 1100-1650 instead of 63-126 mg/dL). The Y-axis auto-scales to ~2156 to fit both correct data points and incorrect bands.

## Root Cause

The Settings > Reference Ranges page's `handleUnitChange` function converts threshold values from canonical to display unit AND saves the converted values to the DB. The DB has no unit column, so the API always returns them tagged as canonical. The marker detail page then converts them again via `displayValue()`, causing double conversion.

Example: glucose green_min = 4.5 mmol/L -> user switches to mg/dL -> handleUnitChange saves 81.082 (mg/dL) to DB -> API returns 81.082 tagged as "mmol/L" -> displayValue converts 81.082 x 18.0182 = 1461.

Additionally, the RangeBar component on the marker detail page displayed raw API values without any unit conversion, causing inconsistency between the bar (showing whatever was in DB) and the chart (double-converted).

## Fix Applied

1. **thresholds-tab.tsx**: Removed bulk save from `handleUnitChange`. DB always stores canonical units. Updated `displayValue` and `toCanonical` to handle MARKER_UNIT_MAP conversions for display and reverse.
2. **markers/[markerId]/page.tsx**: Added `convertRange()` helper to convert RangeBar values from canonical to user's preferred unit.

## Testing

- Switch glucose unit between mmol/L and mg/dL in Settings > Reference Ranges
- Verify trend chart reference bands align with data points
- Verify RangeBar labels show correct values in preferred unit
- Verify fasting range bar also shows converted values
