# Health Zones System (Aware-Inspired)
**Status:** NEW FEATURE - Dashboard Redesign  
**Concept:** Hierarchical Health Zones with Multi-Marker Grouping  
**Date:** 2026-03-01

---

## 🎯 CONCEPT

Instead of flat "key metrics" grid, create a **Health Zones Dashboard** where:

```
User sees:
├─ 🩸 BLOOD (11 markers)
│  ├─ Blood Glucose
│  ├─ Hemoglobin
│  ├─ Hematocrit
│  └─ ...
├─ 💓 HEART & CIRCULATION (8 markers)
│  ├─ Blood Pressure
│  ├─ Heart Rate / Pulse
│  └─ ...
├─ 🧬 HORMONES & METABOLISM (9 markers)
│  ├─ Insulin
│  ├─ HbA1c
│  └─ ...
├─ 💎 KIDNEY FUNCTION (4 markers)
│  ├─ Creatinine
│  ├─ eGFR
│  └─ ...
├─ 🧪 LIVER FUNCTION (3 markers)
│  ├─ ALT
│  ├─ GGT
│  └─ ...
└─ ... (more zones)
```

**Key Feature:** One marker can belong to multiple zones
- Example: **Triglycerides** appears in both:
  - LIPIDS & CHOLESTEROL zone
  - HEART & CIRCULATION zone
  - METABOLIC HEALTH zone

---

## 📊 HEALTH ZONES DEFINITION (MVP + Future)

### **Zone 1: 🩸 BLOOD (Core Markers)**
Markers related to blood composition, oxygen transport, and cell counts.

**Markers:**
```
✅ Blood Glucose (BG)
✅ Hemoglobin (HB)
✅ Hematocrit (HCT)
✅ Red Blood Cells (RBC) / Erythrocytes
✅ Ketones (βHB) [metabolic marker, but also in blood]
✅ Mean Corpuscular Volume (MCV)
✅ Mean Corpuscular Hemoglobin (MCH)
✅ Mean Corpuscular Hemoglobin Concentration (MCHC)
✅ White Blood Cells (WBC) / Leukocytes
✅ Platelets / Thrombocytes
✅ Eosinophils, Basophils, Monocytes [differential]
```

**Status Colors (Example):**
- BG: 🟢 5.2–6.2 mmol/L
- HB: 🟢 9.0–10.0 mmol/L
- HCT: 🟢 42–47%

---

### **Zone 2: 💓 HEART & CIRCULATION**
Markers related to cardiovascular health and blood pressure regulation.

**Markers:**
```
✅ Blood Pressure Systolic
✅ Blood Pressure Diastolic
✅ Heart Rate / Pulse
✅ Triglycerides (TG) [also in Lipids]
✅ HDL Cholesterol [also in Lipids]
✅ LDL Cholesterol [also in Lipids]
✅ Total Cholesterol [also in Lipids]
✅ ApoB (Apolipoprotein B) [also in Lipids]
✅ hs-CRP (high-sensitivity C-Reactive Protein) [also in Inflammation]
```

**Status Colors (Example):**
- BP: 🟢 100–120 / 65–80 mmHg
- HR: 🟢 55–75 bpm
- TG: 🟢 <1.5 mmol/L

---

### **Zone 3: 🧬 HORMONES & METABOLISM**
Markers related to metabolic hormones, glucose control, and energy metabolism.

**Markers:**
```
✅ Fasting Insulin
✅ HbA1c (glycated hemoglobin)
✅ HOMA-IR (Insulin Resistance Index)
✅ Glucose [also in Blood]
✅ Triglycerides [also in Lipids, Heart]
✅ Free Testosterone
✅ Total Testosterone
✅ FSH (Follicle-Stimulating Hormone)
✅ LH (Luteinizing Hormone)
✅ Estradiol
✅ DHEAS (Dehydroepiandrosterone-Sulfat)
✅ Prolactin
✅ SHBG (Sex Hormone Binding Globulin)
✅ fT3 (Free Triiodothyronine) [also in Thyroid]
✅ fT4 (Free Thyroxine) [also in Thyroid]
✅ TSH (Thyroid-Stimulating Hormone) [also in Thyroid]
```

**Status Colors (Example):**
- Insulin: 🟢 2–8 mU/L
- HbA1c: 🟢 4.0–5.6%
- Testosterone: 🟢 8–30 nmol/L

---

### **Zone 4: 💎 LIPIDS & CHOLESTEROL**
Markers related to fat metabolism, cholesterol, and lipid profiles.

**Markers:**
```
✅ Total Cholesterol
✅ LDL Cholesterol (LDL-C)
✅ HDL Cholesterol (HDL-C)
✅ Triglycerides (TG) [also in Heart, Metabolism]
✅ ApoB (Apolipoprotein B) [also in Heart]
✅ ApoA-I (Apolipoprotein A-I)
✅ LDL Particle Number (LDL-P)
✅ Lipoprotein(a) [Lp(a)]
✅ Non-HDL Cholesterol
✅ TG/HDL Ratio
✅ LDL/HDL Ratio
```

**Status Colors (Example):**
- Total Chol: 🟢 <7.2 mmol/L
- LDL: 🟡 Low LDL preferred for cardio health
- ApoB: 🟢 <1.8 g/L

---

### **Zone 5: 🔥 INFLAMMATION & IMMUNE**
Markers indicating systemic inflammation and immune function.

**Markers:**
```
✅ hs-CRP (high-sensitivity C-Reactive Protein) [also in Heart]
✅ IL-6 (Interleukin-6)
✅ TNF-α (Tumor Necrosis Factor-Alpha)
✅ Lipoprotein(a)
✅ Fibrinogen
✅ ESR (Erythrocyte Sedimentation Rate)
✅ White Blood Cells (WBC) [also in Blood]
✅ Lymphocytes
✅ Neutrophils
✅ IgG (Immunoglobulin G)
✅ IgA (Immunoglobulin A)
```

**Status Colors (Example):**
- hs-CRP: 🟢 <3 µmol/L

---

### **Zone 6: 💊 KIDNEY FUNCTION & ELECTROLYTES**
Markers related to kidney health and electrolyte balance.

**Markers:**
```
✅ Creatinine
✅ eGFR (estimated Glomerular Filtration Rate)
✅ BUN (Blood Urea Nitrogen) / Urea
✅ Uric Acid (UA) [also in Metabolism]
✅ Sodium (Na)
✅ Potassium (K)
✅ Chloride (Cl)
✅ Bicarbonate (HCO3)
✅ Magnesium (Mg)
✅ Calcium (Ca) [also in Minerals]
✅ Phosphate (PO4) [also in Minerals]
```

**Status Colors (Example):**
- eGFR: 🟢 >60 ml/min/1.73m²
- Creatinine: 🟢 62–115 µmol/L
- UA: 🟢 280–360 µmol/L

---

### **Zone 7: 🧪 LIVER FUNCTION**
Markers indicating liver health and detoxification capacity.

**Markers:**
```
✅ ALT (Alanine Aminotransferase) / ALAT
✅ AST (Aspartate Aminotransferase) / ASAT
✅ GGT (Gamma-Glutamyl Transferase)
✅ ALP (Alkaline Phosphatase)
✅ Bilirubin (Total & Direct)
✅ Albumin
✅ Total Protein
✅ AST/ALT Ratio
✅ Albumin/Globulin Ratio
```

**Status Colors (Example):**
- ALT: 🟢 <0.5 µkat/L
- GGT: 🟢 <0.3 µkat/L

---

### **Zone 8: ⚡ MINERALS & ELECTROLYTES (Extended)**
Detailed mineral and trace element markers.

**Markers:**
```
✅ Magnesium (Mg) [also in Kidney]
✅ Calcium (Ca) [also in Kidney]
✅ Phosphate (PO4) [also in Kidney]
✅ Sodium (Na) [also in Kidney]
✅ Potassium (K) [also in Kidney]
✅ Iron (Fe)
✅ Ferritin
✅ Copper (Cu)
✅ Zinc (Zn)
✅ Selenium (Se)
✅ Iodine
```

**Status Colors (Example):**
- Magnesium: 🟢 0.75–1.05 mmol/L
- Iron: 🟢 11–30 µmol/L

---

### **Zone 9: 🧬 VITAMINS & MICRONUTRIENTS**
Vitamin and nutrient status markers.

**Markers:**
```
✅ Vitamin D (25-OH Vitamin D)
✅ Vitamin B12 (Cobalamin)
✅ Folate / B9
✅ Vitamin B6 (Pyridoxal)
✅ Vitamin B2 (Riboflavin)
✅ Vitamin B1 (Thiamine)
✅ Vitamin E (Alpha-Tocopherol)
✅ Vitamin A (Retinol)
✅ Vitamin K
✅ Homocysteine [B vitamin metabolism marker]
```

**Status Colors (Example):**
- Vitamin D: 🟢 30–50 ng/ml
- B12: 🟢 >400 pg/ml

---

### **Zone 10: 🦴 BONE & MUSCLE HEALTH**
Markers related to skeletal and muscular system.

**Markers:**
```
✅ Calcium [also in Minerals]
✅ Phosphate [also in Minerals]
✅ Magnesium [also in Minerals]
✅ Alkaline Phosphatase (ALP)
✅ Creatinine [muscle breakdown indicator, also Kidney]
✅ Creatine Kinase (CK)
✅ Myoglobin
✅ P1NP (Procollagen Type 1 N-Terminal Peptide) [bone formation]
✅ CTX (C-Terminal Telopeptide of Type 1 Collagen) [bone resorption]
```

---

### **Zone 11: 🫁 THYROID FUNCTION**
Thyroid hormone and function markers.

**Markers:**
```
✅ TSH (Thyroid-Stimulating Hormone) [also in Hormones]
✅ fT3 (Free Triiodothyronine) [also in Hormones]
✅ fT4 (Free Thyroxine) [also in Hormones]
✅ Total T3
✅ Total T4
✅ Thyroid Peroxidase (TPO) Antibody [autoimmunity]
✅ Thyroglobulin Antibody
```

---

## 📊 MARKER MAPPING TABLE (50+ Markers)

| Marker | Zone 1 | Zone 2 | Zone 3 | Zone 4 | Zone 5 | Zone 6 | Zone 7 | Zone 8 | Zone 9 | Zone 10 | Zone 11 |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|---------|---------|
| Blood Glucose | ✅ | | ✅ | | | | | | | | |
| Hemoglobin | ✅ | | | | | | | | | | |
| Insulin | | | ✅ | | | | | | | | |
| HbA1c | | | ✅ | | | | | | | | |
| Triglycerides | | ✅ | ✅ | ✅ | | | | | | | |
| HDL-C | | ✅ | | ✅ | | | | | | | |
| LDL-C | | ✅ | | ✅ | | | | | | | |
| Total Cholesterol | | ✅ | | ✅ | | | | | | | |
| ApoB | | ✅ | | ✅ | | | | | | | |
| hs-CRP | | ✅ | | | ✅ | | | | | | |
| Creatinine | | | | | | ✅ | | | | | |
| eGFR | | | | | | ✅ | | | | | |
| Uric Acid | | | ✅ | | | ✅ | | | | | |
| ALT | | | | | | | ✅ | | | | |
| GGT | | | | | | | ✅ | | | | |
| Magnesium | | | | | | ✅ | | ✅ | | ✅ | |
| Calcium | | | | | | ✅ | | ✅ | | ✅ | |
| Vitamin D | | | | | | | | | ✅ | | |
| B12 | | | | | | | | | ✅ | | |
| TSH | | | ✅ | | | | | | | | ✅ |
| fT3 | | | ✅ | | | | | | | | ✅ |
| fT4 | | | ✅ | | | | | | | | ✅ |
| Testosterone | | | ✅ | | | | | | | | |
| White Blood Cells | ✅ | | | | ✅ | | | | | | |

---

## 🎨 UPDATED DASHBOARD WIREFRAME (Health Zones)

```
┌─────────────────────────────────────┐
│ ◄ Health Zones Dashboard            │
├─────────────────────────────────────┤
│                                     │
│ Last Update: 27.2.2026 | 06:00     │
│ Device: Fora 6                      │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 🩸 BLOOD (11 markers, 9 in range)  │
│ ───────────────────────────────────│
│ ┌──────────────┐  ┌──────────────┐│
│ │ Glucose      │  │ Hemoglobin   ││
│ │ 5.8 mmol/L   │  │ 7.57 mmol/L  ││
│ │ 🟢 Normal    │  │ 🟢 Normal    ││
│ └──────────────┘  └──────────────┘│
│ ┌──────────────┐  ┌──────────────┐│
│ │ Hematocrit   │  │ RBC          ││
│ │ 36% 🟡       │  │ 4.7 Tpt/l 🟢 ││
│ └──────────────┘  └──────────────┘│
│ [+ 7 more markers] [Expand Zone]  │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 💓 HEART & CIRCULATION (8 markers) │
│ ───────────────────────────────────│
│ ┌──────────────┐  ┌──────────────┐│
│ │ BP Systolic  │  │ Heart Rate   ││
│ │ 100 mmHg     │  │ 69 bpm 🟢    ││
│ │ 🟢 Excellent │  │              ││
│ └──────────────┘  └──────────────┘│
│ ┌──────────────┐  ┌──────────────┐│
│ │ Triglycerides│  │ Total Chol.  ││
│ │ 1.5 mmol/L   │  │ 8.1 mmol/L   ││
│ │ 🟢 Good      │  │ 🟡 High      ││
│ └──────────────┘  └──────────────┘│
│ [+ 4 more markers] [Expand Zone]  │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 🧬 HORMONES & METABOLISM (9 mkrs)  │
│ ───────────────────────────────────│
│ ┌──────────────┐  ┌──────────────┐│
│ │ Insulin      │  │ HbA1c        ││
│ │ 2.8 mU/L 🟢  │  │ 5.4% 🟢      ││
│ └──────────────┘  └──────────────┘│
│ [+ 7 more markers] [Expand Zone]  │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 💎 LIPIDS & CHOLESTEROL (11 mkrs) │
│ ───────────────────────────────────│
│ ┌──────────────┐  ┌──────────────┐│
│ │ LDL-C        │  │ HDL-C        ││
│ │ 5.04 mmol/L  │  │ 1.39 mmol/L  ││
│ │ 🟡 Borderline│  │ 🟡 Low       ││
│ └──────────────┘  └──────────────┘│
│ [+ 9 more markers] [Expand Zone]  │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 🔥 INFLAMMATION & IMMUNE (11 mkrs)│
│ [+ 11 markers] [Expand Zone]       │
│                                     │
│ 💊 KIDNEY FUNCTION (11 markers)    │
│ [+ 11 markers] [Expand Zone]       │
│                                     │
│ 🧪 LIVER FUNCTION (9 markers)     │
│ [+ 9 markers] [Expand Zone]        │
│                                     │
│ [Load More Zones...]               │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔍 EXPANDED ZONE VIEW (Example: Blood)

```
┌─────────────────────────────────────┐
│ ◄ 🩸 BLOOD Zone (11 markers)        │
├─────────────────────────────────────┤
│                                     │
│ Zone Score: 9/11 In Range 🟢        │
│ ───────────────────────────────────│
│                                     │
│ 1. Blood Glucose         🟢 Normal  │
│    5.8 mmol/L (5.2-6.2)            │
│    Last: 27.2.2026 06:00           │
│    [View Trend]                    │
│                                     │
│ 2. Hemoglobin            🟢 Normal  │
│    7.57 mmol/L (9.0-10.0)          │
│    Last: 27.2.2026 06:00           │
│                                     │
│ 3. Hematocrit            🟡 Low     │
│    36% (42-47%)                    │
│    Last: 27.2.2026 06:00           │
│    💡 Tip: Increase hydration      │
│                                     │
│ 4. RBC / Erythrocytes    🟢 Normal  │
│    4.7 Tpt/l (4.3-5.9)             │
│                                     │
│ ... (7 more markers)                │
│                                     │
│ [Add Measurement] [Download Report] │
│                                     │
└─────────────────────────────────────┘
```

---

## 🏗️ DATA MODEL (Backend)

```typescript
// Zone Definition
interface HealthZone {
  id: string;
  name: string;
  description: string;
  icon: string;
  markerIds: string[]; // References to Parameter table
  displayOrder: number;
  color: string; // For UI theming
}

// Zone Score (calculated)
interface ZoneScore {
  zoneId: string;
  totalMarkers: number;
  inRangeCount: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: datetime;
}

// Example zones:
const zones = [
  {
    id: 'blood',
    name: 'Blood',
    icon: '🩸',
    markerIds: ['bg', 'hb', 'hct', 'rbc', 'ketones', ...],
    displayOrder: 1,
  },
  {
    id: 'heart',
    name: 'Heart & Circulation',
    icon: '💓',
    markerIds: ['bp_sys', 'bp_dia', 'pulse', 'tg', 'hdl_c', ...],
    displayOrder: 2,
  },
  // ... more zones
];
```

---

## ✅ MIGRATION PATH (From Original Dashboard)

### **Before (Original Wireframe):**
```
Dashboard
├─ Your Score: 8/11
└─ 3x3 Grid (Glucose, BP, Weight, Ketones, UA, Cholesterin)
```

### **After (New Health Zones):**
```
Dashboard
├─ 🩸 BLOOD (Zone 1, expanded)
│  ├─ Glucose 🟢
│  ├─ Hemoglobin 🟢
│  └─ ... (11 total)
├─ 💓 HEART & CIRCULATION (Zone 2)
│  ├─ BP 🟢
│  ├─ Heart Rate 🟢
│  └─ ... (8 total)
├─ 🧬 HORMONES & METABOLISM (Zone 3)
│  └─ ... (9 total)
└─ ... (8 more zones)
```

---

## 🎯 BENEFITS

1. **Comprehensive View:** See all 50+ markers organized logically
2. **Granular Insights:** Understand which zone needs attention
3. **Multi-Zone Markers:** Triglycerides relevant to Heart AND Lipids AND Metabolism
4. **Scalable:** Easy to add new markers to existing zones
5. **Educational:** Users learn how biomarkers are grouped medically
6. **Comparable to Aware:** Similar structure to premium health apps

---

## 📋 IMPLEMENTATION NOTES

**Frontend (React):**
- Create reusable `<ZoneCard>` component
- `<ZoneExpanded>` for detailed zone view
- Filter/search across zones
- Zone toggle (collapse/expand)

**Backend (Rust):**
- `zones` table with marker relationships
- `zone_scores` table (cached, updated on new measurement)
- API: `GET /zones` (list all), `GET /zones/{id}` (expanded view)

**Database:**
```sql
CREATE TABLE zones (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  icon VARCHAR,
  display_order INT,
  created_at TIMESTAMP
);

CREATE TABLE zone_markers (
  zone_id VARCHAR REFERENCES zones(id),
  marker_id VARCHAR REFERENCES parameters(code),
  PRIMARY KEY (zone_id, marker_id)
);
```

---

## ✅ APPROVAL CHECKLIST

```
[ ] Health Zones structure makes sense (11 zones)
[ ] Marker grouping logical?
[ ] Multi-zone markers (e.g., Triglycerides) clear?
[ ] Dashboard design (collapsed zones) good?
[ ] Expanded zone view useful?
[ ] Icon/emoji choices good?
[ ] Enough zones for MVP? (Start with top 6, add later)
```

---

_Ready for Dashboard Redesign!_

