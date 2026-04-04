# Issue #302: Tabular import not matching all body composition markers from smart scale screenshots

**Type:** bug
**Priority:** medium
**Component:** backend / import pipeline / marker matcher
**Found during:** manual testing (2026-04-02)

## Description

When importing a screenshot from a smart scale app (e.g. body composition history table), not all biomarkers are matched and imported. The source data contains Weight, BMI, Body Fat %, Body Water %, Muscle %, and Bone Mass % but some markers are missed during import.

The marker matcher has aliases for all these markers, so the issue is likely in AI extraction of the compact table format (e.g. short labels like "20,7 bmi", "6% fat", "20% Muscle") rather than the matching itself.

## Source Data Format

Smart scale app screenshot showing rows like:
```
27.03.26  69,20 kg   6% fat
04:15     20,7 bmi   20% Muscle
```

Also includes: Body Water %, Bone Mass Percentage in the detail card.

## Steps to Reproduce

1. Take a screenshot of the smart scale app's weight history page
2. Import via Dr. Alex or direct image import
3. Check which markers were recognized vs. skipped

## Expected Behavior

All body composition markers (weight, body fat %, body water %, muscle %, bone mass %) should be extracted and matched. BMI should be calculated post-import.

## Source App

**Renpho** smart scale app — grid layout with German labels, comma decimals, two-line-per-row format.

## Fix Approach

1. **AI extraction prompt:** Update to handle Renpho grid layouts — the compact format with value+unit pairs in a 3x4 grid needs explicit guidance in the extraction prompt
2. **Confidence scoring:** AI extraction should flag confidence level for each extracted marker mapping
3. **Pre-import review:** Low-confidence or ambiguous mappings (e.g., "Knochenmasse" could be kg or %) shown as editable dropdowns in the import review window — user confirms/corrects before final import
4. **Unit disambiguation:** When unit is ambiguous between % and kg, show both options in the review dropdown and let the user select the correct marker
5. **Calculated markers:** Ensure BMI and other calculated markers are triggered post-import via `enrich_with_latest_values`

## Dependencies

- **#304** must be completed first — the 9 new body composition marker definitions must exist before the matcher can map to them
- **#303** German aliases must be in place for matching

## Acceptance Criteria

- Import a Renpho smart scale screenshot → all available body composition markers extracted
- Ambiguous mappings shown in review window for user confirmation
- BMI computed automatically after weight is imported
- German comma decimals (69,20) parsed correctly as 69.20

## Location

- Marker matcher: `apps/health/sovereign-health/api/src/services/marker_matcher.rs`
- Import handler: `apps/health/sovereign-health/api/src/handlers/import.rs`
- AI extraction prompt (for tabular/image imports)
- Import review UI: `apps/health/sovereign-health/frontend/src/components/doctor-chat/import-review.tsx`
