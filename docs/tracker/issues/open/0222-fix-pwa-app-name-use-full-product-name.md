---
number: 222
title: "fix: PWA app name should show 'Sovereign Health Intelligence' everywhere"
labels: [bug, pwa]
milestone: ux-and-onboarding
---

## Description

The PWA `short_name` in `manifest.json` is currently "Sovereign Health". On mobile home screens and desktop app launchers, this is what users see. The full product name "Sovereign Health Intelligence" should be used consistently as the app label.

## Current State

- `manifest.json` `name`: "Sovereign Health Intelligence" (correct)
- `manifest.json` `short_name`: "Sovereign Health" (should be full name)
- Linux app launcher shows: "Sovereign Health Intelli..." (truncated from `name`)
- iOS home screen shows: `short_name` value

## Desired

- `short_name`: "Sovereign Health Intelligence"
- All install surfaces show the full product name

## Notes

Chrome recommends `short_name` be 12 characters or fewer for best display on Android home screens. "Sovereign Health Intelligence" is 34 characters and will be truncated on some devices. Acceptable trade-off — brand consistency is more important than fitting the label in one line on small screens.

## Files

- `apps/health/sovereign-health/frontend/public/manifest.json`
