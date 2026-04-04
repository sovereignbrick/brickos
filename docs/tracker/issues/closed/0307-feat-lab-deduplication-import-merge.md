# Issue #307: Lab import should reuse existing labs instead of creating duplicates

**Type:** bug / feature
**Priority:** high
**Component:** backend + frontend / import pipeline
**Found during:** manual testing (2026-04-02)

## Description

When importing lab data (PDF or image), the import pipeline extracts the lab name and always creates a new lab entry, even when a lab with the same or similar name already exists in the user's settings. This leads to duplicate lab entries (e.g. "Dr. med. Martin Seidl" appearing 3 times after 3 imports from the same doctor).

## Current Behavior

1. User imports a lab PDF → lab name extracted → new lab created
2. User imports another PDF from the same lab → another lab entry created
3. User's lab list grows with duplicates

## Expected Behavior

### Phase 1: Automatic deduplication
- On import, match extracted lab name against user's existing labs (fuzzy match on name)
- If match found, reuse the existing lab object
- Merge measurements into the existing lab: small panel from visit 1 + large panel from visit 2 should both link to the same lab
- Different visit dates are preserved as separate import sessions under the same lab

### Phase 1 includes: Lab dropdown in import review
- During import preview, show a dropdown of existing labs + "Create new lab" option
- Pre-select if AI-extracted name matches an existing lab after normalization
- User can manually assign the import to any existing lab if auto-matching fails or is incorrect
- Useful when lab names vary slightly between documents (e.g. "Labor Dr. Seidl" vs "Dr. med. Martin Seidl Laborpraxis")
- Fuzzy matching may not always be correct — the dropdown is the safety net

## Implementation Notes

### Backend
- Add `normalize_lab_name()` — lowercase, strip titles (Dr., med., Prof., Dipl.), trim whitespace, collapse spaces
- Import upload response should include `suggested_lab_id` (matched after normalization) + full `existing_labs` list from `GET /labs`
- Matching: exact match after normalization → auto-select; no match → user picks from dropdown
- `POST /import/confirm` already accepts optional `lab_id` — no API change needed
- `GET /labs` endpoint already exists and returns all user labs

### Frontend (import-review.tsx)
- Add lab provider dropdown below the detected lab name field
- Options: all existing labs from `GET /labs` + "Create new lab" at bottom
- Pre-select the auto-matched lab if `suggested_lab_id` is returned
- If user selects existing lab → send `lab_id` in confirm request
- If user picks "Create new" → send `lab_name` + address fields (current behavior)
- Lab address fields auto-fill from selected existing lab but remain editable

### Edge cases
- Lab name extracted differently across documents (abbreviations, line breaks in OCR)
- Same lab name but different location/branch → should be separate entries
- Lab address can help disambiguate

## Location

- Import handler: `apps/health/sovereign-health/api/src/handlers/import.rs`
- Lab metadata storage: import_sessions table or dedicated labs table
- Frontend import flow: Dr. Alex chat import + direct import UI
