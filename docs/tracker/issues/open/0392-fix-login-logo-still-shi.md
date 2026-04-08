---
github_number: 392
title: "fix: login logo still shows SHI shield on brickos.io (7th attempt)"
milestone: platform-admin-gui
labels: [fix, P2]
---

## Problem

Despite CSS background-image approach (#0388), login page still shows SHI logo on brickos.io.
The CSS .brand-logo class defaults to SHI logo and the data-brand attribute is set after React hydration, causing a flash of SHI logo.

## Root Cause

The useBrand() hook returns SHI during SSR. After hydration, it updates to BrickOS but the initial render already showed SHI logo via CSS background-image.

## Potential Fix

Inject a <script> tag in the <head> via middleware that reads the brand_context cookie
and sets a CSS custom property BEFORE any React rendering:

```html
<script>
  var bc = document.cookie.match(/brand_context=([^;]+)/);
  if (bc && bc[1] === 'brickos') document.documentElement.classList.add('brand-brickos');
</script>
```

Then in CSS:
```css
.brand-logo { background-image: url('/logo.png'); }
.brand-brickos .brand-logo { background-image: url('/brickos-cube.png'); }
```

This runs synchronously before first paint -- no flash.
