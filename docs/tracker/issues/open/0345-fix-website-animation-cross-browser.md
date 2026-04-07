---
github_number: 345
title: "fix: website animation not working on Brave, Chrome, Firefox"
milestone: ux-and-onboarding
labels: [fix, P2]
---

## Problem

The BrickOS website (sovereignhealth.io / brickos.io) has animations that do not work consistently across browsers: Brave, Chrome, Firefox. Specific animations affected need investigation.

## Requirements

1. Audit all CSS/JS animations on the marketing website
2. Test on Brave, Chrome, Firefox, Safari (if applicable)
3. Replace vendor-specific animations with cross-browser compatible alternatives
4. Use `@supports` or feature detection where needed
5. Ensure no animation causes layout shift (CLS impact)

## Testing

- Visual test on Brave, Chrome, Firefox
- Lighthouse performance check (no CLS regression)

## Blocked By

None
