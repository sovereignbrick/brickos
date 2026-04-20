---
number: 588
title: "fix(stability): service worker post-deploy flow -- force reload on nav after update"
milestone: "Sprint 047 -- Multi-App URL Routing + Stability"
labels: [fix, stability, frontend, sw, p2]
created: 2026-04-20
priority: P2
estimate: 0.5d
---

Post Sprint 046 RC: users on a stale SW cache kept seeing old
code even after deploy, until they manually cleared site data. Current
`src/sw.ts` has `skipWaiting: true` + `clientsClaim: true`, which means
a new SW installs immediately but existing clients keep using the old
cache until they navigate or refresh.

## Scope

When a new SW takes control (`controllerchange` event), force an
automatic reload of the active tab so the client picks up the new
precache + new HTML:

```ts
// In a small client helper loaded by the root layout:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!window.__brickosReloading) {
      window.__brickosReloading = true
      window.location.reload()
    }
  })
}
```

Combined with #586 (build-ID banner), this gives two levels:
1. Passive banner "new version available, refresh"
2. When the user DOES refresh / navigate, the SW controllerchange
   kicks in and hard-reloads without keeping the old layout chunks

## Risk

Auto-reload on controller change can feel sudden if a save is
in-flight. Guard with `__brickosReloading` flag + debounce so we
don't reload in a loop.

## Acceptance

- Deploy a new SW -> existing tabs auto-reload within ~5s of next
  navigation / focus
- No reload loop
- No data loss on open forms (controllerchange fires BEFORE navigate,
  browsers preserve form state across `location.reload()`)

## Why this goes in Sprint 047

Halves the "why doesn't my testing show the new code" pain that cost
3 RC rounds during Sprint 046.
