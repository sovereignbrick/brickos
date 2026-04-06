<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist — v0.20.0-rc3
 Date: 2026-03-18

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.20.0-rc3

**Version:** 0.20.0-rc3
**Date:** 2026-03-18
**Environment:** Staging (demo.sovereignhealth.io)
**Demo User:** demo@sovereignhealth.io / Demo2026!

---

## RC3-Specific Tests (new/changed features)

### THEME — Dark/Light Toggle (#84)

- [ ] Theme toggle visible in navbar
- [ ] Toggle switches between dark and light mode
- [ ] Preference persists across page navigation
- [ ] Preference persists after page refresh
- [ ] Dark mode: no white backgrounds on any page
- [ ] Light mode: no dark-on-dark text issues
- [ ] All select/dropdown elements themed correctly (both modes)
- [ ] Doctor chat components correct in both themes
- [ ] Agent grid, chat bubbles, typing indicator themed
- [ ] Affiliate page renders correctly in light mode
- [ ] Checkout page renders correctly in both modes
- [ ] Settings page renders correctly in both modes
- [ ] Zone cards themed correctly
- [ ] Usage widget themed correctly

### ONBOARD — Onboarding Checklist (#19)

- [ ] Onboarding checklist appears for new/incomplete users
- [ ] Steps reflect actual setup state (profile, device, first measurement)
- [ ] Completing a step updates the tracker
- [ ] Checklist dismisses when all steps complete
- [ ] Does not appear for users who completed onboarding

### BILLING — Tax Compliance (#100)

- [ ] Settings page shows billing address section
- [ ] Customer type selector (private / business)
- [ ] Business: company name and VAT ID fields appear
- [ ] Billing address fields: line1, line2, city, postal code, state, country
- [ ] Country dropdown uses localized names (DE locale shows German names)
- [ ] Billing address saves and persists
- [ ] Checkout page collects billing address
- [ ] VAT ID validation (if applicable)

### SIGNUP — consent_product_updates Removed

- [ ] Signup form does NOT show product updates consent checkbox
- [ ] Registration succeeds without consent_product_updates field
- [ ] Settings page does NOT show product updates toggle

### LEARN — Page Infrastructure (#22)

- [ ] `/learn` route loads without error
- [ ] Page shows placeholder/coming soon content
- [ ] Navigation to learn page works from navbar (if linked)

### WEBSITE — Pricing & Screenshots

- [ ] Tier-specific colors visible on pricing page
- [ ] Feature comparison table styled correctly
- [ ] Screenshot gallery/lightbox works (if screenshots present)

---

## Regression Tests (carried from rc2)

### AUTH — Authentication

- [ ] Login: demo@sovereignhealth.io / Demo2026!
- [ ] Login with wrong password shows error
- [ ] Rate limiting triggers after repeated failures
- [ ] Logout works, redirects to login

### ZONES — Health Zones

- [ ] Zone list loads on dashboard
- [ ] Zone cards show correct colors and icons
- [ ] Zone detail page (`/zones/[slug]`) loads
- [ ] Markers listed within zones

### MEAS — Measurements

- [ ] `/measurements` list page loads
- [ ] `/measurements/new` form renders (3-column layout)
- [ ] Device auto-populates markers when selected
- [ ] Template disabled when device selected
- [ ] Meal timing dropdown shows localized options (DE: Nüchtern, etc.)
- [ ] Save measurement succeeds
- [ ] Edit measurement (`/measurements/[id]/edit`) works
- [ ] View measurement detail (`/measurements/[id]`) works

### MARKERS — Marker Detail

- [ ] `/markers/[markerId]` loads
- [ ] Marker name translated (useContent, not raw marker_name)
- [ ] Abbreviation shown after name

### TRENDS — Trends Page

- [ ] Trends page loads
- [ ] Marker dropdown shows translated names
- [ ] Chart renders with data

### DASH — Dashboard

- [ ] Dashboard loads
- [ ] Widgets render correctly

### CHAT — Doctor Chat

- [ ] Chat page loads
- [ ] Conversation list works
- [ ] Send message, receive response
- [ ] Import review panel works
- [ ] Quota badge shows correct count

### SETTINGS — Settings Page

- [ ] Profile section loads with defaults
- [ ] Devices section works
- [ ] Theme toggle in settings matches navbar toggle
- [ ] Billing section present (rc3 new)

### I18N — Internationalization

- [ ] Switch to DE: all visible strings translated
- [ ] Switch to EN: all visible strings in English
- [ ] No raw i18n keys visible (e.g., `common.save`)
- [ ] Marker names use translated content in all contexts

### A11Y — Accessibility

- [ ] Lighthouse score >= 90 on dashboard
- [ ] Tab navigation works through main flows
- [ ] Focus indicators visible
- [ ] Form labels associated with inputs

---

## Post-Deploy Infrastructure

- [ ] API health: `curl https://api-demo.sovereignhealth.io/health` returns `{"status":"ok","version":"0.20.0-rc3"}`
- [ ] Frontend loads: `https://demo.sovereignhealth.io/`
- [ ] Website loads: `https://www-demo.sovereignhealth.io/`
- [ ] Container creation times are fresh (not old containers surviving)
- [ ] Migration 091 applied: `invoices` table exists in staging DB
- [ ] Migration 092 applied: `consent_product_updates` column gone from `user_profile`

---

## Sign-off

| Area | Status | Notes |
|------|--------|-------|
| Theme toggle | | |
| Onboarding | | |
| Billing/tax | | |
| Signup cleanup | | |
| Auth regression | | |
| Measurements | | |
| I18N | | |
| Accessibility | | |
| Infrastructure | | |
