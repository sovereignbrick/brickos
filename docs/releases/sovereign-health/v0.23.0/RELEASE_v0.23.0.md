<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes
 Version: 0.23.0 - 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 - https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release v0.23.0 - Smart Import & RC Hardening (Sprint 005 + RC Testing)

**Date:** 2026-03-21
**Branch:** main
**Previous:** v0.22.0

---

## Summary

v0.23.0 delivers the Smart Import - Tabular Measurements feature from Sprint 005 along with comprehensive fixes from a full 18-section RC manual testing session. Major improvements span the marker detail page (translated content, why_it_matters/when_to_worry sections), the measurements history (advanced multi-select filters, proper table layout), Dr. Alex chat (3 Smart Import cards, improved UX), and deployment infrastructure (LibreOffice in Docker, multi-sheet spreadsheet support).

---

## Key Changes

### Features

- **Smart Import - Measurement Table** - Upload ODS, XLSX, CSV, or photos of measurement tables. AI extracts markers, dates, and values with column mapping and confidence badges. Supports multi-sheet spreadsheets (first sheet auto-selected).
- **Why It Matters / When to Worry** - 92 markers now display educational content explaining clinical significance and when to seek medical attention. Available in EN + DE.
- **Translated marker names** - Marker detail page shows localized names (e.g. "Glukose" in DE) from marker_translations table.
- **Advanced measurement filters** - Multi-select dropdowns for Device, Lab Provider, Diet Protocol, and Fasting Protocol. All use the new MultiSelect component with checkboxes and search.
- **Dr. Alex - 3 Smart Import cards** - Lab Result (PDF/Photo), Medication/Supplement, Measurement Table with consistent naming and emoji icons matching the file upload menu.
- **Locale-aware date pickers** - All date inputs now use DateOnlyPicker (react-datepicker) respecting user's DD/MM/YYYY format setting.

### Improvements

- **Zone dashboard tags** - Device type tags (Lab Provider in purple, Home Device in blue) on the date line below marker names. Archived devices show dashed amber border with tooltip.
- **Foods section** - Heading changed to "What Foods Keep {name} in Range" with intro text about fresh/natural food and diet protocol filter note.
- **Measurement table layout** - Fixed table-fixed with proper <tr> rows (no div wrappers breaking layout). Columns: Date, Marker, Device, Diet Protocol, Fasting Protocol, Value, Unit, Status.
- **Chat sidebar** - Darker background for better text contrast, delete conversation button (backend endpoint pending), two-line tooltips on all prompt tiles.
- **Content cleanup** - Replaced all em-dashes with regular dashes in marker content via migration.

### Infrastructure

- **LibreOffice in Docker** - libreoffice-calc installed in production backend image for spreadsheet-to-CSV conversion.
- **Multi-sheet CSV** - Handles ODS files with multiple sheets by auto-selecting first sheet output.
- **UTF-8 CSV output** - LibreOffice configured for UTF-8 charset with Latin-1 fallback for legacy encodings.
- **API timeout** - Claude CSV extraction timeout increased from 60s to 120s for complex spreadsheets.
- **Backend filters** - device_id now accepts comma-separated UUIDs; diet_protocol and fasting_protocol query params added to measurements list endpoint.

### Bug Fixes

- **Version mismatch** - VERSION constant updated in lib.rs, Cargo.toml, and deploy.sh (was still 0.22.0).
- **Demo mode on staging** - Measurements page now uses authenticated endpoints when user is logged in on demo hostname (useDemoApi flag).
- **Marker detail locale** - Language switch now triggers re-fetch (locale added to useEffect deps).
- **Summary table false positive** - AI extraction prompt clarified to not reject tables with specific dates even if they contain protocol labels.
- **Hydration error** - MeasurementPopover simplified to plain div wrapper (removed portal-based approach that caused SSR mismatch).

---

## Migrations

| # | File | Description |
|---|------|-------------|
| 20260321000001 | measurement_import.sql | Import sessions + rollback tables for Smart Import |
| 20260321000002 | why_it_matters_when_to_worry.sql | Populate why_it_matters + when_to_worry for all 92 markers (EN + DE) |
| 20260321000003 | replace_emdashes_in_content.sql | Replace em-dashes with regular dashes in marker content |

---

## Files Changed

- 26 files committed in RC fix pass
- 57 files total in develop -> main merge (includes Sprint 005 deliverables)

---

## Open Issues

- [#153](https://github.com/sovereignbrick/brickos/issues/153) - Projects vs projects path inconsistency (deployment DX)
- [#154](https://github.com/sovereignbrick/brickos/issues/154) - Dr. Alex responsiveness + navigation improvements
- React hydration error #418 on measurements page (cosmetic, does not affect functionality)
- Conversation delete backend endpoint not yet implemented
- Date picker consistency across all app pages (some still use native inputs)

---

## Testing

Full 18-section manual testing checklist completed on staging (demo.sovereignhealth.io). All sections pass. Checklist at: `docs/project-files/releases/v0.23.0-rc1/2026-03-21_manual-testing-checklist_v0.23.0-rc1.md`

---

## Deploy

```bash
# Staging (already deployed and tested)
bash ops/deploy.sh staging

# Production
git checkout main
bash ops/deploy.sh production --confirm
bash ops/deploy.sh git
```
