# Design: Progressive Web App (PWA)

**Issue:** [#210](https://github.com/sovereignbrick/brickos/issues/210)
**Status:** Draft
**Date:** 2026-03-23
**Supersedes:** E-26_PWA_APP.md (old spec), T-0217_pwa_schema_prep.md (old spec)

## Problem

The app is only usable online via browser. Users cannot install it to their home screen, use it offline, or receive push notifications. A PWA layer would provide native-app-like experience with zero app store dependency — aligned with our sovereignty philosophy.

## Current State (Audit 2026-03-23)

### Already Done (Schema Prep)

Migration `20260314000068_pwa_schema_prep.sql` implemented all 5 T-0217 schema changes:

| Feature | Tables | Status |
|---------|--------|--------|
| `updated_at` auto-trigger | ALL tables | Applied |
| `client_id` (multi-device) | measurements, measurement_templates, user_medications, devices | Applied |
| `idempotency_key` (replay-safe writes) | measurements, measurement_templates, user_medications | Applied |
| `deleted_at` (soft delete for sync) | measurements, measurement_templates, user_medications, devices | Applied |
| `sync_version` (monotonic counter) | measurements, measurement_templates, user_medications | Applied |

Migration `20260320000100_standardize_soft_delete.sql` extended soft delete to:
- devices (backfill `deleted_at` from `is_deleted`)
- organizations
- influence_factors

### Already Done (Frontend)

| Asset | Location | Status |
|-------|----------|--------|
| Icons 192x192 | `frontend/public/android-chrome-192x192.png` | Exists but NOT in any manifest |
| Icons 512x512 | `frontend/public/android-chrome-512x512.png` | Exists but NOT in any manifest |
| Apple touch icon | `frontend/public/apple-touch-icon.png` | Referenced in layout.tsx |
| Favicon | `frontend/public/favicon.ico` | Present (278KB — oversized) |
| Viewport meta | `frontend/src/app/layout.tsx` | viewportFit: 'cover' |
| Content caching | `frontend/src/lib/content-context.tsx` | localStorage, 5-min TTL |
| Auth page no-cache | `frontend/next.config.ts` | Cache-Control: no-store on auth routes |

### Already Done (Website)

| Asset | Location | Status |
|-------|----------|--------|
| Manifest | `website/public/site.webmanifest` | Minimal — missing 192/512 icons, start_url |
| Android icons | `website/public/android-chrome-{192,512}x512.png` | Exist but NOT in manifest |

### NOT Done

| Feature | Status |
|---------|--------|
| Frontend manifest.json | Missing entirely |
| Service worker | None |
| Offline detection | No `navigator.onLine`, no online/offline events |
| Offline fallback page | None |
| IndexedDB data layer | Not implemented |
| Push notifications (backend) | No `web-push` crate, no VAPID keys |
| Push notifications (frontend) | No SW push registration |
| API cache headers | No Cache-Control/ETag on GET endpoints |
| Install prompt UX | No `beforeinstallprompt` handler |
| Background sync | No sync engine |
| PWA meta tags | Missing `apple-mobile-web-app-capable`, `theme-color` |

## Approach

### Phase 1: Installable PWA (3-5 pts)

Make the app installable on mobile and desktop. Quick win, no data layer changes.

**1a. Frontend manifest.json**
```json
{
  "name": "Sovereign Health Intelligence",
  "short_name": "SHI",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#09090b",
  "background_color": "#09090b",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ],
  "categories": ["health", "medical", "lifestyle"]
}
```

**1b. Meta tags in layout.tsx**
- `<meta name="theme-color" content="#09090b" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
- `<link rel="manifest" href="/manifest.json" />`

**1c. Basic service worker** (static asset caching only)
- Use `@serwist/next` (modern Workbox successor, built for Next.js)
- Cache strategy: stale-while-revalidate for static assets (JS/CSS/images)
- Network-first for API calls (no offline data yet)
- Offline fallback page: `/offline` with "You're offline" message

**1d. Install prompt**
- `beforeinstallprompt` handler
- Custom install banner in settings or navbar (not intrusive)

**1e. Fix website manifest**
- Add 192x192 and 512x512 icons to `site.webmanifest`
- Add `start_url`, `scope`, `categories`

### Phase 2: Offline Read (5-8 pts)

View cached data when offline. Read-only — no offline writes yet.

**2a. API cache headers**
- Rust middleware: `Cache-Control: private, max-age=300` on GET endpoints for user data
- `Cache-Control: public, max-age=3600` on content endpoints (markers, zones, tiers)
- `ETag` + `If-None-Match` for conditional requests (304 Not Modified)

**2b. Service worker API caching**
- Network-first with cache fallback for user data (`/api/v1/measurements`, `/api/v1/dashboard`)
- Cache-first for content data (`/api/v1/content/*`)
- Never cache auth endpoints

**2c. Offline detection UI**
- `navigator.onLine` + event listeners in app context
- Persistent banner: "You're offline — showing cached data"
- Grey out write actions (add measurement, import, AI chat, billing)

### Phase 3: Offline Write + Sync (8-13 pts)

Full offline-first with bidirectional sync. This is the hardest phase.

**3a. IndexedDB data layer**
- Use `idb` library (lightweight IndexedDB wrapper)
- Object stores: `measurements`, `sync_queue`, `user_profile`, `content_cache`
- Read path: IDB first → render → background API fetch → update IDB
- Write path: save to IDB + `sync_queue` → sync when online

**3b. Sync engine**
- Process `sync_queue` on reconnect
- Use `idempotency_key` (already in schema) to prevent duplicates
- Use `sync_version` (already in schema) for delta sync: `GET /sync/changes?since_version=N`
- Conflict resolution: last-write-wins with `updated_at` comparison
- Background Sync API where supported (Chrome/Android)
- New API endpoint: `GET /api/v1/sync/changes?since_version={N}&tables={list}`

**3c. Storage management**
- `navigator.storage.persist()` on install
- Quota monitoring in settings
- Periodic purge of old cached data

### Phase 4: Push Notifications (5 pts)

**4a. Backend**
- `web-push` crate + VAPID keys
- `push_subscriptions` table (user_id, endpoint, keys, created_at)
- Endpoints: `POST /push/subscribe`, `DELETE /push/unsubscribe`
- Notification triggers: measurement reminder, subscription expiry

**4b. Frontend**
- Permission request (after user action, never on page load)
- SW push event handler
- Settings toggles per notification type (EN + DE)

### Phase 5: Native Wrappers (Optional, post-launch)

- Capacitor for iOS/Android app store presence
- Tauri for desktop (Windows/macOS/Linux)
- Only if PWA limitations become blockers (Health Connect, HealthKit)

## Data Model

### Existing (from migration 068)

```
measurements:      + client_id, idempotency_key, deleted_at, sync_version
measurement_templates: + client_id, idempotency_key, deleted_at, sync_version
user_medications:  + client_id, idempotency_key, deleted_at, sync_version
devices:           + client_id, deleted_at
```

Global: `sync_version_seq` sequence, `update_sync_version()` trigger function

### New (Phase 3+)

```sql
-- New table for Phase 4
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);
```

### New API Endpoint (Phase 3)

```
GET /api/v1/sync/changes?since_version={N}&tables=measurements,user_medications
Response: {
  "changes": [...rows with sync_version > N, including soft-deleted],
  "current_version": 12345
}
```

## UI Changes

- Offline banner component (all pages)
- Install prompt (settings page or navbar)
- Settings > Data & Storage section (storage usage, clear cache)
- Settings > Notifications section (push notification toggles)

## Implementation Priority

| Phase | Effort | Impact | Dependencies |
|-------|--------|--------|-------------|
| 1. Installable PWA | 3-5 pts | High — app appears on home screen | None |
| 2. Offline Read | 5-8 pts | Medium — cached data when offline | Phase 1 |
| 3. Offline Write + Sync | 8-13 pts | High — true offline-first | Phase 2, schema already ready |
| 4. Push Notifications | 5 pts | Medium — engagement | Phase 1 |
| 5. Native Wrappers | 10+ pts | Low — marginal vs PWA | Phase 1-3 |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Service worker caching bugs (stale pages) | High | Version-based cache busting, skipWaiting + clientsClaim |
| Sync conflicts (offline writes) | High | Idempotency keys (already in schema), last-write-wins, conflict log |
| iOS PWA limitations (no background sync) | Medium | Sync on app foreground instead |
| Storage quota exceeded | Low | Monitor + warn at 80%, purge old data |

## Open Questions

- [ ] Should Phase 1 target a specific sprint or be spread across multiple?
- [ ] Do we need push notifications before BTC Prague (June 2026)?
- [ ] Should the website also be a PWA or just the app?

## References

- Old spec: `docs/project-files/design/old-design/old specs/E-26_PWA_APP.md`
- Schema prep: `docs/project-files/design/old-design/old specs/T-0217_pwa_schema_prep.md`
- Migration: `api/migrations/20260314000068_pwa_schema_prep.sql`
- Soft delete: `api/migrations/20260320000100_standardize_soft_delete.sql`
- Design 022: `docs/project-files/design/022-deployment-architecture-scaling.md` (references PWA)
