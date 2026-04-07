# 015 - BrickOS Unified App Routing

**Status:** Draft
**Author:** Helmut / Claude
**Date:** 2026-04-07
**Related:** 014-brickos-platform-gui, 005-platform-multi-tenant

---

## 1. Vision

All BrickOS apps accessible under a single domain (`app.brickos.io`) with path-based routing. Each app retains its own domain for direct access, but the platform provides a unified entry point.

```
app.brickos.io/platform/        -> BrickOS Platform Admin GUI
app.brickos.io/health/           -> Sovereign Health Intelligence (SHI)
app.brickos.io/links/            -> Sovereign Link management UI
app.brickos.io/voice/            -> Sovereign Voice dashboard
app.brickos.io/exchange/         -> Sovereign Exchange (future)
app.brickos.io/identity/         -> Sovereign Identity (future)

api.brickos.io/                  -> Unified API gateway
```

Legacy domains continue to work (no breaking changes):
```
app.sovereignhealth.io           -> SHI (same as app.brickos.io/health/)
brickos.io/r/{code}             -> Sovereign Link redirects (unchanged)
```

---

## 2. Routing Architecture

```
                    ┌─────────────────────────────┐
                    │       Cloudflare CDN         │
                    │    *.brickos.io (proxied)    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │         nginx (VPS)          │
                    │    app.brickos.io:443        │
                    └─────────────┬───────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬──────────┐
          │           │           │           │          │
     /platform/   /health/    /links/     /voice/   /r/{code}
          │           │           │           │          │
          v           v           v           v          v
     SHI Frontend SHI Frontend  (future)  (future)  SHI Backend
     :3000        :3000         :3002     :3003     :8080
     /platform/*  /*            /*        /*        /r/*
```

### Phase 1 (Now): Path rewriting via nginx

All apps are currently served by the SHI frontend container. The `/platform/` routes are already there. For SHI health app access via `/health/`, nginx rewrites:

```nginx
# app.brickos.io
location /health/ {
    # Strip /health/ prefix, proxy to SHI frontend
    rewrite ^/health/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:3000;
}

location /platform/ {
    proxy_pass http://127.0.0.1:3000/platform/;
}

location /links/ {
    # Future: Sovereign Link standalone web UI
    rewrite ^/links/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:3002;
}

location / {
    # Default: redirect to /platform/ (admin landing)
    return 302 /platform/;
}
```

### Phase 2 (Future): Separate frontend containers

When each app has its own frontend, nginx routes to the correct container:

```
/platform/  -> brickos-platform:3000 (dedicated platform app)
/health/    -> sovereign-health-frontend:3001
/links/     -> sovereign-link-frontend:3002
/voice/     -> sovereign-voice-frontend:3003
```

### Phase 3 (Future): API gateway

```
api.brickos.io/v1/health/*     -> SHI backend :8080
api.brickos.io/v1/links/*      -> Sovereign Link (already in SHI backend)
api.brickos.io/v1/voice/*      -> Sovereign Voice API (future)
api.brickos.io/v1/platform/*   -> Platform API
```

---

## 3. Next.js basePath Configuration

For SHI to work under both `/` (direct domain) and `/health/` (brickos.io), we need conditional basePath:

**Option A: nginx rewrite (no code change)**
- nginx strips `/health/` prefix before proxying
- SHI frontend doesn't know it's under `/health/`
- Links within the app use relative paths (already do)
- External links (emails, QR codes) use the direct domain

**Option B: basePath in next.config.ts**
- Build separate images per deployment context
- More complex, not needed for Phase 1

**Recommended: Option A** -- nginx rewrite is simpler and requires no frontend changes.

---

## 4. Shared Navigation

When a user is on `app.brickos.io`, a top-level app switcher shows all available apps:

```
┌─────────────────────────────────────────────────────────────────┐
│  ■ BrickOS    [Platform]  [Health]  [Links]  [Voice]    Helmut │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  (Current app content renders here)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This can be a shared header component injected via nginx sub-request or a shared React package in `packages/brickos-nav/`.

---

## 5. Auth Across Apps

All apps share the same JWT (issued by brickos-auth). The token cookie domain should be set to `.brickos.io` so it's accessible across all subdomains:

```typescript
// Cookie domain for brickos.io
Cookies.set('auth_token', token, {
  domain: window.location.hostname.endsWith('.brickos.io') ? '.brickos.io' : undefined,
  secure: true,
  sameSite: 'lax',
})
```

This way, logging in on `app.brickos.io/health/` makes the token available on `app.brickos.io/platform/` and `app.brickos.io/links/` automatically.

---

## 6. Implementation Phases

### Phase 1 (Sprint 031): nginx path routing
- Add `/health/` rewrite rule in nginx for app.brickos.io
- Add `/platform/` pass-through (already works)
- Default `/` redirects to `/platform/`
- Cookie domain set to `.brickos.io`

### Phase 2 (Sprint 033+): Separate app containers
- Sovereign Link gets its own frontend (standalone web UI already exists)
- Sovereign Voice gets a dashboard frontend
- Each runs in its own container with its own port

### Phase 3 (Sprint 035+): API gateway + app switcher
- Shared nav component for app switching
- Unified API gateway with path-based routing
- Service mesh for inter-app communication

---

## 7. Domain Map (Complete)

| Domain | Purpose | Target |
|--------|---------|--------|
| brickos.io | Marketing website (static) | /opt/brickos/website |
| app.brickos.io | Unified app entry point | nginx -> containers |
| app.brickos.io/platform/ | Platform admin GUI | SHI frontend :3000 |
| app.brickos.io/health/ | SHI health app | SHI frontend :3000 (rewrite) |
| api.brickos.io | Unified API | SHI backend :8080 |
| demo.brickos.io | Staging (basic auth) | SHI staging frontend :3001 |
| app.sovereignhealth.io | SHI direct access (legacy) | SHI frontend :3000 |
| api.sovereignhealth.io | SHI API direct (legacy) | SHI backend :8080 |
| demo.sovereignhealth.io | SHI staging direct (legacy) | SHI staging :3001 |
| brickos.io/r/{code} | Short link redirects | SHI backend :8080 |
| status.sovereignhealth.io | Gatus monitoring | Gatus :8082 |
