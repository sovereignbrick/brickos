---
number: 240
title: "fix: PWA splash screen — blank black page on load, add logo animation"
labels: [bug, pwa, ux]
milestone: ux-and-onboarding
---

## Description

When opening the PWA (installed app), there is a blank black screen for 1-3 seconds before content appears. This looks broken and unprofessional during demos. Need a branded splash/loading screen.

## Expected Behavior

When the PWA launches, show:
1. Dark background (#09090b — matches theme)
2. SHI blood drop logo (centered, animated pulse or fade-in)
3. "Sovereign Health Intelligence" text below logo
4. Smooth transition to the actual page content

## Options

### Option A: CSS-only splash in `index.html`
Add inline CSS + logo to the HTML shell that shows immediately, hidden by JS once React mounts:
```html
<div id="splash" style="...">
  <img src="/logo.png" />
  <p>Sovereign Health Intelligence</p>
</div>
<script>
  // Hide splash when app loads
  window.addEventListener('load', () => {
    document.getElementById('splash')?.remove()
  })
</script>
```

### Option B: Next.js loading.tsx
Use Next.js App Router's `loading.tsx` convention for each route group:
```
src/app/loading.tsx → shown during route transitions
src/app/(auth)/loading.tsx → shown during auth pages
```

### Option C: Service Worker offline-first shell
Pre-cache a minimal app shell HTML that includes the splash screen. SW serves it immediately, React hydrates on top.

## Recommendation

**Option A** for immediate fix (30 min), **Option B** for proper Next.js integration.

## Files
- `frontend/src/app/layout.tsx` — add splash div before providers
- `frontend/src/app/loading.tsx` — NEW: route-level loading component
- `frontend/public/` — ensure logo.png is optimized
