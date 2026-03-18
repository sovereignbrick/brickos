# Release Notes — v0.20.0-rc3

**Date:** 2026-03-18
**Branch:** develop
**Previous RC:** v0.20.0-rc2 (2026-03-17)

---

## What's New

### User Experience & Onboarding

| Issue | Feature | Details |
|---|---|---|
| #19 | In-app onboarding checklist | 6-step "Getting Started" on dashboard with numbered descriptions, auto/manual completion tracking, progress bar, dismiss/auto-dismiss. Global `OnboardingTracker` in root layout records page visits across all routes. |
| #22 | App screenshots + Learn page | Learn page with tutorial cards, screenshot lightbox (locale-aware EN/DE), video embed component. Content placeholder — blocked until real screenshots created (#101). |
| #84 | Dark/light theme toggle | Theme toggle in navbar user menu, `ThemeProvider` in root layout, localStorage persistence. Full light theme applied across 20+ files (~300 hardcoded dark color refs converted to theme tokens). Automated theme audit script added. |
| #99 | WCAG 2.1 AA accessibility | Skip-to-content link, focus trapping in mobile menu, `focus-visible` rings, contrast-safe colors. Lighthouse score: 96%. |

### Signup & Registration

- Removed "Product updates" consent checkbox from signup — column dropped from `user_profile`
- Newsletter label simplified: "Subscribe to newsletter" / "Newsletter erhalten"
- Signup→dashboard redirect fixed (`router.replace` instead of `router.push`)
- Country dropdown uses theme-aware background (no more white options on dark UI)

### Website (sovereignhealth.io)

- Tier-specific colors applied to pricing page cards and homepage pricing tiles (Glimpse=gray, Focus=emerald, Insight=purple, Clarity=amber, Horizon=rose)
- Colored top borders and tier name text on all pricing cards
- CTA buttons match tier colors
- Learn page added (pending content)
- Hardcoded dark colors in header, markers tooltip, feature table converted to CSS variables

### Affiliate Page

- EUR commission tiles: blue theme (light: `bg-blue-50`/`text-blue-700`, dark: `bg-blue-950`/`text-blue-100`)
- BTC commission tiles: orange theme (light: `bg-orange-50`/`text-orange-700`, dark: `bg-orange-950`/`text-orange-100`)
- All borders, dropdowns, table headers converted to theme tokens

### Doctor Chat

- All 9 components converted from hardcoded `white/` opacity patterns to theme tokens (61 replacements)
- Welcome screen, prompt sections, import buttons, chat bubbles, sidebar, conversation list, quota badge, typing indicator all readable in both themes

### Quality & Testing

- Theme color audit script: `frontend/scripts/check-theme-colors.sh` — scans .tsx files for hardcoded dark colors, 3 modes (check/fix/json)
- Updated `dark-theme.test.ts` to accept theme-aware classes alongside legacy dark classes
- Lighthouse accessibility audit added to RC testing checklist
- Manual testing checklist updated with THEME-01 (automated) and THEME-02 (visual) test cases

### Database

- Migration `20260318000092`: `DROP COLUMN consent_product_updates` from `user_profile`

### Backend

- Removed `consent_product_updates` from: auth.rs (signup INSERT + Mailgun tags), settings.rs (GET/PUT consent), reports.rs (GDPR report), admin_email.rs (stats), segments.rs (filter default), SignupRequest struct

---

## Bug Fixes

- Onboarding steps not updating after visiting pages — tracking moved to global component
- Signup page URL staying at `/signup` after registration
- White dropdown backgrounds on country select
- Doctor Chat completely unreadable in light mode
- Affiliate tiles unreadable in light mode
- Settings reference ranges, influence factors dark on light theme

## Known Issues

- React hydration mismatch #418 (cosmetic console error, no visual impact) — tracked in #105
- Learn page has placeholder content — tracked in #101
- ESLint config migration notice (eslint v9) — pre-existing

## Test Results

- Backend: 267 tests passed, 0 failed
- Frontend: 192 tests passed, 0 failed
- Theme audit: 0 violations
- Lighthouse accessibility: 96%
- Security audit: 6 allowed warnings (unmaintained deps in genpdf chain, no CVEs)
