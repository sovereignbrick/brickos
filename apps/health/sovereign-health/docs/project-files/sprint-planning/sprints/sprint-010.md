# Sprint 010 — BrickOS Link: URL Shortener + Service Gateway

**Started:** 2026-03-24
**Goal:** Ship the BrickOS URL shortener (Phase 1) as branded affiliate links on `brickos.io/r/`, create the `apps/infrastructure/shortener/` crate, and establish the shared design token system for cross-app consistency.

## Context

Sprint 009 delivered GDPR compliance + cargo-chef build optimization. This sprint shifts focus to a new BrickOS infrastructure service — the first app outside Sovereign Health. The URL shortener serves dual purpose: platform affiliate links (brickos.io/r/) and foundation for a standalone self-hosted product (Sovereign Link for Start9).

Design doc: `docs/project-files/design/024-url-shortener-service.md`

## Planned

### P0 — Foundation (must complete)

| # | Title | Points | Area |
|---|-------|--------|------|
| - | chore: create `packages/tokens/` design token system | 2 | Platform |
| - | chore: scaffold `apps/infrastructure/shortener/` crate | 3 | Platform |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: `short_links` + `short_link_clicks` + `app_prefixes` migrations | 2 | API |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: `GET /r/{code}` redirect handler + click tracking | 3 | API |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: auto-create short links for existing affiliate codes | 2 | API |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: affiliate page shows `brickos.io/r/sha3f2c1b9` + copy | 2 | Frontend |
| - | ops: nginx route `brickos.io/r/*` to health API | 1 | Ops |
| | **P0 Subtotal** | **15** | |

### P1 — Enhancements (if time permits)

| # | Title | Points | Area |
|---|-------|--------|------|
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: vanity codes for Horizon+ tier | 3 | Full-stack |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: QR code endpoint `/r/{code}.qr` | 2 | API |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: admin "Links" tab with click stats | 3 | Frontend |
| [#151](https://github.com/sovereignbrick/brickos/issues/151) | feat: campaign link creation (admin) | 2 | Full-stack |
| | **P1 Subtotal** | **10** | |

## Technical Approach

### Design Tokens (`packages/tokens/`)

Extract BrickOS visual identity into framework-agnostic CSS:
```
packages/tokens/
├── brickos-tokens.css    ← Colors, spacing, radius, fonts (hex, CSS vars)
├── brickos-dark.css      ← Dark theme overrides
└── README.md
```

Consumed by:
- React apps: via Tailwind preset (import tokens as Tailwind theme vars)
- Server-rendered apps (Sovereign Link): direct `<link>` include
- Single source of truth for BrickOS visual identity

### Shortener Crate (`apps/infrastructure/shortener/`)

Scaffold the crate now, even though Phase 1 runs handlers in the health API. This ensures:
- Crate compiles from day one
- `LinkStore` trait and models are defined in the right place
- Health API imports the crate (not the other way around)
- Extraction at Phase 3 is trivial — just move the binary entry point

```
apps/infrastructure/shortener/
├── Cargo.toml              ← library crate (no binary yet)
├── src/
│   ├── lib.rs              ← pub exports
│   ├── models.rs           ← ShortLink, ShortLinkClick, AppPrefix
│   ├── handlers/
│   │   ├── redirect.rs     ← GET /r/{code}
│   │   ├── api.rs          ← CRUD endpoints
│   │   └── qr.rs           ← QR generation
│   └── db/
│       ├── mod.rs           ← LinkStore trait
│       └── postgres.rs      ← Postgres implementation
└── migrations/
    └── postgres/
```

Health API depends on `brickos-shortener` as a workspace crate and mounts its routes.

### 2-Char App Prefix System

Auto-generated affiliate codes get prefixed: `sh` + `a3f2c1b9` = `sha3f2c1b9`
- `sh` = Sovereign Health
- Redirect handler: if code is 10 chars and first 2 match a known prefix → fast-path redirect (no DB lookup)
- Vanity codes (`drclinic`) are globally unique, no prefix, DB lookup

### Migration

```sql
-- 1. app_prefixes (platform routing)
-- 2. short_links (links + metadata)
-- 3. short_link_clicks (privacy-preserving analytics)
-- 4. Backfill: create short_links for all existing users.affiliate_code
```

## Velocity Budget

| Budget | Points |
|--------|--------|
| Multi-day sprint (2-3 days) | ~25-35 pts |
| P0 (must ship) | 15 pts |
| P1 (stretch) | 10 pts |
| Unplanned buffer (~30%) | ~8 pts |

## Sprint 011 Preview

**Sprint 011 — Progressive Web App (Phase 1)**
- Manifest.json + meta tags (installable)
- Service worker with @serwist/next (static asset caching)
- Offline detection + fallback page
- API cache headers (Rust middleware)
- Install prompt UX

Design doc: `docs/project-files/design/023-progressive-web-app.md`

## Notes / Decisions

- First BrickOS app outside Sovereign Health — sets the pattern for cross-app architecture
- Design tokens extracted before implementation — ensures visual consistency from day one
- Shortener crate is a library first (imported by health API), becomes a binary at Phase 3
- Nginx routing: `brickos.io/r/*` → port 8080 (health API) for Phase 1
- Existing affiliate system stays intact — shortener layers in front, doesn't replace
- `affiliate_clicks` table: keep running in parallel, deprecate after 30-day validation
