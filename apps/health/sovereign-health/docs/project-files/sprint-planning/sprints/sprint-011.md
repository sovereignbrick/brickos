# Sprint 011 — Progressive Web App (Phase 1: Installable + Offline Detection)

**Started:** 2026-03-24
**Completed:** 2026-03-24
**Goal:** Make Sovereign Health installable on mobile/desktop home screens, add basic service worker for asset caching, implement offline detection UI, and add API cache headers for faster loads.

## Context

Sprint 010 delivered Sovereign Link (URL shortener + affiliate short links). Sprint 011 shifts to user experience — making the app feel native. The PWA schema prep (migration 068: `updated_at`, `client_id`, `idempotency_key`, `deleted_at`, `sync_version`) was done months ago. The frontend has icons but no manifest, no service worker, and no offline capability.

Design doc: `docs/project-files/design/023-progressive-web-app.md`

## Completed

### P0 — Installable PWA

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `manifest.json` with icons, start_url, display: standalone | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: PWA meta tags in layout.tsx (theme-color, apple-mobile-web-app-capable) | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: service worker with @serwist/next (static asset caching) | 5 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline fallback page (`/offline`) | 1 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `beforeinstallprompt` handler + install button in settings | 2 | a484053 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | fix: website `site.webmanifest` — add 192/512 icons, start_url | 1 | a484053 |
| | **P0 Total** | **11** | |

### P1 — Offline Read + API Caching

| # | Title | Points | Commits |
|---|-------|--------|---------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: Rust cache middleware (Cache-Control on GET endpoints) | 3 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW network-first caching for user data API calls | 3 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW cache-first for content endpoints (markers, zones, tiers) | 2 | ea3c020 |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline detection context + banner UI (EN + DE) | 2 | ea3c020 |
| | **P1 Total** | **10** | |

## Carried Over

| Title | Points | Reason |
|-------|--------|--------|
| feat: grey out write actions when offline | 2 | Foundation built (`useOffline()` hook available), individual component integration deferred to Sprint 012 |

## Velocity

| Metric | Value |
|--------|-------|
| Planned (P0) | 11 pts |
| Planned (P1) | 12 pts |
| Completed (P0) | 11 pts |
| Completed (P1) | 10 pts |
| Carried over | 2 pts |
| Total delivered | 21 pts |
| Commits | 2 |

## Architecture Delivered

```
frontend/public/
├── manifest.json                      ← NEW: PWA manifest

frontend/src/
├── sw.ts                              ← NEW: service worker (precache + API caching)
├── app/offline/page.tsx               ← NEW: offline fallback (i18n EN+DE)
├── lib/install-context.tsx            ← NEW: beforeinstallprompt + isInstalled
├── lib/offline-context.tsx            ← NEW: navigator.onLine detection
├── components/offline-banner.tsx      ← NEW: persistent offline banner

api/src/middleware/
├── cache.rs                           ← NEW: Cache-Control by route pattern

website/public/
├── site.webmanifest                   ← UPDATED: 192/512 icons + start_url
├── android-chrome-192x192.png         ← NEW (copied from frontend)
├── android-chrome-512x512.png         ← NEW (copied from frontend)
```

### Key Technical Decisions

1. **@serwist/next v9.5.7** over next-pwa — actively maintained, App Router support, Workbox strategies under the hood
2. **`next build --webpack`** — @serwist/next doesn't support Turbopack yet; Next.js 16 defaults to Turbopack, so webpack must be explicit for SW generation
3. **`tsconfig.json` adds `webworker` lib** — required for `ServiceWorkerGlobalScope` types in `sw.ts`
4. **Cache middleware is additive** — only sets `Cache-Control` if not already set by handler, so explicit handler headers take precedence
5. **API caching layered** — Rust middleware sets HTTP headers (CDN/browser cache), SW adds client-side cache strategies (offline resilience)
6. **Install prompt in Settings > Profile** — non-intrusive, shown only when `beforeinstallprompt` fires, hidden when installed

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

## Testing Checklist

### P0 — Installable
- [ ] Lighthouse PWA audit score > 90
- [ ] Chrome DevTools > Application > Manifest shows correct data
- [ ] Android: "Add to Home Screen" prompt appears
- [ ] iOS Safari: "Add to Home Screen" works, standalone mode
- [ ] Desktop Chrome: install icon in address bar
- [ ] Service worker registered in DevTools > Application > Service Workers
- [ ] Offline fallback: disconnect → navigate → see offline page
- [ ] Install button in Settings works and hides after install

### P1 — Offline Read
- [ ] API responses include Cache-Control headers
- [ ] Dashboard loads from cache when offline (after first visit)
- [ ] Content data (markers, zones) loads from cache
- [ ] Offline banner appears/disappears correctly
- [ ] Reconnect: banner disappears, fresh data loads

## Sprint 012 Preview

**Sprint 012 — PWA Phase 2: Offline Write + Sync** (P1 shipped in 011)
- IndexedDB data layer (`idb` library)
- Offline measurement entry → sync queue
- Sync engine with `idempotency_key` and `sync_version`
- `GET /api/v1/sync/changes?since_version={N}` endpoint
- Storage persistence + quota management
- Grey out write actions when offline (carried from 011)

Or: **Sprint 012 — Production Release** (version bump, staging test, promote)

## Notes / Decisions

- @serwist/next over next-pwa — actively maintained, App Router support
- Manifest uses `start_url: "/dashboard"` not `/` — users land on their data, not landing page
- Service worker disabled in development (`NODE_ENV === "development"`) to avoid caching issues
- `skipWaiting: true` + `clientsClaim: true` — new SW activates immediately, no "refresh to update"
- Offline fallback is a simple page, not a cached shell — keeps Phase 1 scope small
- API cache headers are additive — no existing behavior changes, just new response headers
- Install prompt only in Settings, not a popup — respects user attention
- iOS limitations: no background sync, push only on 16.4+ home screen. Accept for now.
- `next build --webpack` required until @serwist/next supports Turbopack (tracking: serwist/serwist#54)
- Generated `sw.js` and `serwist-worker-*.js` added to `.gitignore` — build artifacts, not source
