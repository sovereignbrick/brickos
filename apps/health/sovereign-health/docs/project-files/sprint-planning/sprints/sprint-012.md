# Sprint 012 — Stability, Security & Bug Fixes

**Started:** 2026-03-24
**Goal:** Fix production bugs from Sprint 010-011, address security audit findings, dependency updates, and improve stability across the platform.

## Context

Sprint 011 shipped the full PWA stack + Sovereign Link. Production testing revealed several bugs: short link redirects 404, vanity code tier gate broken, PWA icon missing on Flatpak. Security audit shows 1 vulnerability + 6 unmaintained crate warnings. 9 dependency bumps pending from Dependabot.

## Planned

### P0 — Production Bugs (must fix)

| # | Title | Points | Area |
|---|-------|--------|------|
| #224 | fix: Sovereign Link /r/{code} 404 on production (app_prefixes missing?) | 2 | API |
| #225 | fix: vanity code tier gate rejects Clarity tier (should allow) | 1 | API |
| #225 | feat: vanity code availability check + ability to change | 3 | Frontend + API |
| #222 | fix: PWA manifest short_name → "Sovereign Health Intelligence" | 1 | Frontend |
| #209 | fix: access log missing PDF + GDPR export entries | 2 | API |
| | **P0 Subtotal** | **9** | |

### P1 — Security & Dependencies

| # | Title | Points | Area |
|---|-------|--------|------|
| — | fix: cargo audit vulnerability (rustls-webpki CRL matching) | 2 | API |
| #211 | chore: bump sentry-actix 0.35 → 0.47 | 1 | API |
| #212 | chore: bump sentry 0.35 → 0.47 | 1 | API |
| #213 | chore: bump jsonwebtoken 9 → 10 | 2 | API (breaking) |
| #214 | chore: bump rand 0.9 → 0.10 | 1 | API |
| #215 | chore: bump lucide-react 0.577 → 1.0 | 1 | Frontend |
| #216 | chore: bump Next.js 16.1.6 → 16.2 | 2 | Frontend |
| #217 | chore: bump react-hook-form 7.71 → 7.72 | 1 | Frontend |
| #218 | chore: bump eslint-config-next 16.1.6 → 16.2 | 1 | Frontend |
| #219 | chore: bump shadcn 4.0.8 → 4.1 | 1 | Frontend |
| | **P1 Subtotal** | **13** | |

### P2 — Stability & Polish (if time permits)

| # | Title | Points | Area |
|---|-------|--------|------|
| #221 | fix: PWA icon missing on Linux Flatpak Chrome | 2 | Frontend |
| #220 | feat: OG link previews for all social platforms | 2 | Frontend + Website |
| #115 | feat: graceful API error handling (extend from Sprint 011 work) | 3 | API |
| — | fix: reduce bg-white count (42 → target < 20) | 2 | Frontend |
| — | chore: update RC checklist demo credentials | 1 | Docs |
| | **P2 Subtotal** | **10** | |

## Execution Order

```
Step 1: Production bugs                               ~2 hrs
  Fix Sovereign Link 404 (check app_prefixes table)
  Fix vanity code tier gate
  Fix PWA manifest name
  Fix access log missing entries

Step 2: Security                                       ~1 hr
  cargo audit fix (rustls-webpki)
  Review unmaintained crate warnings

Step 3: Dependency bumps                               ~2 hrs
  Backend: sentry, jsonwebtoken, rand (test after each)
  Frontend: Next.js, lucide-react, shadcn, react-hook-form, eslint
  Full test suite after all bumps

Step 4: Vanity code UX                                 ~1 hr
  Availability check API endpoint
  Frontend real-time check + change flow

Step 5: Polish                                         ~1 hr
  OG previews, bg-white audit, error handling

Step 6: Test + deploy                                  ~30 min
  cargo fmt + clippy + tests
  pnpm build + test
  Deploy staging → verify → promote → production
```

## Velocity Budget

| Budget | Points |
|--------|--------|
| P0 (must ship) | 9 pts |
| P1 (security) | 13 pts |
| P2 (polish) | 10 pts |
| **Total planned** | **32 pts** |

## Notes / Decisions

- jsonwebtoken 9→10 is a breaking change (API changes) — needs careful testing
- sentry 0.35→0.47 is a major bump — test error reporting after upgrade
- Next.js 16.2 may affect @serwist/next compatibility — verify SW still builds
- Sovereign Link 404 is highest priority — production affiliate links are broken
