<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist — v0.24.0-rc1 (Sprint 006)
 Date: 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.24.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**API:** https://api-demo.sovereignhealth.io/health
**Login:** demo@sovereignhealth.io / Demo2026!
**Date:** 2026-03-21

---

## Layer 0: Infrastructure & Deploy

- [ ] API health endpoint returns 200 with correct version (v0.24.0-bN)
- [ ] Deploy script pre-flight check passes (PROJECT_ROOT, disk, VPS)
- [ ] Staging build number auto-increments on backend deploy
- [ ] Image size verification passes after docker save/load transfer
- [ ] Frontend Docker build resolves @brickos/ui workspace package

---

## Layer 1: Auth & Session

- [ ] Login with credentials
- [ ] Verify dashboard loads (zones visible, no console errors)
- [ ] Switch language DE -> EN -> DE (header toggle)
- [ ] Verify session persists on page refresh
- [ ] Signup with newsletter checkbox checked -> user appears in admin newsletter tab -- **FIXED in Sprint 006**

---

## Layer 2: Dashboard & Health Zones

- [ ] All 7 zones render with icons and colors
- [ ] Each zone shows marker count
- [ ] Click a zone -> markers list loads
- [ ] Marker cards show latest value + status color
- [ ] Click a marker -> marker detail page loads
- [ ] Switch language on zone page -> zone/marker names update WITHOUT refresh -- **FIXED in Sprint 006**

---

## Layer 3: Marker Detail

- [ ] Value, unit, status badge display correctly
- [ ] "Why It Matters" section shows content (not empty)
- [ ] "When to Worry" section shows content (not empty)
- [ ] Switch to DE -> verify German content appears for both sections
- [ ] Trend chart renders (select different periods: 7D, 30D, 3M, All)
- [ ] Foods / Supplements / References tabs load

---

## Layer 4: Measurements (History)

- [ ] History page loads without React hydration error #418 in console -- **FIXED in Sprint 006**
- [ ] No date filter by default, sorted newest first
- [ ] Table has aligned columns (Date, Marker, Value, Unit, Device, Protocol, Status)
- [ ] Click a row -> detail popover shows correctly
- [ ] Date formatting respects locale (DD.MM.YYYY for DE)
- [ ] MultiSelect filter dropdowns work (imported from @brickos/ui) -- **REFACTORED in Sprint 006**
- [ ] Edit a measurement -> device dropdown pre-selects correctly
- [ ] Pagination works if >50 entries
- [ ] DateOnlyPicker used for date range filters (not native input) -- **FIXED in Sprint 006**

---

## Layer 5: Trends

- [ ] Select a marker from dropdown
- [ ] Chart renders for "All" period
- [ ] 7D and 30D periods show data (or "No data" message)
- [ ] Switch markers -> chart updates

---

## Layer 6: Dr. Alex (Chat)

### 6a. Navigation & URL Routing -- **NEW in Sprint 006**
- [ ] `/doctor-chat` shows landing page with agent grid tiles
- [ ] Click a tile -> sends question, URL changes to `/doctor-chat/{id}`
- [ ] Click "Doctor Chat" in navbar while in conversation -> returns to landing page
- [ ] Click "Doctor Chat" in navbar from landing page -> stays on landing page
- [ ] Browser back button from `/doctor-chat/{id}` -> returns to landing
- [ ] "+ New conversation" button returns to landing page
- [ ] Direct URL `/doctor-chat/{invalid-id}` -> redirects to landing

### 6b. Conversations
- [ ] Send a text question -> response appears
- [ ] Conversation saves and appears in sidebar
- [ ] Click conversation in sidebar -> loads messages, URL updates
- [ ] Rename conversation works
- [ ] Delete conversation -> removed from sidebar, returns to landing -- **NEW in Sprint 006**
- [ ] Delete active conversation -> clears chat, returns to landing

### 6c. Quota & Rate Limiting
- [ ] Quota badge shows remaining/total
- [ ] Quota exhausted -> input disabled with upgrade message

---

## Layer 7: Smart Import - Lab PDF

- [ ] Click "Labor-PDF hochladen" card (or paperclip -> "Laborergebnis")
- [ ] Upload a lab PDF or photo
- [ ] Review screen: DateOnlyPicker for measurement date (not native input) -- **FIXED in Sprint 006**
- [ ] Review screen: no em-dashes in empty cells (use hyphens) -- **FIXED in Sprint 006**
- [ ] Review screen shows extracted markers with match confidence
- [ ] Confirm import -> success toast
- [ ] Check measurement appears in History

---

## Layer 8: Smart Import - Medications

- [ ] Click "Einflussfaktoren erfassen" card (or paperclip -> "Medikamente/Supplemente")
- [ ] Upload a medication photo
- [ ] Review screen shows extracted medications
- [ ] Confirm -> medication appears in Settings > Medications

---

## Layer 9: Smart Import - Tabular Measurements

### 9a. Entry Points
- [ ] Agent grid: "Tabellarische Messwerte importieren" card is visible
- [ ] Paperclip button: shows submenu with 3 options (Lab, Medication, Measurements)
- [ ] Clicking "Messwerte-Tabelle" opens file picker

### 9b. Multi-Sheet ODS/XLSX -- **FIXED in Sprint 006**
- [ ] Upload a multi-sheet ODS file (e.g. Blutwerte Messung 2026.ods)
- [ ] First/data sheet is used (NOT explanation/summary sheets)
- [ ] No "summary or analysis view" false rejection for data sheets

### 9c. Column Matching -- **IMPROVED in Sprint 006**
- [ ] "Blutdruck syst." matches to Systolic BP (not unmatched)
- [ ] "Blutdruck diast." matches to Diastolic BP (not AST)
- [ ] All German column headers match correctly (Gewicht, Puls, Blutzucker, etc.)
- [ ] Calculated markers shown as "berechnet - uebersprungen" (no em-dash)
- [ ] Match confidence badges (high/medium/low) display correctly

### 9d. Protocol Mapping -- **NEW in Sprint 006**
- [ ] Protocol mapping section shows editable dropdowns
- [ ] All 7 Messzeitpunkt options available (Nicht angegeben, Nuechtern, Vor der Mahlzeit, 30m/1h/2h/3h nach)
- [ ] Changing a protocol mapping updates the data rows immediately
- [ ] Protocol labels show translated text in DE mode (not raw English tags)
- [ ] Changed protocol overrides are applied when confirming import

### 9e. Duplicate Detection -- **NEW in Sprint 006**
- [ ] Rows with identical date+time+values highlighted in amber
- [ ] "dup" label shown next to date for duplicate rows
- [ ] "Skip duplicate timestamps" checkbox works

### 9f. Data Rows
- [ ] Row preview table with checkboxes
- [ ] Select/deselect all toggle works
- [ ] No em-dashes in empty value cells (hyphens only)
- [ ] Import button shows count
- [ ] Confirm import -> success message with count

### 9g. Import Rollback
- [ ] After a successful import, check Import History
- [ ] Rollback the import -> measurements should be deleted

---

## Layer 10: Settings

### 10a. Profile & Preferences
- [ ] Profile tab loads (name, email, locale, country)
- [ ] Units tab loads
- [ ] Lifestyle defaults tab loads
- [ ] Save changes -> success toast

### 10b. Devices
- [ ] Device list loads with all devices
- [ ] Device shows markers_measured list
- [ ] Lab devices show address info
- [ ] Edit a device -> save works
- [ ] Set default device -> badge appears

### 10c. Medications
- [ ] Medications tab loads
- [ ] DateOnlyPicker used (not native date input)
- [ ] Date picker matches theme in both light and dark mode
- [ ] Add/edit/archive medications works

### 10d. Reference Ranges
- [ ] Custom reference ranges load
- [ ] Edit/delete works

### 10e. Newsletter Consent -- **FIXED in Sprint 006**
- [ ] Toggle newsletter on in settings -> appears in admin newsletter tab
- [ ] Toggle newsletter off -> unsubscribed in admin newsletter tab

---

## Layer 11: Theme & Styling

- [ ] Toggle dark -> light -> dark
- [ ] No white backgrounds on dropdowns/selects in dark mode
- [ ] DateOnlyPicker styled correctly in both themes
- [ ] All pages visually correct in light mode (spot check 3-4 pages)
- [ ] No React hydration errors (#418) in browser console

---

## Layer 12: Admin Panel

- [ ] Login as admin -> admin panel accessible
- [ ] Dashboard stats load (user count, measurement count)
- [ ] Users tab: list loads, search works
- [ ] Settings tab: categories render, toggles work
- [ ] AI Usage tab: stats load for current month
- [ ] Audit Logs tab: access + event logs load
- [ ] If API fails -> red error banner appears (not empty state)
- [ ] Promotions tab: DateOnlyPicker for start/expiry dates (not native) -- **FIXED in Sprint 006**
- [ ] Newsletter tab: shows subscribers from signup + settings toggle -- **FIXED in Sprint 006**
- [ ] Affiliates tab loads
- [ ] Content Strings tab loads

---

## Layer 13: Import History & Billing

- [ ] Import History page loads
- [ ] Shows previous imports (lab, medication, measurement)
- [ ] Entries show file name, type, marker count, date
- [ ] License page shows current tier
- [ ] Pricing page loads with all tiers

---

## Layer 14: Locale / i18n

- [ ] Switch to DE on dashboard -> zone names update without refresh
- [ ] Switch to DE on zone detail -> marker names update without refresh
- [ ] Smart Import: protocol mapping shows German labels (Nuechtern, Nach dem Essen)
- [ ] Smart Import: "berechnet - uebersprungen" for calculated markers in DE
- [ ] Smart Import: all review screen labels in DE (Spaltenzuordnung, Datenzeilen, Protokollzuordnung)
- [ ] Switch back to EN: all strings in English
- [ ] No em-dashes anywhere in the UI (use hyphens)

---

## Layer 15: Shared Components (@brickos/ui) -- **NEW in Sprint 006**

- [ ] MultiSelect on measurements page works (filter by marker, device, lab, protocol, diet)
- [ ] MultiSelect search works
- [ ] MultiSelect shows count label when multiple items selected
- [ ] Verify no console errors related to @brickos/ui imports

---

## Layer 16: Cross-Cutting Concerns

### Browser Console
- [ ] No React errors (#418 hydration or others)
- [ ] No 404/500 XHR errors on page loads
- [ ] No CORS errors

### API Contract
- [ ] GET /health returns version, service name, timestamp
- [ ] DELETE /doctor-chat/conversations/:id returns 200 with `{ deleted: true }`
- [ ] POST /import/upload-measurements with ODS file returns extracted data (not summary error)
- [ ] POST /import/confirm-measurements with protocol_overrides applies correctly

### Performance
- [ ] Dashboard loads within 2s
- [ ] Dr. Alex landing page loads within 1s
- [ ] Measurement history with 50+ rows paginates without lag

---

## Notes

_Record any issues found during testing here:_

-
-
-
