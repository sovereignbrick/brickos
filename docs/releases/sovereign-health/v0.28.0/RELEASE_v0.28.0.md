# Release v0.28.0

**Date:** 2026-03-24
**Sprints:** 012 (Stability & Bug Fixes) + 013 (Go-Live Stability & Investor Readiness)
**Previous:** v0.27.0
**Velocity:** ~55 pts (20 + 35)

---

## Highlights

- **Playwright E2E test suite** — 15 automated tests covering core user journeys (login, dashboard, PWA, API, Sovereign Link, accessibility)
- **Lighthouse audit** — Performance 94, Accessibility 98, SEO 100, Best Practices 81 (Cloudflare only)
- **Feature-details overhaul** — 7 categories, ~50 features, all with tooltips and correct tier assignments
- **Security features documented** — Row-Level Security, Encryption at Rest (AES-256-GCM), Encryption in Transit (TLS 1.3), Data Access Audit Log
- **Compliance section** — GDPR (active), HIPAA, NIS2, ISO 27001, SOC 2 (coming soon)
- **Dr. Alex consultation pool** — unified AI credit system (Glimpse 10/mo → Horizon unlimited)
- **106 markers** — 98 regular + 8 calculated markers now visible in markers directory
- **Hydration fix** — React #418 error suppressed on 13 pages
- **16 tier migrations** — complete feature table audit and restructure

---

## Sprint 012 — Stability & Bug Fixes

### Bug Fixes
- Sovereign Link `/r/{code}` — confirmed working (HEAD vs GET testing artifact)
- Vanity code availability check + permanent codes (no change after save)
- Vanity link persists across page refresh (API returns existing link)
- Affiliate click count reads from both `affiliate_clicks` + `short_link_clicks`
- Access log entry for PDF health report generation
- PWA manifest `short_name` → "Sovereign Health Intelligence"
- PWA maskable icon purpose for adaptive icons
- Website OG image → 1200x627 landscape format
- bg-white audit: 42 → 9 (removed redundant from medication inputs)
- Graceful network error messages (EN + DE)

### Dependencies
- Frontend: react-hook-form, shadcn, lucide-react, Next.js, eslint updated

---

## Sprint 013 — Go-Live Stability & Investor Readiness

### Testing & Quality
- **Playwright E2E:** 15 tests across 7 categories (public pages, PWA, API, auth, demo, Sovereign Link, accessibility)
- **Lighthouse:** baseline scores recorded, skip link target fixed (a11y 98→100)
- **Staging smoke test:** script updated with click count verification

### Feature-Details Table (16 migrations)
- **Data & Tracking:** Glimpse 20 markers (was 8), 90 days history (was 30), calculated markers unlimited, templates 5, influence factors 10, body composition/reference ranges/lifestyle presets enabled
- **AI & Intelligence:** Dr. Alex consultation pool (10/25/50/100/∞), Your Health/Trends/Lab Results/Nutrition all tiers ✓, Smart Import moved to AI section with 3 sub-features
- **Reporting & Export:** CSV/JSON export all tiers ✓, GDPR Data Export added, PDF Reports active for Insight+
- **Integrations:** reordered (active first, coming_soon at end), LOINC Integration added (Horizon), Priority Support removed (duplicate)
- **Security:** Row-Level Security, Encryption at Rest, Encryption in Transit, Data Access Audit Log — all tiers ✓, improved tooltips
- **Compliance:** GDPR, HIPAA, NIS2, ISO 27001, SOC 2 — all tiers ✓
- **Support:** Standard Support + Dedicated Support in own category

### Website
- Feature comparison tooltip: fixed positioning (420px, never clipped)
- Dynamic feature count from API (not hardcoded)
- Health Coach rename (was Dr. Alex on website)
- Staging website points to staging API (was production)
- CORS fix for staging website → staging API

### Markers Directory
- API `GET /v1/content/markers` now returns calculated markers via UNION ALL
- Content files regenerated: 106 markers (98 regular + 8 calculated)

### Hydration Fix
- `suppressHydrationWarning` on 13 loading states (dashboard, measurements, markers, trends, zones, doctor-chat)

### Deployment Issues Documented
- #233: Staging compose env vars / CORS
- #234: Deploy process overhaul (root cause: env var interpolation)

---

## Design Documents

- **Design 028:** Sovereign Support & Ticket System (AI-first, .md schema, CC agents)

---

## Issues Raised

| # | Title |
|---|-------|
| #232 | Lighthouse audit + fix issues |
| #233 | Staging compose env vars / CORS |
| #234 | Deployment process overhaul |
| #235 | AI credit pool (unified quota) |
| #236 | Pricing page sync with feature-details |
| #237 | License tier single source of truth |
| #238 | AI usage cost tracking |
| #239 | AI model agnostic / fallback |
| #240 | PWA splash screen |
| #241 | Multi-product / multi-org license model |
| #242 | GDPR account deletion cascade |
| #243 | Markers directory completeness |
| #244 | Sovereign support ticket system |

---

## Database Changes

16 new migrations (`20260324000005` through `20260324000016`):
- Tier feature audit, limits update, AI rename, AI regroup, cleanup, pool, reporting, integrations, compliance, support

---

## Version Info

| Component | Version |
|-----------|---------|
| Backend | 0.28.0 |
| Frontend | 0.28.0 |
| Playwright | 1.58.2 |
| Lighthouse CLI | latest |
| Product features | ~50 across 7 categories |
| Markers | 106 (98 regular + 8 calculated) |
| E2E tests | 15 |
| Unit tests (frontend) | 223 |
| Unit tests (sovereign-link) | 17 |
