# Low-Fidelity Wireframes (Design Approval Phase)
**Status:** Ready for Helmut Review  
**Style:** Aware-Inspired + Aware Design Tokens  
**Device:** Web + Mobile Responsive

---

## 🎬 NAVIGATION FLOW

```
┌─────────────────┐
│  Landing/Login  │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│  Dashboard       │◄─┐
│  (Health Zones)  │  │
└────────┬─────────┘  │
         │            │
    ┌────┼────┬───────┴──┬────────┐
    │    │    │          │        │
    ▼    ▼    ▼          ▼        ▼
┌────────────────┐ ┌─────┐ ┌──────┐
│Zone Details    │ │ KB  │ │Set   │
│(Expanded View) │ │Tips │ │ings  │
└────────────────┘ └─────┘ └──────┘
  • History
  • Add Data
```

---

## 📱 SCREEN 1: LOGIN / SIGNUP

```
┌─────────────────────────────────────┐
│                                     │
│                                     │  (SafeArea Top)
│      🔷 Sovereign Health              │
│      (Purple Logo)                  │
│                                     │
│   ─────────────────────────────     │  (Spacing: xl)
│                                     │
│   Email                             │
│   ┌─────────────────────────────┐  │  (Input)
│   │ [  email@example.com    ]   │  │  (border_radius: lg)
│   └─────────────────────────────┘  │
│                                     │
│   Password                          │
│   ┌─────────────────────────────┐  │
│   │ [  ••••••••••••••       ]   │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   🟣 Sign In                │  │  (Button Primary)
│   └─────────────────────────────┘  │  (color: brand)
│                                     │
│   Don't have an account?            │
│   📘 Sign Up                        │  (Link)
│                                     │
│                                     │  (Spacing: 3xl)
└─────────────────────────────────────┘
```

---

## 📊 SCREEN 2: DASHBOARD (Health Zones)

```
┌─────────────────────────────────────┐
│ ☰ Health Zones           👤 Helmut  │  (Header + Profile)
├─────────────────────────────────────┤
│ Last Update: 27.2.2026 | 06:00     │  (Metadata)
│ Device: Fora 6                      │
├─────────────────────────────────────┤
│                                     │
│ 🩸 BLOOD (11 markers)               │  (Zone Card, Collapsed)
│ ───────────────────────────────────│
│ Zone Score: 9 / 11 In Range  🟢     │
│                                     │
│ ┌──────────────┐  ┌──────────────┐│
│ │ Glucose      │  │ Hemoglobin   ││  (Quick metrics)
│ │ 5.8 mmol/L   │  │ 7.57 mmol/L  ││
│ │ 🟢 Normal    │  │ 🟢 Normal    ││
│ └──────────────┘  └──────────────┘│
│                                     │
│ ┌──────────────┐  ┌──────────────┐│
│ │ Hematocrit   │  │ Ketones      ││
│ │ 36% 🟡       │  │ 0.1 mmol/L   ││
│ └──────────────┘  └──────────────┘│
│                                     │
│ [Show 7 more markers] [Expand]     │  (CTA)
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 💓 HEART & CIRCULATION (8 markers)  │
│ ───────────────────────────────────│
│ Zone Score: 8 / 8 In Range   🟢    │
│                                     │
│ ┌──────────────┐  ┌──────────────┐│
│ │ BP Systolic  │  │ Heart Rate   ││
│ │ 100 mmHg     │  │ 69 bpm 🟢    ││
│ │ 🟢 Excellent │  │              ││
│ └──────────────┘  └──────────────┘│
│                                     │
│ ┌──────────────┐  ┌──────────────┐│
│ │ Triglycerides│  │ Total Chol.  ││
│ │ 1.5 mmol/L   │  │ 8.1 mmol/L   ││
│ │ 🟢 Good      │  │ 🟡 High      ││
│ └──────────────┘  └──────────────┘│
│                                     │
│ [Show 4 more markers] [Expand]     │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 🧬 HORMONES & METABOLISM (9 mkrs)  │
│ ───────────────────────────────────│
│ Zone Score: 7 / 9 In Range   🟡    │  (Warning: some out of range)
│                                     │
│ ┌──────────────┐  ┌──────────────┐│
│ │ Insulin      │  │ HbA1c        ││
│ │ 2.8 mU/L 🟢  │  │ 5.4% 🟢      ││
│ └──────────────┘  └──────────────┘│
│                                     │
│ [Show 7 more markers] [Expand]     │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 💎 LIPIDS & CHOLESTEROL (11 mkrs) │
│ [Zone Score: 8/11] [Expand]        │
│                                     │
│ 🔥 INFLAMMATION & IMMUNE (11 mkrs) │
│ [Zone Score: 11/11] [Expand]       │
│                                     │
│ 💊 KIDNEY FUNCTION (11 markers)    │
│ [Zone Score: 10/11] [Expand]       │
│                                     │
│ [More Zones (🧪 Liver, ⚡ Minerals)]│
│                                     │
│ ┌────────────────────────────────┐ │
│ │ [+ Add Measurement]            │ │  (CTA)
│ └────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ [History] [Tips] [Settings]         │  (Bottom Tab/Nav)
└─────────────────────────────────────┘
```

---

## 🔍 SCREEN 3: ZONE DETAIL (Expanded Health Zone)

```
┌─────────────────────────────────────┐
│ ◄ 🩸 BLOOD (11 markers)              │  (Header)
├─────────────────────────────────────┤
│                                     │
│ Zone Score: 9 / 11 In Range  🟢     │  (Summary)
│ Last Updated: 27.2.2026 06:00       │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 1. Blood Glucose         🟢 Normal  │  (Marker List)
│    5.8 mmol/L (5.2–6.2)            │
│    Last: 27.2.2026 06:00           │
│    Trend: ↔ Stable                 │
│    [View Trend] [Edit]             │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 2. Hemoglobin            🟢 Normal  │
│    7.57 mmol/L (9.0–10.0)          │
│    Last: 27.2.2026 06:00           │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 3. Hematocrit            🟡 Low     │
│    36% (42–47%)                    │
│    Last: 27.2.2026 06:00           │
│    💡 Tip: Increase hydration      │
│    [More Info]                     │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 4. Red Blood Cells       🟢 Normal  │
│    4.7 Tpt/L (4.3–5.9)             │
│                                     │
│ 5. White Blood Cells     🟢 Normal  │
│    7.2 Gpt/L (4.5–11.0)            │
│                                     │
│ 6. Platelets / Thrombocytes 🟢      │
│    250 Gpt/L (150–400)             │
│                                     │
│ ... (5 more markers)               │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ 📊 Zone Trends (Last 30 Days):      │
│    • 85% of measurements in range   │
│    • Hematocrit trending down ↓     │
│    • Generally stable & improving   │
│                                     │
│ ═══════════════════════════════════│
│                                     │
│ [Add Measurement] [Download Report] │
│                                     │
└─────────────────────────────────────┘
```

---

## 📥 SCREEN 4: NEW MEASUREMENT (Data Entry)

```
┌─────────────────────────────────────┐
│ ◄ New Measurement                   │  (Header + Back)
├─────────────────────────────────────┤
│                                     │
│ Date: [27.2.2026 ▼]                │
│ Time: [06:00 ▼]                    │  (Date/Time Selectors)
│ Device: [Fora 6 ▼]                 │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ METABOLIC MARKERS:                  │
│                                     │
│ Blood Glucose *                     │  (Label + Required)
│ ┌─────────────────────────┬──────┐│
│ │ [5.8            ]  │mm │      ││  (Value + Unit Selector)
│ └─────────────────────────┴──────┘│
│ Status: 🟢 Normal (Target: 5.2-6.2)│  (Live Feedback)
│ ? mmol/L = mg/dL: ×18              │  (Tooltip Hint)
│                                     │
│ Ketones *                           │
│ ┌─────────────────────────┬──────┐│
│ │ [0.1            ]  │mm │      ││
│ └─────────────────────────┴──────┘│
│ Status: 🟡 Low (Target: 0.5-3.0)   │
│                                     │
│ Cholesterin                         │
│ ┌─────────────────────────┬──────┐│
│ │ [8.1            ]  │mm │      ││
│ └─────────────────────────┴──────┘│
│ Status: 🟡 High (Target: <7.2)     │
│                                     │
│ Uric Acid                           │
│ ┌─────────────────────────┬──────┐│
│ │ [321            ]  │µm │      ││
│ └─────────────────────────┴──────┘│
│ Status: 🟢 Good (Target: 280-360)  │
│                                     │
│ [+ Add Parameter ▼]                │  (Add more metrics)
│                                     │
│ ───────────────────────────────────│
│                                     │
│ CARDIO & VITALS:                    │
│                                     │
│ BP Systolic                         │
│ ┌─────────────────────────┬──────┐│
│ │ [100           ]  │mm │      ││
│ └─────────────────────────┴──────┘│
│ Status: 🟢 Excellent                │
│                                     │
│ Weight                              │
│ ┌─────────────────────────┬──────┐│
│ │ [73.0          ]  │kg │      ││
│ └─────────────────────────┴──────┘│
│ Status: 🟢 Stable (No change)       │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ JOURNAL ENTRY:                      │
│                                     │
│ What did you eat / How do you feel? │  (Label)
│ ? Tips: mention diet, sleep, energy │  (Tooltip help)
│                                     │
│ ┌─────────────────────────────────┐│
│ │ carnivore, honey, 1 coffee,    ││  (Text Input)
│ │ sleep 9h                       ││
│ └─────────────────────────────────┘│
│                                     │
│ TAGS (Optional):                    │
│ [#carnivore] [#honey] [#morning]   │  (Tag pills)
│ [+ Add Tag ▼]                       │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ [🟣 Save] [Cancel] [Preview]       │  (Action Buttons)
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 SCREEN 5: SESSION HISTORY

```
┌─────────────────────────────────────┐
│ ◄ History                           │
├─────────────────────────────────────┤
│                                     │
│ Filter: [Last 30 days ▼]           │  (Filters)
│ Device: [All ▼]                    │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 27.2.2026 | 06:00                  │  (Session Header)
│ Device: Fora 6                      │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🩸 Glucose    5.8 mmol/L   🟢   ││  (Quick view)
│ │ 💓 BP        100/69 mmHg   🟢   ││
│ │ ⚖️  Weight     73.0 kg      🟢   ││
│ │ 🔸 Ketones    0.1 mmol/L   🟡   ││
│ └─────────────────────────────────┘│
│ [View] [Edit] [Delete]             │  (Actions)
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 24.2.2026 | 06:00                  │
│ Device: Fora 6                      │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🩸 Glucose    4.9 mmol/L   🟢   ││
│ │ 💓 BP        100/69 mmHg   🟢   ││
│ │ ⚖️  Weight     72.9 kg      🟢   ││
│ └─────────────────────────────────┘│
│ [View] [Edit] [Delete]             │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 20.2.2026 | 06:00                  │
│ Device: Fora 6                      │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🩸 Glucose    5.8 mmol/L   🟢   ││
│ │ 💓 BP        114/73 mmHg   🟢   ││
│ │ ⚖️  Weight     73.05 kg     🟢   ││
│ └─────────────────────────────────┘│
│ [View] [Edit] [Delete]             │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ [◄ Previous] [1 2 3] [Next ►]      │  (Pagination)
│                                     │
└─────────────────────────────────────┘
```

---

## 📈 SCREEN 6: TRENDS / CHARTS

```
┌─────────────────────────────────────┐
│ ◄ Trends                            │
├─────────────────────────────────────┤
│                                     │
│ SELECT METRIC:                      │
│ [Glucose ▼] [BP ▼] [Weight ▼]      │  (Metric Tabs)
│ [UA ▼] [Ketones ▼]                 │
│                                     │
│ TIME RANGE:                         │
│ [Last 30 days ▼]                   │  (Time Filter)
│                                     │
│ ───────────────────────────────────│
│                                     │
│ Blood Glucose (Last 30 days)        │
│                                     │
│ 7.0 mmol/L ┤          📊 Chart    │
│            │    ╱╲    ╱╲           │  (Minimalist Chart)
│ 6.0 mmol/L ├───╱──╲──╱──╲─────    │
│            │  ╱    ╲╱    ╲        │
│ 5.0 mmol/L ├─╱──────────────       │  (With target band)
│            ├────────────────────   │
│ Target     │🟢🟢 ─ 5.2-6.2        │
│ ────────── ├────────────────────   │
│ 4.0 mmol/L │                       │
│            └────────────────────   │
│              1 7 14 21 28 Feb     │  (X-axis: dates)
│                                     │
│ STATS:                              │
│ Mean: 5.4 mmol/L                   │  (Summary stats)
│ Min: 4.3 | Max: 6.1                │
│ In Range: 85% (26/30 days)         │  (Green badge)
│                                     │
│ ───────────────────────────────────│
│                                     │
│ [Download CSV] [Share]             │  (Export actions)
│                                     │
└─────────────────────────────────────┘
```

---

## 📚 SCREEN 7: KNOWLEDGE BASE (Nutrition Tips)

```
┌─────────────────────────────────────┐
│ ◄ Knowledge Base                    │
├─────────────────────────────────────┤
│                                     │
│ 🔍 [_______________]               │  (Search)
│                                     │
│ QUICK TIPS (Top 3):                 │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 1. REDUCE HONEY                 ││
│ │    Impact: BG↓ Ketones↑ UA↓     ││  (Summary Card)
│ │    Timeline: 3–7 days           ││  (Aware-style card)
│ │    [Learn More →]               ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 2. INCREASE WATER (Fasting)     ││
│ │    Impact: UA↓ Energy↑          ││
│ │    Timeline: Immediate          ││
│ │    [Learn More →]               ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 3. MODERATE SARDINES            ││
│ │    Impact: UA↓ Kidney↓          ││
│ │    Timeline: 5–10 days          ││
│ │    [Learn More →]               ││
│ └─────────────────────────────────┘│
│                                     │
│ ALL TIPS (10):                      │
│ ───────────────────────────────────│
│                                     │
│ □ Reduce Honey                     │  (Checklist-style)
│ □ Moderate Sardine/Purine         │
│ □ Increase Water (Fasting)        │
│ □ Time Protein Intake             │
│ □ Limit Alcohol                   │
│ □ Optimize Carb Timing            │
│ □ Increase Salt                   │
│ □ Track Liver (ALT/GGT)           │
│ □ Magnesium Supplementation       │
│ □ Intermittent Fasting Windows    │
│                                     │
└─────────────────────────────────────┘
```

---

## 📖 SCREEN 8: TIP DETAIL (Example: Reduce Honey)

```
┌─────────────────────────────────────┐
│ ◄ TIP-1: Reduce Honey               │
├─────────────────────────────────────┤
│                                     │
│ Category: Glucose | Lipids         │
│ Difficulty: Easy ★☆☆              │  (Meta)
│ Timeline: 3–7 days                 │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 🎯 IMPACT ON YOUR PARAMETERS:       │
│                                     │
│ • BG (Glucose)           ↓ ✓       │  (Parameter list)
│ • Ketones                ↑ ✓       │
│ • Triglycerides (TG)     ↓ ✓       │
│ • Uric Acid (UA)         ↓ ✓       │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 📝 WHY IT WORKS:                    │
│                                     │
│ Honey is ~55% fructose. Even       │
│ though natural, it causes:         │  (Description)
│                                     │
│ • Immediate BG spike               │
│ • Ketone suppression               │
│ • UA spike (fructose metabolism)   │
│ • TG elevation (liver fat)         │
│                                     │
│ Your data (27.2.2026):             │  (Personal data)
│ Honey added → BG 5.8, Ketones 0.1  │
│ (borderline, trend up)             │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 💡 WHAT TO DO:                      │
│                                     │
│ 1. Remove honey for 2 weeks        │
│ 2. Measure: BG, Ketones (day 1,3,7)│
│ 3. Alternative: Monk fruit/Stevia  │
│                                     │
│ ⚠️  WARNING:                        │
│ • No withdrawal risk               │
│ • May miss psychological ritual    │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ 📖 REAL EXAMPLE:                    │
│ "Added 1 tbsp honey daily (2 weeks)│
│ BG: 5.2→5.8, Ketones: 0.5→0.1.   │
│ Stopped honey. BG back to 5.3 in   │
│ 5 days."                           │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ [Back] [Print] [Share with Doctor] │
│                                     │
└─────────────────────────────────────┘
```

---

## ⚙️ SCREEN 9: SETTINGS (Units + Thresholds)

```
┌─────────────────────────────────────┐
│ ◄ Settings                          │
├─────────────────────────────────────┤
│                                     │
│ UNIT PREFERENCES:                   │
│ ───────────────────────────────────│
│                                     │
│ Glucose Unit:                       │
│ 🔵 mmol/L     ○ mg/dL              │  (Radio buttons)
│ ? 1 mmol/L = 18 mg/dL              │
│                                     │
│ Cholesterin Unit:                   │
│ 🔵 mmol/L     ○ mg/dL              │
│ ? 1 mmol/L = 38.67 mg/dL           │
│                                     │
│ Uric Acid Unit:                     │
│ 🔵 µmol/L     ○ mg/dL              │
│ ? 1 µmol/L = 1/59.48 mg/dL         │
│                                     │
│ Weight Unit:                        │
│ 🔵 kg         ○ lbs                │
│ ? 1 kg = 2.205 lbs                 │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ PERSONAL THRESHOLDS (Ampel-Logik): │
│ ───────────────────────────────────│
│                                     │
│ Blood Glucose (mmol/L):             │
│                                     │
│ 🟢 GREEN (Normal):                  │
│    From: [5.2]  To: [6.2]           │
│                                     │
│ 🟡 YELLOW (Attention):              │
│    From: [4.8]  To: [6.7]           │
│                                     │
│ 🔴 RED (Warning):                   │
│    < [4.8]  or  > [6.7]             │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ Uric Acid (µmol/L):                 │
│                                     │
│ 🟢 GREEN (Normal):                  │
│    From: [280]  To: [360]           │
│                                     │
│ 🟡 YELLOW (Attention):              │
│    From: [360]  To: [450]           │
│                                     │
│ 🔴 RED (Warning):                   │
│    > [480]                          │
│                                     │
│ ───────────────────────────────────│
│                                     │
│ [Save Changes] [Reset to Defaults]  │
│                                     │
└─────────────────────────────────────┘
```

---

## 📱 RESPONSIVE BEHAVIOR

```
Desktop (1024px+):
- Side-by-side layouts
- Multi-column grids (3 cols)
- Full charts

Tablet (768px-1023px):
- 2-column layouts where needed
- Full cards
- Touch-optimized buttons (44px min height)

Mobile (0-767px):
- Single-column layouts
- Stacked cards
- Bottom navigation (5 tabs)
- Larger touch targets (44-48px)
- SafeArea padding for notch
```

---

## 🎯 COMPONENT VARIANTS

### StatusBadge
```
🟢 Normal / In Range
🟡 Attention / Warning / Slightly High/Low
🔴 Critical / Out of Range / Warning

Sizes: sm (12px), md (14px), lg (16px)
```

### MetricCard
```
Compact (Dashboard):
[Icon] [Value] [Unit] [Status]

Expanded (Detail):
[Icon]
[Title]
[Value] [Unit]
[Range Bar]
[Status Badge]
```

### CircularScore
```
8 / 11 In Range
With ring visualization (75% green, 25% orange)
Motivational text below
```

---

## ✅ APPROVAL CHECKLIST

```
[ ] Layout & Structure (Card-based, iOS-native)
[ ] Color scheme (Green/Orange/Gray/Purple)
[ ] Typography (Hierarchy clear)
[ ] Spacing (Whitespace balanced)
[ ] Components (Reusable, consistent)
[ ] Responsive (Mobile-first, tablet, desktop)
[ ] Data visualization (Charts, progress, status)
[ ] Navigation (Intuitive, easy to find)
[ ] Awareness-inspired (similar look & feel)
[ ] Unit display (Always shown, clear)
[ ] Status feedback (Real-time validation)
```

---

_Ready for Helmut's Feedback_

