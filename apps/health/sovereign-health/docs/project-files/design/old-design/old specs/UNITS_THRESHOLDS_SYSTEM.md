# Units & Thresholds Management System (MVP Addition)
**Status:** NEW FEATURE  
**Inspired by:** Aware App UI/UX Patterns  
**Date:** 2026-03-01

---

## 🎯 Overview

**Problem:** Different users prefer different units:
- Glucose: mmol/L vs mg/dL
- Cholesterin: mmol/L vs mg/dL
- Weight: kg vs lbs
- Blood Pressure: mmHg (standard)

**Solution:** 
1. **Unit Preferences** (User Settings)
2. **Unit Conversion** (Automatic, stored in preferred unit)
3. **Personal Min/Max Thresholds** (User-defined Ampel-Logik)
4. **Display Flexibility** (Show value + unit always)
5. **KB Adaptation** (Tips show user's preferred units)

---

## 📊 PARAMETER CATALOG WITH UNITS (MVP)

### Metabolic Parameters

| Parameter | Code | Default Unit | Alternative Units | Conversion |
|-----------|------|---------------|--------------------|------------|
| Blood Glucose | bg | mmol/L | mg/dL | ×18 |
| Ketones (βHB) | ketones | mmol/L | mg/dL | ×8.8 |
| Cholesterin | chol_total | mmol/L | mg/dL | ×38.67 |
| Uric Acid | ua | µmol/L | mg/dL | ÷59.48 |
| Hemoglobin | hb | mmol/L | g/dL | ×1.6 |
| Hematocrit | hct | % | Same | N/A |

### Cardio & Vitals

| Parameter | Code | Unit | Notes |
|-----------|------|------|-------|
| BP Systolic | bp_sys | mmHg | Standard worldwide |
| BP Diastolic | bp_dia | mmHg | Standard worldwide |
| Heart Rate | pulse | bpm | Standard worldwide |
| Weight | weight | kg | Alternative: lbs (×2.205) |

### Lab Parameters

| Parameter | Code | Default Unit | Alternative | Conversion |
|-----------|------|---------------|----|------------|
| Insulin | insulin | mU/L | pmol/L | ×6.945 |
| HbA1c | hba1c | % | mmol/mol | ×10.93 |
| ApoB | apob | g/L | mg/dL | ×38.67 |
| hs-CRP | hs_crp | µmol/L | mg/L | ÷1000 |
| Triglycerides | tg | mmol/L | mg/dL | ×88.57 |
| Creatinine | creatinine | µmol/L | mg/dL | ÷88.4 |
| eGFR | egfr | ml/min/1.73m2 | Same | N/A |

---

## ⚙️ USER SETTINGS: Unit Preferences

### Settings Screen Layout

```
┌─────────────────────────────────────┐
│ Settings → Units & Thresholds       │
├─────────────────────────────────────┤
│ GLUCOSE MEASUREMENTS                │
│ Preferred Unit: [mmol/L  ▼]         │
│ Alternative: mg/dL (1 mmol/L = 18)  │
│                                     │
│ CHOLESTERIN MEASUREMENTS            │
│ Preferred Unit: [mmol/L  ▼]         │
│ Alternative: mg/dL (1 mmol/L = 38.67)│
│                                     │
│ URIC ACID MEASUREMENTS              │
│ Preferred Unit: [µmol/L ▼]          │
│ Alternative: mg/dL                  │
│                                     │
│ WEIGHT MEASUREMENTS                 │
│ Preferred Unit: [kg      ▼]         │
│ Alternative: lbs (1 kg = 2.205 lbs) │
│                                     │
│ [Save Preferences]                  │
└─────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE user_unit_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  parameter_code VARCHAR(50),
  preferred_unit VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, parameter_code)
);

Example:
user_id=1, parameter_code='bg', preferred_unit='mg/dL'
user_id=1, parameter_code='weight', preferred_unit='lbs'
```

---

## 🎯 PERSONAL THRESHOLDS (Ampel-Logik)

### User-Defined Min/Max Values

**Problem:** Each user has different health goals:
- Helmut: BG target 5.2–6.2 (tight metabolic control)
- Peter: BG target 5.0–7.0 (more relaxed)

**Solution:** Each user sets their own min/max ranges.

### Settings: Personal Thresholds

```
┌─────────────────────────────────────┐
│ Settings → Personal Thresholds      │
│ (Your "Ampel-Logik" / Traffic Light)│
├─────────────────────────────────────┤
│ 🟢 GREEN ZONE (Normal)              │
│ 🟡 YELLOW ZONE (Attention)          │
│ 🔴 RED ZONE (Warning)               │
├─────────────────────────────────────┤
│ BLOOD GLUCOSE (mmol/L)              │
│ Green:   [5.2] — [6.2]              │
│ Yellow:  [4.8] — [6.7]              │
│ Red:     < [4.8] or > [6.7]         │
│                                     │
│ BLOOD PRESSURE (mmHg)               │
│ Green:   [100-120] / [65-80]        │
│ Yellow:  [120-130] / [80-90]        │
│ Red:     > [130] or > [90]          │
│                                     │
│ URIC ACID (µmol/L)                  │
│ Green:   [280] — [360]              │
│ Yellow:  [360] — [450]              │
│ Red:     > [480]                    │
│                                     │
│ [Save Thresholds]                   │
└─────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE user_thresholds (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  parameter_code VARCHAR(50),
  unit VARCHAR(20),
  green_min DECIMAL(10, 4),
  green_max DECIMAL(10, 4),
  yellow_min DECIMAL(10, 4),
  yellow_max DECIMAL(10, 4),
  red_min DECIMAL(10, 4),
  red_max DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, parameter_code)
);

Example (Helmut's BG):
user_id=1, parameter_code='bg', unit='mmol/L'
green_min=5.2, green_max=6.2
yellow_min=4.8, yellow_max=6.7
red_min=NULL, red_max=NULL (or <4.8 and >6.7)
```

---

## 📥 Data Entry: Always Show Unit

### Screen: New Session (Unit Display)

```
┌─────────────────────────────────────┐
│ New Measurement Session              │
├─────────────────────────────────────┤
│ METABOLIC MARKERS:                  │
│ ─────────────────────────────────   │
│                                     │
│ Blood Glucose:                      │
│ [5.8] [mmol/L ▼]  ? mmol/L=mg/dL:18│
│ Status: 🟢 Normal (Target: 5.2-6.2) │
│                                     │
│ Ketones:                            │
│ [0.1] [mmol/L ▼]  ? Info            │
│ Status: 🟡 Low (Normal: 0.5-3.0)    │
│                                     │
│ Cholesterin (Total):                │
│ [8.1] [mmol/L ▼]  ? mmol/L=mg/dL:38.67│
│ Status: 🟡 Slightly High (Target: <7.2)│
│                                     │
│ Uric Acid:                          │
│ [321] [µmol/L ▼]  ? Info            │
│ Status: 🟢 Good (Target: 280-360)   │
│                                     │
│ ─────────────────────────────────   │
│ CARDIO & VITALS:                    │
│ ─────────────────────────────────   │
│                                     │
│ BP Systolic:                        │
│ [100] [mmHg] Status: 🟢 Excellent   │
│                                     │
│ Weight:                             │
│ [73.0] [kg ▼]  Status: 🟢 Stable    │
│                                     │
│ [Save] [Cancel]                     │
└─────────────────────────────────────┘
```

---

## 📊 Dashboard: Show Units + Status

### Dashboard Display (with Thresholds)

```
┌─────────────────────────────────────┐
│ Dashboard (27.2.2026 | 06:00)       │
├─────────────────────────────────────┤
│ LAST MEASUREMENT:                   │
│                                     │
│ 🟢 Blood Glucose    5.8 mmol/L      │
│   Target: 5.2—6.2  (Normal)         │
│                                     │
│ 🟡 Ketones          0.1 mmol/L      │
│   Target: 0.5—3.0  (Low)            │
│                                     │
│ 🟡 Cholesterin      8.1 mmol/L      │
│   Target: <7.2     (Slightly High)  │
│                                     │
│ 🟢 Uric Acid       321 µmol/L       │
│   Target: 280—360  (Normal)         │
│                                     │
│ 🟢 BP             100/69 mmHg       │
│   Target: 100-120/65-80 (Excellent) │
│                                     │
│ 🟢 Weight          73.0 kg          │
│   Trend: ↔ Stable  (no change)      │
│                                     │
│ [View Details] [Edit] [History]     │
└─────────────────────────────────────┘
```

---

## 📚 Knowledge Base: Adapt to User Units

### KB Article (Nutrition Tip) — Dynamic Units

```
BEFORE (Static):
TIP-1: Reduce Honey
"Honey causes immediate BG spike (5.8 mmol/L)"

AFTER (Dynamic, based on user preference):

If user prefers mmol/L:
"Honey causes immediate BG spike (~5.8 mmol/L)"

If user prefers mg/dL:
"Honey causes immediate BG spike (~104 mg/dL)"

[Conversion note visible]
1 mmol/L = 18 mg/dL
```

### KB Article: Always Show Both Units

```
┌─────────────────────────────────────┐
│ ◄ TIP-1: Reduce Honey                │
├─────────────────────────────────────┤
│ Impact Examples (with conversion):  │
│                                     │
│ • BG may rise: 5.0 → 5.8 mmol/L    │
│   (90 → 104 mg/dL)                  │
│                                     │
│ • Uric Acid spike: 360 → 420 µmol/L│
│   (6.0 → 7.0 mg/dL)                 │
│                                     │
│ • Triglycerides: 1.5 → 1.8 mmol/L  │
│   (133 → 159 mg/dL)                 │
│                                     │
│ YOUR TARGETS:                       │
│ 🟢 BG Target: 5.2—6.2 mmol/L        │
│    (93—112 mg/dL)                   │
│ 🟢 UA Target: 280—360 µmol/L        │
│    (4.7—6.0 mg/dL)                  │
│                                     │
│ [Back] [Print]                      │
└─────────────────────────────────────┘
```

---

## 🔄 Unit Conversion Logic (Backend)

### Conversion Functions (Rust)

```rust
// Glucose
fn mmol_to_mgdl(mmol: f64) -> f64 { mmol * 18.0 }
fn mgdl_to_mmol(mgdl: f64) -> f64 { mgdl / 18.0 }

// Cholesterin
fn mmol_to_mgdl_chol(mmol: f64) -> f64 { mmol * 38.67 }
fn mgdl_to_mmol_chol(mgdl: f64) -> f64 { mgdl / 38.67 }

// Uric Acid
fn umol_to_mgdl_ua(umol: f64) -> f64 { umol / 59.48 }
fn mgdl_to_umol_ua(mgdl: f64) -> f64 { mgdl * 59.48 }

// Weight
fn kg_to_lbs(kg: f64) -> f64 { kg * 2.205 }
fn lbs_to_kg(lbs: f64) -> f64 { lbs / 2.205 }
```

### Storage Strategy

```
ALWAYS STORE IN DEFAULT UNIT:
- Glucose: mmol/L
- Cholesterin: mmol/L
- UA: µmol/L
- Weight: kg

CONVERT ON DISPLAY:
- Read user's unit preference
- Apply conversion function
- Display value + unit

ACCEPT INPUT IN EITHER UNIT:
- User enters 104 mg/dL
- Check preferred unit in DB
- If preferred is mmol/L, convert: 104/18 = 5.78 mmol/L
- Store as 5.78 mmol/L
- Display as user prefers
```

---

## 📱 API Updates

### New Endpoints

```
GET /api/user/preferences/units
  Response: {
    "glucose": "mmol/L",
    "cholesterin": "mmol/L",
    "ua": "µmol/L",
    "weight": "kg"
  }

PUT /api/user/preferences/units
  Request: {
    "glucose": "mg/dL",
    "weight": "lbs"
  }

GET /api/user/thresholds
  Response: {
    "bg": {
      "green": {"min": 5.2, "max": 6.2},
      "yellow": {"min": 4.8, "max": 6.7},
      "red": {"min": null, "max": null}
    },
    "ua": { ... },
    "bp": { ... }
  }

PUT /api/user/thresholds
  Request: {
    "parameter_code": "bg",
    "green_min": 5.2,
    "green_max": 6.2,
    ...
  }

GET /api/parameters/{code}/convert
  Query: value=5.8&from=mmol/L&to=mg/dL
  Response: {"value": 104.4, "unit": "mg/dL"}
```

---

## 🎨 Threshold Visualization (Dashboard)

### Color-Coded Status Display

```
┌────────────────────────────────────────┐
│ MEASUREMENT WITH THRESHOLD INDICATOR   │
├────────────────────────────────────────┤
│                                        │
│ Blood Glucose: 5.8 mmol/L   🟢 NORMAL │
│ ┌──────────────────────────────────┐  │
│ │ 🟢 4.8 ─────•───── 6.2 🟢      │  │ (green zone)
│ │ 🟡 4.0 ─ 6.7 🟡                 │  │ (yellow zone)
│ │ 🔴  <4.0 or >6.7 🔴            │  │ (red zone)
│ └──────────────────────────────────┘  │
│ Your value: •5.8 (within green range) │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ Uric Acid: 321 µmol/L   🟢 GOOD      │
│ ┌──────────────────────────────────┐  │
│ │ 🟢 280 ─────•───── 360 🟢       │  │
│ │ 🟡 280 ─ 450 🟡                 │  │
│ │ 🔴  >480 🔴                     │  │
│ └──────────────────────────────────┘  │
│ Your value: •321 (within green range) │
│                                        │
└────────────────────────────────────────┘
```

---

## ✅ MVP UPDATES (Units & Thresholds)

### New Tables (Database)
- ✅ user_unit_preferences
- ✅ user_thresholds

### New Settings Screens
- ✅ Unit Preferences
- ✅ Personal Thresholds (Ampel-Logik)

### Updated Screens
- ✅ Data Entry (show units, show status vs threshold)
- ✅ Dashboard (color-coded with thresholds)
- ✅ Session Detail (units + status)

### Updated KB
- ✅ Nutrition Tips show both units (mmol/L + mg/dL)
- ✅ Tips adapt to user's preferred units
- ✅ Show user's personal targets

### Updated API
- ✅ Unit conversion endpoints
- ✅ Threshold getter/setter
- ✅ Store in default units, display in user preference

---

## 📊 Timeline Impact (MVP)

**No timeline extension:** Features integrate into existing screens (Week 3–5).

---

_Ready for Database Schema & API Detailed Specification_

