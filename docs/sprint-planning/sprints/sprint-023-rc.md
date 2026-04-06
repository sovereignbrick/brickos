# Sprint 023 -- RC Checklist

**Date:** 2026-04-05
**Branch:** develop
**Version:** 0.33.0 (pre-bump for sprint 023)

## Build Verification

- [x] `cargo fmt --all --check` -- PASS
- [x] `cargo clippy --all-targets -- -D warnings` -- PASS
- [x] `cargo build` -- PASS (39s)
- [x] `pnpm build` -- PASS (production build, /search route registered)

## Test Results

- [x] Contract tests (search, reset-data, affiliate) -- 15/15 PASS
- [x] API contract tests -- PASS
- [x] Validators tests -- PASS
- [x] Units tests -- PASS
- [x] Calculated markers tests -- PASS
- [x] Dark theme tests -- PASS
- [x] Status tests -- PASS
- [x] Tier tests -- PASS
- [ ] Date format tests -- 7 FAIL (pre-existing, locale-dependent)
- [ ] i18n completeness -- 1 FAIL (pre-existing, 25 identical EN/DE brand names)

**New tests added:** 15 contract tests + 19 E2E tests (3 suites)
**Total:** 230/238 passing (8 pre-existing failures, 0 new failures)

## Feature Verification Checklist

### #298 Global Search
- [ ] Search index migration applies cleanly
- [ ] `GET /api/v1/search?q=glucose` returns ranked results
- [ ] `GET /api/v1/search/suggest?q=glu` returns suggestions
- [ ] Public search (no auth) returns Tier 1 only
- [ ] Authenticated search returns Tier 1 + Tier 2 + user_context
- [ ] Bilingual: "Glukose" (DE) returns glucose marker
- [ ] Content tiles indexed (did_you_know, how_to_stay_in_range, etc.)
- [ ] Blind spots appear for unmeasured markers
- [ ] Dr. Alex CTA shown for marker results
- [ ] Frontend: Ctrl+K opens search overlay
- [ ] Frontend: /search?q=glucose renders results page with tabs
- [ ] Frontend: mobile responsive (horizontal scroll tabs)
- [ ] `POST /api/v1/search/reindex` works (admin only)

### #299 Reset All Data
- [ ] `POST /settings/reset-data` without confirm returns counts
- [ ] `POST /settings/reset-data` with confirm="RESET" deletes data
- [ ] Audit log entry created
- [ ] ntfy notification sent
- [ ] Account/profile/subscription preserved after reset
- [ ] Frontend: danger zone card visible in Settings > Privacy
- [ ] Frontend: type "RESET" confirmation works

### #300 Signup Tracking
- [ ] Admin Users tab shows "Source" column (Affiliate/Direct)
- [ ] Referrer email shown on hover for affiliate users
- [ ] Affiliate summary cards render above user table
- [ ] `GET /admin/affiliate-summary` returns stats

### #302 AI Cost Tracking
- [ ] Avg Cost/User stat card visible in AI Usage tab
- [ ] High-usage users flagged with "HIGH" badge (>2x avg)

### #303 Dr. Alex Design Doc
- [ ] Design doc at docs/project-files/design/037-dr-alex-document-analysis.md
- [ ] Covers: data model, upload flow, prompts, tier gating, privacy

### #304 Lighthouse
- [ ] Report saved to docs/project-files/lighthouse/
- [ ] Contrast fix applied (zone-card.tsx)

### #305 E2E Playwright
- [ ] 3 test suites created (auth, profile, cleanup)
- [ ] Test helpers (auth, api, fixtures) in e2e/helpers/
- [ ] Sample fixtures in e2e/fixtures/

## Pre-Deploy Checks
- [ ] Version bump in lib.rs (if deploying to production)
- [ ] Frontend lockfile in sync
- [ ] No .env secrets in committed files
- [ ] Lighthouse JSON report excluded from git (or acceptable size)
