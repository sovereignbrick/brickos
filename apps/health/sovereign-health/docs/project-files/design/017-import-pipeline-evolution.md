# Design 017: Import Pipeline Evolution

**Author:** Sprint 019 retrospective
**Date:** 2026-04-03
**Status:** DRAFT
**Scope:** Evaluate current import architecture, identify gaps, propose improvements

---

## 1. Current Architecture

The import pipeline uses a 5-phase model:

```
Upload → Extract (AI) → Match (deterministic) → Review (user) → Confirm → Persist
```

### What works well

**The AI/deterministic split is correct.** AI handles the ambiguous problem (OCR, table structure, layout detection) while deterministic code handles the known-schema problem (alias resolution, unit conversion, reference ranges). This gives us:

- Reproducible matching (same input → same slug every time)
- Auditable (alias map is in source code, not a black box)
- Fast (no API call for matching)
- Testable (38 unit tests on marker_matcher alone)

**User review before persistence is essential.** The review screen catches AI extraction errors before they become bad measurements. This is the right default for health data where incorrect values could mislead medical decisions.

**Session-based import with rollback.** Every import creates a session with measurement IDs tracked, enabling clean undo. This is the right model for a system where bad imports happen.

### What doesn't work well

| Problem | Impact | Frequency |
|---------|--------|-----------|
| Static alias map requires code changes | New lab formats need a release | Every sprint |
| No fuzzy matching for typos | "Glucos" → unmatched | ~5% of lab imports |
| Binary match (match or nothing) | No "did you mean?" suggestions | Every unmatched marker |
| No inter-value sanity checks | 400 mg/dL glucose accepted silently | Rare but dangerous |
| No format auto-detection | Must choose lab/table/medication upfront | User friction |
| Single extraction prompt for all formats | Smart scale, lab PDF, glucose meter use same prompt | Prompt bloat |

---

## 2. Proposed Improvements

### Phase 1: Smarter AI Extraction (Sprint 020)

#### 2.1 Format auto-detection

**Problem:** Users must choose "Lab PDF", "Table Import", or "Medication" before uploading. Wrong choice → wrong extraction prompt → bad results.

**Proposal:** Add a lightweight classification step before extraction:

```
Upload → Classify (AI, ~100 tokens) → Route to specialized prompt → Extract → Match → Review
```

The classifier would output:
```json
{
  "format": "lab_report" | "smart_scale" | "glucose_meter" | "spreadsheet" | "medication" | "unknown",
  "confidence": 0.95,
  "language": "de",
  "layout": "table" | "grid" | "list" | "form"
}
```

**Cost:** ~$0.001 per classification (100 input tokens + 50 output tokens). Negligible vs the extraction call.

**Benefit:** Enables specialized prompts per format instead of one bloated prompt. A Renpho-specific prompt would be much more reliable than a generic "handle everything" prompt.

#### 2.2 Specialized extraction prompts

Replace the single `EXTRACTION_SYSTEM_PROMPT` with format-specific prompts:

| Format | Prompt focus | Expected markers |
|--------|-------------|-----------------|
| `lab_report` | German/English lab PDFs, reference ranges, flags, provider metadata | Blood markers, lipids, hormones, vitamins |
| `smart_scale` | Grid layouts, kg/% disambiguation, German labels, comparison views | Body composition, weight, BMI |
| `glucose_meter` | Time-series readings, meal context, German date formats | Glucose, meal timing |
| `blood_pressure` | Systolic/diastolic pairs, pulse, time-series | BP, heart rate |
| `medication` | Packaging, ingredients, dosage, brand (existing prompt) | Medications, supplements |

Each prompt would be shorter, more focused, and more reliable than the current all-in-one prompt.

#### 2.3 Structured output (tool_use)

**Problem:** Current extraction returns free-form JSON in a text response. Claude sometimes wraps it in markdown fences, truncates arrays, or includes explanatory text.

**Proposal:** Use Claude's `tool_use` feature to force structured output:

```json
{
  "tools": [{
    "name": "extract_markers",
    "input_schema": {
      "type": "object",
      "properties": {
        "markers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "marker_name": { "type": "string" },
              "value": { "type": "number" },
              "unit": { "type": "string" },
              "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
            },
            "required": ["marker_name", "value"]
          }
        },
        "lab_date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
        "lab_provider": { "type": "string" }
      }
    }
  }]
}
```

**Benefit:** Eliminates all JSON parsing edge cases. No more `parse_extraction_response()` with fallback heuristics.

---

### Phase 2: Smarter Matching (Sprint 022-023)

#### 2.4 Fuzzy matching with Levenshtein distance

**Problem:** Typos and OCR errors cause unmatched markers. "Glucos", "Cholesterin Ges", "HbA1C" are close enough to match but the current exact/contains algorithm misses them.

**Proposal:** Add a 4th matching tier after the current 3 tiers:

```
1. Exact match
2. Contains match (input contains alias, prefer longest)
3. Reverse contains (alias contains input, only if input >= 4 chars)
4. NEW: Fuzzy match (Levenshtein distance <= 2, only for inputs >= 6 chars)
```

**Implementation:** Use the `strsim` crate (MIT licensed, zero dependencies):

```rust
use strsim::levenshtein;

// After tier 3 fails:
if normalized.len() >= 6 {
    let mut best: Option<(&str, usize)> = None;
    for (alias, slug) in map.iter() {
        if alias.len() >= 6 {
            let dist = levenshtein(&normalized, alias);
            if dist <= 2 && (best.is_none() || dist < best.unwrap().1) {
                best = Some((slug, dist));
            }
        }
    }
    if let Some((slug, _)) = best {
        return Some(slug); // confidence: "fuzzy"
    }
}
```

**Risk:** False positives. Mitigate by:
- Only for inputs >= 6 chars (short strings have too many neighbors)
- Max distance 2 (strict)
- Flag as `match_confidence: "fuzzy"` in review UI
- User must explicitly confirm fuzzy matches

#### 2.5 AI-assisted matching for unmatched markers

**Problem:** Some markers have no alias at all (new biomarkers, regional names, niche tests). Current behavior: silently unmatched, shown in "unmatched" section.

**Proposal:** For unmatched markers, make a second AI call to suggest the best match:

```
"The marker 'Glomerulare Filtrationsrate (CKD-EPI)' was not matched.
Here are the closest markers in our system: [egfr, creatinine, bun, ...]
Which one is the best match, or is this a new marker we don't track?"
```

**Cost:** ~$0.002 per unmatched marker. Only triggered for genuinely unmatched markers (typically 1-3 per import).

**Benefit:** Catches regional/niche names without needing to add aliases manually. The AI suggestion is shown to the user for confirmation, not auto-applied.

#### 2.6 Learning from user corrections

**Problem:** When a user manually corrects a marker match in the review screen, that correction is lost. The same unmatched marker will fail again on the next import.

**Proposal:** Store user corrections and use them as custom aliases:

```sql
CREATE TABLE user_marker_aliases (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    ai_name TEXT NOT NULL,          -- what the AI extracted
    marker_slug TEXT NOT NULL,      -- what the user selected
    source_lab_id UUID,             -- optional: lab-specific alias
    usage_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Matching priority:**
1. User-specific aliases (highest priority — user corrected this before)
2. Exact match (static alias map)
3. Contains match
4. Reverse contains
5. Fuzzy match
6. AI-assisted suggestion

**Benefit:** System gets smarter per user without requiring code changes. "Dr. Seidl always writes 'GFR n. MDRD'" → matched automatically after first correction.

---

### Phase 3: Validation & Safety (Sprint 024-025)

#### 2.7 Physiological range validation

**Problem:** No sanity check on extracted values. A glucose of 400 mmol/L (should be mg/dL) is accepted silently.

**Proposal:** Add a validation layer between extraction and review:

```rust
fn validate_physiological_range(slug: &str, value: f64, unit: &str) -> ValidationResult {
    match slug {
        "glucose" if unit == "mmol/L" && value > 50.0 => Warning("Value likely in mg/dL, not mmol/L"),
        "glucose" if unit == "mg/dL" && value > 600.0 => Error("Physiologically implausible"),
        "weight" if value > 300.0 || value < 20.0 => Warning("Weight outside normal human range"),
        "heart_rate" if value > 250.0 || value < 20.0 => Warning("Heart rate outside normal range"),
        _ => Ok,
    }
}
```

**Display:** Show warnings in the review UI as orange badges. Errors as red badges with "Are you sure?" confirmation.

#### 2.8 Temporal consistency checks

**Problem:** A user imports "Weight: 70 kg on Monday" and "Weight: 120 kg on Tuesday". No flag.

**Proposal:** Compare imported values against the user's historical data:

```rust
fn check_temporal_consistency(slug: &str, value: f64, date: DateTime, history: &[Measurement]) -> Option<Warning> {
    if let Some(prev) = history.last() {
        let delta_pct = ((value - prev.value) / prev.value).abs() * 100.0;
        let delta_days = (date - prev.timestamp).num_days();
        
        if delta_pct > 50.0 && delta_days < 7 {
            return Some(Warning(format!(
                "{:.0}% change in {} days — verify this value", delta_pct, delta_days
            )));
        }
    }
    None
}
```

**Display:** Show in review UI: "Weight changed 71% in 1 day — verify this value".

---

### Phase 4: Multi-format Intelligence (Sprint 026+)

#### 2.9 Template-based extraction

**Problem:** Every import runs a full AI extraction even for known formats (same lab, same layout every time).

**Proposal:** Learn document templates from successful imports:

1. First import from a lab: full AI extraction
2. On confirm: store the "template" (column positions, marker mappings, header patterns)
3. Next import from same lab: use template for deterministic extraction, AI only for OCR of values

**Benefit:** Faster, cheaper, more reliable for repeat lab imports. AI only needed for the OCR of numeric values, not for structural understanding.

#### 2.10 FHIR/HL7 structured import

**Problem:** Some labs and health systems can export data in structured formats (FHIR, HL7, CDA). These don't need AI at all.

**Proposal:** Add a structured import path:

```
Upload FHIR JSON → Parse → Map LOINC codes to marker slugs → Review → Confirm
```

Our markers already have LOINC codes (Phase 1 of design 011). This enables:
- Direct LOINC-to-marker resolution (no AI needed)
- Import from health portals (e.g., Austrian ELGA, German ePA)
- API-based import for developer integrations

---

## 3. Priority Matrix

| Improvement | Impact | Effort | Risk | Priority |
|-------------|--------|--------|------|----------|
| 2.1 Format auto-detection | High | Low | Low | P1 |
| 2.3 Structured output (tool_use) | High | Low | Low | P1 |
| 2.2 Specialized prompts | High | Medium | Low | P1 |
| 2.7 Physiological validation | High | Low | Low | P1 |
| 2.4 Fuzzy matching | Medium | Low | Medium | P2 |
| 2.6 Learning from corrections | High | Medium | Low | P2 |
| 2.8 Temporal consistency | Medium | Medium | Low | P2 |
| 2.5 AI-assisted matching | Medium | Low | Medium | P3 |
| 2.9 Template-based extraction | High | High | Medium | P3 |
| 2.10 FHIR import | High | High | Low | P4 |

---

## 4. Metrics to Track

To evaluate import quality over time:

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Match rate | ~85% | >95% | matched / total extracted per session |
| User correction rate | Unknown | <5% | Values changed in review / total confirmed |
| Rollback rate | Unknown | <2% | Rolled back sessions / total confirmed |
| False positive rate | Unknown | <1% | Incorrect matches not caught by user |
| Extraction failure rate | Unknown | <3% | Failed sessions / total uploads |
| Avg extraction confidence | Unknown | >0.85 | Mean confidence across all markers |

**Implementation:** Add counters to `import_sessions`:
```sql
ALTER TABLE import_sessions ADD COLUMN user_corrections INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN fuzzy_matches INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN ai_suggested_matches INT DEFAULT 0;
```

---

## 5. Conclusion

The current architecture is fundamentally sound. The AI-for-extraction + deterministic-for-matching split is correct and should be maintained. The main opportunities are:

1. **Better AI utilization** — format-specific prompts, structured output, auto-detection
2. **Fuzzy matching** — catch the ~5% of markers lost to typos/OCR errors
3. **User correction learning** — make the system smarter per user without code changes
4. **Validation guardrails** — catch physiologically impossible values before they're stored
5. **Template learning** — skip AI entirely for known lab formats after first import

These improvements can be implemented incrementally without architectural changes. The review-before-persist pattern remains the safety net for all of them.
