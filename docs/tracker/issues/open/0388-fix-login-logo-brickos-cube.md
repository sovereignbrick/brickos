---
github_number: 388
title: "fix: login page still shows SHI shield logo on app.brickos.io"
milestone: platform-admin-gui
labels: [fix, P2]
---

## Problem

Despite 6+ fix attempts, the login page at app.brickos.io/login shows the SHI shield/blood drop logo instead of the BrickOS cube. The title "BrickOS Platform" and subtitle are correct, and the demo/register sections are hidden -- only the logo fails.

## Previous Attempts

1. getBrandConfig() -- returns SHI during SSR
2. useBrand() hook -- state updates after mount but Image caches SSR src
3. Plain <img> tag -- still shows SHI from SSR
4. Next.js middleware with brand_context cookie -- cookie set but not read on initial render
5. Mounted check with placeholder -- shows pulse then SHI logo
6. Multiple iterations of above

## Recommended Fix

The logo image must not be rendered during SSR at all. Instead:
1. Render a fixed-size placeholder div during SSR
2. After mount, check hostname/cookie and render the correct <img>
3. The placeholder should be the same size as the logo (64x64) to prevent layout shift

OR: Use CSS background-image that can be overridden by a class set via middleware.

## Update 2026-04-08

Login at app.brickos.io still shows SHI shield logo. Text "BrickOS Platform" is correct.
User confirmed demo.brickos.io login works fine -- issue is production only.
