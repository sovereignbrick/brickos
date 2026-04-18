<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Browser Testing Checklist — v0.24.0-rc1
 Date: 2026-03-22

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Browser Testing Checklist — v0.24.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**API:** https://api-demo.sovereignhealth.io/health
**Login:** demo@sovereignhealth.io / Demo2026!
**Date:** 2026-03-22
**Tester:** _______________

> Keep browser console open throughout all testing to catch errors passively.
> Note any issues in the "Notes" section at the bottom.

---

## 1. Login Page (`/login`)

- [ ] Login with demo@sovereignhealth.io / Demo2026!
- [ ] Verify dashboard loads (zones visible, no console errors)
- [ ] Verify session persists on page refresh

## 2. Signup Page (`/signup`)

- [ ] Signup with newsletter checkbox checked -> user appears in admin newsletter tab

## 3. Dashboard (`/`)

- [ ] All 7 zones render with icons and colors
- [ ] Each zone shows marker count
- [ ] Click a zone -> markers list loads
- [ ] Switch language DE -> EN -> DE (header toggle)
- [ ] Zone/marker names update WITHOUT refresh on language switch

## 4. Zone Detail / Marker Cards

- [ ] Marker cards show latest value + status color
- [ ] Click a marker -> marker detail page loads

## 5. Marker Detail (`/markers/{id}`)

- [ ] Value, unit, status badge display correctly
- [ ] "Why It Matters" section shows content (not empty)
- [ ] "When to Worry" section shows content (not empty)
- [ ] Switch to DE -> verify German content appears for both sections
- [ ] Trend chart renders (select different periods: 7D, 30D, 3M, All)
- [ ] Foods / Supplements / References tabs load

## 6. Measurements History (`/measurements`)

- [ ] Page loads without React hydration error #418 in console
- [ ] No date filter by default, sorted newest first
- [ ] Table columns aligned (Date, Marker, Value, Unit, Device, Protocol, Status)
- [ ] Click a row -> detail popover shows correctly
- [ ] Date formatting respects locale (DD.MM.YYYY for DE)
- [ ] MultiSelect filter dropdowns work (marker, device, lab, protocol, diet)
- [ ] MultiSelect search works
- [ ] MultiSelect shows count label when multiple items selected
- [ ] Edit a measurement -> device dropdown pre-selects correctly
- [ ] Pagination works if >50 entries
- [ ] DateOnlyPicker used for date range filters (not native input)

## 7. Trends (`/trends`)

- [ ] Select a marker from dropdown
- [ ] Chart renders for "All" period
- [ ] 7D and 30D periods show data (or "No data" message)
- [ ] Switch markers -> chart updates

## 8. Dr. Alex — Landing (`/doctor-chat`)

- [ ] Landing page shows agent grid tiles
- [ ] Click "Doctor Chat" in navbar from landing page -> stays on landing page
- [ ] Dr. Alex landing page loads within 1s

## 9. Dr. Alex — Conversations (`/doctor-chat/{id}`)

- [ ] Click a tile -> sends question, URL changes to `/doctor-chat/{id}`
- [ ] Response appears after sending
- [ ] Conversation saves and appears in sidebar
- [ ] Click conversation in sidebar -> loads messages, URL updates
- [ ] Rename conversation works
- [ ] Delete conversation -> removed from sidebar, returns to landing
- [ ] Delete active conversation -> clears chat, returns to landing
- [ ] Click "Doctor Chat" in navbar while in conversation -> returns to landing
- [ ] Browser back button from `/doctor-chat/{id}` -> returns to landing
- [ ] "+ New conversation" button returns to landing page
- [ ] Direct URL `/doctor-chat/{invalid-id}` -> redirects to landing
- [ ] Quota badge shows remaining/total
- [ ] Quota exhausted -> input disabled with upgrade message

## 10. Smart Import — Lab PDF (via Dr. Alex paperclip or tile)

- [ ] Click "Labor-PDF hochladen" card (or paperclip -> "Laborergebnis")
- [ ] Upload a lab PDF or photo
- [ ] Review screen: DateOnlyPicker for measurement date (not native input)
- [ ] Review screen: no em-dashes in empty cells (hyphens only)
- [ ] Review screen shows extracted markers with match confidence
- [ ] Confirm import -> success toast
- [ ] Check measurement appears in History

## 11. Smart Import — Medications (via Dr. Alex paperclip or tile)

- [ ] Click "Einflussfaktoren erfassen" card (or paperclip -> "Medikamente/Supplemente")
- [ ] Upload a medication photo
- [ ] Review screen shows extracted medications
- [ ] Confirm -> medication appears in Settings > Medications

## 12. Smart Import — Tabular Measurements (via Dr. Alex paperclip or tile)

- [ ] "Tabellarische Messwerte importieren" card is visible
- [ ] Paperclip button shows submenu with 3 options (Lab, Medication, Measurements)
- [ ] Clicking "Messwerte-Tabelle" opens file picker
- [ ] Upload a multi-sheet ODS file -> first/data sheet is used (not summary)
- [ ] "Blutdruck syst." matches to Systolic BP (not unmatched)
- [ ] "Blutdruck diast." matches to Diastolic BP (not AST)
- [ ] All German column headers match correctly
- [ ] Calculated markers shown as "berechnet - uebersprungen" (no em-dash)
- [ ] Match confidence badges (high/medium/low) display correctly
- [ ] Protocol mapping section shows editable dropdowns
- [ ] All 7 Messzeitpunkt options available
- [ ] Changing a protocol mapping updates data rows immediately
- [ ] Protocol labels show translated text in DE mode
- [ ] Changed protocol overrides applied when confirming import
- [ ] Rows with identical date+time+values highlighted in amber
- [ ] "dup" label shown next to date for duplicate rows
- [ ] "Skip duplicate timestamps" checkbox works
- [ ] Row preview table with checkboxes, select/deselect all works
- [ ] No em-dashes in empty value cells
- [ ] Import button shows count
- [ ] Confirm import -> success message with count

## 13. Import History (`/import-history`)

- [ ] Page loads
- [ ] Shows previous imports (lab, medication, measurement)
- [ ] Entries show file name, type, marker count, date
- [ ] Rollback an import -> measurements deleted

## 14. Settings — Profile & Preferences (`/settings`)

- [ ] Profile tab loads (name, email, locale, country)
- [ ] Units tab loads
- [ ] Lifestyle defaults tab loads
- [ ] Save changes -> success toast

## 15. Settings — Devices

- [ ] Device list loads with all devices
- [ ] Device shows markers_measured list
- [ ] Lab devices show address info
- [ ] Edit a device -> save works
- [ ] Set default device -> badge appears

## 16. Settings — Medications

- [ ] Medications tab loads
- [ ] DateOnlyPicker used (not native date input)
- [ ] Date picker matches theme in both light and dark mode
- [ ] Add/edit/archive medications works

## 17. Settings — Reference Ranges

- [ ] Custom reference ranges load
- [ ] Edit/delete works

## 18. Settings — Newsletter Consent

- [ ] Toggle newsletter on -> appears in admin newsletter tab
- [ ] Toggle newsletter off -> unsubscribed in admin newsletter tab

## 19. Settings — Billing & License

- [ ] License page shows current tier
- [ ] Pricing page loads with all tiers

## 20. Theme Toggle (any page)

- [ ] Toggle dark -> light -> dark
- [ ] DateOnlyPicker styled correctly in both themes
- [ ] Spot check 3-4 pages in light mode — all visually correct

## 21. Admin Panel (`/admin`)

- [ ] Login as admin -> admin panel accessible
- [ ] Dashboard stats load (user count, measurement count)
- [ ] Users tab: list loads, search works
- [ ] Settings tab: categories render, toggles work
- [ ] AI Usage tab: stats load for current month
- [ ] Audit Logs tab: access + event logs load
- [ ] If API fails -> red error banner appears (not empty state)
- [ ] Promotions tab: DateOnlyPicker for start/expiry dates
- [ ] Newsletter tab: shows subscribers from signup + settings toggle
- [ ] Affiliates tab loads
- [ ] Content Strings tab loads

## 22. i18n Spot Check (across pages)

- [ ] Switch to DE on dashboard -> zone names update without refresh
- [ ] Switch to DE on zone detail -> marker names update without refresh
- [ ] Smart Import: all review screen labels in DE
- [ ] Switch back to EN -> all strings in English
- [ ] No em-dashes anywhere in the UI

## 23. Browser Console (check throughout)

- [ ] No React errors (#418 hydration or others)
- [ ] No 404/500 XHR errors on page loads
- [ ] No CORS errors
- [ ] No console errors related to @brickos/ui imports

## 24. Performance (observe during testing)

- [ ] Dashboard loads within 2s
- [ ] Measurement history with 50+ rows paginates without lag

---

## Summary

| Area | Items | Pass | Fail | Skip |
|------|-------|------|------|------|
| 1. Login | 3 | | | |
| 2. Signup | 1 | | | |
| 3. Dashboard | 5 | | | |
| 4. Zone Detail | 2 | | | |
| 5. Marker Detail | 6 | | | |
| 6. Measurements History | 11 | | | |
| 7. Trends | 4 | | | |
| 8. Dr. Alex Landing | 3 | | | |
| 9. Dr. Alex Conversations | 13 | | | |
| 10. Smart Import — Lab PDF | 7 | | | |
| 11. Smart Import — Medications | 4 | | | |
| 12. Smart Import — Tabular | 21 | | | |
| 13. Import History | 4 | | | |
| 14. Settings — Profile | 4 | | | |
| 15. Settings — Devices | 5 | | | |
| 16. Settings — Medications | 4 | | | |
| 17. Settings — Reference Ranges | 2 | | | |
| 18. Settings — Newsletter | 2 | | | |
| 19. Settings — Billing | 2 | | | |
| 20. Theme Toggle | 3 | | | |
| 21. Admin Panel | 11 | | | |
| 22. i18n Spot Check | 5 | | | |
| 23. Browser Console | 4 | | | |
| 24. Performance | 2 | | | |
| **Total** | **121** | | | |

---

## Notes

_Record any issues found during testing:_

1.
2.
3.
4.
5.
