---
github_number: 376
title: "fix: QR code BrickOS cube needs white background behind the PNG"
milestone: ux-and-onboarding
labels: [fix, P2]
---

## Problem

The QR code at brickos.io/r/*.qr shows the BrickOS cube PNG but the cube image has a dark/black background from the PNG itself. The white circle behind it is visible but the cube's own dark background clashes. Need to either:

1. Use the light-background variant of the cube (blockos-cube-512.png instead of blockos-cube-dark-512.png)
2. Or clip the cube to a circle with white fill behind it

## Files

- `apps/technology/sovereign-link/src/handlers/qr.rs`
- `apps/technology/sovereign-link/src/assets/brickos-cube.b64` (currently dark variant)
- Light variant: `apps/platform/brickos-website/public/assets/blockos-cube-512.png`
