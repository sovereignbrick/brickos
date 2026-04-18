<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist
 Version: 0.22.0 — 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.22.0 (Sprint 004: Polish & Precision)

**Date:** 2026-03-20
**Environment:** Staging (demo.sovereignhealth.io)
**Tester:** _______________
**Previous version:** v0.21.0

---

## A. Sprint 004-Specific Tests

### A1. MFA TOTP Issuer (P1-1)

- [ ] Enable MFA on a test account
- [ ] Scan QR code with authenticator app (Google Authenticator, Aegis, etc.)
- [ ] Verify issuer shows **"BrickOS - Sovereign Health Intelligence"** (not generic)
- [ ] Complete MFA setup, verify codes work

### A2. Exercise Dropdown (P1-2)

- [ ] Navigate to measurement entry (exercise/lifestyle section)
- [ ] Open exercise type dropdown
- [ ] Verify these options exist: Yoga, Pilates, Swimming, Cycling
- [ ] Verify i18n: switch to DE, confirm German translations present
- [ ] Save a measurement with one of the new exercise types

### A3. Light Theme Tooltip Fix (P1-3)

- [ ] Switch to light theme
- [ ] Navigate to device list or any page with tooltips
- [ ] Hover over tooltip triggers — verify text is readable (no black-on-black)
- [ ] Verify select/dropdown elements have correct styling in light theme
- [ ] Switch back to dark theme — confirm no regressions

### A4. Dr. Alex Banner Removed (P1-4)

- [ ] Navigate to influence factors tab
- [ ] Verify NO blue promotional banner for Dr. Alex appears
- [ ] Verify Dr. Alex is still accessible from sidebar navigation

### A5. Dosage Form — Powder Option (P1-5)

- [ ] Navigate to medication/supplement add or edit
- [ ] Open dosage form dropdown
- [ ] Verify "Powder" (EN) / "Pulver" (DE) option exists
- [ ] Save an item with Powder dosage form

### A6. Supplement Import Toast Link (P1-6)

- [ ] Import a supplement via Dr. Alex photo upload
- [ ] On success toast, verify "View in Settings" link appears
- [ ] Click link — verify it navigates to the correct settings section
- [ ] Compare with medication import toast — both should match

### A7. Locale-Aware Decimal Separator (P2-1)

- [ ] Switch to DE locale
- [ ] Navigate to weight or sleeping hours input
- [ ] Enter a decimal value using comma (e.g., `7,5`)
- [ ] Verify it accepts comma as decimal separator
- [ ] Verify display shows comma for DE locale
- [ ] Switch to EN locale — verify display shows period (e.g., `7.5`)
- [ ] Verify both `,` and `.` are accepted as input in both locales

### A8. Security Tab Two-Column Layout (P2-3)

- [ ] Navigate to Settings → Security
- [ ] Verify two-column grid layout (MFA left, password right)
- [ ] Verify responsive: collapses to single column on mobile width
- [ ] Verify all functionality still works within new layout

### A9. Privacy Tab Two-Column Layout (P2-4)

- [ ] Navigate to Settings → Privacy
- [ ] Verify two-column grid layout (consent left, export right)
- [ ] Verify responsive: collapses to single column on mobile width
- [ ] Verify all functionality still works within new layout

### A10. Influence Factors Explanation Text (P2-5)

- [ ] Navigate to influence factors page
- [ ] Verify clear section headers distinguishing medications vs supplements
- [ ] Verify explanation text about how factors affect marker interpretation
- [ ] Switch to DE — verify German translations present
- [ ] Switch to EN — verify English text present

### A11. Medication/Supplement Edit Layout (P2-6)

- [ ] Navigate to influence factors → edit a medication or supplement
- [ ] Verify column labels visible (name, dosage, form, frequency)
- [ ] Verify columns have readable widths (not cramped)
- [ ] Edit and save — verify changes persist

### A12. Measurement Search Ranking (P3-1)

- [ ] Navigate to measurement search / marker search
- [ ] Search for "muscle"
- [ ] Verify top results include CK, Myoglobin, Creatinine (not irrelevant noise)
- [ ] Search for "leber" (DE) — verify Liver-related markers appear first
- [ ] Search for exact marker name — verify it appears as #1 result

### A13. Dr. Alex Photo Validation (P3-2)

- [ ] Navigate to Dr. Alex photo upload
- [ ] Try to add more than 3 photos
- [ ] Verify error appears **immediately** (before upload/analysis starts)
- [ ] Verify error message is clear (i18n: EN and DE)
- [ ] Upload exactly 3 photos — verify it proceeds normally

### A14. Dr. Alex Results — Brand & Inline Editing (P3-3)

- [ ] Upload a supplement photo via Dr. Alex
- [ ] Verify brand name is extracted and displayed in results
- [ ] Verify mg/dosage values are shown
- [ ] Verify each extracted value is **inline editable** (name, dosage, form, brand)
- [ ] Edit a value and save — verify correction persists

### A15. Notification Service (new)

- [ ] Check API logs on startup — verify "Notifications: ENABLED" or "DISABLED" message
- [ ] If ntfy/Telegram configured:
  - [ ] Sign up a new test user → verify notification on Users channel
  - [ ] Reset password → verify notification on Users channel
  - [ ] Enable MFA → verify notification on Users channel
  - [ ] Disable MFA → verify notification on Users channel (High priority)
- [ ] Verify notifications are fire-and-forget (API response times not affected)

### A16. Database Migrations (Sprint 004)

- [ ] Verify `health_check` table dropped: `SELECT 1 FROM health_check` → should fail
- [ ] Verify `content_audit_log` table dropped: `SELECT 1 FROM content_audit_log` → should fail
- [ ] Verify `ui_strings` table still exists: `SELECT COUNT(*) FROM ui_strings` → should succeed
- [ ] Verify no migration errors in API startup logs

---

## B. Regression Tests

### B1. AUTH — Authentication

- [ ] Login: demo@sovereignhealth.io / Demo2026!
- [ ] Login with wrong password → shows error
- [ ] Rate limiting triggers after 5+ rapid failures
- [ ] Logout works, redirects to login
- [ ] MFA setup flow (enable, verify code, disable)
- [ ] Password change (requires current password + MFA if enabled)
- [ ] Forgot password → email sent (if Mailgun configured)

### B2. ZONES — Health Zones

- [ ] Zone list loads on dashboard
- [ ] Zone cards show correct colors and icons
- [ ] Zone detail page (`/zones/[slug]`) loads
- [ ] Markers listed within zones with translated names

### B3. MEAS — Measurements

- [ ] `/measurements` list page loads
- [ ] `/measurements/new` form renders (3-column layout)
- [ ] Device auto-populates markers when selected
- [ ] Template disabled when device selected
- [ ] Meal timing dropdown shows localized options (DE: Nüchtern, etc.)
- [ ] Save measurement succeeds
- [ ] Edit measurement (`/measurements/[id]/edit`) works
- [ ] Delete measurement works
- [ ] View measurement detail (`/measurements/[id]`) works

### B4. MARKERS — Marker Detail

- [ ] `/markers/[markerId]` loads
- [ ] Marker name translated (useContent, not raw marker_name)
- [ ] Abbreviation shown after name
- [ ] Reference ranges displayed

### B5. TRENDS — Trends Page

- [ ] Trends page loads
- [ ] Marker dropdown shows translated names grouped by zone
- [ ] Chart renders with data points
- [ ] Period selector works (7d, 30d, 3m, 6m, 1y, all)
- [ ] Secondary marker overlay works
- [ ] Reference range bands toggle on/off

### B6. DASH — Dashboard

- [ ] Dashboard loads
- [ ] Widgets render correctly
- [ ] Onboarding checklist shows for incomplete users
- [ ] Usage widget shows correct quota

### B7. CHAT — Doctor Chat / Dr. Alex

- [ ] Chat page loads
- [ ] Agent grid shows available agents
- [ ] Conversation list works
- [ ] Send message, receive response
- [ ] Import review panel works (lab + medication)
- [ ] Quota badge shows correct count
- [ ] File upload accepts JPEG, PNG, WebP, PDF

### B8. SETTINGS — Settings Page

- [ ] Profile section loads with user data
- [ ] Devices section: list, add, edit, delete
- [ ] Security tab: MFA toggle, password change (two-column layout)
- [ ] Privacy tab: consent toggles, data export (two-column layout)
- [ ] License/tier information displays correctly
- [ ] Billing section present (if Stripe configured)
- [ ] Billing address: customer type, company/VAT fields (business mode)
- [ ] Account deletion (test on non-protected user)

### B9. I18N — Internationalization

- [ ] Switch to DE: all visible strings translated
- [ ] Switch to EN: all visible strings in English
- [ ] No raw i18n keys visible (e.g., `common.save`)
- [ ] Marker names use translated content in all contexts
- [ ] Decimal separator matches locale (B7 + A7)
- [ ] Exercise types translated
- [ ] Dosage forms translated

### B9a. CONTENT — Admin Content Pipeline

**App content (live, DB-driven):**
- [ ] Admin → App-Inhalte → Markers → edit a marker description (e.g., Glucose)
- [ ] Verify change appears in app immediately (clear localStorage or wait for cache TTL)
- [ ] Admin → App-Inhalte → Zones → verify DE zone names display correctly
- [ ] Admin → App-Inhalte → Tiers → switch to DE tab → verify German translations present
- [ ] Admin → Textbausteine → edit a UI string → verify it appears in app

**Website content (static, requires publish):**
- [ ] Admin → Web-Inhalte → edit a section (e.g., homepage hero text)
- [ ] Verify change does NOT appear on website yet (static build)
- [ ] Admin → Website → click "Publish Website"
- [ ] Verify publish completes successfully
- [ ] Verify change NOW appears on the website
- [ ] Check `src/data/content-en.json` fetchedAt timestamp is fresh

**Content completeness:**
- [ ] Admin → App-Inhalte → Markers → spot-check 5 markers have description, tooltip, why_it_matters filled (EN + DE)
- [ ] Admin → App-Inhalte → Tiers → all 6 tiers have DE translations (name, tagline, description)
- [ ] Admin → App-Inhalte → Zones → all 8 zones have EN + DE names and descriptions

### B10. THEME — Dark/Light Mode

- [ ] Theme toggle visible in navbar
- [ ] Dark mode: no white backgrounds on any page
- [ ] Light mode: no dark-on-dark text issues
- [ ] All select/dropdown elements themed correctly
- [ ] Tooltips readable in both themes
- [ ] Preference persists across navigation and refresh
- [ ] Doctor chat components correct in both themes

### B11. BILLING — Billing & Subscriptions

- [ ] Pricing page loads with tier cards
- [ ] Checkout flow initiates (if Stripe configured)
- [ ] Billing page shows current subscription status
- [ ] Invoice history displays (if applicable)
- [ ] Cancel/reactivate flows work (if active subscription)

### B12. DEMO — Demo User Integrity

- [ ] Demo user has measurements visible on dashboard
- [ ] Demo user has devices in device list
- [ ] Demo user has calculated markers (GKI, BMI, etc.)
- [ ] Demo user cannot delete account (protected user)

---

## C. Post-Deploy Infrastructure Checks

- [ ] `curl https://api-demo.sovereignhealth.io/health` → version = "0.22.0"
- [ ] Frontend loads: https://demo.sovereignhealth.io/
- [ ] Website loads: https://www-demo.sovereignhealth.io/
- [ ] Container creation times are fresh (`docker inspect --format='{{.Created}}'`)
- [ ] Migrations applied: check `_sqlx_migrations` for migration 103 (drop_unused_tables)
- [ ] No error logs in `docker logs` for backend container
- [ ] Notifications log line present: "Notifications: ENABLED" or "DISABLED"
- [ ] Lockfile sync: no `ERR_PNPM_OUTDATED_LOCKFILE` in frontend build logs

---

## D. Accessibility (spot check)

- [ ] Tab navigation works through login → dashboard → measurements
- [ ] Focus indicators visible on interactive elements
- [ ] Form labels associated with inputs
- [ ] Color contrast: no unreadable text in either theme

---

## Sign-off

| # | Area | Tester | Date | Status | Notes |
|---|------|--------|------|--------|-------|
| A | Sprint 004 features | | | | |
| B1 | Auth | | | | |
| B2 | Zones | | | | |
| B3 | Measurements | | | | |
| B4 | Markers | | | | |
| B5 | Trends | | | | |
| B6 | Dashboard | | | | |
| B7 | Doctor Chat | | | | |
| B8 | Settings | | | | |
| B9 | I18N | | | | |
| B10 | Theme | | | | |
| B11 | Billing | | | | |
| B12 | Demo data | | | | |
| C | Infrastructure | | | | |
| D | Accessibility | | | | |
