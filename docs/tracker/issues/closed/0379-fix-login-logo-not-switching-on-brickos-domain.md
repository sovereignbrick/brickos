---
github_number: 379
title: "fix: login page logo doesn't switch to BrickOS cube on brickos.io domain"
milestone: platform-admin-gui
labels: [fix, P1]
---

## Problem

On `demo.brickos.io/login?return=/platform`, the app name shows "BrickOS Platform" correctly but the logo still shows the SHI shield icon instead of the BrickOS cube.

## What was tried

1. `getBrandConfig()` returns correct brand on client -- but Next.js Image caches SSR src
2. Switched to `useBrand()` hook with useEffect -- still renders SHI logo from SSR
3. Replaced Next.js `<Image>` with plain `<img>` -- still shows SHI logo

## Root Cause

The login page is server-rendered with SHI branding (default). The client-side `useBrand()` hook updates state after mount, but by then the SHI logo is already visible and may not visually update due to browser image caching or hydration mismatch.

## Possible Fixes

1. Use Next.js middleware to detect hostname and set a cookie/header before rendering
2. Conditionally render the logo only after mount (show nothing during SSR)
3. Use CSS to hide the logo until client-side brand detection completes
4. Move brand detection to Next.js middleware (server-side, before render)
