# Design 032: Reference Ranges -- Protocol Impact on Biomarker Interpretation

**Status:** For MD Review
**Date:** 2026-03-27
**Purpose:** Document how dietary protocols shift biomarker reference ranges, with practical examples from our database. Intended for review by a medical professional to validate our reference range model.

---

## 1. Core Concept

Sovereign Health uses a 4-zone traffic-light model for every biomarker:

```
RED | ORANGE | GREEN (optimal) | ORANGE | RED
    ^        ^                  ^        ^
    orange   green              green    orange
    _min     _min               _max     _max
```

The key insight: **what is "normal" depends on what you eat and how you fast.** A glucose reading of 3.8 mmol/L is concerning on a standard diet but expected during a 48-hour fast. A total cholesterol of 7.0 mmol/L is alarming for a standard eater but may be benign for a lean mass hyper-responder on keto.

Our system adjusts reference ranges based on the user's dietary protocol, so the same blood value produces different color-coded assessments depending on context.

---

## 2. Protocol Contexts

| Protocol Context | Maps From | Description |
|-----------------|-----------|-------------|
| `standard` | Omnivore, Mediterranean, Vegetarian, Vegan, Paleo, Other | Standard medical reference ranges |
| `standard_keto` | Keto, Carnivore | Adjusted for ketogenic/low-carb metabolism |
| `fasting` | Any diet with active fasting | Generic fasting state (16h+) |
| `fasting_16_8` | 16:8 or OMAD | Intermittent fasting (daily time-restricted eating) |
| `fasting_48h` | 36h or 48h fasts | Multi-day fasting |
| `fasting_extended` | 72h+ fasts | Extended fasting (3+ days) |

**Mapping logic (services/calculated.rs):**
- Diet protocol Keto/Carnivore + measurement not during active fast -> `standard_keto`
- Measurement during active fast -> `fasting_*` based on fast duration
- All other diets (Omnivore, Vegan, Mediterranean, etc.) -> `standard`

---

## 3. Markers Affected by Protocol

### 3.1 Keto/Carnivore Protocol (standard_keto)

11 markers have keto-specific ranges. Here's how they differ from standard:

| Marker | Unit | Standard Green | Keto Green | Shift | Rationale |
|--------|------|---------------|------------|-------|-----------|
| **Glucose** | mmol/L | 4.0 -- 5.6 | 3.5 -- 5.0 | Lower | Reduced carb intake lowers fasting glucose |
| **Ketones** | mmol/L | 0.1 -- 3.0 | 0.5 -- 3.0 | Higher floor | Nutritional ketosis produces 0.5-3.0 mmol/L |
| **Total Cholesterol** | mmol/L | 3.5 -- 5.2 | 3.5 -- 7.0 | Widened upper | Lean mass hyper-responder (LMHR) pattern: TC rises with increased fat intake but particle composition changes |
| **LDL-C** | mmol/L | 1.0 -- 3.0 | 1.0 -- 4.5 | Widened upper | LDL particle size shifts to large buoyant (pattern A) on keto, which is less atherogenic per particle |
| **HDL-C** | mmol/L | 1.0 -- 2.5 | 1.3 -- 3.0 | Higher floor | Keto consistently raises HDL; below 1.3 on keto suggests the diet isn't working |
| **Triglycerides** | mmol/L | 0.4 -- 1.7 | 0.3 -- 1.2 | Tightened | Keto dramatically lowers TG; if TG stays above 1.2, suspect hidden carbs or metabolic issue |
| **Insulin** | uIU/mL | 2.0 -- 8.0 | 1.0 -- 5.0 | Tightened | Keto should lower insulin; levels above 5 suggest incomplete adaptation |
| **HbA1c** | % | 4.0 -- 5.6 | 3.8 -- 5.3 | Tightened | Average glucose should be lower on keto |
| **hs-CRP** | mg/L | 0.0 -- 1.0 | 0.0 -- 0.8 | Tightened | Keto typically reduces systemic inflammation |
| **Uric Acid** | umol/L | 200 -- 360 | 200 -- 420 | Widened upper | Ketones compete with uric acid for renal excretion; temporary elevation during adaptation is expected |
| **Ferritin** | ug/L | 30 -- 400 | 50 -- 300 | Shifted | Carnivore diets increase iron intake; higher floor expected, but too-high ferritin still concerning |

**Clinical note for MD:** The LMHR pattern (elevated LDL + low TG + high HDL) is well-documented in lean individuals on ketogenic diets. Our wider LDL range for keto does NOT ignore cardiovascular risk -- we recommend ApoB testing alongside LDL-C for keto users. ApoB ranges are identical across protocols because particle count is protocol-independent.

### 3.2 Fasting Protocols

16 markers have fasting-specific ranges. The shifts depend on fast duration:

**Glucose progression during fasting:**

| Protocol | Orange Min | Green Min | Green Max | Orange Max |
|----------|-----------|-----------|-----------|-----------|
| Standard | 3.5 | 4.0 | 5.6 | 6.9 |
| Fasting 16:8 | 3.0 | 3.5 | 5.0 | 6.0 |
| Fasting 48h | 2.5 | 3.0 | 4.5 | 5.5 |
| Extended (72h+) | 2.0 | 2.5 | 4.0 | 5.0 |

**Ketones progression during fasting:**

| Protocol | Orange Min | Green Min | Green Max | Orange Max |
|----------|-----------|-----------|-----------|-----------|
| Standard | 0.0 | 0.1 | 3.0 | 5.0 |
| Fasting 16:8 | 0.3 | 0.5 | 2.0 | 4.0 |
| Fasting 48h | 0.5 | 1.0 | 3.5 | 5.0 |
| Extended (72h+) | 1.0 | 2.0 | 5.0 | 7.0 |

**Clinical rationale:** During fasting, hepatic gluconeogenesis maintains glucose at a lower set point while ketone production increases for brain fuel. The longer the fast, the lower expected glucose and higher expected ketones. Our ranges track this physiological progression.

**Other fasting-affected markers:**

| Marker | Why Changed During Fasting |
|--------|--------------------------|
| Uric acid | Ketones compete with urate for renal tubular secretion; temporary elevation expected |
| Total cholesterol | Mobilization of fat stores increases circulating lipids |
| LDL-C | Transient LDL rise during lipolysis |
| HDL-C | May increase during fat mobilization |
| Triglycerides | Drop as TG are primary fuel source during fasting |
| Insulin | Should be very low during fasting |
| Iron | Serum iron fluctuates with fasting cycles |
| Liver enzymes (ALT, GGT) | Mild elevation during autophagy/fat mobilization is benign |
| Electrolytes (Na, K, Mg) | Fasting depletes electrolytes; wider acceptable ranges |
| Homocysteine | May rise slightly during fasting due to methyl group demand |
| Creatinine | May rise from muscle protein turnover during extended fasts |

### 3.3 Vegan Protocol (Not Yet Implemented)

**Recommended ranges to add in future sprint:**

| Marker | Change from Standard | Rationale |
|--------|---------------------|-----------|
| Vitamin B12 | Tighter lower bound | Vegans at high risk of B12 deficiency; require supplementation |
| Iron/Ferritin | Tighter lower bound | Plant-based iron (non-heme) has lower bioavailability |
| Vitamin D | Same as standard | Deficiency is diet-independent (sun exposure driven) |
| Omega-3 (EPA/DHA) | Tighter lower bound | No direct dietary EPA/DHA; must convert from ALA |
| Zinc | Tighter lower bound | Phytates in plant foods reduce zinc absorption |
| Homocysteine | Tighter upper bound | B12 deficiency elevates homocysteine |
| Total Protein/Albumin | Same as standard | Achievable on well-planned vegan diet |

### 3.4 Mediterranean Protocol (Not Yet Implemented)

Mediterranean diet is generally aligned with standard medical ranges. Minor adjustments:

| Marker | Change from Standard | Rationale |
|--------|---------------------|-----------|
| HDL | Higher floor expected | Olive oil + fish intake consistently raises HDL |
| Triglycerides | Tighter upper bound | Mediterranean diet should lower TG effectively |
| hs-CRP | Tighter upper bound | Anti-inflammatory dietary pattern |

---

## 4. Markers NOT Affected by Protocol

These markers use identical reference ranges regardless of diet:

| Category | Markers | Why Protocol-Independent |
|----------|---------|------------------------|
| **Kidney function** | eGFR, Cystatin C | Renal function is not diet-dependent |
| **Blood count** | WBC, RBC, Platelets, Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils | Hematological parameters are physiologically stable across diets |
| **Thyroid** | TSH, fT3, fT4 | Thyroid function is hormonally regulated, not diet-driven |
| **Hormones** | Testosterone, Estradiol, Progesterone, FSH, LH, SHBG, DHEA-S, Prolactin | Endocrine ranges are genetically/age determined |
| **Bone/mineral** | Calcium, Phosphate | Tightly regulated by parathyroid hormone regardless of intake |
| **Blood pressure** | Systolic, Diastolic | While diet affects BP, reference ranges for pathology are universal |
| **Heart rate** | HR | Driven by fitness, not diet |
| **Structural** | Albumin, Total Protein | Protein status achievable on any diet |
| **Most vitamins** | A, E, B2, B6, Folate | Lab reference ranges are diet-independent (deficiency risk varies) |
| **Minerals** | Selenium, Zinc | Lab ranges are universal; dietary intake varies |
| **Cardiovascular** | ApoB, Lp(a), Non-HDL-C | Particle count/genetic markers are protocol-independent |

**Note for MD:** While ApoB, Lp(a), and Non-HDL-C are protocol-independent, we list them alongside protocol-affected lipids (TC, LDL, HDL, TG) to provide the full cardiovascular risk picture. ApoB is arguably more important than LDL-C on keto because it accounts for particle number regardless of cholesterol content.

---

## 5. Practical Examples from Our Database

### Example A: Standard Omnivore (unhealthy)

```
Glucose:    6.2 mmol/L  -> ORANGE (standard green max: 5.6)
Ketones:    0.1 mmol/L  -> GREEN  (standard green: 0.1-3.0)
TG:         2.8 mmol/L  -> RED    (standard orange max: 2.3)
Insulin:   18.0 uIU/mL  -> RED    (standard orange max: 15)
LDL-C:      4.5 mmol/L  -> RED    (standard orange max: 4.1)
HDL-C:      0.9 mmol/L  -> ORANGE (standard green min: 1.0)
HbA1c:      6.1%        -> ORANGE (standard green max: 5.6)
```

Assessment: Pre-diabetic pattern with insulin resistance and dyslipidemia.

### Example B: Same Values on Keto Protocol

```
Glucose:    6.2 mmol/L  -> RED    (keto orange max: 6.0) -- WORSE on keto!
Ketones:    0.1 mmol/L  -> RED    (keto green min: 0.5) -- should be in ketosis
TG:         2.8 mmol/L  -> RED    (keto orange max: 1.7) -- WORSE on keto!
Insulin:   18.0 uIU/mL  -> RED    (keto orange max: 10) -- WORSE on keto!
LDL-C:      4.5 mmol/L  -> GREEN  (keto green max: 4.5) -- acceptable on keto
HDL-C:      0.9 mmol/L  -> RED    (keto orange min: 1.0) -- WORSE on keto!
HbA1c:      6.1%        -> RED    (keto orange max: 5.7) -- WORSE on keto!
```

Assessment: This person claims to be on keto but their markers say otherwise. The keto protocol TIGHTENS most ranges, making the assessment MORE alarming, not less. Only LDL is interpreted more leniently. The app would flag this clearly.

### Example C: Well-adapted Keto User

```
Glucose:    4.2 mmol/L  -> GREEN  (keto green: 3.5-5.0)
Ketones:    1.8 mmol/L  -> GREEN  (keto green: 0.5-3.0)
TG:         0.8 mmol/L  -> GREEN  (keto green: 0.3-1.2)
Insulin:    3.0 uIU/mL  -> GREEN  (keto green: 1.0-5.0)
LDL-C:      5.2 mmol/L  -> GREEN  (keto green: 1.0-4.5) -> actually ORANGE
TC:         7.2 mmol/L  -> GREEN  (keto green: 3.5-7.0)
HDL-C:      2.1 mmol/L  -> GREEN  (keto green: 1.3-3.0)
HbA1c:      4.8%        -> GREEN  (keto green: 3.8-5.3)
```

Assessment: Excellent keto adaptation. Low glucose, moderate ketones, low TG, low insulin. The elevated TC/LDL is expected in the LMHR pattern and is assessed in context of the excellent TG/HDL ratio.

### Example D: 48-Hour Fast

```
Glucose:    3.2 mmol/L  -> GREEN  (fasting_48h green: 3.0-4.5)
                           RED on standard (below orange_min 3.5)!
Ketones:    2.8 mmol/L  -> GREEN  (fasting_48h green: 1.0-3.5)
Uric Acid: 410 umol/L   -> GREEN  (fasting_48h green: 180-420)
                           RED on standard (above orange_max 360+)!
```

Assessment: Without protocol-aware ranges, this person would get alarming RED readings for glucose and uric acid that are actually perfectly normal during a 48-hour fast.

---

## 6. Implementation Details

### How Ranges Are Selected

```
User submits measurement with:
  - protocol_tag: "standard" or "fasting"
  - fasting_protocol: "16_8", "48h", etc.
  - diet_protocol: "keto", "carnivore", "omnivore", etc.

System resolves protocol_context:
  1. If protocol_tag = "fasting" -> use fasting_* ranges
  2. If diet = "keto" or "carnivore" -> use standard_keto ranges
  3. Otherwise -> use standard ranges

Threshold lookup:
  1. Check reference_ranges for (marker, protocol_context)
  2. If found -> use those thresholds
  3. If not found -> fall back to standard thresholds
```

### Calculated Markers

Calculated markers (GKI, BMI, WHtR, HOMA-IR, etc.) use their own threshold system stored in `calculated_markers.default_thresholds` and `protocol_overrides` (JSONB), NOT the `reference_ranges` table. This is because:

1. Calculated markers are derived values, not direct lab measurements
2. Their thresholds are formula-specific (e.g., GKI interpretation depends on whether you're using it for cancer research vs. general ketosis monitoring)
3. Protocol overrides are stored inline with the formula definition for tighter coupling

---

## 7. Gaps and Recommendations for MD Review

### Currently Implemented
- Standard ranges for 72 markers (evidence-based)
- Keto/carnivore protocol for 11 key markers
- Fasting protocols (16:8, 48h, extended) for 16 markers
- Calculated marker thresholds for 8 derived markers

### Needs MD Input
1. **Vegan protocol ranges** -- which markers need tightening?
2. **Gender-specific ranges** -- currently all ranges are unisex. Should we split hemoglobin, ferritin, testosterone, estradiol by gender?
3. **Age-specific ranges** -- should we adjust ranges for over-60 vs. under-30?
4. **Carnivore vs. keto distinction** -- currently identical. Should ferritin/iron ranges differ?
5. **Fasting adaptation period** -- first-time fasters may have different expected ranges than experienced fasters. Is this clinically meaningful?

### Quality Assurance
- 8 automated tests verify range completeness and consistency
- All ranges tested: green inside orange, no NULL greens, protocol variants exist
- Tooltip format standardized with LOINC codes for clinical traceability

---

## References

- Volek, J.S. et al. (2015). "The Art and Science of Low Carbohydrate Living"
- Feldman, D. (2022). Lean Mass Hyper-Responder pattern: cholestrolcode.com
- de Cabo, R. & Mattson, M.P. (2019). "Effects of Intermittent Fasting on Health, Aging, and Disease." NEJM 381:2541-2551
- Longo, V.D. & Mattson, M.P. (2014). "Fasting: Molecular Mechanisms and Clinical Applications." Cell Metabolism 19(2):181-192
- LOINC database: loinc.org (codes referenced in marker tooltips)
