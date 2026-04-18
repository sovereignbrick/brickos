# RELEASE v0.32.0 — Import Pipeline Evolution

**Date:** 2026-04-04
**Sprint:** 019 + 020
**Branch:** develop → main
**Tests:** 103 automated, all passing

## Highlights

- Complete import pipeline overhaul with AI format detection, category-based prompts, and structured output
- 9 new body composition markers for smart scale imports
- Fuzzy marker matching catches OCR typos
- User correction learning with global feedback loop
- HbA1c mmol/mol → % conversion and marker deduplication
- Unified import review header across all import types
- Diet, fasting, and meal timing protocols with user defaults

## Sprint 019 — Import Quality & Dr. Alex Intelligence

### New Features
- **9 body composition markers** (skeletal muscle, muscle mass, subcutaneous fat, visceral fat, fat-free mass, BMR, metabolic age, body protein, bone mass) with LOINC codes and reference ranges
- **Dr. Alex 360-day analysis window** (was 30 days)
- **Lab dedup with dropdown** — user selects existing lab or creates new during import
- **Calprotectin marker** with German aliases (i.St., CLIA)
- **Chloride marker** with CLD-E alias

### Bug Fixes
- Migration crash fix (encrypted value cast as float8)
- Import rollback button wiring (session_id resolution)
- German marker aliases (GFR MDRD, HbA1c HPLC/IFCC, Cholesterin Ges., Alkal. Phosphatase)
- Mobile smart import buttons flex-wrap

## Sprint 020 — Import Pipeline Architecture

### New Features
- **Claude tool_use** for structured extraction output (images)
- **Format auto-detection** classifier (lab_report, body_composition, glucose_meter, blood_pressure)
- **Category-based extraction prompts** with multi-language support (DE, EN, FR, ES, IT)
- **Fuzzy marker matching** (Levenshtein distance via strsim crate)
- **User correction learning** — corrections promote to global aliases when 5+ users agree
- **AI-assisted suggestions** for unmatched markers
- **Physiological range validation** (unit confusion detection, extreme value flagging)
- **Temporal consistency checks** (flags unrealistic changes)
- **Import quality metrics** tracking on import_sessions
- **Unified import review header** — consistent dropdowns across all import types
- **Diet/Fasting/Meal Timing protocols** stored on measurements, defaults from user settings
- **Unmatched column reassignment** — dropdown to manually assign markers AI missed

### Bug Fixes
- HbA1c mmol/mol → % conversion (IFCC to DCCT)
- Marker deduplication (removes Kurzbefund column duplicates)
- Lab device auto-creation when selecting existing lab
- Lab name shown in measurement history
- Rollback: measurement_ids tracking for lab imports, backfill for pre-v0.32.0
- Rollback: redirect to measurements page with toast + no-cache headers
- Rollback: filter is_demo=false in measurements list
- Retry logic on ALL Anthropic API calls with connection pool idle timeout
- Fat/fat% alias for body_fat_pct
- AI field name tolerance (marker_name, name, marker)
- Lab metadata extraction from nested objects
- Timezone: display times in UTC (matches imported time)
- Migration checksum pre-flight check in deploy script
- PDF imports skip tool_use (prevents timeout)
- Classifier skipped for explicit import types

## Migrations (8)
- 20260326000001: Rewritten seed migration (hardcoded demo values)
- 20260403000001: Calprotectin marker
- 20260403000002: 9 body composition markers
- 20260403000003: Import classification columns
- 20260403000004: Marker corrections learning tables
- 20260403000005: Import quality metrics columns
- 20260403000006: Default meal timing
- 20260403000007: Chloride marker
- 20260404000001: Backfill measurement_ids

## Design Documents
- 017: Import Pipeline Evolution (architecture, priority matrix, metrics)

## Known Issues
- AI OCR sometimes reads wrong column values from lab reports
- Rotated lab photo images reduce extraction accuracy
- Full i18n for error messages (deferred to Sprint 021, #328)
