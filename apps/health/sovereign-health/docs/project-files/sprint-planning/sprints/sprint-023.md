# Sprint 023 -- Search, Data Reset, AI Evolution & DevOps

**Started:** 2026-04-05
**Duration:** multi-day
**Status:** PLANNED
**Goal:** Global search across the app, data reset feature, AI credit pool redesign, unit preference fix, dependency updates, Lighthouse audit, and E2E test foundation.

## Sprint Backlog

### M1: Product Features

| # | Title | Area | Pts |
|---|-------|------|-----|
| #308 | Global search for markers, food, supplements | Full-stack | 8 |
| #310 | Reset all data / start fresh (keep account) | Full-stack | 5 |
| #312 | Signup channel tracking (UTM, source in admin) | Backend | 3 |

**#308 sub-tasks:**
1. Backend: `GET /api/v1/search?q=...` endpoint with PostgreSQL full-text search
2. Search across: markers, calculated_markers, marker_aliases (EN + DE)
3. Relationship search: glucose -> GKI, HOMA-IR; vitamin D -> supplements
4. Frontend: search icon in navbar + Ctrl+K shortcut
5. Results page at `/search?q=...` grouped by type with badges
6. Debounced input (300ms), recent searches in localStorage
7. i18n: EN + DE

**#310 sub-tasks:**
1. Backend: `POST /settings/reset-data` endpoint
2. Delete from: measurements, calculated_marker_values, import_sessions, devices, labs, medications, chat sessions, templates, custom reference ranges
3. Return record counts before deletion (confirmation dialog)
4. Frontend: "Reset All Data" in Settings danger zone with confirmation modal (type "RESET")
5. Audit log entry + ntfy notification
6. i18n: EN + DE

**#312 sub-tasks:**
1. Track UTM parameters (source, medium, campaign) from signup URL
2. Store signup_source in users table or user_profile
3. Show in admin Users tab
4. Distinguish: direct, referral, social, QR code, campaign

### M2: AI Evolution

| # | Title | Area | Pts |
|---|-------|------|-----|
| #235 | Unified AI credit pool (replace 8 per-feature counters) | Full-stack | 5 |
| #238 | AI usage cost tracking in admin (per-user, per-feature) | Full-stack | 5 |
| #226 | Dr. Alex document analysis (prescriptions, articles) | Full-stack | 8 |

**#235 sub-tasks:**
1. Migration: add `ai_credits_monthly` to license_tiers, `ai_credits_used` to user tracking
2. Replace 8 `check_chat_quota()` calls with single `check_ai_credit(cost)`
3. Credit costs: chat = 1, smart import = 2, trend analysis = 1
4. Show credits remaining in Dr. Alex UI
5. Monthly reset (cron or on-access check)
6. Update website feature table to show single pool

**#238 sub-tasks:**
1. Extend `ai_usage_log` with cost calculation (input_tokens * $3/MTok + output_tokens * $15/MTok)
2. Admin dashboard widget: total AI cost this month, avg cost per user
3. Admin user detail: AI usage breakdown
4. Feature breakdown: which AI features cost most
5. Flag high-usage users

**#226 sub-tasks:**
1. New table: `consultation_documents` (encrypted)
2. Upload flow in Dr. Alex: document type picker (prescription, article, lab report, advice)
3. Extract text from uploaded doc (reuse import OCR pipeline)
4. AI cross-references document with user's biomarker data
5. Save as consultation record linked to chat conversation
6. Tier-gated: Insight and above

### M3: Tech Debt & DevOps

| # | Title | Area | Pts |
|---|-------|------|-----|
| -- | Redesign unit preference storage (per-marker fields) | Full-stack | 5 |
| -- | Fix ntfy deploy notifications | Ops | 2 |
| #232 | Lighthouse audit + fix issues | Ops/Frontend | 3 |
| #72 | E2E Playwright tests (foundation) | Testing | 5 |
| #215-219 | Dependency bumps (lucide-react, next, react-hook-form, eslint, shadcn) | Chore | 2 |

**Unit preference redesign sub-tasks:**
1. Migration: add per-marker unit columns to user_preferences (insulin_unit, hba1c_unit, vitamin_d_unit, etc.)
2. Update backend validation to accept marker-specific units
3. Frontend: save to correct field per marker (not shared group)
4. Remove workaround in thresholds-tab (BACKEND_ALLOWED skip logic)

**ntfy fix sub-tasks:**
1. Verify ntfy token on VPS (.env.staging + .env.monitoring)
2. Test from VPS: `curl -H "Authorization: Bearer $TOKEN" https://ntfy.brickos.io/test -d "ping"`
3. Check Cloudflare DNS (must be DNS-only, not proxied)
4. Fix and verify deploy notifications work

**Lighthouse sub-tasks:**
1. Run audit: `lighthouse https://app.sovereignhealth.io --output html`
2. Fix critical issues (performance, accessibility, SEO)
3. Target: all scores > 90
4. Save report to docs/

**E2E Playwright sub-tasks:**
1. Install Playwright in frontend project
2. Create test config with auth helper (login as test user)
3. Write foundational tests: login, dashboard load, navigate to markers, add measurement
4. Run against localhost Docker stack

**Dep bumps:**
1. Update lucide-react, next, react-hook-form, eslint-config-next, shadcn
2. Verify build + fix any breaking changes
3. Update frontend lockfile

## Dependency Graph

```
M3: Tech Debt (do first -- foundation)
═══════════════════════════════════════
  Unit preference redesign (unblocks clean unit handling)
  Dep bumps (update before new features)
  ntfy fix (independent)
       ↓
M1: Product Features (after M3 -- uses updated deps)
═══════════════════════════════════════════════════
  #308 Global search (independent, largest feature)
  #310 Reset all data (independent)
  #312 Signup tracking (small, independent)

M2: AI Evolution (parallel with M1)
════════════════════════════════════
  #235 AI credit pool (do first -- simplifies quota system)
    ↓
  #238 AI cost tracking (uses credit pool data)
    ↓
  #226 Document analysis (uses credit pool for billing)

M3 continued: DevOps (end of sprint)
═════════════════════════════════════
  #232 Lighthouse audit (after features are built)
  #72 E2E Playwright (after features, tests the new flows)
```

## Execution Order

```
PHASE 0 -- Housekeeping
════════════════════════
  cargo fmt
  Dep bumps (#215-219)
  ntfy fix

PHASE 1 -- Tech Debt
═════════════════════
  1a. Unit preference redesign (per-marker fields)
  1b. #235 AI credit pool (migration + backend)

PHASE 2 -- Product Features + AI (parallel tracks)
═══════════════════════════════════════════════════

  Track A:                          Track B:
  ────────                          ────────
  2a. #308 Global search backend    2d. #235 AI credit pool frontend
  2b. #308 Global search frontend   2e. #238 AI cost tracking
  2c. #310 Reset all data           2f. #226 Document analysis
      #312 Signup tracking

PHASE 3 -- DevOps
═════════════════
  3a. #232 Lighthouse audit + fixes
  3b. #72 E2E Playwright foundation

PHASE 4 -- RC Testing + Deploy
══════════════════════════════
  cargo fmt + clippy + tests
  pnpm build
  Localhost testing
  Deploy to staging
  Deploy to production
```

## Total Points: 56

## Risk Assessment

- **#308 (search):** Full-text search in PostgreSQL needs proper ts_vector setup. May need to index marker_translations. Keep scope to markers first, food/supplements later if time-consuming.
- **#226 (doc analysis):** Reusing OCR pipeline helps but the AI cross-referencing prompt needs careful design. Scope to MVP: extract text + ask Dr. Alex about it.
- **#235 (credit pool):** Migration path from 8 counters to 1 pool. Keep old columns during transition, remove in later sprint.
- **Unit preference redesign:** Adding columns to user_preferences requires migration + updating all read/write paths. Test all 27 marker unit toggles.
- **#72 (E2E):** Scope to foundation only (4-5 tests). Full coverage is a multi-sprint effort.
