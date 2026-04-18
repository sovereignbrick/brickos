<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist — v0.23.0-rc1 (Sprint 005)
 Date: 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.23.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**API:** https://api-demo.sovereignhealth.io/health
**Login:** demo@sovereignhealth.io / Demo2026!
**Date:** 2026-03-21

---

## 1. Login & Auth

- [ ] Login with demo credentials
- [ ] Verify dashboard loads (zones visible, no errors)
- [ ] Switch language DE → EN → DE (header toggle)
- [ ] Verify session persists on page refresh

---

## 2. Health Zones (Dashboard)

- [ ] All 7 zones render with icons and colors
- [ ] Each zone shows marker count
- [ ] Click a zone → markers list loads
- [ ] Marker cards show latest value + status color
- [ ] Click a marker → marker detail page loads

---

## 3. Marker Detail

- [ ] Value, unit, status badge display correctly
- [ ] "Why It Matters" section shows content (not empty) — **NEW in Sprint 005**
- [ ] "When to Worry" section shows content (not empty) — **NEW in Sprint 005**
- [ ] Switch to DE → verify German content appears for both sections
- [ ] Trend chart renders (select different periods: 7D, 30D, 3M, All)
- [ ] Foods / Supplements / References tabs load

---

## 4. Measurements (History)

- [ ] History page loads with all measurements (no date filter by default)
- [ ] Sorted newest first
- [ ] Table has aligned columns (Date, Marker, Value, Unit, Device, Protocol, Status)
- [ ] Click a row → detail popover shows correctly
- [ ] Date formatting respects locale (DD.MM.YYYY for DE, not US format)
- [ ] Edit a measurement → device dropdown pre-selects the correct device (not "Manuelle Eingabe")
- [ ] Pagination works if >50 entries

---

## 5. Trends

- [ ] Select a marker from dropdown
- [ ] Chart renders for "All" period
- [ ] 7D and 30D periods show data (or "No data" message, not empty chart)
- [ ] Switch markers → chart updates

---

## 6. Dr. Alex (Chat)

- [ ] Chat page loads
- [ ] Agent grid shows all cards including **"Tabellarische Messwerte importieren"** — **NEW**
- [ ] Send a text question → response appears
- [ ] Conversation saves and appears in sidebar

---

## 7. Smart Import — Lab PDF (existing)

- [ ] Click "Labor-PDF hochladen" card (or paperclip → "Laborergebnis")
- [ ] Upload a lab PDF or photo
- [ ] Review screen shows extracted markers with match confidence
- [ ] Confirm import → success toast
- [ ] Check measurement appears in History

---

## 8. Smart Import — Medications (existing)

- [ ] Click "Einflussfaktoren erfassen" card (or paperclip → "Medikamente/Supplemente")
- [ ] Upload a medication photo
- [ ] Review screen shows extracted medications
- [ ] Confirm → medication appears in Settings > Medications

---

## 9. Smart Import — Tabular Measurements **NEW**

This is the main new feature in Sprint 005.

### 9a. Entry Points
- [ ] Agent grid: "Tabellarische Messwerte importieren" card is visible
- [ ] Paperclip button: shows submenu with 3 options (Lab, Medication, Measurements)
- [ ] Clicking "Messwerte-Tabelle" opens file picker

### 9b. Spreadsheet Upload (if test file available)
- [ ] Upload an ODS, XLSX, or CSV file
- [ ] Wait for AI extraction (may take 10-30s)
- [ ] Review screen appears with:
  - [ ] Column mapping table (source column → matched marker)
  - [ ] Device assignment per column
  - [ ] Unit display
  - [ ] Match confidence badges (high/medium/low)
  - [ ] Calculated markers (BMI, GKI, WHtR) shown as "calculated — skipped" — **NEW**
- [ ] Row preview table with checkboxes
- [ ] Select/deselect all toggle works
- [ ] "Skip duplicate timestamps" checkbox present
- [ ] Import button shows count
- [ ] Confirm import → success message with count

### 9c. Image Upload (photo of table)
- [ ] Upload a photo of a measurement table
- [ ] AI extracts data correctly (dates, values, markers)
- [ ] Review screen shows extracted data
- [ ] Verify year inference for DD/MM dates (should show full YYYY-MM-DD)

### 9d. Summary Table Rejection — **NEW**
- [ ] Upload a photo of an "Overview Analysis" / summary screen (averaged values, not individual dates)
- [ ] System should reject with error: "This appears to be a summary or analysis view..."
- [ ] Should NOT try to import averaged data

### 9e. Import Rollback
- [ ] After a successful import, check Import History
- [ ] Rollback the import → measurements should be deleted

---

## 10. Settings — Profile & Preferences

- [ ] Profile tab loads (name, email, locale, country)
- [ ] Units tab loads
- [ ] Lifestyle defaults tab loads
- [ ] Save changes → success toast

---

## 11. Settings — Devices

- [ ] Device list loads with all devices
- [ ] Device shows markers_measured list
- [ ] Lab devices show address info
- [ ] Edit a device → save works
- [ ] Set default device → badge appears

---

## 12. Settings — Medications

- [ ] Medications tab loads
- [ ] Date picker uses react-datepicker (not native input) — **FIXED in Sprint 005**
- [ ] Date picker matches theme in both light and dark mode
- [ ] Add/edit/archive medications works

---

## 13. Settings — Reference Ranges

- [ ] Custom reference ranges load
- [ ] Edit/delete works

---

## 14. Theme

- [ ] Toggle dark → light → dark
- [ ] No white backgrounds on dropdowns/selects in dark mode
- [ ] Date pickers styled correctly in both themes
- [ ] All pages visually correct in light mode (spot check 3-4 pages)

---

## 15. Admin Panel

- [ ] Login as admin → admin panel accessible
- [ ] Dashboard stats load (user count, measurement count)
- [ ] Users tab: list loads, search works
- [ ] Settings tab: categories render, toggles work
- [ ] AI Usage tab: stats load for current month
- [ ] Audit Logs tab: access + event logs load
- [ ] If API fails → red error banner appears (not empty state) — **FIXED in Sprint 005**
- [ ] Promotions tab loads
- [ ] Newsletter tab loads
- [ ] Affiliates tab loads
- [ ] Content Strings tab loads

---

## 16. Import History

- [ ] Import History page loads
- [ ] Shows previous imports (lab, medication, measurement)
- [ ] Entries show file name, type, marker count, date

---

## 17. Billing

- [ ] License page shows current tier
- [ ] Pricing page loads with all tiers

---

## 18. Locale / i18n

- [ ] Switch to DE: all new Smart Import strings show German text
- [ ] "Tabellarische Messwerte importieren" card label in DE
- [ ] Review screen labels in DE (Spaltenzuordnung, Datenzeilen, etc.)
- [ ] "berechnet — übersprungen" for calculated markers in DE
- [ ] Switch back to EN: all strings in English

---

## Notes

_Record any issues found during testing here:_

-
-
-
