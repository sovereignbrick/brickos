# MVP Requirements — FINAL UPDATE
**Datum:** 2026-03-01  
**Changes:** Cardio Data + Nutrition Tips KB

---

## ✅ MVP DATA PARAMETERS (FINALIZED)

### A. METABOLIC MARKERS (Fora 6)
```
✅ Glucose (BG)           — mmol/L
✅ Ketones (βHB)          — mmol/L
✅ Cholesterin (Total)    — mmol/L
✅ Uric Acid (UA)         — µmol/L
✅ Hemoglobin (HB)        — mmol/L
✅ Hematocrit (HCT)       — %
```

### B. CARDIO & VITALS + BODY COMPOSITION (Qardio + Manual)
```
✅ Blood Pressure Systolic  — mmHg
✅ Blood Pressure Diastolic — mmHg
✅ Heart Rate / Pulse       — bpm
✅ Weight                   — kg
✅ Waist Circumference      — cm        ⭐ NEW (manual tape measure)
```

### C. JOURNAL & CONTEXT
```
✅ Free-text Journal Entry (Essensgewohnheiten + Schlaf)
✅ Tags (Optional): #carnivore #honey #morning etc.
```

**Total: 12 Measurement Parameters + 1 Journal Entry per Session**
(6 metabolic + 5 cardio/body composition + 1 context entry)

---

## 📚 NUTRITION TIPS KNOWLEDGE BASE (MVP NEW FEATURE)

### Overview
- **No AI Generation** (Curated manually)
- **10 Core Tips** (optimized for Helmut's scenario: carnivore + fasting + metabolic optimization)
- **Parameter Impact Mapping** (Each tip shows which blood markers it affects)
- **Science-Backed** with Examples + Warnings

### 10 Tips in MVP:

1. **TIP-1: Reduce or Eliminate Honey**
   - Impact: BG↓ Ketones↑ TG↓ UA↓
   - Timeline: 3–7 days
   
2. **TIP-2: Moderate Sardine/High-Purine Protein Intake**
   - Impact: UA↓ Creatinine↓
   - Timeline: 5–10 days

3. **TIP-3: Increase Water Intake (When Fasting)**
   - Impact: UA↓ eGFR↑ BP↓
   - Timeline: Immediate

4. **TIP-4: Time Protein Intake (Avoid UA Spikes)**
   - Impact: UA↓ Creatinine↓
   - Timeline: 2–3 weeks

5. **TIP-5: Limit or Avoid Alcohol**
   - Impact: TG↓ UA↓ BP↓ Cholesterin↓
   - Timeline: 2–4 weeks

6. **TIP-6: Optimize Carb Timing (If Reintroducing)**
   - Impact: BG↓ Insulin↓ TG↓
   - Timeline: 1–2 weeks

7. **TIP-7: Increase Salt Intake (Carnivore + Fasting)**
   - Impact: BP↓ HR↓ Energy↑
   - Timeline: Immediate

8. **TIP-8: Track Liver Function (ALT/GGT)**
   - Impact: Monitor (High-fat diet + fasting → liver stress)
   - Timeline: Every 6 months

9. **TIP-9: Magnesium Supplementation (Sleep + BP)**
   - Impact: BP↓ Sleep Quality↑ Insulin↓
   - Timeline: 2–3 weeks

10. **TIP-10: Intermittent Fasting Windows (16:8 vs 20:4 vs 24h)**
    - Impact: Insulin↓ Ketones↑ UA↓ (with hydration)
    - Timeline: 2–4 weeks

### Storage
- Knowledge Base = **Static Content** (not AI-generated, manually curated)
- Display: Image + Description + Explanation + Example + Warning
- Parameter Impact Map: Visual (BG↓, UA↑, etc.)

---

## 🎯 MVPSCOPE & FEATURES (UPDATED)

### Phase 1A (Core API & Auth): Weeks 1–2
- ✅ User Registration / Login
- ✅ JWT Session Management
- ✅ Encryption (TLS + DB)
- ✅ Data Isolation (User A ≠ User B)

### Phase 1B (Data Entry & Dashboard): Weeks 3–5
- ✅ New Session (Manual Data Entry)
  - 6 Metabolic Markers (Fora 6)
  - 4 Cardio & Vitals (BP, HR, Weight)
  - Journal Entry + Tags
- ✅ Dashboard (Key Metrics Overview)
- ✅ Session History (List + Detail)
- ✅ Session Edit / Delete

### Phase 1C (Knowledge Base): Weeks 6–7
- ✅ Nutrition Tips (10 curated tips)
- ✅ Parameter Impact Display (which markers each tip affects)
- ✅ Tip Detail View (Image + Description + Example + Warning)
- ✅ Quick Reference (Parameter Optimization Map)

### Phase 1D (Trends + Export): Weeks 8–10
- ✅ Basic Trends (Charts: BG, Weight, UA, BP over 30 days)
- ✅ CSV Export (download all data)
- ✅ Mobile Responsive

### Phase 1E (Testing & Deployment): Weeks 11–12
- ✅ Security Review
- ✅ Privacy Policy
- ✅ Deployment (Helmut's VPS)
- ✅ Documentation

---

## 📊 SCREEN UPDATES (MVP)

### Screen 3 UPDATED: New Session (with Cardio Data)

```
┌─────────────────────────────────────┐
│ New Measurement Session              │
├─────────────────────────────────────┤
│ Date: [2026-03-01 ▼]                │
│ Time: [06:00      ▼]                │
│ Device: [Fora 6   ▼]                │
│ Location: [Home   ▼]                │
├─────────────────────────────────────┤
│ METABOLIC MARKERS (Fora 6):          │
│ ─────────────────────────────────   │
│ Blood Glucose    │ 5.8   │ mmol/L   │
│ Ketones          │ 0.1   │ mmol/L   │
│ Cholesterin      │ 8.1   │ mmol/L   │
│ Uric Acid        │ 321   │ µmol/L   │
│ Hemoglobin       │ 7.57  │ mmol/L   │
│ Hematocrit       │ 36.0  │ %        │
├─────────────────────────────────────┤
│ CARDIO & VITALS (Qardio + Manual):   │
│ ─────────────────────────────────   │
│ BP Systolic      │ 100   │ mmHg     │
│ BP Diastolic     │ 69    │ mmHg     │
│ Heart Rate       │ 69    │ bpm      │
│ Weight           │ 73.0  │ kg       │
│ [+ Add Parameter ▼]                 │
├─────────────────────────────────────┤
│ JOURNAL ENTRY (with ? Tooltip Help):│
│ [___________________________________] │
│ "carnivore, honey, 1 coffee, 9h"   │
│ ? Tip: "Mention diet, sleep, coffee"│
│                                     │
│ TAGS (Optional):                    │
│ [#carnivore #honey #morning]        │
├─────────────────────────────────────┤
│ [Save] [Cancel] [Preview]           │
└─────────────────────────────────────┘
```

---

### Screen 6 UPDATED: Nutrition Tips / Knowledge Base

```
┌─────────────────────────────────────┐
│ Nutrition Tips & Knowledge Base      │
├─────────────────────────────────────┤
│ 🔍 Search: [_________________]       │
├─────────────────────────────────────┤
│ 📌 QUICK TIPS (Top 3 for You):       │
│ ─────────────────────────────────   │
│ 1. REDUCE HONEY                     │
│    Impact: BG↓ Ketones↑ UA↓         │
│    Timeline: 3–7 days               │
│    [Learn More]                     │
│                                     │
│ 2. INCREASE WATER (Fasting)         │
│    Impact: UA↓ Energy↑              │
│    Timeline: Immediate              │
│    [Learn More]                     │
│                                     │
│ 3. MODERATE SARDINES                │
│    Impact: UA↓ Kidney↓              │
│    Timeline: 5–10 days              │
│    [Learn More]                     │
├─────────────────────────────────────┤
│ 📚 ALL TIPS (10 Total):              │
│                                     │
│ □ Reduce Honey                      │
│ □ Moderate Sardine/Purine Protein   │
│ □ Increase Water (Fasting)          │
│ □ Time Protein Intake               │
│ □ Limit Alcohol                     │
│ □ Optimize Carb Timing              │
│ □ Increase Salt (Carnivore)         │
│ □ Track Liver (ALT/GGT)             │
│ □ Magnesium Supplementation         │
│ □ Intermittent Fasting Windows      │
│                                     │
│ 📊 PARAMETER MAP:                    │
│ • BG               (glucose control) │
│ • Ketones          (fat metabolism)  │
│ • Uric Acid        (kidney/gout)     │
│ • Blood Pressure   (cardio)          │
│ • Triglycerides    (lipid health)    │
│ • Liver (ALT/GGT)  (monitoring)      │
│                                     │
│ [Back] [Help]                       │
└─────────────────────────────────────┘
```

---

### Screen 7 UPDATED: Nutrition Tip Article (Example: Reduce Honey)

```
┌─────────────────────────────────────┐
│ ◄ TIP-1: Reduce or Eliminate Honey   │
├─────────────────────────────────────┤
│ Category: Glucose | Lipids          │
│ Difficulty: Easy ★☆☆               │
│ Timeline: 3–7 days                  │
├─────────────────────────────────────┤
│ 📊 PARAMETER IMPACT:                 │
│ • Blood Glucose (BG)      ↓ ✓        │
│ • Ketones                 ↑ ✓        │
│ • Triglycerides (TG)      ↓ ✓        │
│ • Uric Acid (UA)          ↓ ✓        │
├─────────────────────────────────────┤
│ 📝 DESCRIPTION:                      │
│ Honey is ~55% fructose. Even        │
│ though natural, it causes:          │
│ • Immediate BG spike                │
│ • Ketone suppression (carb insulin) │
│ • UA spike (fructose metabolism)    │
│ • TG elevation (liver fat)          │
│                                     │
│ Your data (27.2.2026):              │
│ Added honey → BG 5.8, Ketones 0.1  │
│ (borderline, trend up)              │
├─────────────────────────────────────┤
│ 💡 WHAT TO DO:                       │
│ 1. Remove honey for 2 weeks         │
│ 2. Measure: BG, Ketones (day 1, 3,7)│
│ 3. Alternative: Monk fruit/Stevia  │
│                                     │
│ ⚠️ WARNING:                          │
│ • No withdrawal risk                │
│ • May miss psychological ritual     │
│ • Test repeatedly                   │
├─────────────────────────────────────┤
│ 📖 EXAMPLE (Anonymized):             │
│ "Added 1 tbsp honey daily (2 weeks).│
│ BG: 5.2→5.8, Ketones: 0.5→0.1.    │
│ Stopped honey. BG back to 5.3 in 5d."│
│                                     │
│ [Back] [Print] [Share with Doctor]  │
└─────────────────────────────────────┘
```

---

## 🔐 SECURITY UPDATES

**No changes to security requirements. All previous specs remain:**
- ✅ TLS/HTTPS (Transit)
- ✅ AES-256 Database Encryption (at Rest)
- ✅ Bcrypt Password Hashing
- ✅ JWT Token Auth
- ✅ User Data Isolation
- ✅ Audit Logging (Phase 2)

---

## 📋 MVPTIMELINE (FINAL)

**Total: 10–12 Weeks (no change)**

```
Week 1–2:   Auth + DB + Encryption
Week 3–5:   Data Entry + Dashboard
Week 6–7:   Nutrition Tips KB (10 tips)
Week 8–10:  Trends + Charts + Export
Week 11–12: Testing + Deployment
```

---

## ✅ ACCEPTANCE CRITERIA (MVP UPDATED)

- [x] All 11 measurement parameters captured (6 metabolic + 4 cardio + context)
- [x] Journal entry with tooltip help
- [x] Session saved encrypted
- [x] Session history displayed
- [x] Session detail view
- [x] Trends (basic charts for BG, UA, Weight, BP)
- [x] Nutrition Tips KB (10 curated tips) displayed
- [x] Each tip shows parameter impact
- [x] Each tip has example + warning
- [x] CSV export
- [x] Multi-user (Helmut + Peter)
- [x] User isolation verified
- [x] Mobile responsive
- [x] All data encrypted (transit + storage)

---

## 📊 REQUIREMENTS SUMMARY (MVP Final)

```
DATA CAPTURE:        ✅ 11 Metrics (metabolic + cardio) + Journal
JOURNAL/CONTEXT:     ✅ Free-text + Tags + Tooltip Help
NUTRITION TIPS KB:   ✅ 10 Curated Tips (No AI, Manual)
PARAMETER MAPPING:   ✅ Each Tip → Impact on BG, UA, BP, TG, etc.
SECURITY:            ✅ Encryption Transit + Storage
MULTI-USER:          ✅ Helmut + Peter (Isolated)
MOBILE READY:        ✅ Responsive Design
TIMELINE:            ✅ 10–12 Weeks
```

---

_MVP Requirements Finalized. Ready for Design & Implementation Phase._

