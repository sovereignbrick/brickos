# App Test Report — 2026-03-12

*Tester: admin@schindlwick.com*
*Status: Analyzed & consolidated into task groups*

---

## Summary

| Category | Items | Priority |
|---|---|---|
| ✅ Passed | 3 items | - |
| 🔴 Bug fixes | 24 items | HIGH |
| 🟡 Improvements | 4 items | MEDIUM |
| **Total** | **31 items** | |

### ✅ Passed
- Language selection on website - EN/DE working, Dr. Alex translates ✓
- Registration and sign-in working ✓
- Dashboard in both languages ✓

---

## Consolidated Task Groups

### Task Group A1: i18n — Complete Translation Overhaul (CRITICAL)

This is the biggest systemic issue. Translation is incomplete across the entire app.

**A1.1 — Language preference must be authoritative**
- When user selects preferred language in settings, it MUST override all defaults
- Language selector in menu must work on ALL pages including Dr. Alex, markers, trends, settings tabs
- User's stored language preference takes priority over browser language or URL param

**A1.2 — Settings page tabs not translated**
- `/settings` — tab names (Device, Medication, etc.) are in English regardless of language
- Same for all sub-pages: thresholds, privacy, etc.

**A1.3 — Dr. Alex chat not respecting language**
- `/doctor-chat` — tiles and chat shown in German even when top selector and menu are English
- All Dr. Alex quick-action tiles must follow the selected language

**A1.4 — Marker names + descriptions not translated**
- `/markers/glucose` — no German translation available
- Primary Marker dropdown on trends page always shows English
- Health Zone names on trends page always English
- Marker descriptions in browser not translated for DE
- **Action:** Verify translation table has DE entries for ALL markers. Add missing ones. Make editable in admin (Content App section).

**A1.5 — Settings > Thresholds: "Save failed" message in English**
- When language is DE, error/success messages still show in English
- `/settings?tab=thresholds` — "Save failed" shown in English

**A1.6 — Settings > Medications page: English only**
- `/settings?tab=medications` — entire page in English, needs full DE translation

**A1.7 — Settings > Lifestyle fields labels**
- Dropdown labels for Ernahrungsprotokoll, Bewegung, Schlafqualitat, Fastenprotokoll, Stresslevel
- Some are translated, some aren't. Ensure consistency.

**A1.8 — Settings > Thresholds: German text too long (ladd symbol)**
- "Auf Standard zurucksetzen" label is too long, overflows
- Solution: shorten German text OR use icon with tooltip on hover showing full text

**A1.9 — PDF download message not translated**
- `/settings?tab=privacy` — PDF download success message in English when DE selected
- License upgrade prompt also in English

**A1.10 — App name inconsistency**
- Mobile version shows "Sovereign Health" but app name is "Sovereign Health Intelligence"
- Store name centrally (single constant/config). No translation needed — it's a brand name.

### Master i18n action:
```
1. Audit ALL hardcoded strings in frontend (app + website + admin)
2. Move every string to translation files (EN + DE)
3. Ensure admin Content sections exist: "Content App", "Content Web", "Content Admin"
4. All toast/error/success messages must go through i18n
5. User language preference overrides everything
```

---

### Task Group A2: Favicon + Branding

**A2.1 — Website favicon missing**
- `sovereignhealth.io` has no favicon (or wrong one). Google search shows empty icon.
- Copy the favicon from `app.sovereignhealth.io` to the website.
- Ensure `favicon.ico`, `apple-touch-icon.png`, and `site.webmanifest` are all present.
- Google will re-index the favicon eventually (can take days/weeks — not a code issue after fix).

**A2.2 — Signup + verification pages need app icon**
- `/signup` and "Wait for email verification" pages: add the application icon for branding feel.
- Also ensure both pages have language selection (EN/DE).
- Email verification message language should match the selected language on signup.

---

### Task Group A3: Measurement System Overhaul

**A3.1 — New Measurement form is overwhelming**
- `/measurements/new` — ALL markers added to form by default. Way too many.
- **Fix:** Form starts EMPTY. User adds markers they want via an "Add Marker" button.
- User can save their selection as a **template** for reuse.
- Template saves the selected markers + their order.
- The "X" remove button on markers is not working — fix it.

**A3.2 — Default measurement template**
- Create a system default template called "Daily Basics" with:
  - Body weight, Blood Pressure Systolic, Blood Pressure Diastolic, BPM (pulse), Glucose, Ketone, HCT, HB, THC (Total Cholesterol), UA (Uric Acid)
- User can create additional templates for different protocols (e.g., "Fasting Period", "Full Panel")

**A3.3 — Marker search broken**
- Cannot find "Blood Pressure", "BP", or "Systolic" in the marker search
- **Fix:** Search must match on:
  - Full name ("Blood Pressure Systolic")
  - Common abbreviations ("BP", "BG", "HB", "HCT", "THC", "UA")
  - Partial matches ("blood", "pressure", "glucose")
- Add an `abbreviation` or `aliases` field to the markers table if it doesn't exist
- Map: THC = Total Cholesterol, BG = Blood Glucose, HB = Hemoglobin, BP = Blood Pressure, UA = Uric Acid, HCT = Hematocrit

**A3.4 — Fasting field: replace Yes/No with protocols**
- Currently: Fasting toggle is Yes/No
- **Fix:** Replace with a dropdown of fasting protocols:
  - None / No Fasting
  - Intermittent Fasting (16:8)
  - Intermittent Fasting (18:6)
  - Intermittent Fasting (20:4)
  - OMAD (One Meal A Day)
  - Extended Fast (24-48h)
  - Extended Fast (48-72h)
  - Extended Fast (72h+)
  - Water Fast
  - Dry Fast
  - Custom
- Same values should appear in `/settings` for Fastenprotokoll
- Ensure consistent data types between measurement form and settings

**A3.5 — Diet Protocol field: align options**
- Check that the Diet Protocol dropdown in measurements matches what's in `/settings`
- Ensure consistent naming and options across both locations

**A3.6 — Profile body measurements as defaults**
- `/settings` has "Your Current Measurements": Age, Height, Waist Circumference, Weight
- If a user has these set in their profile, **pre-populate** them in new measurements
- Add tooltip: "This value comes from your profile settings. You can change it here or update your defaults in Settings."
- User can override per measurement without changing their profile defaults

---

### Task Group A4: Trends Page Fixes

**A4.1 — Glucose trend: reference range not showing measurement**
- `/markers/glucose` — Trend chart shows reference range bar but the single measurement point is not visible
- Switching between Standard/Fasting range has no visible effect on the chart
- **Fix:** Ensure measurement dots are rendered on the trend line AND reference range bands update when toggling

**A4.2 — Trends: Fasting Range checkbox missing**
- `/trends` — Only "Standard Range" checkbox, no "Fasting Range" option
- Add "Fasting Range" checkbox that overlays fasting-specific reference ranges

**A4.3 — Trends: filter to markers with data only**
- `/trends` — Primary Marker and Compare With dropdowns show ALL markers
- **Fix:** By default, only show markers that have at least one measurement value
- Add tooltip: "Add measurements first to see trend analysis for more markers"
- Empty state message for users with no measurements

**A4.4 — Trends: Primary Marker dropdown language**
- Dropdown always shows English marker names regardless of language setting
- Fix: use translated marker names from translation table

---

### Task Group A5: Dr. Alex Chat Layout

**A5.1 — Chat window not fully visible**
- `/doctor-chat` — User must scroll to see the chat input. Quick-action tiles push the chat off screen.
- **Fix:** Make tiles smaller/more compact. Ensure the chat input prompt is always visible without scrolling.
- Apply to both EN and DE layouts.

**A5.2 — Dr. Alex medication hint**
- `/settings?tab=medications` — Add a hint: "Tip: You can ask Dr. Alex to help add medications from a photo of your prescription"
- Translate to DE

---

### Task Group A6: Export Fix

**A6.1 — Export All fails**
- `/measurements` — "Export All" with 3 markers results in "Failed to export data"
- **Fix:** Debug the export endpoint. Check backend logs for the error.
- Test with varying numbers of measurements (1, 3, 10, 50)

---

### Task Group A7: Settings Page Fixes

**A7.1 — Thresholds: Unit row height**
- `/settings?tab=thresholds` — Ensure the Unit column height matches the reference value fields (Optimal Min, Optimal Max, etc.)
- Clean alignment across the row

**A7.2 — Privacy: Anonymous data sharing default**
- `/settings?tab=privacy` — "Anonyme Datenweitergabe" should be set to DEFAULT ACTIVATED
- User can opt out if they want
- This is the privacy-friendly default (anonymous, not identifying)

**A7.3 — PDF download message positioning**
- `/settings?tab=privacy` — PDF download success message appears at bottom of screen
- Upgrade prompt for PDF reports (Insight+ tier) also shows
- **Fix:** Position messages consistently — use a standard toast/notification position (top-right or top-center) across the entire app

---

### Task Group A8: Global Toast/Message Standardization

**A8.1 — Set standard for all messages across the app**
- All toast/notification/error/success messages must:
  1. Appear in a consistent position (top-right recommended)
  2. Be translated (EN/DE)
  3. Use consistent styling (green=success, red=error, yellow=warning, blue=info)
  4. Auto-dismiss after ~5 seconds (errors can persist longer)
- Audit all message calls across the codebase and standardize

---

### Task Group A9: Admin Content Management

**A9.1 — Create admin content sections**
- Extend the existing admin Content management with three sections:
  - **Content App** — all app-facing translatable strings
  - **Content Web** — all website-facing translatable strings
  - **Content Admin** — all admin panel translatable strings (NEW)
- Each section: editable key-value pairs with EN + DE columns
- Changes should take effect without redeployment (read from DB/cache)

---

## Prompt Execution Plan

| Prompt | Task Groups | Est. Complexity | Dependency |
|---|---|---|---|
| **A-P1** | A1 (full i18n audit + fix) | LARGE | None — most critical |
| **A-P2** | A3 (measurement overhaul) | LARGE | None |
| **A-P3** | A2 (favicon + branding) + A8 (toast standardization) | Medium | None |
| **A-P4** | A4 (trends fixes) | Medium | A-P1 (needs translated markers) |
| **A-P5** | A5 (Dr. Alex layout) + A5.2 (medication hint) | Small | A-P1 (needs i18n) |
| **A-P6** | A6 (export fix) | Small | None — can debug independently |
| **A-P7** | A7 (settings fixes) | Small | A-P1 (needs i18n) |
| **A-P8** | A9 (admin content management) | Medium | A-P1 (needs i18n structure defined) |

**Recommended order:** A-P1 → A-P3 → A-P2 → A-P6 → A-P4 → A-P5 → A-P7 → A-P8

---

## Design Principles (updates from this test)

### Add to project standards:
1. **User language preference is king** — stored preference > URL param > browser default
2. **All user-facing strings through i18n** — zero hardcoded text (EN or DE)
3. **Toast/message standard:** top-right, translated, color-coded, auto-dismiss
4. **App name:** "Sovereign Health Intelligence" everywhere (stored as single constant)
5. **Measurement form:** opt-in markers (not all-by-default), template-based
6. **Marker search:** must support abbreviations and partial matching
7. **Fasting protocols:** enumerated list (not Yes/No toggle)
8. **Profile defaults pre-populate** measurement forms (overridable)
