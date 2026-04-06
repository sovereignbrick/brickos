# Release v0.27.0

**Date:** 2026-03-24
**Sprints:** 010 (Sovereign Link) + 011 (PWA Full Stack)
**Previous:** v0.26.0
**Velocity:** 68 pts (26 + 42)

---

## Highlights

- **Progressive Web App** -- full PWA stack: installable on desktop/mobile, service worker with asset + API caching, offline fallback page, offline write queue with sync engine, push notification infrastructure.
- **Sovereign Link** -- new URL shortener crate (`sovereign-link`) with branded affiliate links (`brickos.io/r/`), QR code generation, vanity codes for premium tiers, admin Links tab with click analytics.
- **Offline-first architecture** -- IndexedDB-backed sync queue with idempotency keys, push-then-pull sync engine, auto-sync on reconnect. Measurements can be created offline and synced when back online.
- **Cache middleware** -- Rust HTTP Cache-Control middleware sets appropriate headers by route pattern. Service worker layers client-side caching strategies on top.
- **Graceful error handling** -- network errors show user-friendly messages instead of raw "Failed to fetch". Offline banner appears automatically when connection is lost.
- **Push notifications** -- subscription management (VAPID), service worker push/click handlers, settings toggle. Sending logic deferred to next release.

---

## Features

### PWA — Installable (#210 -- 11pts)
- `manifest.json` with name, icons (192/512), start_url `/dashboard`, display `standalone`
- PWA meta tags: `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- Service worker via `@serwist/next` v9.5.7 (static asset precaching, runtime caching)
- Offline fallback page `/offline` (EN + DE) with retry button
- `beforeinstallprompt` handler + install button in Settings > Profile
- `navigator.storage.persist()` on install for durable storage
- Website `site.webmanifest` updated with 192/512 icons

### PWA — Offline Detection (#210 -- 12pts)
- `OfflineContext` provider tracking `navigator.onLine` + events
- Persistent offline banner: "You're offline — showing cached data" (EN + DE)
- Write actions disabled when offline (measurements, chat, billing)
- Rust `CacheMiddleware` sets `Cache-Control` by route pattern:
  - Content: `public, max-age=3600`
  - User data: `private, max-age=60-300`
  - Mutations: `no-store`
  - Health: `no-cache`
- SW API caching: cache-first for content/zones, network-first for dashboard/measurements, network-only for auth/billing

### PWA — Offline Write + Sync (#210 -- 13pts)
- `GET /sync/version` — current global sync_version
- `GET /sync/changes?since_version=N` — delta sync for measurements, templates, medications
- Idempotent measurement creation: `ON CONFLICT (idempotency_key) DO NOTHING`
- `DELETE /measurements/{id}` now sets `deleted_at` for sync visibility
- IndexedDB data layer (`idb`): sync_queue, sync_state, measurements_cache
- `SyncContext` provider: push/pull engine, auto-sync on reconnect, 60s interval
- Measurement form queues writes offline with toast "Saved offline — will sync when connected"

### PWA — Push Notifications (#210 -- 5pts)
- `push_subscriptions` table (user_id, endpoint, keys, user_agent)
- `POST /push/subscribe`, `DELETE /push/unsubscribe`, `GET /push/vapid-key`
- SW `push` + `notificationclick` event handlers
- `PushContext` provider: permission management, subscribe/unsubscribe flow
- Settings toggle for push notifications (EN + DE)
- VAPID keys via env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)

### Sovereign Link (#151 -- 26pts)
- New crate: `apps/technology/sovereign-link/` (library, 10 source files)
- `GET /r/{code}` redirect handler with click tracking
- `GET /r/{code}.qr` SVG QR code generation
- Auto-created short links for existing affiliate codes (backfill)
- Vanity codes for Clarity/Horizon tier (server-side tier check)
- Admin "Links" tab with click stats, filters, campaign creation
- Affiliate page shows `brickos.io/r/` short URL + QR code
- nginx config: `brickos.io/r/*` → health API

### UX Improvements
- Graceful network error messages (EN + DE) instead of raw "Failed to fetch"
- Login page network error: "Unable to connect. Check your internet connection and try again."
- API request wrapper catches `TypeError` from failed fetch

---

## Infrastructure

- `@serwist/next` v9.5.7 for service worker (replaces no previous SW)
- `idb` v8.0.3 for IndexedDB access
- `next build --webpack` required (Turbopack doesn't support @serwist/next yet)
- `tsconfig.json` adds `webworker` lib for SW types
- nginx: PWA files (manifest, sw.js, /offline, icons) bypass basic auth on staging
- nginx: basic auth removed from staging API (breaks CORS preflight)
- Staging smoke test script: `ops/staging-smoke-test.sh` (30+ automated checks)
- RC testing checklist: 24 layers, 100+ test items

---

## Database Changes

### New Migration
- `20260324000003_push_subscriptions.sql` — push notification subscription storage

### Existing Schema Used (no changes)
- Migration 068 columns now populated: `client_id`, `idempotency_key`, `deleted_at`, `sync_version`
- `sync_version_seq` sequence + triggers active on measurements, templates, medications

---

## Breaking Changes

None.

---

## Known Limitations

- Push notification sending not yet implemented (subscriptions stored, triggers TBD)
- iOS PWA: no background sync (Apple limitation), push only on 16.4+ home screen
- `@serwist/next` doesn't support Turbopack — build uses `--webpack` flag
- Offline write queue currently supports measurements only (templates, medications TBD)

---

## Version Info

| Component | Version |
|-----------|---------|
| Backend | 0.27.0 |
| Frontend | 0.27.0 |
| Sovereign Link | 0.1.0 |
| @serwist/next | 9.5.7 |
| idb | 8.0.3 |
| Next.js | 16.1.6 |
