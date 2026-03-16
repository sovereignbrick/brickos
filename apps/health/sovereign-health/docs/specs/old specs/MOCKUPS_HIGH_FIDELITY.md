# High-Fidelity App Mockups
**Visual Preview of the Sovereign Health App (Desktop + Mobile)**

---

## 🎯 Mockup Goals

Show what the app looks like **fully functional** before coding begins:
- All 8 zones visible and understandable
- Data entry flow (how measurements are added)
- Trend visualization
- Knowledge base integration
- Settings/profile page
- Language switching (EN/DE mockups side-by-side)

**Design Principles Applied:**
- ✅ Neutral zone backgrounds (focus on Ampel colors)
- ✅ Icons/images for each zone (sourced from library)
- ✅ German text space accommodated
- ✅ Slick, minimal, data-driven
- ✅ Mobile-first responsive

---

## 🖼️ Zone Icon Library (Recommendations)

Each zone gets a dedicated **SVG icon** (not emoji) from:
- **Source:** Heroicons (open-source), Feather Icons, or custom SVG
- **Style:** Minimal line-work, consistent stroke width
- **Color:** Render in #888888 (muted gray) or natural B&W
- **Size:** 32px–40px in zone headers, 16px–24px in collapsed previews

### Icon Specifications per Zone

| Zone | Icon Name | Description | Visual |
|------|-----------|-------------|--------|
| ⚡ Energy & Metabolic Power | `zap-bold` or `lightning-bolt` | Lightning bolt, minimalist strokes | ⚡ |
| 💪 Structural Integrity | `muscle` or `dumbbell` | Arm/muscle, strong angular lines | 💪 |
| 🫀 Cardiovascular Resilience | `heart` or `heartbeat` | Heart with subtle pulse line | 💗 |
| 🧠 Cognitive & Nervous System | `brain` or `head` | Brain side profile, synaptic lines | 🧠 |
| 🛡️ Immune & Inflammatory Balance | `shield-check` or `shield` | Shield, protective geometry | 🛡️ |
| 🔄 Detoxification & Waste Clearance | `recycle` or `refresh-cw` | Circular recycle arrows, clean lines | ♻️ |
| 🎯 Hormonal Harmony | `target` or `crosshair` | Concentric circles, balanced | 🎯 |
| 🌱 Nutritional Sufficiency | `leaf` or `sprout` | Plant/leaf growth, organic curves | 🌱 |

**Icon Implementation:**
```tsx
<Icon name="zap-bold" size={40} color="#888888" strokeWidth={1.5} />
```

---

## 📱 SCREEN 1: DASHBOARD (Collapsed Zones + Measurement Timeline)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Health Zones                             👤 Helmut  🌍 EN/DE       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  RECENT MEASUREMENTS TIMELINE                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  27.2.2026  │  24.2.2026  │  20.2.2026  │  17.2.2026  │  13.2.2026         │
│   06:00     │   06:15     │   06:00     │   06:30     │   06:00            │
│  ────────   │  ────────   │  ────────   │  ────────   │  ────────          │
│  BG: 5.8    │  BG: 5.2    │  BG: 5.8    │  BG: 5.1    │  BG: 5.2           │
│  KB: 0.1    │  KB: 0.6    │  KB: 0.2    │  KB: 0.8    │  KB: 0.5           │
│  BP: 100/69 │  BP: 100/68 │  BP: 98/65  │  BP: 102/70 │  BP: 100/69        │
│  (🟢)       │  (🟢)       │  (🟢)       │  (🟢)       │  (🟢)              │
│                                                                             │
│  [← Previous Measurements] [Next →]                                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                     │  │                              │ │
│  │  ⚡ Energy & Metabolic Power        │  │  💪 Structural Integrity     │ │
│  │  ─────────────────────────────────  │  │  ──────────────────────────  │ │
│  │                                     │  │                              │ │
│  │  🟢 6 / 7 In Range                  │  │  🟡 6 / 9 In Range           │ │
│  │                                     │  │                              │ │
│  │  Blood Glucose    5.8 mmol/L   🟢   │  │  Albumin      35 g/L    🟢   │ │
│  │  Insulin          2.8 mU/L     🟢   │  │  Magnesium    0.85 mmol/L 🟢 │ │
│  │  HbA1c            5.4%         🟢   │  │  Vitamin D    85 nmol/L 🟢   │ │
│  │  TSH              2.1 mIU/L    🟢   │  │  Calcium      2.4 mmol/L 🟡  │ │
│  │                                     │  │  Iron         16 µg/L    🟢   │ │
│  │  [View All 7]  [Expand]            │  │                              │ │
│  │                                     │  │  [View All 9]  [Expand]      │ │
│  └─────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                     │  │                              │ │
│  │  🫀 Cardiovascular Resilience       │  │  🧠 Cognitive & Nervous      │ │
│  │  ─────────────────────────────────  │  │  ──────────────────────────  │ │
│  │                                     │  │                              │ │
│  │  🟢 8 / 9 In Range                  │  │  🟢 7 / 8 In Range           │ │
│  │                                     │  │                              │ │
│  │  BP (Systolic)    100 mmHg     🟢   │  │  B12          350 pmol/L 🟢  │ │
│  │  Heart Rate       69 bpm       🟢   │  │  Folate       8 µg/L     🟢   │ │
│  │  ApoB             1.5 g/L      🟢   │  │  Magnesium    0.85 mmol/L🟢   │ │
│  │  Triglycerides    1.2 mmol/L   🟢   │  │  Free T3      4.5 pmol/L 🟢   │ │
│  │                                     │  │                              │ │
│  │  [View All 9]  [Expand]            │  │  [View All 8]  [Expand]      │ │
│  └─────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                     │  │                              │ │
│  │  🛡️  Immune & Inflammatory          │  │  🔄 Detoxification & Waste   │ │
│  │  ─────────────────────────────────  │  │  ──────────────────────────  │ │
│  │                                     │  │                              │ │
│  │  🟢 17 / 17 In Range                │  │  🟡 12 / 13 In Range         │ │
│  │                                     │  │                              │ │
│  │  WBC               7.2 Gpt/L   🟢   │  │  ALT           28 IU/L   🟢  │ │
│  │  Lymphocytes       32 %        🟢   │  │  GGT           35 IU/L   🟢  │ │
│  │  Vitamin D        90 nmol/L    🟢   │  │  eGFR          88 mL/min 🟡  │ │
│  │  hs-CRP            0.6 mg/L    🟢   │  │  Uric Acid    321 µmol/L 🟢  │ │
│  │                                     │  │                              │ │
│  │  [View All 17] [Expand]            │  │  [View All 13] [Expand]      │ │
│  └─────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                                     │  │                              │ │
│  │  🎯 Hormonal Harmony                │  │  🌱 Nutritional Sufficiency  │ │
│  │  ─────────────────────────────────  │  │  ──────────────────────────  │ │
│  │                                     │  │                              │ │
│  │  🟢 8 / 9 In Range                  │  │  🟢 13 / 14 In Range         │ │
│  │                                     │  │                              │ │
│  │  Total Testosterone 16 nmol/L  🟢   │  │  Vitamin D     90 nmol/L 🟢  │ │
│  │  Free Testosterone 300 pmol/L  🟢   │  │  Vitamin B12  350 pmol/L 🟢  │ │
│  │  FSH                 6 IU/L    🟢   │  │  Omega-3 Index 8%       🟢   │ │
│  │  LH                  5 IU/L    🟢   │  │  Iron         16 µg/L    🟢   │ │
│  │                                     │  │                              │ │
│  │  [View All 9]  [Expand]            │  │  [View All 14] [Expand]      │ │
│  └─────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  [+ Add New Measurement]                                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Home] [History] [Knowledge Base] [Trends] [Settings]                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (375px)

```
┌──────────────────────────────┐
│ Health Zones        👤 🌍    │
├──────────────────────────────┤
│                              │
│ Last: 27.2 | Fora 6          │
│                              │
│ ┌──────────────────────────┐ │
│ │ ⚡ Energy & Power        │ │
│ │                          │ │
│ │ 🟢 6 / 7 In Range        │ │
│ │                          │ │
│ │ BG: 5.8 mmol/L    🟢    │ │
│ │ Insulin: 2.8 mU/L 🟢    │ │
│ │ HbA1c: 5.4%        🟢    │ │
│ │                          │ │
│ │ [View All] [Expand]     │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 💪 Structural           │ │
│ │                          │ │
│ │ 🟡 6 / 9 In Range        │ │
│ │                          │ │
│ │ Albumin: 35 g/L   🟢    │ │
│ │ Magnesium: 0.85   🟢    │ │
│ │ Vitamin D: 85      🟢    │ │
│ │                          │ │
│ │ [View All] [Expand]     │ │
│ └──────────────────────────┘ │
│                              │
│ [Repeat 6 more zones...]    │
│                              │
│ ┌──────────────────────────┐ │
│ │ [+ Add Measurement]      │ │
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ Home │Hist│KB │Trends│Set   │
└──────────────────────────────┘
```

---

## 🔍 SCREEN 2: ZONE DETAIL (Expanded + Trend Visualization)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ ⚡ Energy & Metabolic Power                          👤 Helmut  🌍 EN/DE │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Zone Score: 6 / 7 In Range  🟢        Last Updated: 27.2.2026, 06:00     │
│  "Can I have sustained energy throughout the day?"                         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  📊 ZONE TREND (Last 30 Days)                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Overall Zone Score:  85% of measurements in range (23/27 days)            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ 7                                                                   │  │
│  │                      ╱╲          ╱╲                                 │  │
│  │ 6 ━━ TARGET ━━━───╱  ╲────────╱  ╲───────                         │  │
│  │                  ╱    ╲    ╱      ╲                                │  │
│  │ 5                      ╲──╱        ╲───                            │  │
│  │                                                                     │  │
│  │ 4                                                                   │  │
│  │ ──┴────────────────────────────────────────────────┴──────         │  │
│  │   1 Feb  8 Feb  15 Feb  22 Feb  1 Mar  8 Mar  15 Mar  22 Mar      │  │
│  │   ─ Glucose (Target: 5.2-6.2)                                     │  │
│  │                                                                     │  │
│  │ Trend: ↔ Stable, slight rise mid-month (honey effect)             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  1. Blood Glucose (Fasting)                        🟢 Normal              │
│     ────────────────────────────────────────────────────────────────────  │
│     Current:   5.8 mmol/L  |  Target: 5.2–6.2                            │
│     Previous:  5.2 mmol/L  (3 days ago)  |  Change: +0.6 ↑ (due to honey)│
│     7-day Avg: 5.4 mmol/L  |  30-day Avg: 5.3 mmol/L                    │
│     Status: Excellent (within target)                                    │
│     Trend: ↔ Stable; minor rise correlated with honey (Feb 24-26)       │
│                                                                             │
│     📊 [View Full Trend]   ℹ️ [Learn More]   ✏️ [Edit]                   │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  2. Fasting Insulin                                🟢 Excellent           │
│     ────────────────────────────────────────────────────────────────────  │
│     Value: 2.8 mU/L  |  Target: <2.5 (best), <3.0 (good)                │
│     HOMA-IR: 0.7 (excellent insulin sensitivity)                         │
│     Trend: ↔ Stable, slight downward (3.1 → 2.8 over 8 months)          │
│                                                                             │
│     💡 TIP: Your insulin sensitivity is excellent. Maintain current       │
│            diet/exercise to preserve this.                                │
│                                                                             │
│     📊 [View Trend Chart]   ℹ️ [Learn More]   ✏️ [Edit]                   │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  3. HbA1c (3-Month Glucose Average)                🟢 Excellent           │
│     ────────────────────────────────────────────────────────────────────  │
│     Value: 5.4%  |  Target: <5.5%                                        │
│     Status: Excellent metabolic control (lowest CVD risk tier)            │
│     Last Measured: 23.7.2025 (🔴 8 months old — consider re-testing)    │
│                                                                             │
│     📊 [View Trend]   ℹ️ [Learn More]   ✏️ [Edit]                         │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  4. TSH (Thyroid Stimulating Hormone)              🟢 Normal               │
│     ────────────────────────────────────────────────────────────────────  │
│     Value: 2.1 mIU/L  |  Target: 0.4–4.0 (most labs), 1.5–2.5 (optimal) │
│     Status: Optimal for most people                                       │
│     Implication: Your thyroid is working well; good metabolic rate       │
│                                                                             │
│     📊 [View Trend]   ℹ️ [Learn More]   ✏️ [Edit]                         │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  5. Free T4 (Thyroxine)                           🟢 Normal                │
│     Value: 12 pmol/L  |  Target: 10–14                                   │
│     Status: Mid-range, healthy                                            │
│                                                                             │
│     📊 [View Trend]   ℹ️ [Learn More]   ✏️ [Edit]                         │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  6. Free T3 (Active Thyroid Hormone)              🟢 Normal                │
│     Value: 4.2 pmol/L  |  Target: 3.5–5.0                                │
│     Status: Good (T3 drives thermogenesis and energy)                     │
│                                                                             │
│     📊 [View Trend]   ℹ️ [Learn More]   ✏️ [Edit]                         │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  7. DHEA-S (Energy/Stress Hormone)                🟡 Low-Normal            │
│     ────────────────────────────────────────────────────────────────────  │
│     Value: 4.2 µmol/L  |  Target for 56-year-old: 5–8 µmol/L            │
│     Status: Below optimal for age                                         │
│     Implication: May affect energy, stress recovery, muscle recovery     │
│                                                                             │
│     💡 TIP: Consider DHEA testing after stress reduction or increased    │
│            strength training (both boost DHEA naturally)                  │
│                                                                             │
│     📊 [View Trend]   ℹ️ [Learn More]   ✏️ [Edit]                         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ZONE INSIGHT:                                                             │
│  ───────────────                                                           │
│  Your energy metabolism is excellent. Fasting glucose and insulin are     │
│  optimal. HbA1c (5.4%) indicates 3-month glucose control is very good.   │
│  Thyroid is functioning well (TSH, T4, T3 all normal).                   │
│                                                                             │
│  ACTION ITEMS:                                                             │
│  • Re-test HbA1c in March 2026 (post-honey phase) to confirm stability   │
│  • Monitor DHEA-S; consider re-testing in April after increased training │
│  • Maintain current diet/exercise patterns (working well)                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [+ Add Measurement]  [Download Report]  [Print]  [Share with Doctor] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (375px)

```
┌──────────────────────────────┐
│ ◄ ⚡ Energy & Power   🌍 EN/DE│
├──────────────────────────────┤
│                              │
│ 🟢 6 / 7 In Range            │
│ Last: 27.2 | 06:00           │
│                              │
│ Can I have sustained energy? │
│                              │
│ ──────────────────────────── │
│                              │
│ 1. Blood Glucose     🟢       │
│    ──────────────────────    │
│    5.8 mmol/L (5.2–6.2)     │
│    Excellent ↔ Stable       │
│                              │
│    [View Trend] [Learn More] │
│                              │
│ ──────────────────────────── │
│                              │
│ 2. Fasting Insulin   🟢       │
│    ──────────────────────    │
│    2.8 mU/L (<2.5 best)     │
│    HOMA-IR: 0.7 ✓           │
│                              │
│    [View Trend] [Learn More] │
│                              │
│ ──────────────────────────── │
│                              │
│ [3. HbA1c]    [4. TSH] [+]  │
│ [5. T4]       [6. T3]       │
│ [7. DHEA-S]                 │
│                              │
│ ──────────────────────────── │
│                              │
│ ZONE INSIGHT:               │
│ Your energy metabolism is   │
│ excellent. Glucose, insulin,│
│ thyroid all optimal.        │
│                              │
│ ACTION:                     │
│ • Re-test HbA1c (March)    │
│ • Monitor DHEA-S (April)   │
│                              │
│ ──────────────────────────── │
│                              │
│ [+ Add Measurement]         │
│ [Download Report]           │
│                              │
└──────────────────────────────┘
```

---

## ➕ SCREEN 3: NEW MEASUREMENT (Data Entry)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ New Measurement                                     👤 Helmut  🌍 EN/DE  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 Date & Time                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Date: [27.02.2026 ▼]  Time: [06:00 ▼]  Device: [Fora 6 ▼]              │
│  Location: [🏠 Home ▼]                                                     │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  🩸 METABOLIC MARKERS (Required *)                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Blood Glucose *                                                            │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 5.8                                     │ mmol/L ▼ │  (or mg/dL: ×18) │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟢 Normal (5.2–6.2)                                              │
│  ? Tip: Fasting = before food, coffee variable. Capillary from left thumb│
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Ketones (βHB) *                                                            │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 0.1                                     │ mmol/L ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟡 Low (carnivore target: 0.5–3.0)                              │
│  💡 Note: Low ketones expected with honey consumption yesterday          │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Cholesterin                                                                │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 8.1                                     │ mmol/L ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟡 Elevated (target: <7.2)                                       │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Uric Acid                                                                  │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 321                                     │ µmol/L ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟢 Good (280–360)                                                │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Hemoglobin                                                                 │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 7.57                                    │ mmol/L ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟢 Normal (9.0–10.0 mmol/L)                                      │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Hematocrit                                                                 │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 36                                      │ %      ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟡 Low (target: 42–47)                                           │
│  💡 Tip: Increase hydration                                               │
│                                                                             │
│  [+ Add Parameter ▼]  (Optional: add custom parameters)                   │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  💗 CARDIOVASCULAR & VITALS                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Blood Pressure (Systolic / Diastolic)                                     │
│  ┌────────────────────────┬────────────────────────┬──────────┐           │
│  │ 100                    │ 69                     │ mmHg   ▼ │           │
│  └────────────────────────┴────────────────────────┴──────────┘           │
│  Status: 🟢 Excellent (<120/80)                                           │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Heart Rate (Resting)                                                       │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 69                                      │ bpm    ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟢 Excellent (55–70 optimal)                                     │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Weight                                                                     │
│  ┌─────────────────────────────────────────┬──────────┐                   │
│  │ 73.0                                    │ kg     ▼ │                  │
│  └─────────────────────────────────────────┴──────────┘                   │
│  Status: 🟢 Stable (no change from last measurement)                      │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  📝 JOURNAL ENTRY                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ? What did you eat? How do you feel? Stress? Sleep quality?               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ carnivore, 1 tbsp honey with morning coffee, 9h sleep, no stress  │  │
│  │ Energy: 8/10, digestion good, no afternoon crash                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  🏷️  TAGS (Optional)                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [#carnivore] [#honey] [#morning] [#fasting] [+ Add Tag]                 │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [💾 Save Measurement]  [Cancel]  [👁️  Preview]                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (375px)

```
┌──────────────────────────────┐
│ ◄ New Measurement     🌍 EN/DE│
├──────────────────────────────┤
│                              │
│ 📅 Date & Time              │
│ [27.02.2026 ▼] [06:00 ▼]   │
│ [Fora 6 ▼]  [Home ▼]       │
│                              │
│ ────────────────────────────│
│                              │
│ 🩸 METABOLIC MARKERS        │
│                              │
│ Blood Glucose *             │
│ ┌──────────┬──────────────┐ │
│ │ 5.8      │ mmol/L ▼    │ │
│ └──────────┴──────────────┘ │
│ Status: 🟢 Normal           │
│                              │
│ Ketones *                   │
│ ┌──────────┬──────────────┐ │
│ │ 0.1      │ mmol/L ▼    │ │
│ └──────────┴──────────────┘ │
│ Status: 🟡 Low             │
│                              │
│ [Cholesterin] [Uric Acid]   │
│ [Hemoglobin] [Hematocrit]   │
│                              │
│ [+ Add Parameter ▼]         │
│                              │
│ ────────────────────────────│
│                              │
│ 💗 VITALS                   │
│                              │
│ BP: [100] / [69]  mmHg      │
│ HR: [69]  bpm               │
│ Weight: [73.0]  kg          │
│                              │
│ ────────────────────────────│
│                              │
│ 📝 JOURNAL                  │
│ ┌──────────────────────────┐ │
│ │ carnivore, honey,   │    │ │
│ │ 9h sleep, energy 8/10    │ │
│ └──────────────────────────┘ │
│                              │
│ 🏷️  TAGS                     │
│ [#carnivore] [#honey]       │
│ [#fasting] [+ Add]          │
│                              │
│ ────────────────────────────│
│                              │
│ [💾 Save] [Cancel] [Preview]│
│                              │
└──────────────────────────────┘
```

---

## ⚙️ SCREEN 4: SETTINGS (Profile + Language + Thresholds)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ Settings                                            👤 Helmut  🌍 EN/DE  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [PROFILE] [UNITS & THRESHOLDS] [SECURITY]                                │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  👤 PERSONAL INFORMATION                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Name *                                                                     │
│  ┌─────────────────────────────────────────┐                              │
│  │ Helmut                                  │                              │
│  └─────────────────────────────────────────┘                              │
│                                                                             │
│  Email *                                                                    │
│  ┌─────────────────────────────────────────┐                              │
│  │ helmut@example.com                      │                              │
│  └─────────────────────────────────────────┘                              │
│                                                                             │
│  Gender                                                                     │
│  ◉ Male   ○ Female   ○ Other   ○ Prefer Not to Say                        │
│                                                                             │
│  Date of Birth *                                                            │
│  ┌─────────────────────────────────────────┐                              │
│  │ 15.05.1970                              │  (Age: 56)                   │
│  └─────────────────────────────────────────┘                              │
│                                                                             │
│  Timezone *                                                                 │
│  ┌─────────────────────────────────────────┐                              │
│  │ Europe/Berlin                        ▼ │                              │
│  └─────────────────────────────────────────┘                              │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  🌍 LANGUAGE & DISPLAY                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Language *                                                                 │
│  [🇬🇧 English  ]  [🇩🇪 Deutsch ✓]                                          │
│                                                                             │
│  ℹ️  German requires more space (longer compound words). The app        │
│     automatically adjusts layout, padding, and line height. You can     │
│     switch anytime.                                                       │
│                                                                             │
│  Theme                                                                      │
│  ◉ Light   ○ Dark   ○ System Default                                      │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [💾 Save Changes]  [Cancel]  [Reset to Defaults]                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [UNITS & THRESHOLDS]  [Switching to tab...]                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚙️ UNIT PREFERENCES                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Glucose Unit                                                               │
│  ◉ mmol/L (millimoles per liter)                                          │
│  ○ mg/dL (milligrams per deciliter)                                       │
│  ? Conversion: 1 mmol/L = 18 mg/dL                                        │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Cholesterin Unit                                                           │
│  ◉ mmol/L   ○ mg/dL                                                        │
│  ? Conversion: 1 mmol/L = 38.67 mg/dL                                     │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  [Weight Unit]  [BP Unit]  [Uric Acid Unit]  [Energy Unit]                │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  🟢🟡🔴 PERSONAL THRESHOLDS (Ampel-Logik)                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  These ranges define your personal traffic light. All measurements      │
│  against these thresholds. Adjust based on your clinician's advice.    │
│                                                                             │
│  Blood Glucose (mmol/L)                                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 GREEN (Normal/Optimal):                                            │ │
│  │    From: [5.2]      To: [6.2]                                         │ │
│  │                                                                         │ │
│  │ 🟡 YELLOW (Attention Needed):                                         │ │
│  │    From: [4.8]      To: [6.7]                                         │ │
│  │                                                                         │ │
│  │ 🔴 RED (Warning):                                                      │ │
│  │    < [4.8]          or   > [6.7]                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Uric Acid (µmol/L)                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 GREEN (Normal):           280 — 360                               │ │
│  │ 🟡 YELLOW (Attention):       360 — 450                               │ │
│  │ 🔴 RED (Warning):            > 480  (gout risk)                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [+ Customize more thresholds (15 more zones)]                            │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [💾 Save Changes]  [Cancel]  [Reset to Defaults]                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [SECURITY]  [Switching to tab...]                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔐 SECURITY & ACCOUNT                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Change Password                                                            │
│  Current Password: ┌─────────────────────────────────────────┐             │
│                   │ ••••••••••••••••••••                    │             │
│                   └─────────────────────────────────────────┘             │
│                                                                             │
│  New Password:     ┌─────────────────────────────────────────┐             │
│                   │                                         │             │
│                   └─────────────────────────────────────────┘             │
│                   ℹ️  Min. 8 characters, mixed case recommended          │
│                                                                             │
│  Confirm Password: ┌─────────────────────────────────────────┐             │
│                   │                                         │             │
│                   └─────────────────────────────────────────┘             │
│                                                                             │
│  [Update Password]                                                          │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  Active Sessions                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Current Session (This Device)                                         │ │
│  │ 🖥️  Chrome on macOS | IP: 192.168.1.100 | Last Active: Now         │ │
│  │ ✓ This Session | [Revoke]                                            │ │
│  │                                                                         │ │
│  │ Web Session (Tablet)                                                  │ │
│  │ 🌐 Safari on iPadOS | IP: 192.168.1.105 | Last Active: 2 hours ago  │ │
│  │ [Revoke]                                                              │ │
│  │                                                                         │ │
│  │ Mobile Session                                                         │ │
│  │ 📱 Chrome on Android | IP: 192.168.1.110 | Last Active: 5 hours ago │ │
│  │ [Revoke]                                                              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  🔴 DANGER ZONE                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  Delete Account                                                             │
│  ⚠️  This action cannot be undone. All your data will be deleted.         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [🗑️  Delete My Account]                                             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (375px)

```
┌──────────────────────────────┐
│ ◄ Settings            🌍 EN/DE│
├──────────────────────────────┤
│                              │
│ [PROFILE] [UNITS] [SECURITY]│
│                              │
│ 👤 PERSONAL INFO            │
│                              │
│ Name                        │
│ ┌──────────────────────────┐│
│ │ Helmut                  ││
│ └──────────────────────────┘│
│                              │
│ Email                       │
│ ┌──────────────────────────┐│
│ │ helmut@example.com      ││
│ └──────────────────────────┘│
│                              │
│ Gender                      │
│ ◉ Male  ○ Female  ○ Other  │
│                              │
│ Birthdate                   │
│ [15.05.1970] (Age: 56)      │
│                              │
│ Timezone                    │
│ [Europe/Berlin          ▼]  │
│                              │
│ ────────────────────────────│
│                              │
│ 🌍 LANGUAGE                  │
│                              │
│ [🇬🇧 EN] [🇩🇪 DE ✓]         │
│                              │
│ German uses more space.     │
│ The app adapts automatically.│
│                              │
│ Theme                       │
│ ◉ Light  ○ Dark  ○ System   │
│                              │
│ ────────────────────────────│
│                              │
│ [Save Changes] [Reset]      │
│                              │
└──────────────────────────────┘
```

---

## 📚 SCREEN 5: KNOWLEDGE BASE (Tips)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ Knowledge Base                                      👤 Helmut  🌍 EN/DE  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔍 [_________________________]  [Search Tips...]                           │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  QUICK TIPS FOR YOU (Based on Your Latest Measurements)                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  TIP #1: REDUCE HONEY (3–7 days to effect)                          │ │
│  │  ────────────────────────────────────────────────────────────────── │ │
│  │                                                                      │ │
│  │  Your Data (27.2.2026):                                             │ │
│  │  • Glucose: 5.8 mmol/L (↑ from 5.2 baseline)                        │ │
│  │  • Ketones: 0.1 mmol/L (↓ from 0.5 baseline)                        │ │
│  │                                                                      │ │
│  │  Impact:    BG ↓ | Ketones ↑ | UA ↓ | TG ↓                          │ │
│  │  Timeline:  3–7 days to see effect                                  │ │
│  │  Effort:    Easy (simple elimination)                               │ │
│  │                                                                      │ │
│  │  [Learn More →]                                                     │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  TIP #2: INCREASE WATER INTAKE DURING FASTING                       │ │
│  │  ────────────────────────────────────────────────────────────────── │ │
│  │                                                                      │ │
│  │  Your Data:                                                          │ │
│  │  • Hematocrit: 36% (low; hydration concern)                         │ │
│  │  • Uric Acid: 321 (good, but can drop more with hydration)         │ │
│  │                                                                      │ │
│  │  Impact:    UA ↓ | HCT ↑ | Energy ↑ | Kidney health ↑              │ │
│  │  Timeline:  Immediate (1–2 days)                                    │ │
│  │  Effort:    Trivial (drink more water)                              │ │
│  │                                                                      │ │
│  │  [Learn More →]                                                     │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  TIP #3: OPTIMIZE SLEEP (7–9 HOURS)                                 │ │
│  │  ────────────────────────────────────────────────────────────────── │ │
│  │                                                                      │ │
│  │  You're doing this well (9h recently). Keep it up!                  │ │
│  │  Good sleep improves: Glucose | Insulin | Hormones | Recovery     │ │
│  │                                                                      │ │
│  │  [Learn More →]                                                     │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ALL TIPS (20 Total)                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Category: [All Categories ▼]                                              │
│  Sort: [Most Relevant ▼]                                                   │
│                                                                             │
│  ☐ Reduce Honey                                                            │
│  ☐ Increase Water (Fasting)                                               │
│  ☐ Optimize Sleep (7–9 hours)                                             │
│  ☐ Moderate Purine Intake (Sardines, Organ Meats)                         │
│  ☐ Time Protein Intake (Spread Across Day)                                │
│  ☐ Limit Alcohol                                                          │
│  ☐ Optimize Carb Timing (If Any)                                          │
│  ☐ Increase Magnesium Intake                                              │
│  ☐ Monitor Liver Health (ALT/GGT Trends)                                  │
│  ☐ Track Kidney Function (Creatinine/eGFR)                                │
│  ☐ Strength Training for Testosterone                                     │
│  ☐ Stress Management (Meditation, Nature)                                 │
│  ☐ Fasting Window Optimization                                            │
│  ☐ Evaluate Supplement Necessity                                          │
│  ☐ Consider Lab Retest (Post-Honey Phase)                                 │
│  ☐ Monitor Cardiovascular Markers (ApoB)                                  │
│  ☐ Optimize Thyroid (Re-test in 6 months)                                 │
│  ☐ Manage Inflammation (hs-CRP)                                           │
│  ☐ Bone Health Assessment                                                 │
│  ☐ Cognitive Function Monitoring                                          │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [Load More Tips (5 additional)]                                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📈 SCREEN 6: TRENDS/CHARTS (Multi-Metric Timeline with Historical Data)

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ Trends                                              👤 Helmut  🌍 EN/DE  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Metric: [Glucose ▼]  Time Range: [Last 30 Days ▼]  Compare: [Insulin ▼] │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  Blood Glucose (Fasting, Last 30 Days)        vs.    Fasting Insulin     │
│                                                                             │
│          7.0 mmol/L  │                                                    │
│                      │                                                    │
│          6.5 mmol/L  │                                                    │
│                      │     ╱╲          ╱╲                                │
│          6.0 mmol/L  │────╱  ╲────────╱  ╲────                           │
│                      │   ╱    ╲    ╱      ╲                              │
│ ━━━ TARGET 5.2-6.2 ━ ├──╱──────╲──╱────────╲──────                      │
│                      │╱         ╲╱          ╲                            │
│          5.0 mmol/L  │                       ╲───                        │
│                      │                                                    │
│          4.5 mmol/L  │                                                    │
│                      │                                                    │
│          ──┴─────────┴──────────────────────────┴──────┴──────           │
│             27 Feb   3 Mar   10 Mar   17 Mar   24 Mar  Final            │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  STATISTICS (Last 30 Days)                                                 │
│                                                                             │
│  Mean:            5.4 mmol/L                                               │
│  Median:          5.3 mmol/L                                               │
│  Std Dev:         0.4 mmol/L  (good stability)                             │
│  Min:             4.8 mmol/L                                               │
│  Max:             6.1 mmol/L                                               │
│  In Range (🟢):   26 / 30 days (87%)                                      │
│  Low (🔴):        0 days                                                   │
│  High (🟡):       4 days  (honey effect, expected)                         │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  INSIGHT:                                                                   │
│  Your glucose is stable and well-controlled. The small rises (6.0–6.1)    │
│  correspond to honey consumption (visible pattern on 2–4 days post-honey).│
│  Removing honey should normalize this to 5.2–5.4 baseline.                │
│                                                                             │
│  MEASUREMENT DETAILS (Sorted by Date)                                      │
│                                                                             │
│  Date        BG        Insulin   KB      BP      Weight  Status           │
│  ────────────────────────────────────────────────────────────────────────  │
│  27.2.2026   5.8 🟡    2.8       0.1 🟡  100/69  73.0   Post-honey      │
│  24.2.2026   5.2 🟢    2.7       0.6 🟢  100/68  72.9   Good state      │
│  20.2.2026   5.8 🟡    2.9       0.2 🟡  98/65   72.8   Recovering      │
│  17.2.2026   5.1 🟢    2.6       0.8 🟢  102/70  72.7   Baseline        │
│  13.2.2026   5.2 🟢    2.7       0.5 🟢  100/69  72.9   Baseline        │
│  10.2.2026   5.3 🟢    2.8       0.4 🟢  99/68   73.1   Excellent       │
│  [← Older measurements]  [Next newer →]                                   │
│                                                                             │
│  RECOMMENDATION:                                                            │
│  Stop honey for 2 weeks. Measure BG daily (days 1, 3, 7, 14) to confirm   │
│  recovery. Once confirmed, honey can be re-tested at lower frequency.     │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [📥 Download CSV]  [🔗 Share with Doctor]  [🖨️  Print]              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  Other Metrics:                                                             │
│  [Insulin] [HbA1c] [BP] [Heart Rate] [Weight] [Ketones] [Uric Acid]      │
│  [Cholesterin] [hs-CRP] [Thyroid]                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 DESIGN SUMMARY

### Colors in Action

```
AMPEL STATUS (Primary Visual Focus)
🟢 Green (#27AE60)  — In range, no action needed
🟡 Yellow (#F39C12) — Attention needed, monitor/adjust
🔴 Red (#E74C3C)    — Out of range, action required

ZONE BACKGROUNDS (Neutral, No Distraction)
All zone cards:     #FFFFFF (white)
Zone headers:       #F5F5F5 (light gray)
Zone borders:       #E8E8E8 (subtle gray)

ZONE ICONS (Muted)
All zone icons:     #888888 (gray) or natural B&W
Icons identify zone, not color-code it
This keeps focus on Ampel colors
```

### Typography Scale

**English (EN):**
- H1: 32px
- H2: 24px
- Body: 16px

**German (DE):**
- H1: 28px (slightly smaller for longer text)
- H2: 20px
- Body: 14px
- Line Height: 1.6 (vs. 1.5 for EN)

### Responsive Behavior

| Breakpoint | Device | Layout |
|-----------|--------|--------|
| 0–374px | Small Phone | Single column, stacked zones |
| 375–599px | Standard Phone | Single column, full cards |
| 600–1023px | Tablet | 2-column zone grid |
| 1024px+ | Desktop | 2–3 column grid (optimized) |

---

## ✅ Mockup Approval Checklist

- [ ] Dashboard (all 8 zones visible, collapsed)
- [ ] Zone Detail (expanded, shows all markers with status + insights)
- [ ] New Measurement (data entry, live validation, journal + tags)
- [ ] Settings (profile, language toggle, units, Ampel thresholds, security)
- [ ] Knowledge Base (quick tips, all tips searchable)
- [ ] Trends (chart, stats, downloadable, multi-metric)
- [ ] Color scheme (Ampel 🟢🟡🔴 is priority, zone backgrounds neutral)
- [ ] Icons (each zone has SVG icon, rendered in muted gray)
- [ ] Language (EN + DE mockups make sense, German space accommodated)
- [ ] Mobile responsive (works at 375px, 600px, 1024px+)

---

_Ready for technical implementation. All screens designed, all data flows clear, all interactions specified._
