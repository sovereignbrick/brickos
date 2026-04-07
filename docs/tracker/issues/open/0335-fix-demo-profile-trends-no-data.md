---
github_number: 335
title: "fix: demo profile marker detail shows no trend data or min/avg/max"
milestone: health-intelligence
labels: [fix, P1]
---

## Problem

When viewing marker detail pages (e.g., Glucose) via the demo profiles (optimized/average/at_risk), the trend chart shows "No data in this range" and Min/Avg/Max tiles show "-". Recent measurements section shows only 1 data point.

For logged-in users the same pages work correctly with full trend lines and statistics.

## Impact

Demo is the primary way new users evaluate the product. No trend data makes the demo look broken.

## Investigation

The demo trend API endpoint likely doesn't return data for the selected time range, or the profile parameter isn't being passed correctly to the trend query.

Check:
1. `/demo/markers/{slug}/trend` endpoint -- does it accept profile parameter?
2. Demo seed data date ranges -- are measurements within the 3M default window?
3. Frontend: is the demo trend fetch passing the profile correctly?
