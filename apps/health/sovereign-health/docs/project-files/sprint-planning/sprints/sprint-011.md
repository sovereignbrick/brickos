# Sprint 011 — Progressive Web App (Phase 1: Installable + Offline Detection)

**Started:** 2026-03-24
**Goal:** Make Sovereign Health installable on mobile/desktop home screens, add basic service worker for asset caching, implement offline detection UI, and add API cache headers for faster loads.

## Context

Sprint 010 delivered Sovereign Link (URL shortener + affiliate short links). Sprint 011 shifts to user experience — making the app feel native. The PWA schema prep (migration 068: `updated_at`, `client_id`, `idempotency_key`, `deleted_at`, `sync_version`) was done months ago. The frontend has icons but no manifest, no service worker, and no offline capability.

Design doc: `docs/project-files/design/023-progressive-web-app.md`

**What exists:**
- Icons: `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png` (all in `frontend/public/`)
- Viewport: `viewportFit: 'cover'` in layout.tsx
- Content caching: localStorage with 5-min TTL (`content-context.tsx`)
- Auth no-cache: `Cache-Control: no-store` on checkout/signup/login/settings
- Schema: sync columns on core tables (migration 068)

**What's missing:**
- `manifest.json` (frontend has none)
- Service worker (none)
- Offline detection / fallback
- API cache headers (no `Cache-Control` on GET endpoints)
- PWA meta tags (`theme-color`, `apple-mobile-web-app-capable`)
- Install prompt UX

## Planned

### P0 — Installable PWA (must complete)

| # | Title | Points | Area |
|---|-------|--------|------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `manifest.json` with icons, start_url, display: standalone | 1 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: PWA meta tags in layout.tsx (theme-color, apple-mobile-web-app-capable) | 1 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: service worker with @serwist/next (static asset caching) | 5 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline fallback page (`/offline`) | 1 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: `beforeinstallprompt` handler + install button in settings | 2 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | fix: website `site.webmanifest` — add 192/512 icons, start_url | 1 | Website |
| | **P0 Subtotal** | **11** | |

### P1 — Offline Read + API Caching (if time permits)

| # | Title | Points | Area |
|---|-------|--------|------|
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: Rust cache middleware (Cache-Control on GET endpoints) | 3 | API |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW network-first caching for user data API calls | 3 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: SW cache-first for content endpoints (markers, zones, tiers) | 2 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: offline detection context + banner UI (EN + DE) | 2 | Frontend |
| [#210](https://github.com/sovereignbrick/brickos/issues/210) | feat: grey out write actions when offline | 2 | Frontend |
| | **P1 Subtotal** | **12** | |

## Technical Approach

### Manifest (`frontend/public/manifest.json`)

```json
{
  "name": "Sovereign Health Intelligence",
  "short_name": "SHI",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
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

### Meta Tags (in `layout.tsx` metadata export)

```typescript
export const metadata: Metadata = {
  // ... existing fields
  manifest: '/manifest.json',
  themeColor: '#09090b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sovereign Health',
  },
}
```

Next.js 16 handles these natively via the `Metadata` type — no raw `<meta>` tags needed.

### Service Worker (@serwist/next)

**Why @serwist/next over next-pwa:**
- `next-pwa` is unmaintained (last release 2023)
- `@serwist/next` is the active successor, built for Next.js App Router
- Workbox strategies under the hood, but with Next.js-aware routing

**Setup:**

```bash
pnpm add @serwist/next && pnpm add -D serwist
```

**`next.config.ts`:**
```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(withNextIntl(nextConfig));
```

**`src/sw.ts`** (service worker source):
```typescript
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
```

**Caching strategies (from `defaultCache`):**
- **Precache:** Next.js build assets (JS chunks, CSS)
- **Stale-while-revalidate:** static assets (images, fonts)
- **Network-first:** page navigations (with `/offline` fallback)
- **Network-only:** API calls (P0 — no API caching yet)

### Offline Fallback Page (`src/app/offline/page.tsx`)

Simple page shown when network is unavailable and no cached page exists:

```tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">You're offline</h1>
        <p className="text-muted-foreground">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="...">
          Retry
        </button>
      </div>
    </div>
  )
}
```

### Install Prompt

**Context provider** (`src/lib/install-context.tsx`):
```typescript
// Captures beforeinstallprompt event
// Exposes: canInstall, promptInstall(), isInstalled
// isInstalled: checks display-mode: standalone media query
```

**UI:** Button in Settings page (not intrusive popup):
```
Settings > App
┌──────────────────────────────────────┐
│  Install Sovereign Health            │
│  Add to your home screen for quick   │
│  access.                             │
│                                      │
│  [Install App]                       │
└──────────────────────────────────────┘
```

Hidden if already installed (`display-mode: standalone`).

### P1: API Cache Headers (Rust Middleware)

New Actix middleware that sets `Cache-Control` based on route pattern:

| Route pattern | Cache-Control | Reason |
|---------------|---------------|--------|
| `GET /api/v1/content/*` | `public, max-age=3600` | Markers, zones, tiers change rarely |
| `GET /api/v1/dashboard` | `private, max-age=60` | User data, short cache |
| `GET /api/v1/measurements` | `private, max-age=300` | User data, moderate cache |
| `GET /health` | `no-cache` | Always fresh |
| `POST/PUT/DELETE *` | `no-store` | Mutations never cached |
| Auth routes | `no-store, no-cache` | Already set in next.config.ts |

### P1: Offline Detection Context

```typescript
// src/lib/offline-context.tsx
// - Listens to navigator.onLine + online/offline events
// - Provides: { isOffline: boolean }
// - When offline: shows persistent banner at top of page
// - Grey out: "Add Measurement", "Import", "Dr. Alex", "Billing" buttons
```

Banner (i18n):
- EN: "You're offline — showing cached data"
- DE: "Du bist offline — gespeicherte Daten werden angezeigt"

### P1: SW API Caching Strategies

| Endpoint | Strategy | Why |
|----------|----------|-----|
| `/api/v1/content/*` | Cache-first, refresh in background | Content rarely changes |
| `/api/v1/dashboard` | Network-first, fallback to cache | Show stale data vs blank |
| `/api/v1/measurements` | Network-first, fallback to cache | User data, prefer fresh |
| `/api/v1/zones/*` | Cache-first, refresh in background | Zone data is stable |
| `/api/affiliate/*` | Network-only | Needs real-time data |
| `/auth/*`, `/billing/*` | Network-only | Security-sensitive |

## Execution Order

```
Step 1: manifest.json + meta tags                    → 30 min
  Create frontend/public/manifest.json
  Add manifest + themeColor + appleWebApp to layout.tsx metadata
  Fix website site.webmanifest (add 192/512 icons)

Step 2: @serwist/next setup                          → 1-2 hrs
  pnpm add @serwist/next serwist
  Create src/sw.ts with defaultCache + offline fallback
  Wrap next.config.ts with withSerwist
  Verify: build succeeds, sw.js generated in public/

Step 3: Offline fallback page                        → 30 min
  Create src/app/offline/page.tsx (EN + DE)
  Verify: disconnect network → navigate → see offline page

Step 4: Install prompt                               → 1 hr
  Create src/lib/install-context.tsx
  Add InstallProvider to layout.tsx
  Add install button to Settings page
  Verify: Chrome shows install prompt, button works

Step 5 (P1): API cache headers                       → 1 hr
  Create middleware/cache.rs
  Register in main.rs
  Verify: curl -I shows Cache-Control headers

Step 6 (P1): Offline detection + SW API caching      → 2 hrs
  Create src/lib/offline-context.tsx
  Add OfflineProvider to layout.tsx
  Add OfflineBanner component
  Configure SW runtime caching for API routes
  Verify: go offline → banner shows, cached data loads
```

## Docker Considerations

The service worker (`sw.js`) is generated at build time by @serwist/next. The standalone Next.js output includes it. No Docker changes needed — the existing `pnpm build` + `standalone` output handles it.

**Important:** Service worker scope is `/` — it intercepts all navigations under the domain. The `swDest: "public/sw.js"` ensures it's served from root.

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
- [ ] Write actions greyed out when offline
- [ ] Reconnect: banner disappears, fresh data loads

## Velocity Budget

| Budget | Points |
|--------|--------|
| Multi-day sprint (2-3 days) | ~25-35 pts |
| P0 (must ship) | 11 pts |
| P1 (stretch) | 12 pts |
| Unplanned buffer (~30%) | ~7 pts |

## Sprint 012 Preview

**Sprint 012 — PWA Phase 2: Offline Write + Sync** (if P1 ships in 011)
- IndexedDB data layer (`idb` library)
- Offline measurement entry → sync queue
- Sync engine with `idempotency_key` and `sync_version`
- `GET /api/v1/sync/changes?since_version={N}` endpoint
- Storage persistence + quota management

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
