# License Tier Rework v3 — REVIEW DRAFT

**Date:** 2026-03-15  
**Status:** DRAFT — for review and discussion  
**Previous:** v2 (2026-03-15), B-0097 spec (2026-03-14)

---

## Design Principles

1. **Consistent feature order** — every tier lists features in the same sequence for visual comparison
2. **Cascading visibility** — if a feature becomes unlimited in tier N, show "—" in tier N+1 and above (inherited). Features with increasing limits show in every tier until unlimited.
3. **Single AI pool** — one shared "AI Chats" quota per month. User decides how to spend it. Features enabled/disabled per tier, shared balance.
4. **Monthly reset, no rollover** — quotas reset on billing cycle date. Unused chats/imports do NOT accumulate.
5. **"Available from [Tier]"** — locked features show which tier unlocks them. Applied consistently across ALL tiers.
6. **AI features grouped** — visually indented as a block under the AI Chats pool line
7. **"Bald" / "Soon" tags** — only on features NOT yet implemented. Remove from implemented features.

---

## Terminology Changes (v3)

### Renames

| Old Term | New Term (DE) | New Term (EN) | Scope |
|---|---|---|---|
| Schwellenwerte | **Referenzbereich** | **Reference Ranges** | Pricing page, app settings tab, all references |
| Kohortenvergleich | **Benchmark** | **Benchmark** | Pricing page, all references. Concept: compare individual biomarker against average values of users with same Ernährungsprotokoll and/or Fastenprotokoll |

**App changes for "Referenzbereich":**
- Settings tab `?tab=thresholds` → rename tab label to "Referenzbereich" / "Reference Ranges"
- All references in app navigation, tooltips, headings
- Website pricing page feature label
- Search entire codebase for "Schwellenwert" / "threshold" in user-facing strings

**App changes for "Benchmark":**
- Replace all "Kohortenvergleich" / "Cohort comparison" user-facing strings
- Tooltip: "Vergleiche deine Biomarker mit dem Durchschnitt anderer Nutzer mit gleichem Ernährungs- und Fastenprotokoll" / "Compare your biomarkers with the average of other users with the same diet and fasting protocol"

---

## Einflussfaktoren — Medication & Supplement Rework

### Problem
"Medikamente" and "Nahrungsergänzungsmittel" (Supplements) are used inconsistently. They require the same tracking workflow. Users shouldn't need to classify what's what. Additionally, the current data model is flat — it stores individual ingredients but not the parent product (e.g., "Aspirin" → contains "Acetylsalicylsäure", "Triacetin").

### Solution: Umbrella Term "Einflussfaktoren" (Influence Factors)

**New taxonomy:**

```
Einflussfaktoren (Influence Factors)
├── Medikamente (Medications)
│   └── e.g. Aspirin 500mg
│       ├── Wirkstoff: Acetylsalicylsäure 500mg
│       └── Hilfsstoff: Triacetin
├── Nahrungsergänzungsmittel (Supplements)  
│   └── e.g. Omega-3 Fish Oil 1000mg
│       ├── Wirkstoff: EPA 360mg
│       └── Wirkstoff: DHA 240mg
└── Ernährung (Diet Protocols — already exists as Ernährungsprotokoll)
```

### Data Model Change (hierarchical)

```
PRODUCT (Einflussfaktor)
├── id, name, type (medication|supplement), brand, dosage_form, dose, frequency
└── INGREDIENTS (Wirkstoffe)
    ├── id, product_id, name, amount, unit, role (active|auxiliary)
    └── ...
```

- **Product level:** What the user takes (brand name, dose, frequency)
- **Ingredient level:** What's actually in it (Wirkstoffe — active ingredients + Hilfsstoffe — excipients)
- **License tier counting** is at the **product level** (e.g., "10 Einflussfaktoren" = 10 products, regardless of ingredient count)

### App UI Changes

| Location | Old | New |
|---|---|---|
| Settings tab label | Medikamente / Medications | **Einflussfaktoren** / **Influence Factors** |
| Tab URL param | `?tab=medications` | `?tab=influence-factors` (keep old as redirect) |
| Add button | + Medikament hinzufügen | **+ Einflussfaktor hinzufügen** |
| Add form: type selector | (none) | **Radio: Medikament / Nahrungsergänzungsmittel** |
| Edit headline | Medikament bearbeiten | **Wirkstoffe bearbeiten** / **Edit Ingredients** |
| List view | Flat list of ingredients | **Grouped by product**, expandable to show ingredients |
| Dr. Alex import | Scans → adds flat ingredients | Scans → creates **product + nested ingredients** |

### Impact on AI Features

- **"Supplement-Checks" (AI feature)** stays as-is in the tier table — it's about Dr. Alex evaluating whether your supplements help your markers
- **"Medikamenten-Import" → "Einflussfaktoren-Import"** — rename, covers both medication and supplement document scanning
- Dr. Alex needs to parse scanned documents into the **product → ingredients hierarchy** (not flat list)

---

## Calculated Markers

### Focus Tier — 3 Calculated Markers

| Calculated Marker | Formula | Required Biomarkers |
|---|---|---|
| **Dr. Boz Ratio (GKI)** | Glucose (mg/dL) ÷ Ketones (mmol/L) | Glucose, Ketones (βHB) |
| **BMI** | Weight (kg) ÷ Height (m)² | Weight, Height |
| **TG/HDL Ratio** | Triglycerides ÷ HDL-C | Triglycerides, HDL-C |

### Insight Tier — 8+ Calculated Markers

All Focus markers plus:

| Calculated Marker | Formula | Required Biomarkers |
|---|---|---|
| **ApoB/ApoA1 Ratio** | ApoB ÷ ApoA1 | ApoB, ApoA1 |
| **HOMA-IR** | (Glucose × Insulin) ÷ 405 | Fasting Glucose, Fasting Insulin |
| **Non-HDL Cholesterol** | Total Cholesterol − HDL-C | Total Cholesterol, HDL-C |
| **LDL/HDL Ratio** | LDL-C ÷ HDL-C | LDL-C, HDL-C |
| **eGFR (calculated)** | CKD-EPI formula | Creatinine, Age, Sex |

---

## Focus Tier — 20 Biomarkers (curated)

These 20 cover all 3 calculated marker inputs plus the most commonly tracked health markers:

| # | Biomarker | Zone | Why included |
|---|---|---|---|
| 1 | Glucose | Energy & Metabolic | GKI input, most tracked |
| 2 | Ketones (βHB) | Energy & Metabolic | GKI input |
| 3 | HbA1c | Energy & Metabolic | Long-term glucose |
| 4 | Weight | Nutrition & Vitamins | BMI input |
| 5 | BP Systolic | Heart & Circulation | Core vital |
| 6 | BP Diastolic | Heart & Circulation | Core vital |
| 7 | Heart Rate | Heart & Circulation | Core vital |
| 8 | Total Cholesterol | Heart & Circulation | Basic lipid |
| 9 | LDL-C | Heart & Circulation | Basic lipid |
| 10 | HDL-C | Heart & Circulation | TG/HDL input |
| 11 | Triglycerides | Heart & Circulation | TG/HDL input |
| 12 | Hemoglobin | Blood & Immune | Basic blood |
| 13 | Hematocrit | Blood & Immune | Basic blood |
| 14 | Uric Acid | Kidney & Electrolytes | Common tracker |
| 15 | Creatinine | Kidney & Electrolytes | Kidney function |
| 16 | eGFR | Kidney & Electrolytes | Kidney function |
| 17 | ALT (GPT) | Liver & Detox | Liver basic |
| 18 | AST (GOT) | Liver & Detox | Liver basic |
| 19 | hs-CRP | Blood & Immune | Inflammation |
| 20 | Ferritin | Blood & Immune | Iron status |

### Insight Tier — 50 Biomarkers
All 20 Focus biomarkers + 30 additional (ApoB, ApoA1, Insulin, Vitamin D, B12, Folate, TSH, fT3, fT4, Testosterone, Cortisol, GGT, Bilirubin, Albumin, Iron, Transferrin, Magnesium, Calcium, Sodium, Potassium, Phosphate, WBC, RBC, Platelets, MCV, MCH, MCHC, Lymphocytes, Neutrophils, Eosinophils).

### Clarity + Horizon — Unlimited
All biomarkers the platform supports.

---

## Complete Tier Comparison Table (v3)

**Legend:**
- ✅ = included (with value if limited)
- 🔒 = "Verfügbar ab [Tier]" / "Available from [Tier]"
- `Bald` = Coming Soon tag (not yet implemented)
- — = inherited from lower tier (already unlimited there)
- ↳ = indented, grouped under parent feature

| # | Feature (DE) | Feature (EN) | Glimpse (Free) | Focus (€9.99) | Insight (€24.99) | Clarity (€49.99) | Horizon (Custom) |
|---|---|---|---|---|---|---|---|
| | **GRUNDFUNKTIONEN** | **CORE** | | | | | |
| 1 | Biomarker | Biomarkers | ✅ 8 | ✅ 20 | ✅ 50 | ✅ Unbegrenzt | — |
| 2 | Verlauf | History | ✅ 30 Tage | ✅ 365 Tage | ✅ Unbegrenzt | — | — |
| 3 | Rechenwerte | Calculated Values | ✅ 1 | ✅ 3 | ✅ 8+ | ✅ Unbegrenzt | — |
| 4 | Messvorlagen | Measurement Templates | ✅ 1 | ✅ 3 | ✅ 5 | ✅ Unbegrenzt | — |
| 5 | Einflussfaktoren | Influence Factors | ✅ 2 | ✅ 10 | ✅ 25 | ✅ Unbegrenzt | — |
| 6 | Messungen | Measurements | ✅ 100 | ✅ 250 | ✅ 500 | ✅ Unbegrenzt | — |
| | | | | | | | |
| | **AI-FUNKTIONEN** | **AI FEATURES** | | | | | |
| 7 | AI-Chats (Pool) | AI Chats (Pool) | ✅ 2/Mo | ✅ 5/Mo | ✅ 30/Mo | ✅ Unbegrenzt | — |
| 8 | ↳ Dr. Alex Chat | ↳ Dr. Alex Chat | ✅ | ✅ | ✅ | ✅ | — |
| 9 | ↳ Trendanalysen | ↳ Trend Analysis | 🔒 ab Focus | ✅ (aus Pool) | ✅ (aus Pool) | ✅ (aus Pool) | — |
| 10 | ↳ Ernährungs-Tipps | ↳ Nutrition Advice | 🔒 ab Focus | ✅ (aus Pool) | ✅ (aus Pool) | ✅ (aus Pool) | — |
| 11 | ↳ Labor-Analysen | ↳ Lab Analysis | 🔒 ab Insight | 🔒 ab Insight | ✅ (aus Pool) | ✅ (aus Pool) | — |
| 12 | ↳ Supplement-Checks | ↳ Supplement Checks | 🔒 ab Clarity | 🔒 ab Clarity | 🔒 ab Clarity | ✅ (aus Pool) | — |
| | | | | | | | |
| | **ANALYSE & VERGLEICH** | **ANALYSIS & COMPARISON** | | | | | |
| 13 | Protokollvergleich | Protocol Comparison | 🔒 ab Insight | 🔒 ab Insight | ✅ `Bald` | ✅ `Bald` | ✅ `Bald` |
| 14 | Benchmark | Benchmark | 🔒 ab Clarity | 🔒 ab Clarity | 🔒 ab Clarity | ✅ `Bald` | ✅ `Bald` |
| | | | | | | | |
| | **TOOLS & SICHERHEIT** | **TOOLS & SECURITY** | | | | | |
| 15 | CSV/JSON-Export | CSV/JSON Export | 🔒 ab Focus | ✅ 5/Mo | ✅ 10/Mo | ✅ Unbegrenzt | — |
| 16 | Referenzbereich | Reference Ranges | 🔒 ab Focus | ✅ | ✅ | ✅ | — |
| 17 | Körperanalyse | Body Composition | 🔒 ab Focus | ✅ | ✅ | ✅ | — |
| 18 | 2FA-Sicherheit | 2FA Security | 🔒 ab Focus | ✅ | ✅ | ✅ | — |
| | | | | | | | |
| | **ADVANCED** | **ADVANCED** | | | | | |
| 19 | AI-Dashboard | AI Dashboard | 🔒 ab Insight | 🔒 ab Insight | ✅ `Bald` | — | — |
| 20 | PDF-Berichte | PDF Reports | 🔒 ab Insight | 🔒 ab Insight | ✅ 1/Mo | ✅ 2/Mo | ✅ Wöchentlich |
| 21 | Labor-Import | Lab Import | 🔒 ab Insight | 🔒 ab Insight | ✅ 3/Mo | ✅ 5/Mo | ✅ Unbegrenzt |
| 22 | Einflussfaktoren-Import | Influence Factor Import | 🔒 ab Insight | 🔒 ab Insight | ✅ 3/Mo | ✅ 10/Mo | ✅ Unbegrenzt |
| | | | | | | | |
| | **ENTERPRISE** | **ENTERPRISE** | | | | | |
| 23 | API-Zugang | API Access | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | ✅ `Bald` |
| 24 | Self-Hosting | Self-Hosted | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | ✅ `Bald` |
| 25 | Persönl. Onboarding | Personal Onboarding | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | ✅ `Bald` |
| 26 | Prioritäts-Support | Priority Support | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | 🔒 ab Horizon | ✅ `Bald` |
| 27 | Standard-Support | Standard Support | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## "Bald" / "Soon" Tag Assignments

### HAS "Bald" tag (NOT yet implemented)
| Feature | Reason |
|---|---|
| Protokollvergleich | Protocol comparison engine not built |
| Benchmark | Cohort/benchmark system not built |
| AI-Dashboard | Dashboard AI insights not built |
| API-Zugang | Public API not built |
| Self-Hosting | OSS deployment docs/tooling not built |
| Persönl. Onboarding | Service process not defined |
| Prioritäts-Support | Support SLA not defined |

### NO "Bald" tag (implemented or being implemented)
| Feature | Status |
|---|---|
| PDF-Berichte | Implemented |
| Labor-Import | Implemented |
| Einflussfaktoren-Import | Implemented (as Medikamenten-Import, rename needed) |
| All Glimpse/Focus features | Implemented |
| All AI Chat features | Implemented |
| CSV/JSON-Export | Implemented |
| Referenzbereich | Implemented (as Schwellenwerte, rename needed) |
| Körperanalyse | Implemented |
| 2FA-Sicherheit | Implemented |

---

## Display Rules

### Dash "—" Rule
When a feature becomes **unlimited** in tier N, show "—" in tier N+1 and above. Those tiers inherit it.

**Applied examples in this table:**
- Biomarker unlimited in Clarity → "—" in Horizon
- Verlauf unlimited in Insight → "—" in Clarity and Horizon
- AI-Dashboard `Bald` in Insight → "—" in Clarity (inherited, still Bald)
- All AI sub-features: once parent pool is unlimited in Clarity → "—" in Horizon

### AI Chat Block — Visual Grouping
```
✅ AI-Chats   5/Mo
   ↳ ✅ Dr. Alex Chat
   ↳ ✅ Trendanalysen        (aus Pool)
   ↳ ✅ Ernährungs-Tipps     (aus Pool)
   ↳ 🔒 Labor-Analysen       ab Insight
   ↳ 🔒 Supplement-Checks    ab Clarity
```

The "(aus Pool)" / "(from pool)" makes clear: no separate quota per feature.

**Glimpse special case:** Dr. Alex Chat is available (✅) even in Glimpse — it's the basic Q&A. The specialized features (Trends, Nutrition, Labs, Supplements) are the ones gated.

### "Available from" Display
- Gray/dimmed text + 🔒 lock icon
- Tooltip: "Verfügbar ab {Tier}" / "Available from {Tier}"
- Applied in ALL tiers where feature is locked (including Focus → "ab Insight")

### Feature Section Headers
The table has section headers (GRUNDFUNKTIONEN, AI-FUNKTIONEN, etc.) displayed as subtle dividers in the pricing grid. These are NOT features — just visual grouping. Style: uppercase, small font, muted color, no checkbox/lock.

### Monthly Reset Rule
All `/Mo` quotas reset on billing cycle date. **No rollover.**

Display in app:
```
"3 von 5 AI-Chats übrig — erneuert am 15. April"
"3 of 5 AI Chats remaining — resets April 15"
```

---

## Code Changes Required (Summary)

### Renames (search & replace in all user-facing strings)
| Find | Replace (DE) | Replace (EN) | Files |
|---|---|---|---|
| Schwellenwert* | Referenzbereich | Reference Range(s) | App, website, i18n JSON, settings tab |
| Kohortenvergleich | Benchmark | Benchmark | App, website, i18n JSON |
| Medikamente (tab) | Einflussfaktoren | Influence Factors | App settings tab, navigation |
| Medikament hinzufügen | Einflussfaktor hinzufügen | Add Influence Factor | App settings form |
| Medikament bearbeiten | Wirkstoffe bearbeiten | Edit Ingredients | App settings form |
| Medikamenten-Import | Einflussfaktoren-Import | Influence Factor Import | Pricing, tier config |
| `?tab=medications` | `?tab=influence-factors` | — | App URL, keep old as redirect |

### Data Model: Einflussfaktoren Hierarchy
New tables/columns needed:

```sql
-- Products table (new or renamed from medications)
CREATE TABLE influence_factors (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,          -- "Aspirin 500mg", "Omega-3 Fish Oil"
  type VARCHAR(50) NOT NULL,           -- 'medication' | 'supplement'
  brand VARCHAR(255),
  dosage_form VARCHAR(100),            -- tablet, capsule, liquid, etc.
  dose VARCHAR(100),                   -- "500mg", "1000mg"
  frequency VARCHAR(100),              -- "1x daily", "2x daily"
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Ingredients table (new)
CREATE TABLE influence_factor_ingredients (
  id UUID PRIMARY KEY,
  factor_id UUID NOT NULL REFERENCES influence_factors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,          -- "Acetylsalicylsäure", "EPA", "DHA"
  name_de VARCHAR(255),                -- German name
  amount VARCHAR(100),                 -- "500mg", "360mg"
  role VARCHAR(50) DEFAULT 'active',   -- 'active' (Wirkstoff) | 'auxiliary' (Hilfsstoff)
  created_at TIMESTAMPTZ
);
```

**Migration path:** Existing `medications` table rows become `influence_factors` with type='medication'. Existing individual ingredients become child rows in `influence_factor_ingredients`.

### License Tier Counting
- Row 5 "Einflussfaktoren": counts **products** (influence_factors table), NOT ingredients
- Row 22 "Einflussfaktoren-Import": counts **import operations per month** (Dr. Alex scans)

---

## Changes Summary: v2 → v3

| Change | v2 | v3 |
|---|---|---|
| Glimpse AI Chats | 1/Mo | 2/Mo |
| Focus Verlauf (History) | Unbegrenzt | 365 Tage |
| Insight Biomarkers | Unbegrenzt | 50 |
| CSV/JSON-Export | Unbegrenzt (Focus) | 5/Mo (Focus), 10/Mo (Insight) |
| Schwellenwerte | Schwellenwerte | **Referenzbereich** (renamed) |
| Kohortenvergleich | Kohortenvergleich | **Benchmark** (renamed + redefined) |
| Medikamente | Medikamente | **Einflussfaktoren** (umbrella: Meds + Supplements) |
| Data model | Flat ingredient list | **Product → Ingredients hierarchy** |
| Medikamenten-Import | /Mo count | Per-product count (3/Mo → 10/Mo) |
| Dr. Alex Chat | (implicit in AI pool) | Explicit row — available in ALL tiers |
| Protokollvergleich | No "Bald" | Added "Bald" (not yet implemented) |
| Section headers | None | Added: Grundfunktionen, AI, Analyse, Tools, Advanced, Enterprise |
| Standard-Support | Not listed | Added — available in all tiers |
| Feature EN names | Not listed | Added EN column for i18n reference |

---

## Open Questions for Review

1. **Focus 20 biomarkers** — right list? Swap any?
2. **Insight 50 biomarkers** — the 30 additional listed above correct?
3. **Insight calculated markers "8+"** — 5 additional listed above. Want more specific or keep "8+"?
4. **Einflussfaktoren-Import limits** — "3/Mo" for Insight means 3 scanned documents per month. Is that enough?
5. **CSV/JSON-Export now limited** — Focus 5/Mo, Insight 10/Mo. Was unlimited before. Acceptable?
6. **Dr. Alex Chat row** — shows ✅ for all tiers including Glimpse. Correct? (Basic Q&A always available, specialized features gated separately)
7. **Einflussfaktoren migration** — existing medication data: auto-migrate all as type='medication'? Or ask users to classify?
8. **"Wirkstoffe bearbeiten"** — is this the right label for editing a product's ingredients, or should it be "Einflussfaktor bearbeiten" (edit the product itself)?
9. **Benchmark definition** — compare with users on same diet/fasting protocol. Need minimum cohort size? Privacy threshold (e.g., min 50 users per protocol)?

---

## Claude Code Audit Task

**Action for Claude Code (next prompt):** After implementing, generate report at `/docs/specs/LICENSE_TIER_AUDIT_2026-03-15.md`:
- Current DB tier_limits values (all columns, all tiers)
- Current feature flags/gates in code (which features check which tier)
- Current usage tracking (what's counted, what resets, what rolls over)
- Diff: expected (this v3 spec) vs. actual (code/DB)
- List of all user-facing strings containing old terms (Schwellenwert, Kohortenvergleich, Medikamente as tab name)
- Any inconsistencies found
