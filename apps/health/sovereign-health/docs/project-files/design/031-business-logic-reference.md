# Design 031: Business Logic Reference -- Sovereign Health Intelligence

**Status:** Living Document
**Date:** 2026-03-27
**Purpose:** Complete reference of all business logic in the application, for the app owner, development team, and user documentation.

---

## 1. Calculated Markers

### Overview

Sovereign Health computes 7 derived health markers from raw measurement inputs. These are calculated at runtime when measurements are submitted, using the same formulas on both backend (Rust) and frontend (TypeScript).

### Marker Catalog

| # | Slug | Name | Formula | Inputs | Unit | Protocol-Aware |
|---|------|------|---------|--------|------|----------------|
| 1 | `gki` | Glucose-Ketone Index | glucose / ketones | glucose, ketones | ratio | Yes |
| 2 | `dr_boz_ratio` | Dr. Boz Ratio | (glucose x 18) / ketones | glucose, ketones | ratio | No |
| 3 | `whtr` | Waist-to-Height Ratio | waist_cm / height_cm | waist_circumference, height (profile) | ratio | No |
| 4 | `bmi` | Body Mass Index | weight / (height_m x height_m) | weight, height (profile) | kg/m2 | No |
| 5 | `hct_hb_ratio` | HCT/HB Ratio | hematocrit / (hemoglobin x 1.61) | hematocrit, hemoglobin | ratio | Yes |
| 6 | `tg_hdl_ratio` | TG/HDL Ratio | triglycerides / hdl | triglycerides, hdl | ratio | No |
| 7 | `homa_ir` | HOMA-IR | (glucose x 18.018 x insulin) / 405 | glucose, insulin | index | No |

### Threshold Ranges (Standard Protocol)

| Marker | Red (low) | Orange (low) | Green | Orange (high) | Red (high) |
|--------|-----------|--------------|-------|---------------|------------|
| GKI | < 3.0 | 3.0 - 3.0 | 3.0 - 6.0 | 6.0 - 9.0 | > 9.0 |
| Dr. Boz | -- | -- | 0 - 40 | 40 - 80 | > 80 |
| WHtR | < 0.35 | 0.35 - 0.40 | 0.40 - 0.50 | 0.50 - 0.58 | > 0.58 |
| BMI | < 17.0 | 17.0 - 18.5 | 18.5 - 24.9 | 24.9 - 29.9 | > 29.9 |
| HCT/HB | < 2.5 | 2.5 - 2.7 | 2.7 - 3.5 | 3.5 - 3.7 | > 3.7 |
| TG/HDL | -- | -- | 0 - 1.5 | 1.5 - 3.0 | > 3.0 |
| HOMA-IR | -- | -- | 0 - 1.0 | 1.0 - 2.0 | > 2.0 |

### Fasting Protocol Overrides

When `protocol_tag = "fasting"`, thresholds shift based on `fasting_protocol`:

| Protocol | Maps To | GKI Green Max | GKI Orange Max |
|----------|---------|---------------|----------------|
| 16:8, OMAD | fasting_16_8 | 9.0 | 15.0 |
| 36h, 48h | fasting_48h | 3.0 | 6.0 |
| 72h, extended | fasting_extended | 1.0 | 3.0 |

This means: during extended fasts, GKI is expected to be much lower (deeper ketosis), so the "green" range tightens.

### Computation Pipeline

```
User submits measurement
    |
    v
enrich_with_latest_values()     -- fetch missing inputs from recent measurements
    |
    v
compute_calculated_markers()    -- apply formulas + protocol-aware thresholds
    |
    v
INSERT INTO calculated_marker_values  -- store with status (green/orange/red)
    |
    v
Return in API response              -- frontend displays color-coded result
```

### Status Logic

```
if value < orange_min -> RED
if value > orange_max -> RED
if green_min <= value <= green_max -> GREEN
else -> ORANGE
```

Source: `services/calculated.rs:196-226`

---

## 2. Health Profile Fields

### Body Measurements

| Field | Storage | Encrypted | Business Logic |
|-------|---------|-----------|----------------|
| **gender** | user_profile | Yes | PDF reports. Future: gender-specific reference ranges |
| **age** | user_profile | Yes | PDF reports. Future: age-specific reference ranges |
| **height_cm** | user_profile | Yes | **CRITICAL**: input for BMI and WHtR calculations |
| **default_waist_cm** | user_profile | Yes | Pre-fills waist measurement; auto-creates measurement on update |
| **default_weight_kg** | user_profile | Yes | Pre-fills weight measurement; auto-creates measurement on update |

### Lifestyle Defaults

| Field | Storage | Business Logic |
|-------|---------|----------------|
| **default_diet_protocol** | user_preferences | Pre-fills measurement form. Informational for AI |
| **default_fasting_protocol** | user_preferences | **CRITICAL**: determines protocol context for threshold overrides |
| **default_exercise** | user_preferences | Pre-fills measurement form. AI context for Dr. Alex |
| **default_sleep_hours** | user_preferences | Pre-fills measurement form. AI context |
| **default_sleep_quality** | user_preferences | Pre-fills measurement form. AI context |
| **default_stress_level** | user_preferences | Pre-fills measurement form (1-10 scale). AI context |

### Key Behaviors

1. **Weight/waist auto-measurement**: When a user updates their default weight or waist in the profile, the backend automatically creates a new measurement entry. This ensures calculated markers (BMI, WHtR) are always current.

2. **Fasting protocol drives thresholds**: The `default_fasting_protocol` field maps to protocol contexts via `resolve_protocol_context()`:
   - 16:8/OMAD -> fasting_16_8
   - 36h/48h -> fasting_48h
   - 72h/extended -> fasting_extended
   - Standard -> no override (default thresholds)

3. **Dr. Alex AI context**: All lifestyle fields from the ACTUAL measurements (not profile defaults) are passed to the AI:
   - Gender, age, height, weight
   - Diet protocol, fasting protocol
   - Exercise, sleep hours/quality, stress level

---

## 3. User Journey: Omnivore Transitions to Keto + Intermittent Fasting

### Starting State: Unhealthy Omnivore

**Profile:**
- Diet: Omnivore, Fasting: None, Exercise: None
- Height: 180cm, Weight: 95kg, Waist: 102cm

**Measurements:**
- Glucose: 6.2 mmol/L (orange -- pre-diabetic range)
- Ketones: 0.1 mmol/L (very low)
- Triglycerides: 2.8 mmol/L (orange)
- Insulin: 18 uIU/mL (high)

**Calculated Markers:**
- GKI: 62.0 (RED -- no ketosis, standard protocol)
- BMI: 29.3 (orange -- overweight)
- WHtR: 0.567 (orange -- elevated cardiovascular risk)
- HOMA-IR: 4.8 (RED -- significant insulin resistance)
- TG/HDL: 2.5 (orange -- elevated)

**Dr. Alex Assessment:** "Your insulin resistance (HOMA-IR 4.8) is significantly elevated. Combined with high triglycerides and pre-diabetic glucose, you are at increased risk for type 2 diabetes. Consider dietary changes and regular exercise."

### Transition: User Changes Lifestyle

**Week 1-4: Switches to Keto + 16:8 fasting**

1. User updates Health Profile:
   - Diet Protocol: Keto
   - Fasting Protocol: 16:8
   - Exercise: Walking

2. App impact:
   - Measurement form pre-fills with "Keto" diet and "16:8" fasting
   - When measurements are submitted with `protocol_tag: "fasting"` and `fasting_protocol: "16_8"`:
     - GKI thresholds shift: green range widens to 3.0-9.0 (vs 3.0-6.0 standard)
     - Reference ranges adjust for fasting state
   - Dr. Alex receives fasting context and adjusts advice accordingly

3. New measurements after 4 weeks:
   - Glucose: 4.8 mmol/L (green -- improved)
   - Ketones: 1.2 mmol/L (in ketosis)
   - Weight: 90kg (5kg loss)

4. New calculated markers:
   - GKI: 4.0 (GREEN under fasting_16_8 protocol -- healthy ketosis)
   - BMI: 27.8 (orange, improving)
   - WHtR: 0.544 (orange, improving)

**Dr. Alex Assessment:** "Your glucose has improved significantly (6.2 -> 4.8 mmol/L). GKI of 4.0 indicates you are in nutritional ketosis. Your 16:8 fasting protocol is working well. Keep monitoring your lipid panel -- triglycerides should improve over the next 2-3 months."

### 3 Months Later

- Weight: 82kg, Waist: 88cm
- BMI: 25.3 (borderline green/orange)
- WHtR: 0.489 (GREEN -- below 0.5 threshold)
- HOMA-IR: 1.8 (orange, improving toward green < 1.0)
- GKI: 3.5 (GREEN)

**How the app supports this journey:**
1. Trend charts show the trajectory over time (glucose dropping, ketones rising)
2. Color-coded status changes from red/orange to green provide motivation
3. Protocol-aware thresholds give accurate assessment for the user's specific dietary context
4. Dr. Alex provides personalized advice based on the actual data
5. Calculated markers (GKI, HOMA-IR, WHtR) give deeper insight than raw numbers alone

---

## 4. Other Business Logic Areas

### Tier Enforcement (SSoT)

All feature access is governed by the `tier_features` table via:
- `check_tier_feature()` -- boolean feature gates (csv_export, mfa_totp, etc.)
- `check_tier_limit()` -- numeric limits (markers: 8/20/50, measurements: 100/250/500)
- `check_ai_credits()` -- unified AI credit pool (3/17/75/unlimited)

See Design 030 for full licensing model documentation.

### AI Credit Pool

Monthly credit pool replaces per-agent quotas:
- Chat messages cost 1 credit
- Smart imports cost 2 credits
- Pool resets monthly (lazy check)
- Tracked in `ai_credit_usage` table

### Measurement Encryption

All measurement values are encrypted at rest (AES-256-GCM) in `value_canonical`. Calculated marker values are stored as plaintext NUMERIC (they are derived, not user-entered PII).

### Demo Mode

Demo data uses the same computation pipeline as production:
- `demo_zone_detail()` computes calculated markers at runtime
- Three profiles: optimized (green), average (orange), at_risk (red)
- Demo measurements excluded from tier limit counts (`WHERE is_demo = false`)

### Data Access Logging (GDPR)

Every data access event is logged to `data_access_log`:
- PDF imports, measurement imports
- Data exports (CSV, JSON, PDF)
- Self-access and cross-user access tracked separately

---

## 5. Reference: Code Locations

| Logic | File | Lines |
|-------|------|-------|
| Calculated marker formulas | `services/calculated.rs` | 110-175 |
| Status computation | `services/calculated.rs` | 196-226 |
| Protocol context resolution | `services/calculated.rs` | 228-239 |
| Enrichment (cross-session inputs) | `services/calculated.rs` | 26-68 |
| Measurement submission + calc trigger | `handlers/measurements.rs` | 259-286 |
| Tier enforcement (SSoT) | `services/tier.rs` | 1020-1070 |
| AI credit pool | `services/tier.rs` | 1091-1250 |
| Dr. Alex health context | `services/doctor_chat.rs` | 34-140 |
| Profile auto-measurement | `handlers/settings.rs` | 544-612 |
| Frontend calc preview | `frontend/src/lib/calculated.ts` | 21-87 |
| Frontend status colors | `frontend/src/lib/status.ts` | 12-32 |
