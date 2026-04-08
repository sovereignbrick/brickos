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
