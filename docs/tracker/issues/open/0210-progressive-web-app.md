---
github_number: 210
title: "feat: Progressive Web App — installable, offline-capable, push notifications"
milestone: ux-and-onboarding
labels: [feat]
points: 0
---

## Description
Build a PWA layer on the existing Next.js frontend. One codebase serves desktop browsers, mobile browsers, and installable home-screen apps.

Phased approach:
1. **Installable PWA** (3-5 pts) — manifest, service worker, install prompt
2. **Offline Read** (5-8 pts) — API cache headers, SW caching, offline detection UI
3. **Offline Write + Sync** (8-13 pts) — IndexedDB, sync engine, conflict resolution
4. **Push Notifications** (5 pts) — VAPID, push subscriptions, notification toggles
5. **Native Wrappers** (optional) — Capacitor iOS/Android, Tauri desktop

## Pre-work Already Done
- Schema prep migration (068): `updated_at`, `client_id`, `idempotency_key`, `deleted_at`, `sync_version` on core tables
- Soft delete standardization (100): devices, organizations, influence_factors
- Icons exist: `android-chrome-192x192.png`, `android-chrome-512x512.png` (not yet in manifest)
- Content caching: localStorage with 5-min TTL in content-context.tsx
- Auth pages: already have `Cache-Control: no-store`

## Design Doc
apps/health/sovereign-health/docs/project-files/design/023-progressive-web-app.md
