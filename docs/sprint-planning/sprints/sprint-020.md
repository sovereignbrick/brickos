# Sprint 020 -- Import Pipeline Evolution

**Started:** 2026-04-03
**Duration:** multi-day
**Status:** CLOSED — tested and verified 2026-04-03
**Goal:** Overhaul the import pipeline with smarter AI extraction, fuzzy matching, physiological validation, global learning feedback loop, and comprehensive regression tests. Fix the foundation before production scale.

## Context

Sprint 019 (v0.32.0) shipped 9 new body composition markers, German lab aliases, lab dedup dropdown, and Dr. Alex 360-day context. The import pipeline works but has structural limitations: a monolithic extraction prompt, no fuzzy matching, no validation guardrails, and no learning from user corrections. This sprint fixes the foundation before more users onboard.

Design spec: `docs/project-files/design/017-import-pipeline-evolution.md`

## Sprint Backlog

### M1: Smarter AI Extraction

| # | Title | Area |
|---|-------|------|
| #317 | Format auto-detection (classify before extract) | Backend |
| #318 | Category-based extraction prompts (replace monolithic prompt) | Backend |
| #319 | Structured output via Claude tool_use (no more JSON parsing) | Backend |

### M2: Smarter Matching

| # | Title | Area |
|---|-------|------|
| #320 | Fuzzy marker matching (Levenshtein distance) | Backend |
| #323 | User correction learning — global feedback loop | Full-stack |
| #324 | AI-assisted suggestions for unmatched markers | Full-stack |

### M3: Validation & Safety

| # | Title | Area |
|---|-------|------|
| #321 | Physiological range validation | Full-stack |
| #322 | Temporal consistency checks | Full-stack |

### M4: Metrics & Testing

| # | Title | Area |
|---|-------|------|
| #325 | Import quality metrics tracking | Full-stack |
| #326 | Import pipeline regression test suite | Testing |

## Dependency Graph

```
M1: Smarter AI Extraction (do first — other milestones build on it)
══════════════════════════════════════════════════════════════════

#317 Format auto-detection
  ↓ classifier determines category
#318 Category-based extraction prompts
  ↓ prompts use structured output
#319 Structured output (tool_use)

M2: Smarter Matching (after M1 — extraction output feeds matching)
═════════════════════════════════════════════════════════════════

#320 Fuzzy matching (independent, can start any time)

#323 User correction learning
  ↓ corrections feed into suggestions
#324 AI-assisted unmatched suggestions
  ↓ accepted suggestions feed back into #323

M3: Validation & Safety (after M1 — validates extraction output)
════════════════════════════════════════════════════════════════

#321 Physiological range validation (independent)
#322 Temporal consistency checks (independent, needs DB access)

M4: Metrics & Testing (last — tests validate all other milestones)
═════════════════════════════════════════════════════════════════

#325 Import quality metrics (after M1+M2, needs counters)
#326 Regression test suite (after ALL above, validates everything)
```

## Execution Order

```
PHASE 1 — Extraction overhaul
  1. #319 Structured output (tool_use)       — lowest risk, biggest reliability win
  2. #317 Format auto-detection              — classifier before extraction
  3. #318 Category-based prompts             — split monolithic prompt

PHASE 2 — Matching intelligence
  4. #320 Fuzzy matching (Levenshtein)       — add strsim crate, 4th matching tier
  5. #323 Correction learning + feedback     — migration + capture + aggregation
  6. #324 AI-assisted unmatched suggestions  — batch AI call for unmatched

PHASE 3 — Validation guardrails
  7. #321 Physiological range validation     — new validation.rs service
  8. #322 Temporal consistency checks        — compare with historical data

PHASE 4 — Measurement & quality
  9. #325 Import quality metrics             — counters on import_sessions
 10. #326 Regression test suite              — 100+ tests, full pipeline coverage

FINAL — Localhost RC test → extensive import testing by user
```

## Key Design Decisions

### Category-based, NOT app-specific prompts
There are hundreds of health apps. We do NOT create per-app prompts (Renpho, Withings, etc.). Instead, category-based prompts: `lab_report`, `body_composition`, `glucose_meter`, `blood_pressure`, `general_health`. Any app that outputs body composition data uses the same `body_composition` prompt.

### Multi-language via classifier
The format classifier detects language (DE, EN, FR, ES, IT, ...). Language-specific guidance (decimal format, date format, common marker names) is injected into the extraction prompt. The marker matcher static alias map covers DE + EN today; new languages added as users from those regions onboard.

### Global learning, not per-user
User corrections feed into a global improvement loop:
1. Log every correction (user changed AI match)
2. Aggregate: 5+ users correct same extraction → same slug? Auto-promote to global alias
3. Conflicts (users disagree) → admin review
4. Promoted aliases available to ALL users immediately

### Validation warns, never blocks
Physiological and temporal validation flags suspicious values but never prevents import. The user is always the final authority on their own health data.

## Success Criteria

1. **Format auto-detection** works for lab PDFs, scale screenshots, glucose meters (>95% accuracy)
2. **Category prompts** are shorter and more reliable than the monolithic prompt
3. **tool_use** eliminates all JSON parsing failures
4. **Fuzzy matching** recovers ~5% of previously-unmatched markers
5. **User corrections** feed into global alias improvement loop
6. **Validation** catches unit confusion and impossible values
7. **100+ automated tests** pass covering full import pipeline
8. **No regressions** — existing imports continue to work
9. **User testing** — extensive import testing passes on localhost

## Risk Assessment

- **#317+#318 (prompts):** Splitting the monolithic prompt could regress extraction quality if prompts are too narrow. Mitigate with regression tests against known lab PDFs.
- **#320 (fuzzy):** False positives from Levenshtein matching. Mitigate with strict constraints (min 6 chars, max distance 2, < len/3).
- **#323 (learning):** Bad corrections from single users could pollute global aliases. Mitigate with 5-user minimum threshold + conflict detection.
- **#319 (tool_use):** Changing the API call format could break extraction. Mitigate with fallback to text-mode if tool_use fails.
