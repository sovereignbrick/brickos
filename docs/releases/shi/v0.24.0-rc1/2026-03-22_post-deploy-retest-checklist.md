<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Post-Deploy Retest Checklist — v0.24.0-rc1 (b3)
 Date: 2026-03-22

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Post-Deploy Retest Checklist — v0.24.0-rc1 (b3)

**Staging:** https://demo.sovereignhealth.io/
**Build:** v0.23.0-b3
**Date:** 2026-03-22
**Tester:** _______________

> These items were fixed during the RC session and require verification after staging deploy.

---

## Backend Fixes

- [ ] Doctor chat delete — conversation removed from sidebar immediately
- [ ] Doctor chat delete — deleted conversation not accessible via direct URL
- [ ] Doctor chat delete — no "Resource not found" on remaining conversations
- [ ] Newsletter label — shows "Subscribe to newsletter" / "Newsletter erhalten" (no "monthly")
- [ ] Tab label — shows "Referenzbereiche" / "Reference Ranges" (not "Grenzwerte")
- [ ] Tier features_summary — visible in admin Content App > Tiers (EN + DE filled)
- [ ] Deep health — `curl https://api-demo.sovereignhealth.io/health?deep=1` returns `checks.database.status: ok`
- [ ] Version — API returns v0.23.0-b3

## Frontend Fixes

- [ ] Trend chart — dots visible on ALL period views (7D, 30D, 3M, 6M, 1Y, ALL)
- [ ] Trend chart — dots colored by status (green/orange/red)
- [ ] Trend chart — hover tooltip shows status color dot + value + protocol
- [ ] Trend chart — fasting period legend has dotted underline + hover tooltip
- [ ] DatePicker — selected day number visible (not hidden by blue box) in dark mode
- [ ] DatePicker — selected day number visible in light mode
- [ ] Paperclip import — medication upload accepts multiple files (up to 3)
- [ ] Em-dash — billing country select shows "-" not "—"
- [ ] Hydration — no React #418 error in browser console (or suppressed)

## Quick Smoke Test

- [ ] Login works
- [ ] Dashboard loads
- [ ] Dr. Alex chat works (new conversation)
- [ ] Settings page loads (all tabs)

---

## After All Pass

1. Uncomment Gatus body conditions in `gatus-config.yaml`:
   ```yaml
   - "[BODY].status == ok"
   - "[BODY].checks.database.status == ok"
   ```
2. Merge develop → main
3. Deploy to production: `bash deploy.sh production --confirm`
4. Write release notes: `releases/v0.24.0/RELEASE_v0.24.0.md`
