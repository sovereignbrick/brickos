# Sprint 021 -- Error Handling, Monitoring, Unit Conversion & Mobile UX

**Started:** 2026-04-04
**Duration:** multi-day
**Status:** IN PROGRESS
**Goal:** Comprehensive error handling with admin monitoring integration, DSGVO-compliant logging, user unit preference display conversion across the app, and mobile/PWA UX optimization.

## Sprint Backlog

### M1: Error Handling, Monitoring & DSGVO Compliance

| # | Title | Area | Pts |
|---|-------|------|-----|
| #115 | General error handling (Phase 1: ErrorToast, Error Boundaries, classify_upstream_error, smarter From\<sqlx::Error\>, i18n error namespace) | Full-stack | 8 |
| #328 | Import error handling + monitoring + admin logging + DSGVO compliance | Full-stack | 13 |

**#328 sub-tasks:**
1. Import pipeline i18n error messages (EN + DE) — all 8 error scenarios
2. Structured audit_log events for every import step (start, classify, extract, match, validate, confirm, rollback, error)
3. External health/metrics API endpoint (`GET /api/v1/health/metrics`)
4. New "API Monitoring" tab in admin panel
5. `last_login_at` + `last_active_at` columns on users table + admin display
6. Standardize audit_log IP handling to hashed (match data_access_log DSGVO compliance)
7. Consent change audit trail (Art. 7 — log toggle changes with before/after)
8. Auto-purge cron for expired log entries on API startup

**#115 sub-tasks (Phase 1 only):**
1. Global `<ErrorToast />` component in root layout
2. React Error Boundaries on route segments
3. `classifyApiError()` utility (extend existing)
4. Common `errors.*` i18n namespace (EN + DE)
5. Shared `classify_upstream_error()` backend function
6. Smarter `From<sqlx::Error>` with constraint code mapping
7. Timeout on all external HTTP clients (Stripe, Strike, Mailgun)

### M2: User Unit Preferences

| # | Title | Area | Pts |
|---|-------|------|-----|
| #306 | Unit preference display conversion across entire app | Full-stack | 8 |

**Sub-tasks:**
1. Extract `MARKER_UNIT_MAP` from thresholds-tab into shared `lib/unit-conversion.ts`
2. Create `useUnitConversion()` hook
3. Apply to: measurement list, trend charts, popovers, marker detail, dashboard
4. Backend: bidirectional `convert_unit()` in marker_matcher.rs
5. Dr. Alex context: send values in user's preferred units
6. Import preview: show values in user's preferred units

### M3: Mobile UX & PWA

| # | Title | Area | Pts |
|---|-------|------|-----|
| #329 | Mobile / PWA UX optimization (includes #301 mobile spacing) | Frontend | 8 |

**Mobile UX sub-tasks:**
1. Auto-hide header on scroll down (reclaim 56px sticky header space)
2. Responsive title + action buttons (stack on mobile, no overflow)
3. Full-width dropdowns on mobile (no truncation)
4. 44px minimum touch targets (WCAG 2.5.5)
5. Health profile form spacing fix (#301)

**PWA sub-tasks:**
6. Theme persistence in PWA standalone mode + dynamic meta theme-color
7. Manifest shortcuts (Add Measurement, Dr. Alex, Dashboard)
8. Share target registration (images + PDFs for import)
9. App badge API (pending import count)
10. Extended offline caching (markers, reference ranges, recent measurements)

## Dependency Graph

```
M1: Error Handling & Monitoring (do first — foundation for all)
══════════════════════════════════════════════════════════════
  #115 Phase 1: General error infra
    ├─ ErrorToast, Error Boundaries, i18n namespace
    ├─ classify_upstream_error(), smarter From<sqlx::Error>
    └─ Timeouts on all external clients
         ↓
  #328: Import-specific + monitoring + DSGVO
    ├─ Import i18n errors (uses #115 infra)
    ├─ Structured audit_log events
    ├─ External metrics endpoint + admin tab
    ├─ last_login_at + last_active_at
    ├─ IP hash standardization
    ├─ Consent audit trail
    └─ Auto-purge cron

M2: Unit Preferences (independent of M1)
════════════════════════════════════════
  #306 Unit conversion
    ├─ Extract shared conversion utility
    ├─ useUnitConversion() hook
    ├─ Apply to all display components
    └─ Backend bidirectional converter

M3: Mobile UX & PWA (independent of M1/M2)
═══════════════════════════════════════════
  #329 Mobile + PWA
    ├─ Header auto-hide
    ├─ Responsive layouts
    ├─ Touch targets
    ├─ PWA theme + shortcuts + share target
    └─ Extended caching
```

## Total Points: 37

## Housekeeping

Close 18 issues delivered in Sprint 019/020:
#299, #300, #302, #303, #304, #305, #307, #311, #317, #318, #319, #320, #321, #322, #323, #324, #325, #326

Close #327 (delivered in Sprint 020) — DONE
Close #301 (merged into #329) — DONE

## Key Design Decisions

### API monitoring: External endpoint + admin tab
Metrics collected at the API layer and exposed via `GET /api/v1/health/metrics` (JSON). The admin panel renders this in a new "API Monitoring" tab alongside existing Data Access, App Events, and DB Audit tabs. This allows external uptime monitors to consume the same endpoint.

### Unit conversion: Display-time only
All values stored in canonical units. Conversion happens at display time in the frontend via a shared hook. Backend only converts for AI context (Dr. Alex) and PDF reports.

### Mobile header: Auto-hide, not remove
The header provides essential navigation. Rather than removing it, auto-hide on scroll down and show on scroll up — proven pattern from native apps.

### #301 merged into #329
Health profile spacing is part of the broader mobile UX audit. No separate issue needed.

## Execution Order

```
PHASE 0 — Housekeeping (30 min)
════════════════════════════════
  Close 18 delivered issues (#299–#326)
  cargo fmt (separate commit per convention)

PHASE 1 — Foundation (backend-heavy, do first)
═══════════════════════════════════════════════

  1a. #115 Backend: classify_upstream_error() + smarter From<sqlx::Error>
      + timeouts on Stripe/Strike/Mailgun
      WHY FIRST: every other error handling task builds on this

  1b. #115 Frontend: ErrorToast + Error Boundaries + i18n error namespace
      (can parallel with 1a — no backend dependency)

  1c. #328 Migration: last_login_at + last_active_at on users table
      + update login handler + middleware throttle
      (can parallel with 1a/1b — independent DB work)

PHASE 2 — Logging, Monitoring & Unit Conversion (parallel tracks)
═════════════════════════════════════════════════════════════════

  Track A (M1 continued):                Track B (M2):
  ─────────────────────────              ─────────────────
  2a. #328 Structured audit_log          2d. #306 Extract MARKER_UNIT_MAP
      events for import pipeline              into shared lib/unit-conversion.ts
           ↓                                       ↓
  2b. #328 IP hash standardization       2e. #306 useUnitConversion() hook
      + consent audit trail                   + apply to all display components
      + auto-purge cron                            ↓
           ↓                             2f. #306 Backend bidirectional
  2c. #328 Import i18n error messages         convert_unit() + Dr. Alex context
      (uses #115 infra from Phase 1)

  Track A and Track B run in parallel — zero dependencies between them.

PHASE 3 — Monitoring + Mobile/PWA (parallel tracks)
════════════════════════════════════════════════════

  Track C (M1 final):                    Track D (M3):
  ────────────────────                   ─────────────────
  3a. #328 External metrics endpoint     3d. #329 Auto-hide header on scroll
      GET /api/v1/health/metrics              + responsive title/buttons
           ↓                                       ↓
  3b. #328 Admin "API Monitoring" tab    3e. #329 Full-width mobile dropdowns
      (depends on 3a endpoint)                + 44px touch targets
           ↓                                  + health profile spacing (#301)
  3c. #328 Admin Users tab:                        ↓
      last_login/last_active columns     3f. #329 PWA: theme persistence
      (uses 1c migration)                    + manifest shortcuts
                                              + share target + app badge
                                              + extended caching

  Track C and Track D run in parallel — zero dependencies between them.

PHASE 4 — RC Testing (final)
═════════════════════════════
  Local RC check:
  - cargo fmt + clippy + tests
  - pnpm build (catch TS errors)
  - Mobile viewport test (< 430px)
  - Unit conversion round-trip test
  - Import error scenario walkthrough
  - Admin panel: verify all tabs + metrics
  - PWA install test on phone
```

## Risk Assessment

- **#328 (monitoring endpoint):** In-memory metrics may not survive API restarts. Mitigate with periodic DB flush or accept cold-start metric gap.
- **#306 (unit conversion):** Round-trip precision loss. Mitigate with consistent rounding rules and never converting stored values.
- **#329 (auto-hide header):** May break sticky sub-navigation on specific pages. Test all pages with scroll behavior.
- **#115 (error boundaries):** May catch errors too broadly and hide useful debugging info. Keep `development` mode verbose.
