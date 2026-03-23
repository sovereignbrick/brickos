# Sprint 010 — Sovereign Link: URL Shortener + Service Gateway

**Started:** 2026-03-23
**Completed:** 2026-03-23
**Goal:** Ship the BrickOS URL shortener (Phase 1+2) as branded affiliate links on `brickos.io/r/`, create the Sovereign Link crate as the first BrickOS infrastructure service, and establish the shared design token system.

## Context

Sprint 009 delivered GDPR compliance + cargo-chef build optimization (v0.26.0). This sprint shifts focus to a new BrickOS infrastructure service — the first app outside Sovereign Health. Sovereign Link serves dual purpose: platform affiliate links (`brickos.io/r/`) and foundation for a standalone self-hosted product (Sovereign Link for Start9).

Design doc: `docs/project-files/design/024-url-shortener-service.md`

## Completed

### P0 — Foundation

| # | Title | Points | Commits |
|---|-------|--------|---------|
| - | chore: create `packages/tokens/` design token system | 2 | 7ece9b6 |
| #151 | chore: scaffold `apps/infrastructure/sovereign-link/` crate | 3 | 7ece9b6 |
| #151 | feat: `short_links` + `short_link_clicks` + `app_prefixes` migrations | 2 | 7ece9b6 |
| #151 | feat: `GET /r/{code}` redirect handler + click tracking | 3 | 7ece9b6 |
| #151 | feat: auto-create short links for existing affiliate codes (backfill) | 2 | 7ece9b6 |
| #151 | feat: affiliate page shows `brickos.io/r/sha3f2c1b9` + QR | 2 | 7ece9b6 |
| #151 | ops: nginx config `brickos.io/r/*` → health API | 1 | 4e1c26d |
| | **P0 Total** | **15** | |

### P1 — Enhancements

| # | Title | Points | Commits |
|---|-------|--------|---------|
| #151 | feat: vanity codes for Horizon+/Clarity tier | 3 | edd8a1a |
| #151 | feat: QR code endpoint `GET /r/{code}.qr` (SVG) | 0 | 7ece9b6 (included in P0) |
| #151 | feat: admin "Links" tab with click stats + filters | 3 | edd8a1a |
| #151 | feat: campaign link creation (admin) | 2 | edd8a1a |
| | **P1 Total** | **8** | |

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| docs: local issue tracker (27 open, 71 closed, 10 milestones) | 3 | 29941b5 |
| docs: design 021 multi-tenant platform offering | 0 | 29941b5 |
| docs: design 023 progressive web app (Sprint 011 prep) | 0 | 29941b5 |
| docs: design 024 URL shortener + Sovereign Link (full spec) | 0 | 29941b5 |
| chore: rename `apps/node/` → `apps/infrastructure/` | 0 | 29941b5 |
| chore: add AGPL-3.0 LICENSE file | 0 | 29941b5 |
| **Unplanned Total** | **3** | |

## Carried Over

None — all planned items completed.

## Velocity

| Metric | Value |
|--------|-------|
| Planned (P0) | 15 pts |
| Planned (P1) | 8 pts |
| Completed (planned) | 23 pts |
| Completed (unplanned) | 3 pts |
| Carried over | 0 |
| Total delivered | 26 pts |
| Commits | 4 (+ 1 planning) |
| New crate | `sovereign-link` (10 source files) |
| New tables | 3 (`app_prefixes`, `short_links`, `short_link_clicks`) |
| New admin tab | Links (click stats, filters, campaign creation) |
| Design docs | 3 (#021, #023, #024) |
| Tracker issues | 98 (27 open, 71 closed) |

## Architecture Delivered

```
apps/infrastructure/sovereign-link/     ← NEW crate (library)
├── src/
│   ├── lib.rs                          ← configure_routes() for host API
│   ├── models.rs                       ← ShortLink, AppPrefix, ClickMeta, LinkStats
│   ├── handlers/
│   │   ├── redirect.rs                 ← GET /r/{code} — fast-path prefix routing
│   │   ├── qr.rs                       ← GET /r/{code}.qr — SVG QR codes
│   │   └── api.rs                      ← CRUD REST API + vanity validation
│   └── db/
│       ├── mod.rs                      ← LinkStore trait
│       └── postgres.rs                 ← Full Postgres implementation

packages/tokens/                        ← NEW design token system
├── brickos-tokens.css                  ← Shared BrickOS visual identity
└── package.json                        ← @brickos/tokens

docs/tracker/                           ← NEW local-first issue tracker
├── issues/ (27 open, 71 closed)
├── milestones/ (10)
└── sync/sync.sh                        ← GitHub REST API sync script
```

### Key Technical Decisions

1. **Product renamed:** "shortener" → "Sovereign Link" — better brand, works as Start9 package name
2. **2-char app prefix:** `sh` = Sovereign Health, `bt` = BTC Tracker. Auto-codes (`sha3f2c1b9`) route without DB lookup. Vanity codes (`drclinic`) are globally unique, DB lookup.
3. **One codebase, two modes:** Feature flags (`--features platform` vs `--features standalone`) compile different backends. Not two repos.
4. **Shortener layers, doesn't replace:** Existing affiliate system unchanged. Shortener adds redirect + click tracking in front. Join on `affiliate_code`.
5. **Design tokens:** `packages/tokens/brickos-tokens.css` is the hex-based single source of truth. React apps use Tailwind preset, server-rendered apps use direct CSS link.
6. **Local issue tracker:** `docs/tracker/` with `git mv` to close issues, sync.sh for GitHub REST API restore.

## Notes / Decisions

- First BrickOS app outside Sovereign Health — sets the pattern for cross-app crate sharing
- Crate is a library (imported by health API), becomes a standalone binary at Phase 3
- Nginx: `brickos.io/r/*` → port 8080 (health API) via Cloudflare proxy + origin cert
- QR codes: both client-side (qrcode.react on affiliate page) and server-side (GET /r/{code}.qr SVG) encode the short URL
- Vanity codes tier-gated to Clarity + Horizon (checked server-side, not just UI)
- Admin Links tab includes hierarchical summary by app prefix + link type
- `affiliate_clicks` table stays in parallel — deprecate after 30-day validation period
- Sprint 011 will be PWA Phase 1 (installable, service worker, offline detection)
