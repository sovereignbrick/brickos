# Issue #303: Lab import missing German marker aliases -- GFR (MDRD), HbA1c variants, abbreviations

**Type:** bug
**Priority:** high
**Component:** backend / marker matcher
**Found during:** manual lab PDF import testing (2026-04-02)

## Description

When importing German lab reports (Laborbefund), several markers are not recognized by the marker matcher due to missing aliases. This affects both PDF imports and tabular/image imports of printed lab results.

## Missing Aliases

### 1. GFR (MDRD-kurz) -- not matched
Current aliases only cover CKD-EPI variants. German labs commonly report GFR as "GFR (MDRD-kurz)" or "GFR (MDRD)".

**Need to add:**
- `"gfr (mdrd-kurz)"` → `egfr`
- `"gfr (mdrd)"` → `egfr`
- `"gfr mdrd"` → `egfr`

### 2. HbA1c (HPLC) / HbA1c (IFCC) -- not matched
Labs report HbA1c with the method in parentheses. The full string "HbA1c (HPLC)" doesn't match plain "hba1c" because the matcher sees the full input.

**Need to add:**
- `"hba1c (hplc)"` → `hba1c`
- `"hba1c (ifcc)"` → `hba1c`
- `"hba1c hplc"` → `hba1c`
- `"hba1c ifcc"` → `hba1c`

### 3. Abbreviated German names -- substring match fails
German labs use abbreviations that don't match the full alias:

| Lab text | Current alias | Problem |
|----------|--------------|---------|
| Cholesterin Ges. | cholesterin gesamt | "Ges." ≠ "gesamt" |
| Alkal. Phosphatase | alkalische phosphatase | "Alkal." ≠ "alkalische" |
| Bilirubin Ges. | bilirubin gesamt | Same abbreviation issue |

**Need to add:**
- `"cholesterin ges"` → `total_cholesterol`
- `"cholesterin ges."` → `total_cholesterol`
- `"alkal. phosphatase"` → `alp`
- `"alkal phosphatase"` → `alp`
- `"bilirubin ges"` → `bilirubin_total`
- `"bilirubin ges."` → `bilirubin_total`

### 4. Calprotectin -- entirely missing
Calprotectin (fecal inflammation marker) has no aliases at all. Common on German lab reports as "Calprotectin i.St." or "Calprotectin (CLIA)".

**Need to add new marker `calprotectin` with aliases:**
- `"calprotectin"`, `"calprotectin i.st."`, `"fäkales calprotectin"`, `"fecal calprotectin"`

### 5. Non-biomarker lab entries (low priority)
These are culture/pathogen tests, not numeric biomarkers -- can be ignored for now:
- Campylobacter jejuni / coli
- Salmonellen/Shigellen (Kultur)
- Yersinien (Kultur)
- B-1XT1

## Source Data

German lab report (Laborbefund) with ~50 markers across multiple dates, printed table format. See test images in `/home/dev-comp/Projects/TestDaten/Laborbefunde/`.

## Location

- Marker matcher: `apps/health/sovereign-health/api/src/services/marker_matcher.rs` (alias_map function)
- May also need migration for new `calprotectin` marker definition
