# Design: LOINC Integration & Biomarker Reference Platform

**Issues:** [#145](https://github.com/sovereignbrick/brickos/issues/145), [#146](https://github.com/sovereignbrick/brickos/issues/146)
**Milestone:** [LOINC Integration & Biomarker API (#23)](https://github.com/sovereignbrick/brickos/milestones)
**Status:** Draft
**Date:** 2026-03-19

---

## Problem

Our 84 biomarkers lack standardized clinical identifiers. Without external reference codes:

- **No interoperability** — cannot import/export lab results from EHRs, FHIR-based systems, or other health apps
- **Data quality risk** — marker names, abbreviations, and units are internally defined without a clinical standard to validate against
- **No enrichment path** — cannot programmatically look up clinical descriptions, unit conversions, or cross-reference with external databases
- **No professional credibility** — clinic/research users expect LOINC-coded observations

LOINC (Logical Observation Identifiers Names and Codes) is the international standard for identifying clinical laboratory observations, used by HL7 FHIR, EHRs worldwide, and mandated by many regulatory bodies.

---

## LOINC Overview

### What LOINC Is

LOINC assigns a unique code to each distinct clinical observation. A LOINC code identifies a specific combination of six axes:

| Axis | Description | Example (Glucose) |
|---|---|---|
| **Component** | What is measured | Glucose |
| **Property** | Type of measurement | Mass concentration (MCnc) |
| **Time** | Point vs. duration | Point in time (Pt) |
| **System** | Specimen type | Serum or Plasma (Ser/Plas) |
| **Scale** | Quantitative vs. ordinal | Quantitative (Qn) |
| **Method** | How it's measured | (optional) |

**Critical matching rule:** The same marker name (e.g., "Glucose") exists across dozens of LOINC entries for different systems (Serum, Urine, CSF), scales (quantitative, ordinal), and methods. We must match the entry most applicable to our use case: **Serum/Plasma, quantitative, no specific method**.

### What LOINC Provides

- Unique code (e.g., `2345-7`)
- Long common name (e.g., "Glucose [Mass/volume] in Serum or Plasma")
- Short name, component, system, class
- Example units (UCUM format)
- Web lookup URL: `https://loinc.org/{code}`

### What LOINC Does NOT Provide

- Reference ranges (intentionally excluded — vary by lab, method, population)
- Optimal/performance ranges
- Clinical significance or interpretation
- Unit conversion factors
- Disease associations

### License

- **Free** for commercial and non-commercial use
- **No license fees**
- **Attribution required** — must include:
  > "This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee."
- Cannot use LOINC to create a competing vocabulary standard
- Cannot modify LOINC codes or their meanings
- Full license: https://loinc.org/license/

---

## Available APIs & Data Sources

### Primary: LOINC

| API | Auth | Status | Use Case |
|---|---|---|---|
| **LOINC FHIR API** (`fhir.loinc.org`) | Free registration (HTTP Basic) | BETA | Code lookup, properties, search |
| **NLM Clinical Tables** (`clinicaltables.nlm.nih.gov`) | None required | Stable | Autocomplete search, validation |
| **LOINC Web** (`loinc.org/{code}`) | None | Stable | Human-readable reference link |
| **LOINC Download** (`loinc.org/downloads/`) | Free account | Stable | Bulk CSV of all codes |

#### LOINC FHIR API Example

```
GET https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&code=2345-7
Authorization: Basic {base64(username:password)}

Response includes:
  - display: "Glucose [Mass/volume] in Serum or Plasma"
  - COMPONENT: "Glucose"
  - PROPERTY: "MCnc"
  - SYSTEM: "Ser/Plas"
  - CLASS: "CHEM"
  - EXAMPLE_UNITS: "mg/dL"
```

#### NLM Clinical Tables API Example (No Auth)

```
GET https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=glucose&df=LOINC_NUM,LONG_COMMON_NAME,COMPONENT,SYSTEM,CLASS
```

### Complementary: Unit Conversion

| Service | URL | Auth | Notes |
|---|---|---|---|
| **NIH UCUM Service** | `ucum.nlm.nih.gov/ucum-service.html` | None | LOINC-aware unit conversion |
| **UCUM NLM Clinical Tables** | `clinicaltables.nlm.nih.gov/apidoc/ucum/v3/doc.html` | None | Unit lookup + validation |
| **miracum LOINC Conversion** | `github.com/miracum/loinc-conversion` | Open source | REST service for LOINC unit conversion |

### Complementary: Clinical Enrichment

| Source | Data | License | URL |
|---|---|---|---|
| **MarkerDB 2.0** | 218 protein + 1,664 chemical markers, reference values, disease associations, sensitivity/specificity | Free (academic) | `markerdb.ca` |
| **SNOMED CT** | Clinical findings, diagnoses (maps to LOINC) | National license (free in US via NLM, DE via BfArM) | `snomed.org` |
| **HL7 FHIR Observations** | Standard structure for lab results with LOINC codes | Free | `hl7.org/fhir/observation.html` |
| **awesome-biomarkers** | Curated blood biomarker list with reference ranges | Open source (MIT) | `github.com/markwk/awesome-biomarkers` |
| **CureDAO health-reference-data** | Health reference databases, units, medical codes | Open source | `github.com/curedao/health-reference-data` |
| **Get Based** | 287+ biomarkers, optimal + standard reference ranges | Open source | `github.com/elkimek/get-based` |

### Key Architectural Insight

> LOINC tells you **what the test is**. It does NOT tell you **what the result means**.
>
> LOINC is the **universal join key** that links all other data sources together. By storing a LOINC code per marker, we can cross-reference MarkerDB for reference values, NIH UCUM for unit conversions, SNOMED CT for clinical findings, and our own curated optimal ranges — all keyed to the same identifier.

---

## Approach

### Phase 1 — LOINC Foundation (Sprint 002, Issue #145)

Map all existing 84 markers to LOINC codes. Add schema fields for external reference. Update abbreviations.

**Scope:**
- Database migration: add LOINC columns to `markers` table
- Seed all 84 markers with verified LOINC codes
- Update abbreviations to match LOINC standard conventions
- Rust model update
- LOINC attribution in app

### Phase 2 — Reference & Optimal Ranges

Enrich markers with clinically sourced reference ranges and curated optimal ranges.

**Scope:**
- EU/SI reference ranges per marker (from clinical guidelines + MarkerDB)
- Optimal/performance ranges (longevity-focused, functional medicine literature)
- Automatic low/high/optimal flag system
- Category tags: metabolic, inflammation, hormones, liver, kidney, lipids, hematology, vitamins, electrolytes
- Gender-specific and age-specific ranges
- Protocol-aware ranges (fasting, keto, athletic contexts)

### Phase 3 — Advanced Clinical Features

Full multi-code LOINC support, unit conversion, and health scoring.

**Scope:**
- Multiple LOINC codes per marker (different specimens/methods)
- Unit conversion engine via NIH UCUM service
- Composite health scores (metabolic score, inflammation score, etc.)
- SNOMED CT cross-reference for clinical findings
- FHIR Observation import/export

### Phase 4 — Public Biomarker API

Expose aggregated biomarker data as a public API.

**Scope:**
- REST API: `/api/v1/biomarkers/{loinc_code}`
- Comprehensive response: LOINC metadata + reference ranges + optimal ranges + unit conversions + clinical description + related markers
- API key auth + rate limiting
- OpenAPI documentation
- Free tier (basic lookup) + paid tier (full clinical data)
- FHIR-compatible response format option

---

## Data Model

### Phase 1 — New Columns on `markers` Table

```sql
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_code VARCHAR(20);
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_display_name TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_system TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_class TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS medical_description TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_url TEXT;

CREATE INDEX IF NOT EXISTS idx_markers_loinc_code ON markers(loinc_code);
```

| Column | Type | Purpose | Client-facing? |
|---|---|---|---|
| `loinc_code` | VARCHAR(20) | LOINC identifier (e.g., `2345-7`) | No (internal/API) |
| `loinc_display_name` | TEXT | Official LOINC long name | No (internal) |
| `loinc_system` | TEXT | Specimen type: Serum, Blood, Urine | No (future clinic UI) |
| `loinc_class` | TEXT | LOINC class: CHEM, HEMAT, ENDOCRINE | No (future clinic UI) |
| `medical_description` | TEXT | Clinical description from external sources | No (internal only) |
| `loinc_url` | TEXT | `https://loinc.org/{code}` | No (internal/admin) |

### Phase 2 — New Tables

```sql
-- Population-specific reference ranges from clinical sources
CREATE TABLE IF NOT EXISTS marker_reference_ranges_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES markers(id),
    population TEXT NOT NULL DEFAULT 'general',  -- 'general', 'male', 'female', 'pediatric', 'elderly'
    age_min INT,
    age_max INT,
    unit TEXT NOT NULL,
    reference_low NUMERIC(12,4),
    reference_high NUMERIC(12,4),
    optimal_low NUMERIC(12,4),
    optimal_high NUMERIC(12,4),
    source TEXT NOT NULL,                         -- 'WHO', 'IFCC', 'functional_medicine', etc.
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(marker_id, population, age_min, age_max, unit)
);

-- Category classification
CREATE TABLE IF NOT EXISTS marker_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES markers(id),
    category_slug TEXT NOT NULL,                   -- 'metabolic', 'inflammation', 'hormones', etc.
    category_name TEXT NOT NULL,
    display_order INT DEFAULT 0,
    UNIQUE(marker_id, category_slug)
);
```

### Phase 3 — New Tables

```sql
-- Multiple LOINC codes per marker (different specimens/methods)
CREATE TABLE IF NOT EXISTS marker_loinc_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES markers(id),
    loinc_code VARCHAR(20) NOT NULL,
    specimen TEXT,                                  -- 'Serum', 'Urine', 'CSF', etc.
    method TEXT,
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(marker_id, loinc_code)
);

-- Unit conversion factors
CREATE TABLE IF NOT EXISTS marker_unit_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES markers(id),
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    factor NUMERIC(20,10) NOT NULL,
    molecular_weight NUMERIC(12,4),                -- for molar conversions
    UNIQUE(marker_id, from_unit, to_unit)
);

-- Composite health scores
CREATE TABLE IF NOT EXISTS health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_slug TEXT UNIQUE NOT NULL,
    score_name TEXT NOT NULL,
    description TEXT,
    formula_description TEXT,
    component_marker_slugs TEXT[] NOT NULL,
    weight_factors JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Full LOINC Mapping — All 84 Markers

### Metabolic / Energy

| marker_slug | Current Abbr | LOINC | LOINC Name | System | Class | New Abbr |
|---|---|---|---|---|---|---|
| glucose | Glucose | 2345-7 | Glucose [Mass/vol] in Ser/Plas | Serum | CHEM | GLU |
| hba1c | HbA1c | 4548-4 | Hemoglobin A1c/Hemoglobin.total in Blood | Blood | CHEM | HbA1c |
| insulin | Insulin | 14959-1 | Insulin [Units/vol] in Ser/Plas | Serum | ENDOCRINE | INS |
| ketones | BHB | 13969-1 | 3-Hydroxybutyrate [Mass/vol] in Blood | Blood | CHEM | BHB |

### Electrolytes

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| sodium | Na | 2951-2 | Serum | CHEM | Na |
| potassium | K | 2823-3 | Serum | CHEM | K |
| chloride | Cl | 2075-0 | Serum | CHEM | Cl |
| bicarbonate | HCO₃ | 1963-8 | Serum | CHEM | HCO3 |
| calcium | Ca | 17861-6 | Serum | CHEM | Ca |
| magnesium | Mg | 19123-9 | Serum | CHEM | Mg |
| phosphate | PO₄ | 14879-1 | Serum | CHEM | PO4 |

### Kidney

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| creatinine | Crea | 2160-0 | Serum | CHEM | CREA |
| bun | BUN | 3094-0 | Serum | CHEM | BUN |
| egfr | eGFR | 33914-3 | Serum | CHEM | eGFR |
| uric_acid | UA | 3084-1 | Serum | CHEM | UA |

### Lipids / Cardiovascular

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| total_cholesterol | TC | 2093-3 | Serum | CHEM | TC |
| hdl_c | HDL-C | 2085-9 | Serum | CHEM | HDL-C |
| ldl_c | LDL-C | 13457-7 | Serum | CHEM | LDL-C |
| triglycerides | TG | 2571-8 | Serum | CHEM | TG |
| non_hdl_c | non-HDL | 18262-6 | Serum | CHEM | non-HDL |
| lp_a | Lp(a) | 10839-9 | Serum | CHEM | Lp(a) |
| apoa1 | ApoA1 | 2089-1 | Serum | CHEM | ApoA1 |
| apob | ApoB | 1884-6 | Serum | CHEM | ApoB |

### Liver

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| alt | ALT | 1742-6 | Serum | CHEM | ALT |
| ast | AST | 1920-8 | Serum | CHEM | AST |
| alp | ALP | 6768-6 | Serum | CHEM | ALP |
| ggt | GGT | 2324-2 | Serum | CHEM | GGT |
| bilirubin_total | Bili | 1975-2 | Serum | CHEM | BILI |
| bilirubin_direct | Bili-D | 1968-7 | Serum | CHEM | BILI-D |
| total_protein | TP | 1925-7 | Serum | CHEM | TP |
| albumin | Alb | 1751-7 | Serum | CHEM | ALB |
| globulin | Glob | 10834-0 | Serum | CHEM | GLOB |

### Inflammation / Iron

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| crp | CRP | 1989-3 | Serum | CHEM | CRP |
| hs_crp | hs-CRP | 30522-7 | Serum | CHEM | hs-CRP |
| esr | ESR | 4537-7 | Blood | HEMAT | ESR |
| ferritin | Ferritin | 32623-1 | Serum | CHEM | Ferritin |
| iron | Fe | 2500-7 | Serum | CHEM | Fe |
| transferrin | Transferrin | 2502-3 | Serum | CHEM | Transferrin |
| tibc | TIBC | 2501-5 | Serum | CHEM | TIBC |

### Hematology (CBC)

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| hemoglobin | HGB | 718-7 | Blood | HEMAT | HGB |
| rbc | RBC | 789-8 | Blood | HEMAT | RBC |
| wbc | WBC | 6690-2 | Blood | HEMAT | WBC |
| platelets | PLT | 777-3 | Blood | HEMAT | PLT |
| hematocrit | HCT | 4544-3 | Blood | HEMAT | HCT |
| mcv | MCV | 787-2 | Blood | HEMAT | MCV |
| mch | MCH | 785-6 | Blood | HEMAT | MCH |
| mchc | MCHC | 786-4 | Blood | HEMAT | MCHC |
| rdw | RDW | 788-0 | Blood | HEMAT | RDW |
| neutrophils | Neut | 731-0 | Blood | HEMAT | NEUT |
| lymphocytes | Lymph | 736-9 | Blood | HEMAT | LYMPH |
| monocytes | Mono | 742-7 | Blood | HEMAT | MONO |
| eosinophils | Eos | 713-8 | Blood | HEMAT | EOS |
| basophils | Baso | 706-2 | Blood | HEMAT | BASO |

### Vitamins

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| vitamin_d | 25(OH)D | 14682-9 | Serum | CHEM | 25(OH)D |
| vitamin_b12 | B12 | 2132-9 | Serum | CHEM | B12 |
| folate | Folate | 2284-8 | Serum | CHEM | Folate |

### Thyroid

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| tsh | TSH | 3016-3 | Serum | ENDOCRINE | TSH |
| ft4 | fT4 | 3024-7 | Serum | ENDOCRINE | fT4 |
| ft3 | fT3 | 3053-6 | Serum | ENDOCRINE | fT3 |

### Hormones

| marker_slug | Current Abbr | LOINC | System | Class | New Abbr |
|---|---|---|---|---|---|
| testosterone | Test | 2986-8 | Serum | ENDOCRINE | TEST |
| testosterone_free | fTest | 2991-8 | Serum | ENDOCRINE | fTEST |
| cortisol | Cortisol | 8310-5 | Serum | ENDOCRINE | CORT |
| estradiol | E2 | 2143-6 | Serum | ENDOCRINE | E2 |
| progesterone | Prog | 10501-5 | Serum | ENDOCRINE | PROG |
| fsh | FSH | 8302-2 | Serum | ENDOCRINE | FSH |
| lh | LH | 10505-6 | Serum | ENDOCRINE | LH |
| prolactin | PRL | 2842-3 | Serum | ENDOCRINE | PRL |

### Home-Device Markers (No Direct LOINC)

| marker_slug | Notes |
|---|---|
| weight | LOINC 29463-7 (Body weight) |
| height | LOINC 8302-2 (Body height) |
| waist_circumference | LOINC 56086-2 (Waist circumference) |
| blood_pressure_systolic | LOINC 8480-6 (Systolic BP) |
| blood_pressure_diastolic | LOINC 8462-4 (Diastolic BP) |
| heart_rate | LOINC 8867-4 (Heart rate) |
| body_temperature | LOINC 8310-5 (Body temperature) |
| spo2 | LOINC 2708-6 (Oxygen saturation) |

*Home-device markers have LOINC codes but may use different systems (e.g., "Patient" rather than "Serum"). These should be mapped in Phase 1 with appropriate system values.*

---

## API Changes

### Phase 1 — No Consumer API Changes

The new LOINC fields are **internal only**. The standard `GET /markers` and `GET /zones/{id}` responses remain unchanged.

**Internal/Admin endpoint** (optional):
```
GET /admin/markers/{slug}/loinc
→ { loinc_code, loinc_display_name, loinc_system, loinc_class, medical_description, loinc_url }
```

### Phase 2 — Extended Marker Response (Opt-in)

```
GET /markers?include=ranges,categories
→ markers[] now includes:
  - reference_range: { low, high, unit, population, source }
  - optimal_range: { low, high }
  - categories: ["metabolic", "inflammation"]
  - flags: { status: "optimal" | "low" | "high" }
```

### Phase 4 — Public Biomarker API

```
GET /api/v1/biomarkers/2345-7
→ {
    loinc_code: "2345-7",
    name: "Glucose",
    display_name: "Glucose [Mass/volume] in Serum or Plasma",
    system: "Serum",
    class: "CHEM",
    units: { canonical: "mg/dL", alternatives: ["mmol/L"] },
    reference_ranges: [
      { population: "general", low: 70, high: 100, unit: "mg/dL", source: "ADA" },
      { population: "general", low: 3.9, high: 5.6, unit: "mmol/L", source: "ADA" }
    ],
    optimal_ranges: [
      { low: 72, high: 90, unit: "mg/dL", context: "longevity", source: "SHI" }
    ],
    related_markers: ["4548-4", "14959-1"],
    categories: ["metabolic", "diabetes"],
    loinc_url: "https://loinc.org/2345-7"
  }
```

---

## UI Changes

### Phase 1 — None

No consumer-facing UI changes. LOINC data is backend-only.

### Phase 2 — Marker Detail Enhancement

- Category tags displayed as badges on marker cards
- Reference range source attribution (small text below range bar)
- Optimal range indicator on measurement charts

### Future — Clinic/Professional View

- Toggle: "Show clinical details" in settings (for healthcare professionals)
- Displays: LOINC code, system, class, LOINC URL link
- Available only for users with `clinic` or `professional` role

---

## Open Questions

- [ ] Should we register for the LOINC FHIR API (free) to validate codes, or rely on the provided JSON mapping?
- [ ] Should home-device markers (weight, height, etc.) get LOINC codes in Phase 1 or defer to Phase 3?
- [ ] For the Public Biomarker API (Phase 4) — separate service or extend the existing Sovereign Health API?
- [ ] MarkerDB data: academic license allows use in our product, but should we verify terms for commercial API redistribution?
- [ ] SNOMED CT: do we need German national license (BfArM) for DE market, or is LOINC sufficient for our use case?
- [ ] Should `medical_description` be populated via automated API calls (LOINC FHIR) or manually curated?

---

## References

- [LOINC.org](https://loinc.org/) — Universal lab observation codes
- [LOINC License](https://loinc.org/license/) — Free, attribution required
- [LOINC FHIR API](https://fhir.loinc.org) — Programmatic access (BETA, free registration)
- [NLM Clinical Table Search](https://clinicaltables.nlm.nih.gov/apidoc/loinc/v3/doc.html) — Free, no auth
- [NIH UCUM Service](https://ucum.nlm.nih.gov/ucum-service.html) — Unit conversion
- [MarkerDB 2.0](https://markerdb.ca/) — Biomarker database with reference values
- [SNOMED CT](https://www.snomed.org/) — Clinical terminology standard
- [HL7 FHIR Observations](https://www.hl7.org/fhir/observation.html) — Lab result interop standard
- [awesome-biomarkers](https://github.com/markwk/awesome-biomarkers) — Curated biomarker reference list
- [Get Based](https://github.com/elkimek/get-based) — Open-source blood work dashboard (287+ markers)
- [CureDAO health-reference-data](https://github.com/curedao/health-reference-data) — Health reference databases
- [miracum LOINC Conversion](https://github.com/miracum/loinc-conversion) — Unit conversion REST service
- [Issue #145](https://github.com/sovereignbrick/brickos/issues/145) — Sprint 002: LOINC mapping
- [Issue #146](https://github.com/sovereignbrick/brickos/issues/146) — LOINC Biomarker API platform
