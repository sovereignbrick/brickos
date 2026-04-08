---
github_number: 387
title: "fix: Gatus at status.brickos.io still shows default style"
milestone: platform-admin-gui
labels: [fix, P3]
---

## Problem

Gatus at status.brickos.io has "BrickOS Platform Status" title but still shows the default Gatus green logo and styling. The nginx CSS injection was applied but may not be working consistently.

## Options

1. Custom Gatus Docker image with modified assets
2. Rebuild with custom theme (Gatus supports custom CSS file)
3. Keep nginx injection but make it more robust

## Update 2026-04-08

Still showing green Gatus logo, dark blue background, wrong favicon. The nginx CSS injection approach isn't working reliably. Need custom Gatus Docker image or complete replacement with custom status page.

Specific issues:
- Logo: still Gatus green gear icon (should be BrickOS cube)
- Favicon: Gatus default (should be BrickOS)
- Background: dark blue (should be #09090b zinc-950)
- Title shows "BrickOS" but "Health Dashboard" subtitle is Gatus default
