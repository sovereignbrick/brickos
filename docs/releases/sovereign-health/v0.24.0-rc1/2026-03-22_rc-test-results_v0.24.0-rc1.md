<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 RC Test Results — v0.24.0-rc1
 Date: 2026-03-22

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# RC Test Results — v0.24.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**Build:** v0.23.0-b1
**Date:** 2026-03-22
**Tester:** Helmut (manual browser) + Claude (code verification)

---

## Summary

| Result | Count |
|--------|-------|
| PASS | 17 areas |
| FAIL (fixed in session) | 4 issues |
| FAIL (needs deploy) | 3 issues |
| SKIP (not implemented) | 2 areas |
| Issues raised | 14 |

---

## Results by Area

| # | Area | Result | Notes |
|---|------|--------|-------|
| 1 | Login Page | PASS | |
| 2 | Signup Page | PASS | Mailgun was misconfigured (fixed: key + domain updated on VPS) |
| 3 | Dashboard | PASS | |
| 4 | Zone Detail / Marker Cards | PASS | |
| 5 | Marker Detail | PASS | Trend chart dots + tooltip improved (code committed, needs deploy) |
| 6 | Measurements History | PASS | |
| 7 | Trends | PASS | |
| 8 | Dr. Alex Landing | PASS | |
| 9 | Dr. Alex Conversations | FAIL (fixed) | Delete failed — `is_deleted` column missing. Migration + query fixes applied |
| 10 | Smart Import — Lab PDF | PASS | |
| 11 | Smart Import — Medications | FAIL (fixed) | Paperclip only accepted 1 file instead of 3. Fixed `chat-input.tsx` |
| 12 | Smart Import — Tabular | PASS | |
| 13 | Import History | SKIP | Page not implemented (backend ready, no frontend) |
| 14 | Settings — Profile | PASS | Restructure planned (design-018) |
| 15 | Settings — Devices | PASS | |
| 16 | Settings — Medications | PASS | DatePicker selected day text invisible (CSS fix committed, needs deploy) |
| 17 | Settings — Reference Ranges | PASS | Tab label "Grenzwerte" → "Referenzbereiche" (migration committed, needs deploy) |
| 18 | Settings — Newsletter Consent | SKIP | Toggle not implemented (issue raised for Sprint 007) |
| 19 | Settings — Billing & License | PASS | |
| 20 | Theme Toggle | PASS | |
| 21 | Admin Panel | PASS | Stripe warning expected on demo; readability OK |
| 22 | i18n Spot Check | PASS | Tier features_summary was NULL in DB (migration committed) |
| 23 | Browser Console | FAIL | React #418 hydration error (pre-existing, suppression added, audit issue raised) |
| 24 | Performance | PASS | Dashboard <2s, pagination OK |

---

## Issues Fixed During Session

| Fix | Files Changed | Status |
|-----|---------------|--------|
| Em-dash in billing country select | `settings/page.tsx` | Committed |
| Newsletter label "monthly" → "Subscribe to" | Migration `20260322000001`, seed migration | Committed |
| Mailgun API key + domain on staging VPS | `.env.staging` on VPS | Applied live |
| Production DB container restored | `docker start` on VPS | Applied live |
| Deep health endpoint (`/health?deep=1`) | `handlers/health.rs`, `lib.rs` | Committed |
| Container watchdog systemd timer | `ops/scripts/container-watchdog.*` | Deployed to VPS |
| Compose project isolation (`name:` field) | `docker-compose.prod.yml`, `docker-compose.staging.yml` | Deployed to VPS |
| Gatus config (deep health + TLS checks) | `gatus-config.yaml` | Deployed to VPS |
| Doctor chat soft-delete migration | Migration `20260322000002` | Committed + applied to staging DB |
| Doctor chat list/fetch `is_deleted` filter | `handlers/doctor_chat.rs` | Committed (needs deploy) |
| Paperclip multi-file upload (1 → 3 files) | `chat-input.tsx` | Committed (needs deploy) |
| Trend chart always show dots + custom tooltip | `components/trend-chart.tsx` | Committed (needs deploy) |
| Fasting period legend tooltip | `trend-chart.tsx`, `en.json`, `de.json` | Committed (needs deploy) |
| DatePicker selected day visibility | `globals.css` | Committed (needs deploy) |
| Tab label "Grenzwerte" → "Referenzbereiche" | Migration `20260322000003`, seed migration, website locale | Committed (needs deploy) |
| Tier features_summary population | Migration `20260322000004` | Committed (needs deploy) |
| Hydration suppression on `<body>` | `layout.tsx` | Committed (needs deploy) |
| Deploy script compose isolation check | `deploy.sh` | Committed |
| Calculated markers backfill (GKI, Dr. Boz) | SQL on staging DB | Applied live |

---

## Issues Raised (Pending GitHub Submission)

| Issue | Milestone | Priority |
|-------|-----------|----------|
| Privacy tab — access log UI (GDPR Art. 15) | UI: Privacy & Security (#13) | P1 |
| Consent management UI — newsletter + partner offers | UI: Privacy & Security (#13) | P1 |
| Email unsubscribe wiring (GDPR/CAN-SPAM) | UI: Privacy & Security (#13) | P1 |
| Admin-configurable announcement bar | User Experience (#17) | P2 |
| Monitoring & resilience P0 (deep health, watchdog, compose isolation) | Infrastructure (#20) | P0 |
| Doctor chat delete — retest after deploy | Infrastructure (#20) | P1 |
| Trend chart dots + tooltip enhancement | User Experience (#17) | P2 |
| Admin settings consistency audit (86% orphaned) | Infrastructure (#20) | P1 |
| Admin settings automated test suite | Infrastructure (#20) | P1 |
| Import History page (backend ready, no frontend) | User Experience (#17) | P2 |
| Settings tab restructure (design-018) | User Experience (#17) | P2 |
| Newsletter consent toggle (Sprint 007 candidate) | UI: Privacy & Security (#13) | P1 |
| Backfill calculated markers admin endpoint | Infrastructure (#20) | P2 |
| React hydration #418 suppression audit | Infrastructure (#20) | P2 |

---

## Design Documents Created

| Doc | Description |
|-----|-------------|
| `design/017-monitoring-and-resilience-strategy.md` | Gap analysis, watchdog, deep health, compose isolation |
| `design/018-settings-tab-restructure.md` | Health Profile / Account / Privacy tab separation |

---

## Blocking Issues Before Production Deploy

1. **Deploy code changes to staging** — 8 committed fixes need a staging deploy cycle
2. **Retest doctor chat delete** — verify soft-delete filter works after deploy
3. **Verify trend chart dots** — confirm dots visible on all period views
4. **Verify DatePicker day visibility** — confirm selected day number readable
5. **Verify tab label** — confirm "Referenzbereiche" not "Grenzwerte"

## Production Deploy Checklist

After staging retest passes:
1. Uncomment Gatus body conditions (`[BODY].checks.database.status == ok`)
2. Merge develop → main
3. Deploy to production (`deploy.sh production --confirm`)
4. Verify `/health?deep=1` returns checks on production
5. Write release notes (`releases/v0.24.0/RELEASE_v0.24.0.md`)
