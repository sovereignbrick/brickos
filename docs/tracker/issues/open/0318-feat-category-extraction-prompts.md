# Issue #318: Category-based extraction prompts

**Type:** feature
**Priority:** high
**Component:** backend / import pipeline
**Sprint:** 020
**Depends on:** #317 (format auto-detection)

## Description

Replace the single monolithic `EXTRACTION_SYSTEM_PROMPT` with category-specific prompts. Each category gets a focused, shorter prompt that handles its format reliably. The classifier from #317 determines which prompt to use.

## Current State

One `EXTRACTION_SYSTEM_PROMPT` (~80 lines) tries to handle lab reports, smart scales, glucose meters, and German lab abbreviations in a single prompt. It grows with every new format we support and becomes less reliable as instructions conflict.

## Proposed Prompts

### `lab_report` prompt
- Focus: structured lab report with columns (marker, value, unit, reference range, flag)
- Handles: German/English abbreviations, method suffixes (HPLC, IFCC, MDRD)
- Extracts: lab metadata (provider, address, date)
- Language-adaptive: decimal format, date format, abbreviation tables

### `body_composition` prompt
- Focus: grid/card layouts from any smart scale app
- Handles: kg vs % disambiguation, visceral fat levels, BMR, metabolic age
- Does NOT mention specific apps (Renpho, Withings) — focuses on the data format
- Handles: comparison views (extract most recent), trend charts (extract data points)

### `glucose_meter` prompt
- Focus: time-series glucose readings
- Handles: meal context (fasting, before/after meal), date/time per reading
- Handles: multiple readings per screen, each as separate marker entry
- Handles: CGM trend data (high/low alerts, time-in-range)

### `blood_pressure` prompt
- Focus: systolic/diastolic pairs with optional pulse
- Handles: time-series readings, morning/evening labels
- Handles: irregular heartbeat flags

### `general_health` prompt
- Focus: catch-all for unknown formats
- Conservative: extracts obvious markers, flags ambiguous ones with low confidence
- Prompts user to confirm all matches

## Implementation

```rust
fn extraction_prompt_for_category(category: &str, language: &str) -> &'static str {
    match category {
        "lab_report" => LAB_REPORT_PROMPT,
        "body_composition" => BODY_COMPOSITION_PROMPT,
        "glucose_meter" => GLUCOSE_METER_PROMPT,
        "blood_pressure" => BLOOD_PRESSURE_PROMPT,
        _ => GENERAL_HEALTH_PROMPT,
    }
}
```

Each prompt includes a language-specific section injected based on the detected language.

## Acceptance Criteria

- [ ] Each category has its own focused prompt (< 50 lines each)
- [ ] `EXTRACTION_SYSTEM_PROMPT` is retired
- [ ] Lab report extraction quality maintained or improved
- [ ] Body composition extraction handles grid, card, and comparison layouts
- [ ] Glucose meter extraction produces per-reading entries with timestamps

## Tests

- [ ] Unit test per category: known input → expected extraction structure
- [ ] Regression test: existing lab PDFs still extract correctly
- [ ] Regression test: existing Renpho screenshots still extract correctly

## Location

- Prompts: `apps/health/sovereign-health/api/src/config/extraction_prompts/` (new directory)
- Router: `apps/health/sovereign-health/api/src/handlers/import.rs`
