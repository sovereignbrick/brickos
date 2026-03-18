# Wireframe Review Checklist
**Status:** Ready for Helmut Approval  
**Date:** 2026-03-01

---

## 🎯 REVIEW PROCESS

We have 9 low-fi wireframes documented in `WIREFRAMES_LOWFI.md`.

For each screen, review:
- ✅ Layout makes sense
- ✅ Components positioned logically
- ✅ Navigation clear
- ✅ Data flow intuitive
- ✅ Multi-language display (EN / DE toggle)
- ✅ Any changes needed before coding

---

## 📱 WIREFRAMES TO REVIEW

### **SCREEN 1: Login/Signup**
```
Simple form:
- Email input
- Password input
- [Sign In] / [Sign Up] buttons
- Link to toggle between modes
```
**Questions:**
- [ ] Logo placement good?
- [ ] Form fields clear?
- [ ] Button labels clear (DE: "Anmelden" / "Registrieren")?

---

### **SCREEN 2: Dashboard (Health Zones)**
```
Header: "Health Zones" + Profile icon
Last update: "27.2.2026 | 06:00"

8 Zone cards (collapsed):
- 🩸 BLOOD (11/11) 🟢 [Expand]
- 💪 STRUCTURAL (7/9) 🟡 [Expand]
- ... (8 total)

Footer: [+ Add Measurement]
Bottom nav: [History] [Tips] [Settings]
```
**Questions:**
- [ ] All 8 zones visible on first scroll?
- [ ] Zone score format clear (X/Y In Range)?
- [ ] Expand buttons obvious?
- [ ] Color coding (🟢🟡🔴) good?
- [ ] Bottom nav logical?
- [ ] Mobile responsive (stack vertically)?

---

### **SCREEN 3: Zone Detail (Expanded)**
```
Header: ◄ 🩸 BLOOD (11 markers)
Zone score: 9/11 In Range 🟢

List all 11 markers:
1. Blood Glucose    5.8 mmol/L 🟢 Normal
2. Hemoglobin       7.57 mmol/L 🟢
3. Hematocrit       36% 🟡 Low
... (8 more)

[View Trend] [Add Measurement] [Download Report]
```
**Questions:**
- [ ] All markers visible in one scroll (or paginated)?
- [ ] Status indicators (🟢🟡🔴) clear?
- [ ] Clicking marker → opens KB article?
- [ ] Trend link works?
- [ ] Bottom action buttons accessible?

---

### **SCREEN 4: New Measurement (Data Entry)**
```
Date: [27.2.2026 ▼] Time: [06:00 ▼]
Device: [Fora 6 ▼] Location: [Home ▼]

METABOLIC MARKERS:
Blood Glucose *: [5.8] [mmol/L ▼]
Status: 🟢 Normal (5.2-6.2)
? tooltip: "mmol/L = mg/dL: ×18"

[Repeat for more parameters]
[+ Add Parameter ▼]

JOURNAL ENTRY:
[textarea] "carnivore, honey, 1 coffee, sleep 9h"
? Help: "What did you eat / How do you feel?"

TAGS: [#carnivore] [#honey] [+ Add Tag]

[Save] [Cancel] [Preview]
```
**Questions:**
- [ ] Unit selector clear (dropdown)?
- [ ] Live validation works (shows status)?
- [ ] Tooltip triggers on "?" icon?
- [ ] Add parameter button obvious?
- [ ] Journal textarea big enough?
- [ ] Tag system intuitive?
- [ ] Save/Cancel buttons accessible?

---

### **SCREEN 5: Session History**
```
Filter: [Last 30 days ▼] Device: [All ▼]

27.2.2026 | 06:00 | Fora 6
🟢 Glucose: 5.8 mmol/L
🟢 BP: 100/69 mmHg
🟢 Weight: 73.0 kg
[View] [Edit] [Delete]

─────────────────

24.2.2026 | 06:00 | Fora 6
[...similar card...]

─────────────────

[◄ Previous] [1 2 3] [Next ►]
```
**Questions:**
- [ ] Session cards compact but readable?
- [ ] Filter options clear?
- [ ] Pagination obvious?
- [ ] Edit/Delete actions safe (confirmation needed)?
- [ ] Quick metrics shown (summary)?

---

### **SCREEN 6: Trends/Charts**
```
Metric: [Glucose ▼] [BP ▼] [Weight ▼]
Time: [Last 30 days ▼]

[Line chart visualization]

STATS:
Mean: 5.4 mmol/L
Min/Max: 4.3 / 6.1
In Range: 85% (26/30 days)

[Download CSV] [Share]
```
**Questions:**
- [ ] Chart readable on mobile?
- [ ] Metric selector clear?
- [ ] Time range filter obvious?
- [ ] Stats useful + visible?
- [ ] Export button accessible?

---

### **SCREEN 7: Knowledge Base (Browse)**
```
Search: [search box]

QUICK TIPS (Top 3):
1. REDUCE HONEY
   Impact: BG↓ Ketones↑ UA↓
   Timeline: 3–7 days
   [Learn More →]

2. INCREASE WATER (Fasting)
   [...]

3. MODERATE SARDINES
   [...]

ALL TIPS (10):
☐ Reduce Honey
☐ Moderate Sardines
☐ Increase Water
... (7 more)
```
**Questions:**
- [ ] Quick tips prominent?
- [ ] Learn More → opens full article?
- [ ] All tips list complete?
- [ ] Search works?
- [ ] Multi-language toggle visible?

---

### **SCREEN 8: KB Article (Full)**
```
◄ TIP-1: Reduce Honey

Category: Glucose | Lipids
Difficulty: Easy ★☆☆
Timeline: 3–7 days

───────────────

🎯 IMPACT ON YOUR PARAMETERS:
• BG (Glucose)         ↓ ✓
• Ketones              ↑ ✓
• Triglycerides (TG)   ↓ ✓
• Uric Acid (UA)       ↓ ✓

───────────────

📝 WHY IT WORKS:
Honey is ~55% fructose. Even though natural...
[Full explanation]

───────────────

💡 WHAT TO DO:
1. Remove honey for 2 weeks
2. Measure: BG, Ketones (day 1, 3, 7)
3. Alternative: Monk fruit/Stevia

───────────────

[Back] [Print] [Share with Doctor]
```
**Questions:**
- [ ] Article readable in single scroll?
- [ ] Sections organized logically?
- [ ] Links to other markers work?
- [ ] Print-friendly formatting?
- [ ] Share option useful?

---

### **SCREEN 9: Settings**
```
UNIT PREFERENCES:
Glucose Unit: ◉ mmol/L ○ mg/dL
? 1 mmol/L = 18 mg/dL

Cholesterin Unit: ◉ mmol/L ○ mg/dL
[... more units ...]

───────────────

PERSONAL THRESHOLDS (Ampel):

Blood Glucose (mmol/L):
🟢 GREEN:   [5.2] — [6.2]
🟡 YELLOW:  [4.8] — [6.7]
🔴 RED:     < [4.8] or > [6.7]

Uric Acid (µmol/L):
🟢 GREEN:   [280] — [360]
🟡 YELLOW:  [360] — [450]
🔴 RED:     > [480]

[... more markers ...]

───────────────

LANGUAGE: [English 🇬🇧] [Deutsch 🇩🇪]
TIMEZONE: [Europe/Berlin ▼]

[Save Changes] [Reset to Defaults]
```
**Questions:**
- [ ] Unit selector clear (radio buttons)?
- [ ] Threshold inputs editable?
- [ ] Color coding consistent with dashboard?
- [ ] Language toggle prominent?
- [ ] Save/Reset buttons obvious?

---

## 🗺️ NAVIGATION FLOW

Verify flow between screens:

```
Login → Dashboard
         ├─ Click Zone → Zone Detail
         │              └─ Click Marker → KB Article
         │
         ├─ Click [+ Add] → New Measurement
         │                  └─ Save → Dashboard
         │
         ├─ Click [History] → Session History
         │                    └─ Click [View] → Session Detail
         │
         ├─ Click [Tips] → Knowledge Base
         │                 └─ [Learn More] → KB Article
         │
         └─ Click [Settings] → Settings
                               └─ Save → Dashboard
```

**Questions:**
- [ ] All flows make sense?
- [ ] Back buttons present (where needed)?
- [ ] No dead ends?
- [ ] Mobile navigation (bottom tab bar) clear?

---

## 🌍 MULTI-LANGUAGE DISPLAY

Review how EN/DE toggle works:

**Example Screen (Dashboard):**

**English:**
```
⚡ ENERGY & METABOLIC POWER (6/7)
Zone Score: 9 / 11 In Range 🟢
Can I have sustained energy?
```

**German:**
```
⚡ ENERGIE & STOFFWECHSELKRAFT (6/7)
Zonenbewertung: 9 / 11 Im Bereich 🟢
Kann ich nachhaltig Energie haben?
```

**Questions:**
- [ ] German translations clear?
- [ ] Toggle button visible on every screen?
- [ ] Text length okay (no overflow)?
- [ ] Medical terms translated correctly?
- [ ] Button labels correct (DE: "Speichern" / "Abbrechen")?

---

## 📋 APPROVAL CHECKLIST

**Overall Design:**
- [ ] 9 screens cover all core features
- [ ] Navigation logical & intuitive
- [ ] Layout mobile-responsive
- [ ] Components reusable & consistent
- [ ] Color coding clear (🟢🟡🔴)
- [ ] Typography hierarchy good
- [ ] White space balanced

**Functionality:**
- [ ] Data entry straightforward
- [ ] KB accessible from multiple entry points
- [ ] Settings easy to find & modify
- [ ] History easy to review
- [ ] Trends/charts informative
- [ ] Search/filter functional

**UX Details:**
- [ ] Error states shown (invalid input)
- [ ] Confirmation dialogs for destructive actions (delete)
- [ ] Loading states clear (if async)
- [ ] Tooltips helpful (? icons)
- [ ] Accessibility (labels, contrast, keyboard nav)

**Multi-Language:**
- [ ] Toggle visible
- [ ] All text translated
- [ ] Right-to-left ready (future)

---

## 📝 CHANGE REQUEST FORMAT

If you want to change a screen, use this format:

```
**Screen: [Name]**
**Change:** [What to change]
**Why:** [Rationale]
**Impact on:** [Other screens affected, if any]

Example:
Screen: Dashboard
Change: Move [+ Add Measurement] to top-right (fixed header)
Why: Makes it more discoverable; users scroll down otherwise
Impact: Minimal — only layout shift
```

---

## ✅ APPROVAL SIGNATURES

- [ ] **Wireframes Approved** (Helmut)
- [ ] **Component Placement Approved** (Helmut)
- [ ] **Navigation Flow Approved** (Helmut)
- [ ] **Multi-Language Approved** (Helmut)

Once all ✅, we proceed to:
1. Backend API Specification
2. Claude Code Brief
3. Code Phase

---

_Ready for review. Mark changes below._

