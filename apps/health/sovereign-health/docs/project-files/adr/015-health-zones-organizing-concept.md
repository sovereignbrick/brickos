# ADR-015: Health Zones as Organizing Concept

**Status:** Accepted
**Date:** 2026-03-08

## Context
The platform tracks 84+ biomarkers. Lab test codes (TSH, ALT, LDL-C) are meaningless to non-experts. Users think in body systems ("How's my thyroid?", "Is my liver OK?"), not lab codes.

## Decision
Organize all biomarkers into **8 health zones** that map to body systems:

| Zone | Examples |
|------|----------|
| Energy & Metabolic | Glucose, HbA1c, Insulin, Thyroid (TSH, fT3, fT4) |
| Cardiovascular | Total Cholesterol, LDL, HDL, Triglycerides, CRP-hs |
| Structural | Calcium, Vitamin D, Phosphate, Alkaline Phosphatase |
| Nutritional | Iron, Ferritin, B12, Folate, Zinc, Selenium |
| Hormonal | Testosterone, Estradiol, Cortisol, DHEA-S |
| Cognitive | Omega-3 Index, Homocysteine, B12, Magnesium |
| Immune | WBC, Lymphocytes, IgA, IgG, Vitamin D |
| Detoxification | ALT, AST, GGT, Bilirubin, Creatinine, eGFR |

The dashboard shows zone-level health at a glance. Users drill into zones to see individual markers.

## Alternatives Considered
- **Flat marker list:** Simple but overwhelming. 84 markers in a list is unusable.
- **Lab-report style (by specimen type):** Groups by blood/urine/saliva. Meaningless to users — they don't care which tube their blood was in.
- **Organ-based:** Too granular (liver, kidney, thyroid each as category). Zones provide broader, more intuitive grouping.

## Consequences
- **Easier:** Intuitive navigation, zone-level health scores, Dr. Alex can reason about zones ("Your immune zone needs attention").
- **Harder:** Some markers belong to multiple zones (Vitamin D is both Structural and Immune). Currently handled by primary zone assignment.
- **Future:** Marker-zone associations will expand as more markers are added. LOINC standardization (ADR in progress) will formalize the mapping.
