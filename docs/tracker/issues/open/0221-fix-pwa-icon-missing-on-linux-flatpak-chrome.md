---
number: 221
title: "fix: PWA icon missing on Linux (Flatpak Chrome)"
labels: [bug, pwa]
milestone: ux-and-onboarding
---

## Description

When installing the PWA via Flatpak Chrome on Linux, the app appears in the application launcher with a generic settings gear icon instead of the SHI blood drop logo. The app name shows as "Sovereign Health Intelli..." (truncated).

## Expected

- SHI logo icon (192x192 or 512x512) visible in application launcher
- Full name or short_name visible

## Root Cause

Flatpak Chrome has limited filesystem access. Even after granting `~/.local/share/applications` and `~/.local/share/icons` permissions via `flatpak override`, Chrome may not write the icon files correctly. The `.desktop` shortcut is created but references an icon path the sandbox can't write to.

## Possible Fixes

1. Add `"purpose": "any maskable"` to manifest icons — helps Android/desktop adaptive icons
2. Add a dedicated 128x128 icon (common Linux desktop size)
3. Investigate if Chrome writes icons to `~/.local/share/icons/` or a Flatpak-specific path
4. Consider providing a `.desktop` file template users can manually install

## Environment

- OS: Pop!_OS 22.04 (Linux)
- Chrome: Flatpak (com.google.Chrome)
- Manifest: `/manifest.json` with 192x192 + 512x512 icons

## Screenshots

Generic gear icon in app launcher instead of SHI logo.
