# Sprint 011 — Progressive Web App (Full Stack: Installable → Offline Sync → Push)

**Started:** 2026-03-24
**Completed:** 2026-03-24
**Goal:** Ship the complete PWA stack — installable app, service worker caching, offline detection, offline write with sync engine, and push notification infrastructure.

## Context

Sprint 010 delivered Sovereign Link (URL shortener + affiliate short links). Sprint 011 shifts to user experience — making the app feel native. The PWA schema prep (migration 068: `updated_at`, `client_id`, `idempotency_key`, `deleted_at`, `sync_version`) was done months ago. The frontend had icons but no manifest, no service worker, and no offline capability.

Design doc: `docs/project-files/design/023-progressive-web-app.md`

## Completed

### Phase 1 — Installable PWA (P0)

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `manifest.json` with icons, start_url, display: standalone | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: PWA meta tags in layout.tsx (theme-color, apple-mobile-web-app-capable) | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: service worker with @serwist/next (static asset caching) | 5 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline fallback page (`/offline`) | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `beforeinstallprompt` handler + install button in settings | 2 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | fix: website `site.webmanifest` — add 192/512 icons, start_url | 1 | a484053 |
| | **Phase 1 Total** | **11** | |

### Phase 2 — Offline Read + API Caching (P1)

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: Rust cache middleware (Cache-Control on GET endpoints) | 3 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW network-first caching for user data API calls | 3 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW cache-first for content endpoints (markers, zones, tiers) | 2 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline detection context + banner UI (EN + DE) | 2 | ea3c020 |
| | **Phase 2 Total** | **10** | |

### Quick Wins

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: grey out write actions when offline (measurements, chat, billing) | 2 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `navigator.storage.persist()` on install + standalone mode | 1 | 7498a14 |
| | **Quick Wins Total** | **3** | |

### Phase 3 — Offline Write + Sync

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `GET /sync/version` + `GET /sync/changes` endpoints | 3 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: idempotent measurement creation (ON CONFLICT idempotency_key) | 1 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: DELETE sets `deleted_at` for sync visibility | 1 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: IndexedDB layer — sync_queue, sync_state, measurements_cache (`idb`) | 3 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SyncContext — push/pull engine, auto-sync on online, 60s interval | 3 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: measurement form queues writes offline with idempotency keys | 2 | 7498a14 |
| | **Phase 3 Total** | **13** | |

### Phase 4 — Push Notifications

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `push_subscriptions` migration + VAPID config | 1 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `POST /push/subscribe`, `DELETE /push/unsubscribe`, `GET /push/vapid-key` | 2 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: PushContext + SW push/notificationclick handlers | 1 | 7498a14 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: push notification toggle in Settings (EN + DE) | 1 | 7498a14 |
| | **Phase 4 Total** | **5** | |

## Carried Over

None — all phases delivered.

## Velocity

| Metric | Value |
|--------|-------|
| Phase 1 (Installable) | 11 pts |
| Phase 2 (Offline Read) | 10 pts |
| Quick Wins | 3 pts |
| Phase 3 (Offline Write + Sync) | 13 pts |
| Phase 4 (Push Notifications) | 5 pts |
| **Total delivered** | **42 pts** |
| Commits | 4 (+ 1 docs) |
| New files | 15 |
| New migration | 1 (`push_subscriptions`) |
| New API endpoints | 5 (`/sync/version`, `/sync/changes`, `/push/vapid-key`, `/push/subscribe`, `/push/unsubscribe`) |
| New frontend contexts | 4 (Install, Offline, Sync, Push) |
| New dependencies | `@serwist/next`, `serwist`, `idb` |

## Architecture Delivered

```
frontend/public/
├── manifest.json                      ← NEW: PWA manifest

frontend/src/
├── sw.ts                              ← NEW: service worker (precache + API caching + push)
├── app/offline/page.tsx               ← NEW: offline fallback (i18n EN+DE)
├── lib/install-context.tsx            ← NEW: beforeinstallprompt + isInstalled + storage.persist
├── lib/offline-context.tsx            ← NEW: navigator.onLine detection
├── lib/sync-context.tsx               ← NEW: push/pull sync engine + offline queue
├── lib/push-context.tsx               ← NEW: Web Push subscription management
├── lib/db.ts                          ← NEW: IndexedDB layer (idb)
├── components/offline-banner.tsx      ← NEW: persistent offline banner

api/src/
├── middleware/cache.rs                ← NEW: Cache-Control by route pattern
├── handlers/sync.rs                   ← NEW: sync endpoints (version, changes)
├── handlers/push.rs                   ← NEW: push subscription CRUD
├── models/sync.rs                     ← NEW: sync response types
├── migrations/20260324000003_push_subscriptions.sql ← NEW

website/public/
├── site.webmanifest                   ← UPDATED: 192/512 icons + start_url
├── android-chrome-{192,512}x512.png   ← NEW (copied from frontend)
```

### Key Technical Decisions

1. **@serwist/next v9.5.7** over next-pwa — actively maintained, App Router support, Workbox strategies
2. **`next build --webpack`** — @serwist/next doesn't support Turbopack yet (tracking: serwist/serwist#54)
3. **`tsconfig.json` adds `webworker` lib** — required for `ServiceWorkerGlobalScope` types
4. **Cache middleware is additive** — only sets `Cache-Control` if not already set by handler
5. **API caching layered** — Rust middleware (HTTP headers) + SW (client-side strategies)
6. **Install prompt in Settings > Profile** — non-intrusive, hidden when installed
7. **Idempotent writes** — `ON CONFLICT (idempotency_key) DO NOTHING` prevents duplicate offline replays
8. **Sync engine: push-then-pull** — push offline queue first, then pull server changes, 60s auto-sync
9. **IndexedDB via `idb`** — lightweight (1.5KB), typed wrapper, 3 stores (queue, state, cache)
10. **No `web-push` crate** — subscription management only; actual push sending deferred (avoids native-tls dep)
11. **VAPID keys via env vars** — `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, optional (push degrades gracefully)

### Cache Strategy Summary

| Route | HTTP Cache-Control | SW Strategy |
|-------|-------------------|-------------|
| `GET /v1/content/*` | `public, max-age=3600` | Cache-first (1h TTL) |
| `GET /api/tiers/*`, `/api/config/*` | `public, max-age=1800` | Cache-first (30m TTL) |
| `GET /dashboard` | `private, max-age=60` | Network-first (10m fallback) |
| `GET /measurements` | `private, max-age=300` | Network-first (10m fallback) |
| `GET /markers/*` (user) | `private, max-age=300` | Network-first (10m fallback) |
| `GET /zones/*` | — | Cache-first (1h TTL) |
| `GET /health` | `no-cache` | — |
| `POST/PUT/DELETE *` | `no-store` | — |
| Auth, billing, affiliate | `no-store, no-cache` | Network-only |

### Sync Architecture

```
Online:  Form submit → API call → response → UI update
Offline: Form submit → IndexedDB sync_queue → toast "saved offline"
                                    ↓ (on reconnect)
                        Push queue → API (idempotency_key dedup)
                        Pull changes → merge into measurements_cache
                        Update sync_state.lastSyncVersion
```

- **Push:** Sequential, stops on network error, max 3 retries per entry
- **Pull:** `GET /sync/changes?since_version=N` returns all changed rows (including soft-deleted)
- **Auto-sync:** Every 60s when online + on `online` event
- **Client ID:** Generated once per device, stored in IndexedDB `sync_state`

## Testing Checklist

### Phase 1 — Installable
- [ ] Lighthouse PWA audit score > 90
- [ ] Chrome DevTools > Application > Manifest shows correct data
- [ ] Android: "Add to Home Screen" prompt appears
- [ ] iOS Safari: "Add to Home Screen" works, standalone mode
- [ ] Desktop Chrome: install icon in address bar
- [ ] Service worker registered in DevTools > Application > Service Workers
- [ ] Offline fallback: disconnect → navigate → see offline page
- [ ] Install button in Settings works and hides after install

### Phase 2 — Offline Read
- [ ] API responses include Cache-Control headers
- [ ] Dashboard loads from cache when offline (after first visit)
- [ ] Content data (markers, zones) loads from cache
- [ ] Offline banner appears/disappears correctly
- [ ] Reconnect: banner disappears, fresh data loads

### Phase 3 — Offline Write + Sync
- [ ] Create measurement offline → queued in IndexedDB
- [ ] Toast shows "Saved offline — will sync when connected"
- [ ] Reconnect → queue pushes to server with idempotency_key
- [ ] `GET /sync/changes?since_version=0` returns data
- [ ] Duplicate idempotency_key returns existing row (no duplicate)
- [ ] Deleted measurements include `deleted_at` in sync response
- [ ] Write buttons greyed out on billing, disabled on chat when offline

### Phase 4 — Push Notifications
- [ ] `GET /push/vapid-key` returns public key
- [ ] Subscribe button in Settings triggers permission prompt
- [ ] Subscription saved in `push_subscriptions` table
- [ ] Unsubscribe removes from table + browser
- [ ] SW shows notification on push event
- [ ] Notification click navigates to correct URL
- [ ] Toggle hidden when browser doesn't support push

## Sprint 012 Preview

**Sprint 012 — Production Release + PWA Hardening**
- Version bump, staging deploy, promote to production
- Generate VAPID keys for staging/production
- Push notification triggers (measurement reminders, subscription expiry)
- Web Push sending logic (RFC 8291 encryption via `reqwest`)
- Storage quota monitoring in Settings
- Sync conflict resolution UI (if needed)

## Notes / Decisions

- @serwist/next over next-pwa — actively maintained, App Router support
- Manifest uses `start_url: "/dashboard"` not `/` — users land on their data
- Service worker disabled in development (`NODE_ENV === "development"`)
- `skipWaiting: true` + `clientsClaim: true` — new SW activates immediately
- Offline fallback is a simple page, not a cached shell
- API cache headers are additive — no existing behavior changes
- Install prompt only in Settings, not a popup — respects user attention
- iOS limitations: no background sync, push only on 16.4+ home screen
- `next build --webpack` required until @serwist/next supports Turbopack
- Generated `sw.js` and `serwist-worker-*.js` added to `.gitignore`
- Push sending deferred — storing subscriptions now, sending when triggers exist
- Sync uses existing migration 068 columns — no new schema changes needed for core sync
- Offline measurement creation uses same form UX, just different backend path
