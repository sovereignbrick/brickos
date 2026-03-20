# Sprint 005 — Phase 0: Production Issues

Collected during v0.22.0 production testing on 2026-03-20.

---

## P0-1: History date filter excludes older data

**Problem:** The measurement history page (`/measurements`) defaults to a date range that only shows recent data. When filtering e.g. March 2026, imported data from June 2025 – January 2026 is hidden. Users expect to see all their data by default.

**Expected:** History should show all measurements by default (no date filter). Date filter should be optional for narrowing down.

**Reproduction:**
1. Login as helmut@schindlwick.com
2. Go to /measurements (History)
3. Note: date filter pre-filled with current month → only 2 results
4. Clear date filters → 191 results visible

**Fix:** Default date filter to empty (show all), or use a much wider default (e.g., 1 year).

---

## P0-2: Trends chart empty for 7D and 30D periods

**Problem:** Trends page shows empty chart when selecting 7D or 30D period selectors, even though data exists within those ranges. Only "All" period shows the data.

**Expected:** 7D/30D should calculate relative to today and show any data within that window. If no data in window, show "No data for this period" message.

**Reproduction:**
1. Go to /trends
2. Select Glucose marker
3. Select "7 days" → empty chart
4. Select "30 days" → empty chart
5. Select "All" → data appears

**Possible cause:** Period calculation may be off, or the API query filters by `created_at` instead of `timestamp` (measurement date). Imported data has `created_at` = 2026-03-20 but `timestamp` = 2025/2026 dates.

---

## P0-3: Missing measurement from 20.3.2026

**Problem:** User entered a measurement on 2026-03-20 via the app but it doesn't appear in the history. Only 2 entries from 2026-03-19 are visible.

**Expected:** All manually entered measurements should appear immediately.

**Reproduction:**
1. Check if measurement was saved (API call or DB query)
2. Verify it's not filtered out by date range

---

## P0-4: Imported data shows "1/7/2026" US date format

**Problem:** The measurement detail page shows dates in US format (M/D/YYYY) even when the user's locale is DE. Should show DD.MM.YYYY for German locale.

**Seen in:** Screenshot of BP Diastolic detail — "1/7/2026, 7:00:00 AM" instead of "07.01.2026, 07:00"

**Expected:** Date formatting should respect the user's locale setting.

---

## P0-5: History should always show latest measurements on top

**Problem:** The measurement history list doesn't consistently sort by newest first. Users expect their most recent measurements at the top.

**Expected:** Default sort: newest `timestamp` first. User should be able to reverse sort if needed.

---

## P0-6: History table layout broken — needs structured columns/tabs

**Problem:** The measurement history list looks unstructured — values, devices, dates, and protocols are crammed together without clear column alignment. On wider screens this looks especially bad.

**Expected:** Structured table with aligned columns (Date, Marker, Value, Unit, Device, Protocol, Status). Consider tabs for grouping (by date, by device, by marker). Responsive: card layout on mobile, table on desktop.

---

## P0-7: Edit measurement shows "Manuelle Eingabe" instead of actual device

**Problem:** When editing an imported measurement that was assigned to a device (e.g., Fora 6), the device dropdown defaults to "Manuelle Eingabe" (manual entry) instead of showing the correct device. The measurement detail popover correctly shows "Fora 6" but the edit form loses it.

**Reproduction:**
1. Click edit (pencil icon) on a Ketones measurement showing "Fora 6"
2. Edit page opens → device dropdown shows "Manuelle Eingabe"
3. All other devices listed in dropdown (Fora 6, Qardio Base, etc.) but not pre-selected

**Possible cause:** Edit page loads the measurement but doesn't set the device_id from the measurement data into the device select state. The measurement has `device_id` in the DB but the edit form initializer may not read it.
