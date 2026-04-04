# Issue #317: Auto-detect import format before extraction

**Type:** feature
**Priority:** high
**Component:** backend / import pipeline
**Sprint:** 020

## Description

Users currently must choose "Lab PDF", "Table Import", or "Medication" before uploading. Wrong choice leads to wrong extraction prompt and bad results. Add a lightweight AI classification step that auto-detects the format and routes to the appropriate extraction flow.

## Proposed Approach

Add a classification call (~100 tokens) before extraction:

```
Upload → Classify (AI) → Route to category prompt → Extract → Match → Review
```

### Classification output

```json
{
  "category": "lab_report" | "body_composition" | "glucose_meter" | "blood_pressure" | "medication" | "general_health" | "unknown",
  "language": "de" | "en" | "fr" | "es" | "it" | ...,
  "layout": "table" | "grid" | "list" | "form" | "document",
  "confidence": 0.95
}
```

### Category-based prompts (NOT app-specific)

Do NOT create app-specific prompts (Renpho, Withings, etc.). There are hundreds of health apps. Instead, use **category-based** prompts:

| Category | Covers | Key extraction rules |
|----------|--------|---------------------|
| `lab_report` | All lab PDFs/images in any language | Reference ranges, flags, provider metadata, abbreviation disambiguation |
| `body_composition` | Any smart scale app (Renpho, Withings, Xiaomi, Garmin, ...) | Grid layouts, kg/% disambiguation, body comp marker vocabulary |
| `glucose_meter` | Any CGM or glucose meter app | Time-series readings, meal context, fasting tags |
| `blood_pressure` | Any BP monitor app | Systolic/diastolic pairs, pulse, time-series |
| `medication` | Any supplement/medication packaging | Existing prompt (brand, dosage, ingredients) |
| `general_health` | Anything else (wearables, sleep trackers, etc.) | Generic marker extraction with user confirmation |

### Multi-language handling

The classifier detects language. The extraction prompt includes language-aware guidance:

- Decimal format: comma (DE/FR/IT/ES) vs dot (EN)
- Date format: DD.MM.YYYY (DE), MM/DD/YYYY (EN-US), DD/MM/YYYY (EN-GB/FR)
- Common marker names in detected language
- Abbreviation disambiguation rules per language

The marker matcher already handles DE + EN. For new languages, aliases are added to the static map as users from those regions onboard.

## Cost

~$0.001 per classification (100 input + 50 output tokens). Negligible vs extraction call.

## Acceptance Criteria

- [ ] Upload endpoint auto-detects format without user choosing import type
- [ ] Classification accuracy > 95% across lab PDFs, scale screenshots, glucose meters
- [ ] Language detection works for DE, EN, FR, ES, IT minimum
- [ ] Fallback: if classification confidence < 0.7, use generic extraction prompt
- [ ] Existing import types still work (backward compatible)

## Tests

- [ ] Unit test: classifier routes known formats correctly
- [ ] Integration test: German lab PDF → classified as lab_report/de
- [ ] Integration test: Renpho screenshot → classified as body_composition/de
- [ ] Integration test: English lab report → classified as lab_report/en

## Location

- Import handler: `apps/health/sovereign-health/api/src/handlers/import.rs`
- New: classifier prompt in `src/config/` or inline
