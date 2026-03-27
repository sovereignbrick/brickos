---
number: 274
title: "fix: duplicate Weight marker shown when adding measurement with Qardio Base device"
labels: [fix, frontend, measurements, priority-high, sprint-016]
milestone: health-intelligence
---

## Description

When creating a new measurement session with the Qardio Base device, the Weight marker appears twice in the marker list. Removing one removes both -- the user cannot have just one Weight input.

## Steps to Reproduce

1. Go to `/measurements/new`
2. Select Device: "Qardio Base"
3. Observe "MY MARKERS" section
4. Weight appears twice (both showing "Qardio Base" badge, both in kg)

## Expected Behavior

Weight should appear only once per device.

## Likely Cause

The Qardio Base device definition in the database may have `weight` assigned twice (possibly from both the device_markers table AND the user_profile default_weight_kg auto-include logic). Or the `weight` marker exists in both the device marker list and the "always include" list for body composition devices.

## Investigation

- [ ] Check `device_markers` table for Qardio Base -- is `weight` listed twice?
- [ ] Check if the measurement form auto-adds `weight` from user_profile AND from device_markers
- [ ] Check frontend deduplication logic when merging device markers + profile defaults

## Fix

- [ ] Deduplicate markers by slug before rendering the form
- [ ] Ensure removing one Weight removes only one entry (if duplicates exist in DB, fix there)
- [ ] Test with all devices that include weight (Qardio Base, manual, scale)
