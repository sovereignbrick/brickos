# Issue #327: Unify import review into single component

**Type:** refactor
**Priority:** high
**Component:** frontend / import review
**Sprint:** 020 (continued)

## Description

Two separate review components exist for imports: `import-review.tsx` (lab PDF/image) and `measurement-import-review.tsx` (tabular/CSV/screenshot). This causes inconsistency and duplicated maintenance. Merge into one shared component with a consistent header.

## Current State

- `import-review.tsx`: lab import review — has lab dropdown, meal timing, diet/fasting protocol, date picker
- `measurement-import-review.tsx`: tabular import review — has device dropdown per column, protocol mapping, data rows table, diet/fasting protocol

Users see different UIs depending on import type, which is confusing.

## Proposed Unified Header

All import reviews share a consistent header section with these dropdowns (all optional, user fills what applies):

| Dropdown | Source | Purpose |
|----------|--------|---------|
| Date / Time | AI-extracted or user-set | When measurements were taken |
| Diet Protocol | User selects | Carnivore, Keto, Vegan, Vegetarian, Mediterranean, Mixed |
| Fasting Protocol | User selects | 16:8, OMAD, 36h, 48h, 72h, Extended |
| Meal Timing | User selects | Fasting, Before meal, 30m/1h/2h/3h after |
| Device | User's devices from Settings | Which device took the measurements |
| Lab | User's labs from Settings | Which lab performed the tests (any import type) |
| Lab Address | AI-extracted or user-set | Street, postal code, city — shown when lab is detected |

Below the header: the marker table (matched + unmatched) with editable values, confidence badges, and override capability.

## Key Requirements

1. **Users can override ANY AI match** — even "high" confidence. Click on the matched marker name to get a dropdown of all markers. This feeds the learning loop (#323).
2. **Device dropdown** pulls from user's existing devices (GET /devices)
3. **Lab dropdown** pulls from user's existing labs (GET /labs) — shown for all imports, not just lab PDFs
4. **Date/Time** picker — pre-filled from AI extraction, editable
5. **Consistent layout** across lab PDF, smart scale, glucose meter, CSV imports

## Import History Improvements

- Add date/time to each entry (formatted with user's locale preference)
- Entries with "0 markers imported" should be visually dimmed or hidden
- Show import type more descriptively (e.g., "Lab Report" instead of "Spreadsheet")

## Location

- Current: `src/components/doctor-chat/import-review.tsx` + `measurement-import-review.tsx`
- Target: single `src/components/import/import-review.tsx` (or refactor in place)
- Import history: `src/app/measurements/imports/page.tsx`
