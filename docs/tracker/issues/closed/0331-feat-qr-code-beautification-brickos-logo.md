---
github_number: 331
title: "feat: beautify QR codes with BrickOS brick logo in center"
milestone: ux-and-onboarding
labels: [feat, P2]
---

## Request

The Sovereign Link QR codes (visible on the Affiliate Program page) should be styled consistently with the SHI branding -- with the BrickOS brick logo embedded in the center of the QR code, similar to how many branded QR codes work.

## Current State

QR codes render as plain black-and-white SVGs with the SHI icon overlaid. Need to match the overall BrickOS visual identity with the brick logo.

## Requirements

- BrickOS brick logo centered in the QR code
- Sufficient error correction level (L -> M or H) to maintain scannability with logo overlay
- Consistent styling across all QR code instances (affiliate links, short links)
- Dark theme compatible
