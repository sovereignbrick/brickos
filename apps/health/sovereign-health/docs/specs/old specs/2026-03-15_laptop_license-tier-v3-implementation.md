# Claude Code Prompt — License Tier v3: Full Implementation

**Date:** 2026-03-15  
**Priority:** HIGH (RC blocker)  
**Scope:** Website (`saas/website`) + App (`core-frontend`) + Backend (`core-backend`)  
**Reference:** `docs/specs/license-tier-v3.md`

---

## Overview

Comprehensive license tier rework:
1. Rename features (Schwellenwerte → Referenzbereich, etc.)
2. Implement consistent tier limits across all surfaces
3. Redesign pricing page (short overview + collapsible full comparison)
4. Store ALL tier/feature/limit data in database tables (admin-editable later)
5. Single AI pool model
6. Einflussfaktoren data model (Product → Ingredients hierarchy)

---

## PART 1: Database — Tier & Feature Tables (do this FIRST)

All license tier data, features, and their limits MUST be stored in database tables. No hardcoded tier configs in frontend or backend code. This enables a future admin UI to edit tiers/features/limits without code changes.

### Table: `license_tiers`
```sql
CREATE TABLE IF NOT EXISTS license_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,       -- 'glimpse', 'focus', 'insight', 'clarity', 'horizon'
  name_en VARCHAR(100) NOT NULL,          -- 'Glimpse', 'Focus', ...
  name_de VARCHAR(100) NOT NULL,          -- 'Glimpse', 'Focus', ...
  price_monthly DECIMAL(10,2),            -- NULL for free/custom
  price_yearly DECIMAL(10,2),             -- NULL for free/custom
  sort_order INTEGER NOT NULL DEFAULT 0,  -- display order
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO license_tiers (slug, name_en, name_de, price_monthly, price_yearly, sort_order) VALUES
  ('glimpse', 'Glimpse', 'Glimpse', 0, 0, 1),
  ('focus', 'Focus', 'Focus', 9.99, 99.99, 2),
  ('insight', 'Insight', 'Insight', 24.99, 249.99, 3),
  ('clarity', 'Clarity', 'Clarity', 49.99, 499.99, 4),
  ('horizon', 'Horizon', 'Horizon', NULL, NULL, 5);
```

### Table: `feature_definitions`
```sql
CREATE TABLE IF NOT EXISTS feature_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,      -- 'biomarkers', 'history', 'ai_chats', 'trend_analysis', etc.
  name_en VARCHAR(255) NOT NULL,          -- 'Biomarkers'
  name_de VARCHAR(255) NOT NULL,          -- 'Biomarker'
  tooltip_en TEXT,                        -- tooltip/description EN
  tooltip_de TEXT,                        -- tooltip/description DE
  group_slug VARCHAR(50) NOT NULL,        -- 'data_tracking', 'ai_features', 'analysis', 'tools_security', 'advanced', 'enterprise'
  group_name_en VARCHAR(100) NOT NULL,    -- 'Data & Tracking'
  group_name_de VARCHAR(100) NOT NULL,    -- 'Daten & Tracking'
  is_ai_subfeature BOOLEAN DEFAULT false, -- true for trend_analysis, nutrition_advice, lab_analysis, supplement_checks, dr_alex_chat
  sort_order INTEGER NOT NULL DEFAULT 0,  -- display order within group
  status VARCHAR(20) DEFAULT 'active',    -- 'active', 'coming_soon', 'deprecated'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `tier_feature_limits`
```sql
CREATE TABLE IF NOT EXISTS tier_feature_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES license_tiers(id),
  feature_id UUID NOT NULL REFERENCES feature_definitions(id),
  is_included BOOLEAN NOT NULL DEFAULT false,    -- true = ✅, false = 🔒
  limit_value INTEGER,                           -- NULL = unlimited, number = capped
  limit_unit VARCHAR(50),                        -- 'total', 'per_month', 'days', NULL
  available_from_tier VARCHAR(50),               -- 'focus', 'insight', etc. (for 🔒 display)
  display_value_en VARCHAR(100),                 -- override display: 'Unlimited', '5/mo', '365 days'
  display_value_de VARCHAR(100),                 -- override display: 'Unbegrenzt', '5/Mo', '365 Tage'
  is_inherited BOOLEAN DEFAULT false,            -- true = show "—" (inherited from lower tier)
  UNIQUE(tier_id, feature_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Seed Data — Feature Definitions

Insert all features in correct order:

```sql
-- Group: data_tracking (Data & Tracking)
INSERT INTO feature_definitions (slug, name_en, name_de, tooltip_en, tooltip_de, group_slug, group_name_en, group_name_de, sort_order, status) VALUES
('biomarkers', 'Biomarkers', 'Biomarker', 'Track blood, body and lifestyle markers', 'Blut-, Körper- und Lifestyle-Marker verfolgen', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 1, 'active'),
('history', 'History', 'Verlauf', 'How far back you can see your data', 'Wie weit zurück du deine Daten sehen kannst', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 2, 'active'),
('calculated_markers', 'Calculated Markers', 'Errechnete Marker', 'Auto-calculated ratios like Dr. Boz, BMI, TG/HDL', 'Automatisch errechnete Werte wie Dr. Boz, BMI, TG/HDL', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 3, 'active'),
('measurement_templates', 'Measurement Templates', 'Messvorlagen', 'Save your routine measurement sets', 'Speichere deine Mess-Routinen', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 4, 'active'),
('influence_factors', 'Influence Factors', 'Einflussfaktoren', 'Track medications and supplements', 'Medikamente und Nahrungsergänzungsmittel verfolgen', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 5, 'active'),
('measurements', 'Measurements', 'Messungen', 'Total measurements you can store', 'Gesamtanzahl speicherbarer Messungen', 'data_tracking', 'Data & Tracking', 'Daten & Tracking', 6, 'active'),

-- Group: ai_features (AI Features)
('ai_chats', 'AI Chats (Pool)', 'AI-Chats (Pool)', 'Monthly AI conversation budget — use for any enabled feature', 'Monatliches AI-Gesprächsbudget — nutze es für jede freigeschaltete Funktion', 'ai_features', 'AI Features', 'AI-Funktionen', 10, 'active'),
('dr_alex_chat', 'Dr. Alex Chat', 'Dr. Alex Chat', 'General health Q&A with Dr. Alex', 'Allgemeine Gesundheitsfragen an Dr. Alex', 'ai_features', 'AI Features', 'AI-Funktionen', 11, 'active'),
('trend_analysis', 'Trend Analysis', 'Trendanalysen', 'AI-powered trend detection across your data', 'KI-gestützte Trenderkennung in deinen Daten', 'ai_features', 'AI Features', 'AI-Funktionen', 12, 'active'),
('nutrition_advice', 'Nutrition Advice', 'Ernährungs-Tipps', 'Personalized nutrition recommendations', 'Personalisierte Ernährungsempfehlungen', 'ai_features', 'AI Features', 'AI-Funktionen', 13, 'active'),
('lab_analysis', 'Lab Analysis', 'Labor-Analysen', 'Dr. Alex explains your lab results simply', 'Dr. Alex erklärt deine Laborwerte verständlich', 'ai_features', 'AI Features', 'AI-Funktionen', 14, 'active'),
('supplement_checks', 'Check Influence Factors', 'Check Einflussfaktoren', 'Evaluate if your medications and supplements help your markers', 'Prüft ob deine Medikamente und Supplemente deinen Markern helfen', 'ai_features', 'AI Features', 'AI-Funktionen', 15, 'active'),

-- Group: analysis (Analysis & Comparison)
('protocol_comparison', 'Protocol Comparison', 'Protokollvergleich', 'Compare different diet/training phases', 'Verschiedene Ernährungs-/Trainingsphasen vergleichen', 'analysis', 'Analysis & Comparison', 'Analyse & Vergleich', 20, 'coming_soon'),
('benchmark', 'Benchmark', 'Benchmark', 'Compare your biomarkers with users on the same diet and fasting protocol', 'Vergleiche deine Biomarker mit Nutzern mit gleichem Ernährungs- und Fastenprotokoll', 'analysis', 'Analysis & Comparison', 'Analyse & Vergleich', 21, 'coming_soon'),

-- Group: tools_security (Tools & Security)
('csv_export', 'CSV/JSON Export', 'CSV/JSON-Export', 'Download your data in open formats', 'Lade deine Daten in offenen Formaten herunter', 'tools_security', 'Tools & Security', 'Tools & Sicherheit', 30, 'active'),
('reference_ranges', 'Reference Ranges', 'Referenzbereich', 'Set personal reference ranges per marker', 'Persönliche Referenzbereiche pro Marker setzen', 'tools_security', 'Tools & Security', 'Tools & Sicherheit', 31, 'active'),
('body_composition', 'Body Composition', 'Körperanalyse', 'Track body fat, muscle mass, water', 'Körperfett, Muskelmasse, Wasser verfolgen', 'tools_security', 'Tools & Security', 'Tools & Sicherheit', 32, 'active'),
('two_factor_auth', '2FA Security', '2FA-Sicherheit', 'Two-factor authentication for your account', 'Zwei-Faktor-Authentifizierung für dein Konto', 'tools_security', 'Tools & Security', 'Tools & Sicherheit', 33, 'active'),

-- Group: advanced (Advanced)
('ai_dashboard', 'AI Dashboard', 'AI-Dashboard', 'AI-generated insights on your dashboard', 'KI-generierte Erkenntnisse auf dem Dashboard', 'advanced', 'Advanced', 'Erweitert', 40, 'coming_soon'),
('pdf_reports', 'PDF Reports', 'PDF-Berichte', 'Downloadable health summary reports', 'Herunterladbare Gesundheitsberichte', 'advanced', 'Advanced', 'Erweitert', 41, 'active'),
('lab_import', 'Lab Import', 'Labor-Import', 'Import lab results from PDF or photo', 'Laborergebnisse aus PDF oder Foto importieren', 'advanced', 'Advanced', 'Erweitert', 42, 'active'),
('influence_factor_import', 'Influence Factor Import', 'Einflussfaktoren-Import', 'Import medication and supplement lists', 'Medikamenten- und Supplement-Listen importieren', 'advanced', 'Advanced', 'Erweitert', 43, 'active'),

-- Group: enterprise (Enterprise)
('api_access', 'API Access', 'API-Zugang', 'Programmatic access to your data', 'Programmatischer Zugriff auf deine Daten', 'enterprise', 'Enterprise', 'Enterprise', 50, 'coming_soon'),
('self_hosting', 'Self-Hosted', 'Self-Hosting', 'Run Sovereign Health on your own server', 'Sovereign Health auf eigenem Server betreiben', 'enterprise', 'Enterprise', 'Enterprise', 51, 'coming_soon'),
('personal_onboarding', 'Personal Onboarding', 'Persönl. Onboarding', '1:1 setup session with our team', '1:1 Einrichtung mit unserem Team', 'enterprise', 'Enterprise', 'Enterprise', 52, 'coming_soon'),
('priority_support', 'Priority Support', 'Prioritäts-Support', 'Fast-track support response', 'Bevorzugte Support-Antwort', 'enterprise', 'Enterprise', 'Enterprise', 53, 'coming_soon'),
('standard_support', 'Standard Support', 'Standard-Support', 'Community and email support', 'Community- und E-Mail-Support', 'enterprise', 'Enterprise', 'Enterprise', 54, 'active');
```

### Seed Data — Tier Feature Limits

Insert limits for EVERY tier × feature combination. This is the single source of truth.

**Glimpse (Free):**
```sql
-- Use subqueries to reference tier_id and feature_id by slug
-- Example pattern (repeat for all features):
INSERT INTO tier_feature_limits (tier_id, feature_id, is_included, limit_value, limit_unit, available_from_tier, display_value_en, display_value_de)
SELECT t.id, f.id, true, 8, 'total', NULL, '8', '8'
FROM license_tiers t, feature_definitions f WHERE t.slug = 'glimpse' AND f.slug = 'biomarkers';
```

**Complete limit values (all tiers × all features):**

| feature_slug | glimpse | focus | insight | clarity | horizon |
|---|---|---|---|---|---|
| biomarkers | ✅ 8 | ✅ 20 | ✅ 50 | ✅ unlimited | — (inherited) |
| history | ✅ 30 days | ✅ 365 days | ✅ unlimited | — | — |
| calculated_markers | ✅ 1 | ✅ 3 | ✅ 8 | ✅ unlimited | — |
| measurement_templates | ✅ 1 | ✅ 3 | ✅ 5 | ✅ unlimited | — |
| influence_factors | ✅ 2 | ✅ 10 | ✅ 25 | ✅ unlimited | — |
| measurements | ✅ 100 | ✅ 250 | ✅ 500 | ✅ unlimited | — |
| ai_chats | ✅ 2/mo | ✅ 5/mo | ✅ 30/mo | ✅ unlimited | — |
| dr_alex_chat | ✅ | ✅ | ✅ | ✅ | — |
| trend_analysis | 🔒 focus | ✅ (pool) | ✅ (pool) | ✅ (pool) | — |
| nutrition_advice | 🔒 focus | ✅ (pool) | ✅ (pool) | ✅ (pool) | — |
| lab_analysis | 🔒 insight | 🔒 insight | ✅ (pool) | ✅ (pool) | — |
| supplement_checks | 🔒 clarity | 🔒 clarity | 🔒 clarity | ✅ (pool) | — |
| protocol_comparison | 🔒 insight | 🔒 insight | ✅ (soon) | ✅ (soon) | ✅ (soon) |
| benchmark | 🔒 clarity | 🔒 clarity | 🔒 clarity | ✅ (soon) | ✅ (soon) |
| csv_export | 🔒 focus | ✅ 5/mo | ✅ 10/mo | ✅ unlimited | — |
| reference_ranges | 🔒 focus | ✅ | ✅ | ✅ | — |
| body_composition | 🔒 focus | ✅ | ✅ | ✅ | — |
| two_factor_auth | 🔒 focus | ✅ | ✅ | ✅ | — |
| ai_dashboard | 🔒 insight | 🔒 insight | ✅ (soon) | — | — |
| pdf_reports | 🔒 insight | 🔒 insight | ✅ 1/mo | ✅ 2/mo | ✅ weekly |
| lab_import | 🔒 insight | 🔒 insight | ✅ 3/mo | ✅ 5/mo | ✅ unlimited |
| influence_factor_import | 🔒 insight | 🔒 insight | ✅ 3/mo | ✅ 10/mo | ✅ unlimited |
| api_access | 🔒 horizon | 🔒 horizon | 🔒 horizon | 🔒 horizon | ✅ (soon) |
| self_hosting | 🔒 horizon | 🔒 horizon | 🔒 horizon | 🔒 horizon | ✅ (soon) |
| personal_onboarding | 🔒 horizon | 🔒 horizon | 🔒 horizon | 🔒 horizon | ✅ (soon) |
| priority_support | 🔒 horizon | 🔒 horizon | 🔒 horizon | 🔒 horizon | ✅ (soon) |
| standard_support | ✅ | ✅ | ✅ | ✅ | ✅ |

Write the full SQL INSERT statements for all rows. Use subqueries referencing tier slug + feature slug. Set `is_inherited = true` for "—" entries. Set proper `display_value_en` / `display_value_de` for each cell.

### Backend API Endpoint

Create `GET /api/tiers/features` that returns the complete tier × feature matrix:

```json
{
  "tiers": [
    { "slug": "glimpse", "name": "Glimpse", "price_monthly": 0, ... },
    ...
  ],
  "groups": [
    {
      "slug": "data_tracking",
      "name": "Data & Tracking",
      "features": [
        {
          "slug": "biomarkers",
          "name": "Biomarkers",
          "tooltip": "Track blood, body and lifestyle markers",
          "status": "active",
          "is_ai_subfeature": false,
          "limits": {
            "glimpse": { "included": true, "value": "8", "inherited": false },
            "focus": { "included": true, "value": "20", "inherited": false },
            "insight": { "included": true, "value": "50", "inherited": false },
            "clarity": { "included": true, "value": "Unlimited", "inherited": false },
            "horizon": { "included": true, "value": null, "inherited": true }
          }
        },
        ...
      ]
    },
    ...
  ]
}
```

This endpoint is called by BOTH the website pricing page AND the app. Single source of truth.

**For the static website export:** Call this endpoint at build time (`getStaticProps` / build-time fetch) and bake the data into the page. When the admin changes tiers later, a website rebuild picks up the changes.

---

## PART 2: Renames (search & replace)

### Global rename rules (user-facing strings ONLY, not code identifiers)

| Find (DE) | Replace (DE) | Find (EN) | Replace (EN) |
|---|---|---|---|
| Schwellenwert / Schwellenwerte | Referenzbereich / Referenzbereiche | Threshold(s) | Reference Range(s) |
| Kohortenvergleich | Benchmark | Cohort comparison | Benchmark |
| Rechenwert / Rechenwerte | Errechnete Marker / Errechneter Marker | Calculated value(s) | Calculated Marker(s) |
| Supplement-Checks | Check Einflussfaktoren | Supplement Checks | Check Influence Factors |
| Medikamente (as tab/section name) | Einflussfaktoren | Medications (as tab/section name) | Influence Factors |
| Medikament hinzufügen | Einflussfaktor hinzufügen | Add medication | Add Influence Factor |
| Medikament bearbeiten | Wirkstoffe bearbeiten | Edit medication | Edit Ingredients |
| Medikamenten-Import | Einflussfaktoren-Import | Medication Import | Influence Factor Import |

### App Settings Tab
- `?tab=thresholds` → rename label to "Referenzbereich" / "Reference Ranges" (keep URL param, or update + redirect old)
- `?tab=medications` → rename label to "Einflussfaktoren" / "Influence Factors" (keep `?tab=medications` as redirect to `?tab=influence-factors`)

### Execution
```bash
# Find all instances to rename
cd ~/projects/sovereign-health
grep -rn --include="*.tsx" --include="*.ts" --include="*.json" --include="*.rs" \
  -i "Schwellenwert\|threshold\|Kohortenvergleich\|cohort.comparison\|Rechenwert\|calculated.value\|Supplement.Check\|Medikament" \
  core-frontend/src/ saas/website/src/ core-backend/src/ | grep -v node_modules | grep -v target
```

Update all i18n JSON files (DE + EN) with the new terms. Then update all component files that reference the old i18n keys.

---

## PART 3: Pricing Page Redesign (Website)

URL: `https://sovereignhealth.io/pricing/`

### Structure: Two Sections

**Section 1: Tier Overview Cards (top)**
The current short tier cards with price, key highlights, and subscribe/CTA button.
- These cards show 4-6 KEY features per tier as bullet points (not the full list)
- CTA: "Kostenlos starten" (Glimpse), "Jetzt starten" (Focus/Insight/Clarity), "Kontakt" (Horizon)
- This section is the quick-glance, drives conversion

**Key highlights per tier card (short list):**

| Glimpse | Focus | Insight | Clarity | Horizon |
|---|---|---|---|---|
| 8 Biomarker | 20 Biomarker | 50 Biomarker | Unbegrenzte Biomarker | Alles in Clarity |
| 30 Tage Verlauf | 365 Tage Verlauf | Unbegrenzter Verlauf | Unbegrenzte AI-Chats | API-Zugang `Bald` |
| 2 AI-Chats/Mo | 5 AI-Chats/Mo | 30 AI-Chats/Mo | Unbegrenzter Export | Self-Hosting `Bald` |
| 100 Messungen | 250 Messungen | 500 Messungen | Unbegrenzte Messungen | Persönl. Onboarding `Bald` |
| Dr. Alex Chat | Trendanalysen | Labor-Analysen | Check Einflussfaktoren | Prioritäts-Support `Bald` |
| Standard-Support | CSV/JSON-Export | PDF-Berichte | Benchmark `Bald` | |

**Section 2: Full Feature Comparison (below)**

Collapsible group-based comparison table. Data fetched from `GET /api/tiers/features` (at build time for static export).

### Full Comparison Table — Display Rules

1. **Groups are collapsible accordion sections** (click group header to expand/collapse)
2. **Default state on page load:**
   - **"Data & Tracking" (Daten & Tracking)** → **OPEN** (expanded)
   - All other groups → **COLLAPSED** (closed)
3. **Do NOT show "Core" as a group header** — the first visible group is "Data & Tracking"
4. **Each row shows:** feature name + ⓘ tooltip icon + value per tier column
5. **AI sub-features** (trend_analysis, nutrition_advice, lab_analysis, supplement_checks, dr_alex_chat) are **indented** under ai_chats with a left border or indent styling
6. **"—" cells** (inherited): show em-dash in muted gray
7. **🔒 cells**: show lock icon + "ab {Tier}" text in muted color
8. **"Bald" badge**: small pill next to the value
9. **Sticky tier header row**: tier names + prices stay visible while scrolling the comparison table

### Sync Rule
The tier overview cards (Section 1) and the full comparison table (Section 2) MUST both read from the same data source (`tier_feature_limits` table via API). No hardcoded values in either section. If the database changes, both sections update on next build.

### Collapsible Group Component

```tsx
interface FeatureGroupProps {
  slug: string;
  name: string;        // localized
  features: Feature[];
  defaultOpen: boolean; // true only for 'data_tracking'
}

function FeatureGroup({ slug, name, features, defaultOpen }: FeatureGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 text-sm font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200"
      >
        {name}
        <ChevronIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-2">
          {features.map(feature => (
            <FeatureRow key={feature.slug} feature={feature} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## PART 4: Einflussfaktoren Data Model

### New Database Tables

```sql
-- Products table (replaces or extends medications)
CREATE TABLE IF NOT EXISTS influence_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('medication', 'supplement')),
  brand VARCHAR(255),
  dosage_form VARCHAR(100),
  dose VARCHAR(100),
  frequency VARCHAR(100),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS influence_factor_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_id UUID NOT NULL REFERENCES influence_factors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_de VARCHAR(255),
  amount VARCHAR(100),
  role VARCHAR(50) DEFAULT 'active' CHECK (role IN ('active', 'auxiliary')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_influence_factors_user ON influence_factors(user_id);
CREATE INDEX idx_influence_factor_ingredients_factor ON influence_factor_ingredients(factor_id);
```

### Migration from existing medications table

```sql
-- Migrate existing medication rows → influence_factors
INSERT INTO influence_factors (id, user_id, name, type, brand, dosage_form, dose, frequency, notes, active, created_at, updated_at)
SELECT id, user_id, name, 'medication', brand, dosage_form, dose, frequency, notes, active, created_at, updated_at
FROM medications;

-- If medications had ingredient columns, migrate those to influence_factor_ingredients
-- Adjust based on actual current schema
```

### Backend API Changes

- `GET /user/influence-factors` — list products with nested ingredients
- `POST /user/influence-factors` — create product (with optional ingredients array)
- `PUT /user/influence-factors/:id` — update product
- `DELETE /user/influence-factors/:id` — delete product (cascades to ingredients)
- `POST /user/influence-factors/:id/ingredients` — add ingredient to product
- `PUT /user/influence-factors/:id/ingredients/:ing_id` — update ingredient
- `DELETE /user/influence-factors/:id/ingredients/:ing_id` — delete ingredient

Keep old `/user/medications` endpoints as redirects/aliases for backward compatibility.

### App Settings Tab UI

The `?tab=influence-factors` page shows:

```
Einflussfaktoren

[+ Einflussfaktor hinzufügen]

┌─────────────────────────────────────────────┐
│ 💊 Aspirin 500mg               [Bearbeiten] │
│    Medikament · 1x täglich                   │
│    ├── Acetylsalicylsäure 500mg (Wirkstoff)  │
│    └── Triacetin (Hilfsstoff)                │
├─────────────────────────────────────────────┤
│ 🟢 Omega-3 Fish Oil 1000mg    [Bearbeiten] │
│    Nahrungsergänzungsmittel · 2x täglich     │
│    ├── EPA 360mg (Wirkstoff)                 │
│    └── DHA 240mg (Wirkstoff)                 │
└─────────────────────────────────────────────┘
```

- Products grouped by type (Medikamente / Nahrungsergänzungsmittel)
- Each product expandable to show ingredients
- "Bearbeiten" / "Edit" → opens form titled "Wirkstoffe bearbeiten" / "Edit Ingredients"
- Type selector: radio toggle Medikament / Nahrungsergänzungsmittel when adding new
- Tier limit enforced: if user has 10 products and tier allows 10, disable add button + show upgrade CTA

### License Tier Counting Rule
- Row 5 "Einflussfaktoren" limit counts **products** (rows in influence_factors table), NOT ingredients
- Row 22 "Einflussfaktoren-Import" limit counts **import operations per month** (Dr. Alex scans)

---

## PART 5: AI Pool Implementation

### Single Pool Logic

The `ai_chats` limit is the TOTAL monthly budget. Individual AI features (trend_analysis, nutrition_advice, lab_analysis, supplement_checks, dr_alex_chat) are **enabled/disabled** per tier but do NOT have separate quotas.

### Usage Tracking Table

```sql
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  feature_slug VARCHAR(100) NOT NULL,  -- 'dr_alex_chat', 'trend_analysis', etc.
  billing_period_start DATE NOT NULL,   -- start of current billing month
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_period ON ai_usage(user_id, billing_period_start);
```

### Backend Logic

```rust
// Check if user can use an AI feature:
// 1. Is the feature enabled for their tier? (tier_feature_limits.is_included = true)
// 2. Is the total AI pool used < limit? (count ai_usage rows for current billing period)

fn can_use_ai_feature(user: &User, feature_slug: &str) -> Result<bool> {
    // Check feature enabled
    let feature_limit = get_tier_feature_limit(user.tier, feature_slug)?;
    if !feature_limit.is_included {
        return Ok(false); // Feature locked for this tier
    }
    
    // Check pool quota
    let pool_limit = get_tier_feature_limit(user.tier, "ai_chats")?;
    if pool_limit.limit_value.is_none() {
        return Ok(true); // Unlimited
    }
    
    let used = count_ai_usage(user.id, current_billing_period())?;
    Ok(used < pool_limit.limit_value.unwrap())
}
```

### Monthly Reset
- `billing_period_start` is the user's subscription start day of month
- Count usage WHERE `billing_period_start = current_period_start`
- No rollover — new period starts fresh
- Display: "3 von 5 AI-Chats übrig — erneuert am 15. April" / "3 of 5 AI Chats remaining — resets April 15"

---

## PART 6: App Usage Dashboard Widget

On the main dashboard, show compact usage summary:

```
┌─────────────────────────────────┐
│  📊 Dein Verbrauch              │
│                                 │
│  Messungen    ████████░░  42/100│
│  AI-Chats     ██░░░░░░░░   1/5 │
│  Export       ░░░░░░░░░░   0/5 │
│                                 │
│  Erneuert am 15. April          │
│  [Upgrade →]                    │
└─────────────────────────────────┘
```

- Only show features with numeric caps (skip unlimited)
- Progress bar colors: green <60%, yellow 60-80%, red >80%
- At 80%: yellow warning
- At 100%: red bar + upgrade CTA
- Renewal date shown at bottom
- Widget hidden entirely for tiers with all-unlimited features

---

## PART 7: Verify & Test

### Audit Step (REQUIRED before deploy)

After implementing everything, Claude Code MUST generate a report file at:
`/docs/specs/LICENSE_TIER_AUDIT_2026-03-15.md`

Contents:
1. Current `license_tiers` table dump (all rows)
2. Current `feature_definitions` table dump (all rows, sorted by group + sort_order)
3. Current `tier_feature_limits` table dump (pivoted: feature × tier matrix)
4. List of all user-facing strings that still contain old terms (Schwellenwert, Kohortenvergleich, Rechenwert, Medikamente as tab name)
5. Diff: expected (this spec) vs. actual (DB data)
6. Any inconsistencies found between pricing page display and DB values

### Test Integration

Check existing test files first (Step 0 from B-0092 prompt). Extend or create tests:

- [ ] Pricing page: overview cards match full comparison table (no value mismatch)
- [ ] Pricing page: "Data & Tracking" group expanded by default, others collapsed
- [ ] Pricing page: click group header toggles expand/collapse
- [ ] Pricing page: all renamed terms appear correctly (DE + EN)
- [ ] Pricing page: no "Core" group header visible
- [ ] Pricing page: ⓘ tooltips show on hover/tap
- [ ] Pricing page: 🔒 shows "ab {Tier}" text
- [ ] Pricing page: "Bald" badge on correct features only
- [ ] App settings: "Referenzbereich" tab label (not "Schwellenwerte")
- [ ] App settings: "Einflussfaktoren" tab label (not "Medikamente")
- [ ] App: add influence factor form works (type selector, ingredients)
- [ ] App: usage widget shows correct counts and limits
- [ ] Backend: `GET /api/tiers/features` returns correct data
- [ ] Backend: AI pool enforcement (2nd chat in Glimpse blocked after 2 used)
- [ ] Backend: measurement cap enforcement (101st measurement blocked for Glimpse)
- [ ] `check-i18n.sh` passes clean
- [ ] `check-terminology.sh` passes clean (if created earlier)

### Build & Deploy

```bash
# Backend
cd ~/projects/sovereign-health/core-backend
cargo test
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"

# Frontend (app)
cd ~/projects/sovereign-health/core-frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io -t registry.gitlab.com/sovereign-health/core-frontend:latest .
docker save registry.gitlab.com/sovereign-health/core-frontend:latest | ssh root@72.61.154.115 "docker load"

# Website
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/

# Deploy containers
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend && docker image prune -f"
```

Purge Cloudflare cache after deploy.
