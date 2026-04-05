# Sprint 023 -- Search, Data Reset, AI Evolution & DevOps

**Started:** 2026-04-05
**Duration:** 2 days (2026-04-05 to 2026-04-06)
**Status:** PLANNED
**Goal:** Global search across the app, data reset feature, AI credit pool redesign, unit preference fix, dependency updates, Lighthouse audit, and E2E test foundation.

## Sprint Backlog

### M1: Product Features

| # | Title | Area | Pts |
|---|-------|------|-----|
| [#298](https://github.com/sovereignbrick/brickos/issues/298) | Global search for markers, food, supplements | Full-stack | 8 |
| [#299](https://github.com/sovereignbrick/brickos/issues/299) | Reset all data / start fresh (keep account) | Full-stack | 5 |
| [#300](https://github.com/sovereignbrick/brickos/issues/300) | Signup channel tracking (affiliate, source in admin) | Backend + Admin | 3 |

**#298 sub-tasks (Google-style search):**
1. Backend: `GET /api/v1/search?q=...&type=all` endpoint with PostgreSQL full-text search (ts_vector/ts_query)
2. Search across: markers, calculated_markers, marker_aliases, food, supplements (EN + DE)
3. Relationship search: glucose -> GKI, HOMA-IR; vitamin D -> supplements
4. Frontend: search icon in navbar + Ctrl+K / Cmd+K keyboard shortcut
5. Google-style results page at `/search?q=...`:
   - Tab bar: All | Markers | Food | Supplements | Calculated (like Google's All | Images | Videos)
   - Each result: title, type badge, snippet with highlighted match, action link
   - Result cards with marker zone color accent
6. Debounced input (300ms), recent searches in localStorage
7. "No results" state with suggestions
8. i18n: EN + DE

**#299 sub-tasks:**
1. Backend: `POST /settings/reset-data` endpoint
2. Delete from: measurements, calculated_marker_values, import_sessions, devices, labs, medications, chat sessions, templates, custom reference ranges
3. Return record counts before deletion (confirmation dialog)
4. Frontend: "Reset All Data" in Settings danger zone with confirmation modal (type "RESET")
5. Audit log entry + ntfy notification
6. i18n: EN + DE

**#300 sub-tasks:**
Note: The affiliate system already tracks `users.referred_by` (affiliate code), `users.affiliate_code` (auto-generated), `users.parent_referrer_id` (2-level chain), and the ntfy/Telegram notification already shows "referred by: [code or direct]". The 30-day `sh_ref` cookie with first-touch attribution is in place. The missing piece is admin visibility + org-level views.

1. Add `referred_by`, `affiliate_code` columns to admin Users tab query (`admin.rs:157-170`)
2. Add "Referred By" and "Affiliate Code" columns to admin Users tab UI (`users-tab.tsx`)
3. Add acquisition channel derivation: "affiliate" (has referred_by), "direct" (no referred_by), filterable/sortable
4. **Org-level affiliate view**: Organisation owners see affiliate stats scoped to their org members only (via `org_members` table). Show: which org members were referred, by whom, conversion status
5. **BrickOS admin full view**: Platform admin sees cross-org affiliate overview: all affiliates, all organisations, conversion rates per affiliate, per org_type (personal, clinic, family, enterprise)
6. Add affiliate performance summary to admin dashboard: total affiliates, total referrals, conversion rate, top 5 affiliates by referral count
7. Distinguish user acquisition: native growth (no referrer) vs affiliate-acquired (has referred_by), per organisation

### M2: AI Evolution

| # | Title | Area | Pts |
|---|-------|------|-----|
| [#301](https://github.com/sovereignbrick/brickos/issues/301) | Unified AI credit pool (replace 8 per-feature counters) | Full-stack | 5 |
| [#302](https://github.com/sovereignbrick/brickos/issues/302) | AI usage cost tracking in admin (per-user, per-feature) | Full-stack | 5 |
| [#303](https://github.com/sovereignbrick/brickos/issues/303) | Dr. Alex document analysis -- DESIGN DOC ONLY | Design | 3 |

**#301 sub-tasks:**
1. Migration: add `ai_credits_monthly` to license_tiers, `ai_credits_used` to user tracking
2. Replace 8 `check_chat_quota()` calls with single `check_ai_credit(cost)`
3. Credit costs: chat = 1, smart import = 2, trend analysis = 1
4. Show credits remaining in Dr. Alex UI
5. Monthly reset (cron or on-access check)
6. Update website feature table to show single pool

**#302 sub-tasks:**
1. Extend `ai_usage_log` with cost calculation (input_tokens * $3/MTok + output_tokens * $15/MTok)
2. Admin dashboard widget: total AI cost this month, avg cost per user
3. Admin user detail: AI usage breakdown
4. Feature breakdown: which AI features cost most
5. Flag high-usage users

**#303 sub-tasks (design doc only -- implementation in future sprint):**
1. Write design doc: `docs/project-files/design/037-dr-alex-document-analysis.md`
2. Define: data model (consultation_documents table), upload flow, AI prompt design
3. Define: document types (prescription, article, lab report, advice)
4. Define: tier gating, credit cost, privacy/encryption
5. Define: UI mockup (upload button, type picker, consultation history)
6. Reference existing: import OCR pipeline, Dr. Alex context injection

### M3: Tech Debt & DevOps

| # | Title | Area | Pts |
|---|-------|------|-----|
| -- | Fix ntfy deploy notifications | Ops | 2 |
| [#304](https://github.com/sovereignbrick/brickos/issues/304) | Lighthouse audit + fix issues | Ops/Frontend | 3 |
| [#305](https://github.com/sovereignbrick/brickos/issues/305) | E2E Playwright tests (foundation) | Testing | 5 |
| #215-219 | Dependency bumps (lucide-react, next, react-hook-form, eslint, shadcn) | Chore | 2 |

~~**Unit preference redesign: REMOVED from sprint.**~~
Analysis confirmed the core issue is resolved: all calculated markers use normalized DB values (canonical units), so unit preference changes have zero impact on calculations. The `BACKEND_ALLOWED` workaround in `thresholds-tab.tsx` prevents data corruption for incompatible units (insulin, HbA1c, vitamin D). The remaining UX gap (incompatible units revert on reload) is tracked as a low-priority enhancement, not a sprint blocker.

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
  Dep bumps (update before new features)
  ntfy fix (independent)
       ↓
M1: Product Features (after M3 -- uses updated deps)
═══════════════════════════════════════════════════
  #298 Global search (independent, largest feature)
  #299 Reset all data (independent)
  #300 Signup tracking (small, independent)

M2: AI Evolution (parallel with M1)
════════════════════════════════════
  #301 AI credit pool (do first -- simplifies quota system)
    ↓
  #302 AI cost tracking (uses credit pool data)
    ↓
  #303 Document analysis design doc (uses credit pool for billing)

M3 continued: DevOps (end of sprint)
═════════════════════════════════════
  #304 Lighthouse audit (after features are built)
  #305 E2E Playwright (after features, tests the new flows)
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
  1a. #301 AI credit pool (migration + backend)

PHASE 2 -- Product Features + AI (parallel tracks)
═══════════════════════════════════════════════════

  Track A:                          Track B:
  ────────                          ────────
  2a. #298 Global search backend    2d. #301 AI credit pool frontend
  2b. #298 Global search frontend   2e. #302 AI cost tracking
  2c. #299 Reset all data           2f. #303 Document analysis design doc
      #300 Signup tracking

PHASE 3 -- DevOps
═════════════════
  3a. #304 Lighthouse audit + fixes
  3b. #305 E2E Playwright foundation

PHASE 4 -- RC Testing + Deploy
══════════════════════════════
  cargo fmt + clippy + tests
  pnpm build
  Localhost testing
  Deploy to staging
  Deploy to production
```

## Total Points: 46 (was 51, removed unit preference redesign -5)

## Risk Assessment

- **#298 (search):** Full-text search in PostgreSQL needs proper ts_vector setup. Design doc at `docs/project-files/design/035-sovereign-health-search.md`. Keep scope to markers first, food/supplements later if time-consuming.
- **#303 (doc analysis):** Design doc only this sprint. Implementation is a large chunk for a future sprint.
- **#301 (credit pool):** Migration path from 8 counters to 1 pool. Keep old columns during transition, remove in later sprint.
- **#305 (E2E):** Scope to foundation only (~19 tests). Design doc at `docs/project-files/design/036-e2e-playwright-tests.md`. Full coverage is a multi-sprint effort.
