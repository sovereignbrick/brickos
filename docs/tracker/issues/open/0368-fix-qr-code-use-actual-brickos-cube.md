---
github_number: 368
title: "fix: QR code - use actual BrickOS cube image instead of SVG approximation"
milestone: ux-and-onboarding
labels: [fix, P2]
---

## Problem

The QR code center logo is a simplified SVG with 3 flat faces that doesn't match the actual BrickOS isometric cube (which has subtle gradients, rounded edges, proper 3D depth). Also the QR code border is too thick/black -- should be a thin white frame.

## Requirements

1. Embed the actual `blockos-cube-dark-512.png` as a base64 `<image>` element in the SVG QR code (or reference it via URL)
2. White circle background (current approach is correct)
3. Thin white border around the QR code (replace current thick black border)
4. The cube should match the brand asset exactly -- dark body, light gray top face, subtle edges

## Reference

- Brand asset: `apps/platform/brickos-website/public/assets/blockos-cube-dark-512.png`
- Current QR code: `apps/technology/sovereign-link/src/handlers/qr.rs`
- SHI affiliate QR (working reference): uses `qrcode.react` with `/apple-touch-icon.png` overlay
