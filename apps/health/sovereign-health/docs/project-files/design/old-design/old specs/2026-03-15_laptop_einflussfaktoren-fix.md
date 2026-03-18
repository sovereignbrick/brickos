# Claude Code Prompt — Einflussfaktoren: Fix Hierarchy + UI

**Date:** 2026-03-15  
**Priority:** HIGH  
**Scope:** App (`core-frontend`) + Backend (`core-backend`)

---

## Problem

The Einflussfaktoren (Influence Factors) tab was partially implemented but is missing the key design: **Product → Ingredients hierarchy**. Current state:

### What's WRONG now:
1. **Button says "+ Medikament hinzufügen"** — should say "+ Einflussfaktor hinzufügen"
2. **Form title says "Neues Medikament hinzufügen"** — should say "Neuen Einflussfaktor hinzufügen"
3. **Only ONE "Wirkstoffname" field** — flat, single ingredient. Should support MULTIPLE ingredients (Wirkstoffe + Hilfsstoffe)
4. **List shows everything as "Medikament" badge** — but Vitamin D3, Vitamin K2, multibionta are supplements, not medications
5. **Dr. Alex import info text still says "Medikamente"** — should say "Einflussfaktoren"
6. **"Grenzwerte" tab** — should be "Referenzbereich" (was this rename done?)
7. **No grouping** — list should be grouped by type (Medikamente section / Nahrungsergänzungsmittel section)
8. **Submit button says "Medikament hinzufügen"** — should adapt based on selected type

### What the hierarchy should look like:

```
Einflussfaktoren (Influence Factors)
├── Medikamente (Medications)
│   └── Aspirin 500mg                    ← PRODUCT (name = "Aspirin", dose = "500mg")
│       ├── Wirkstoff: Acetylsalicylsäure 500mg    ← INGREDIENT (role = active)
│       └── Hilfsstoff: Triacetin                    ← INGREDIENT (role = auxiliary)
│
├── Nahrungsergänzungsmittel (Supplements)
│   └── Supradyn                          ← PRODUCT (name = "Supradyn")
│       ├── Wirkstoff: Vitamin A 800µg    ← INGREDIENT (role = active)
│       ├── Wirkstoff: Vitamin B1 1.4mg   ← INGREDIENT (role = active)
│       ├── Wirkstoff: Vitamin B6 2mg     ← INGREDIENT (role = active)
│       └── Wirkstoff: Zink 10mg          ← INGREDIENT (role = active)
│
│   └── Omega-3 Fish Oil 1000mg           ← PRODUCT
│       ├── Wirkstoff: EPA 360mg          ← INGREDIENT
│       └── Wirkstoff: DHA 240mg          ← INGREDIENT
```

**Key insight:** The PRODUCT is "Supradyn" or "Aspirin" — that's what the user takes. The INGREDIENTS (Wirkstoffe) are what's inside. Currently the form mixes these up (e.g., "Vitamin D3" is listed as a product but it's actually an ingredient of a supplement).

---

## PART 1: Database Check & Fix

### Check current schema
```bash
cd ~/projects/sovereign-health/core-backend
grep -rn "influence_factor\|medication" migrations/ src/models/ --include="*.rs" --include="*.sql"
```

### Required tables (from license-tier-v3 spec)

**Table: `influence_factors`** (products — what the user takes)
```sql
CREATE TABLE IF NOT EXISTS influence_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,              -- "Aspirin", "Supradyn", "Omega-3 Fish Oil"
  type VARCHAR(50) NOT NULL CHECK (type IN ('medication', 'supplement')),
  brand VARCHAR(255),                      -- "Bayer", "Nature Made"
  dosage_form VARCHAR(100),                -- tablet, capsule, liquid, drops, etc.
  dose VARCHAR(100),                       -- "500mg", "1000mg", "2 tablets"
  frequency VARCHAR(100),                  -- "1x daily", "every 20 days"
  start_date DATE,
  prescribing_doctor VARCHAR(255),         -- only for medications
  reason VARCHAR(255),                     -- "Blutzuckerkontrolle", "Gelenkgesundheit"
  notes TEXT,
  source VARCHAR(50) DEFAULT 'manual',     -- 'manual', 'ai_import'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_influence_factors_user ON influence_factors(user_id);
CREATE INDEX idx_influence_factors_type ON influence_factors(user_id, type);
```

**Table: `influence_factor_ingredients`** (what's inside the product)
```sql
CREATE TABLE IF NOT EXISTS influence_factor_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_id UUID NOT NULL REFERENCES influence_factors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,              -- "Acetylsalicylsäure", "EPA", "Vitamin A"
  name_de VARCHAR(255),                    -- German name if different
  amount VARCHAR(100),                     -- "500mg", "360mg", "800µg"
  role VARCHAR(50) DEFAULT 'active' CHECK (role IN ('active', 'auxiliary')),
                                           -- 'active' = Wirkstoff, 'auxiliary' = Hilfsstoff
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_influence_factor_ingredients_factor ON influence_factor_ingredients(factor_id);
```

### Migration from current data

The existing entries (Vitamin D3, Vitamin K2, multibionta) need to be migrated:

```sql
-- Example: "multibionta (Vitamin A)" currently stored as flat medication
-- Should become: Product "multibionta" type=supplement + Ingredient "Vitamin A"

-- Check current structure first:
SELECT * FROM medications;  -- or influence_factors if already renamed
```

If the current table is still `medications` with flat structure:
1. Create the new tables above
2. Migrate existing rows as products
3. Move any ingredient info from the old `wirkstoff` column into `influence_factor_ingredients`
4. Drop or archive the old table

---

## PART 2: Backend API

### Endpoints needed

```
GET    /user/influence-factors              → list all (grouped by type, with nested ingredients)
POST   /user/influence-factors              → create product + ingredients in one call
PUT    /user/influence-factors/:id          → update product fields
DELETE /user/influence-factors/:id          → archive (soft delete) or hard delete

POST   /user/influence-factors/:id/ingredients      → add ingredient
PUT    /user/influence-factors/:id/ingredients/:iid  → update ingredient
DELETE /user/influence-factors/:id/ingredients/:iid  → delete ingredient
```

### GET response format
```json
{
  "medications": [
    {
      "id": "uuid",
      "name": "Aspirin",
      "type": "medication",
      "brand": "Bayer",
      "dose": "500mg",
      "frequency": "1x daily",
      "dosage_form": "tablet",
      "start_date": "2026-01-15",
      "prescribing_doctor": "Dr. Müller",
      "reason": "Blutzuckerkontrolle",
      "source": "manual",
      "active": true,
      "ingredients": [
        { "id": "uuid", "name": "Acetylsalicylsäure", "amount": "500mg", "role": "active" },
        { "id": "uuid", "name": "Triacetin", "amount": null, "role": "auxiliary" }
      ]
    }
  ],
  "supplements": [
    {
      "id": "uuid",
      "name": "Supradyn",
      "type": "supplement",
      "dose": "1 tablet",
      "frequency": "1x daily",
      "source": "ai_import",
      "active": true,
      "ingredients": [
        { "id": "uuid", "name": "Vitamin A", "amount": "800µg", "role": "active" },
        { "id": "uuid", "name": "Vitamin B1", "amount": "1.4mg", "role": "active" },
        { "id": "uuid", "name": "Zink", "amount": "10mg", "role": "active" }
      ]
    }
  ]
}
```

### POST body (create product with ingredients)
```json
{
  "name": "Supradyn",
  "type": "supplement",
  "dose": "1 tablet",
  "frequency": "1x daily",
  "dosage_form": "tablet",
  "ingredients": [
    { "name": "Vitamin A", "amount": "800µg", "role": "active" },
    { "name": "Vitamin B1", "amount": "1.4mg", "role": "active" }
  ]
}
```

---

## PART 3: Frontend — Einflussfaktoren Tab Redesign

### Overview Page (list view)

```
Einflussfaktoren
Verfolge deine aktuellen und vergangenen Einflussfaktoren

                                    [+ Einflussfaktor hinzufügen]

ⓘ Sie können Dr. Alex bitten, Einflussfaktoren von einem Foto
  Ihres Rezepts oder Ihrer Supplement-Packung zu importieren.

💊 Medikamente (2)
┌──────────────────────────────────────────────────────────┐
│ Aspirin 500mg                    Bearbeiten  Archivieren │
│ 💊 Medikament · Bayer · 1x täglich · Dr. Müller         │
│ ├── Acetylsalicylsäure 500mg (Wirkstoff)                │
│ └── Triacetin (Hilfsstoff)                               │
├──────────────────────────────────────────────────────────┤
│ Metformin 850mg                  Bearbeiten  Archivieren │
│ 💊 Medikament · 2x täglich · Dr. Müller                 │
│ └── Metforminhydrochlorid 850mg (Wirkstoff)              │
└──────────────────────────────────────────────────────────┘

🟢 Nahrungsergänzungsmittel (3)
┌──────────────────────────────────────────────────────────┐
│ Supradyn                         Bearbeiten  Archivieren │
│ 🟢 Supplement · 1x täglich                              │
│ ├── Vitamin A 800µg (Wirkstoff)                          │
│ ├── Vitamin B1 1.4mg (Wirkstoff)                         │
│ └── Zink 10mg (Wirkstoff)                                │
├──────────────────────────────────────────────────────────┤
│ Omega-3 Fish Oil 1000mg          Bearbeiten  Archivieren │
│ 🟢 Supplement · 2x täglich                              │
│ ├── EPA 360mg (Wirkstoff)                                │
│ └── DHA 240mg (Wirkstoff)                                │
├──────────────────────────────────────────────────────────┤
│ Vitamin D3                       Bearbeiten  Archivieren │
│ 🟢 Supplement · KI-Import · every 20 days               │
│ └── Cholecalciferol 500µg (Wirkstoff)                    │
└──────────────────────────────────────────────────────────┘
```

**Key changes:**
- Grouped by type: 💊 Medikamente / 🟢 Nahrungsergänzungsmittel
- Each product shows its ingredients (expandable/collapsible, expanded by default)
- Ingredients show role label: (Wirkstoff) or (Hilfsstoff)
- Source badge: "Manuell" or "KI-Import"
- Button: **"+ Einflussfaktor hinzufügen"** (NOT "+ Medikament hinzufügen")
- Info text: "Einflussfaktoren" not "Medikamente"

### Add/Edit Form

```
Neuen Einflussfaktor hinzufügen

Typ
  [💊 Medikament]  [🟢 Nahrungsergänzungsmittel]     ← toggle, affects labels below

Produktname *                        Marke
[z.B. Aspirin / Supradyn]           [z.B. Bayer]

Dosierung                            Häufigkeit
[z.B. 500mg / 1 Tablette]          [Häufigkeit wählen ▾]

Form                                 Startdatum
[Form wählen ▾]                     [tt.mm.jjjj]

Verschreibender Arzt                 Grund
[z.B. Dr. Müller]                   [z.B. Blutzuckerkontrolle]
  ↑ only shown when type=medication    

Notizen
[Zusätzliche Notizen...]

── Wirkstoffe & Hilfsstoffe ──────────────────────────

  Wirkstoff 1:
  Name *                  Menge              Rolle
  [z.B. Acetylsalicylsäure] [z.B. 500mg]   [Wirkstoff ▾]

  Wirkstoff 2:
  Name *                  Menge              Rolle
  [z.B. Triacetin]        []                 [Hilfsstoff ▾]

  [+ Weiteren Wirkstoff hinzufügen]

──────────────────────────────────────────────────────

[Einflussfaktor hinzufügen]    Abbrechen
```

**Key form changes:**

1. **Title adapts to type:**
   - Medikament selected → "Neues Medikament hinzufügen" / "Medikament bearbeiten"
   - Supplement selected → "Neues Nahrungsergänzungsmittel hinzufügen" / "Nahrungsergänzungsmittel bearbeiten"
   - Or keep neutral: "Neuen Einflussfaktor hinzufügen" / "Einflussfaktor bearbeiten"

2. **Type toggle** at the top (💊 / 🟢) — determines:
   - Badge color in list
   - Whether "Verschreibender Arzt" field is shown (only for medications)
   - Placeholder text adapts (medication vs supplement examples)

3. **"Wirkstoffname" field REPLACED** by a dynamic ingredients section:
   - Multiple rows, each with: Name + Amount + Role dropdown (Wirkstoff/Hilfsstoff)
   - "+" button to add more rows
   - "×" button to remove a row (min 0 ingredients)
   - Ingredients are optional — a product can have 0 listed ingredients

4. **Role dropdown options:**
   - Wirkstoff (Active ingredient)
   - Hilfsstoff (Auxiliary/excipient)

5. **Submit button text adapts:**
   - Type = medication → "Medikament hinzufügen" / "Medikament speichern"
   - Type = supplement → "Supplement hinzufügen" / "Supplement speichern"

6. **"Verschreibender Arzt" + "Grund"** — show for medications, hide for supplements (supplements don't have a prescribing doctor)

7. **Date format** — should be dd.mm.yyyy (German format), not mm/dd/yyyy as shown currently

### Edit Mode ("Bearbeiten")

When clicking "Bearbeiten" on a product:
- Same form as add, pre-filled with product data
- Ingredients section shows existing ingredients (editable)
- Can add/remove ingredients
- Title: "Einflussfaktor bearbeiten" (or type-specific: "Medikament bearbeiten" / "Supplement bearbeiten")
- Save sends PUT to `/user/influence-factors/:id` with full product + ingredients array

---

## PART 4: Additional Renames on This Page

| Current text | New text (DE) | New text (EN) |
|---|---|---|
| + Medikament hinzufügen (button) | + Einflussfaktor hinzufügen | + Add Influence Factor |
| Neues Medikament hinzufügen (form title) | Neuen Einflussfaktor hinzufügen | Add New Influence Factor |
| Medikament hinzufügen (submit button) | [Type-adaptive] or Einflussfaktor hinzufügen | [Type-adaptive] or Add Influence Factor |
| "Medikamente von einem Foto Ihres Rezepts" (info text) | "Einflussfaktoren von einem Foto Ihres Rezepts oder Ihrer Supplement-Packung" | "influence factors from a photo of your prescription or supplement packaging" |
| Wirkstoffname (single field) | REMOVE — replace with ingredients section | — |
| Medikamente (3) (section header) | 💊 Medikamente (N) | 💊 Medications (N) |
| (missing) | 🟢 Nahrungsergänzungsmittel (N) | 🟢 Supplements (N) |
| Grenzwerte (tab label) | Referenzbereich | Reference Ranges |

Also check and fix:
- **Date field format**: mm/dd/yyyy → dd.mm.yyyy (German locale)
- **"Medikament" badge on list items** → should show "Medikament" OR "Supplement" based on product type
- **"KI-Import" badge** → keep, but text should say "KI-Import" not just "Import"

---

## PART 5: i18n Keys

All text via translation keys. Add/update:

```json
{
  "influenceFactors.title": "Einflussfaktoren",
  "influenceFactors.subtitle": "Verfolge deine aktuellen und vergangenen Einflussfaktoren",
  "influenceFactors.addButton": "+ Einflussfaktor hinzufügen",
  "influenceFactors.addTitle": "Neuen Einflussfaktor hinzufügen",
  "influenceFactors.editTitle": "Einflussfaktor bearbeiten",
  "influenceFactors.type": "Typ",
  "influenceFactors.type.medication": "Medikament",
  "influenceFactors.type.supplement": "Nahrungsergänzungsmittel",
  "influenceFactors.productName": "Produktname",
  "influenceFactors.productName.placeholderMed": "z.B. Aspirin",
  "influenceFactors.productName.placeholderSup": "z.B. Supradyn",
  "influenceFactors.brand": "Marke",
  "influenceFactors.dose": "Dosierung",
  "influenceFactors.frequency": "Häufigkeit",
  "influenceFactors.form": "Form",
  "influenceFactors.startDate": "Startdatum",
  "influenceFactors.prescribingDoctor": "Verschreibender Arzt",
  "influenceFactors.reason": "Grund",
  "influenceFactors.notes": "Notizen",
  "influenceFactors.ingredients.title": "Wirkstoffe & Hilfsstoffe",
  "influenceFactors.ingredients.name": "Name",
  "influenceFactors.ingredients.amount": "Menge",
  "influenceFactors.ingredients.role": "Rolle",
  "influenceFactors.ingredients.role.active": "Wirkstoff",
  "influenceFactors.ingredients.role.auxiliary": "Hilfsstoff",
  "influenceFactors.ingredients.add": "+ Weiteren Wirkstoff hinzufügen",
  "influenceFactors.submit.add": "Einflussfaktor hinzufügen",
  "influenceFactors.submit.save": "Einflussfaktor speichern",
  "influenceFactors.cancel": "Abbrechen",
  "influenceFactors.edit": "Bearbeiten",
  "influenceFactors.archive": "Archivieren",
  "influenceFactors.section.medications": "Medikamente",
  "influenceFactors.section.supplements": "Nahrungsergänzungsmittel",
  "influenceFactors.source.manual": "Manuell",
  "influenceFactors.source.aiImport": "KI-Import",
  "influenceFactors.info": "Sie können Dr. Alex bitten, Einflussfaktoren von einem Foto Ihres Rezepts oder Ihrer Supplement-Packung zu importieren.",
  "influenceFactors.empty": "Noch keine Einflussfaktoren hinzugefügt"
}
```

Plus EN equivalents.

---

## PART 6: Verify

```bash
# i18n check
cd ~/projects/sovereign-health/core-frontend
./check-i18n.sh

# No old "Medikament hinzufügen" button text remaining
grep -rn "Medikament hinzufügen" src/ --include="*.tsx" --include="*.ts" --include="*.json"

# No flat Wirkstoffname field remaining
grep -rn "Wirkstoffname\|wirkstoff_name\|wirkstoffName" src/ --include="*.tsx" --include="*.ts"

# Check Grenzwerte is renamed
grep -rn "Grenzwerte" src/ --include="*.tsx" --include="*.ts" --include="*.json"
```

### Test checklist
- [ ] Tab label shows "Einflussfaktoren" (not "Medikamente")
- [ ] Button says "+ Einflussfaktor hinzufügen"
- [ ] Type toggle works: Medikament ↔ Nahrungsergänzungsmittel
- [ ] Selecting "Supplement" hides "Verschreibender Arzt" field
- [ ] Can add multiple ingredients with Name + Amount + Role
- [ ] Can remove an ingredient row
- [ ] List view groups by type: 💊 Medikamente / 🟢 Nahrungsergänzungsmittel
- [ ] Each product shows nested ingredients
- [ ] Badge color differs: 💊 orange = medication, 🟢 green = supplement
- [ ] Edit pre-fills all fields including ingredients
- [ ] Date format is dd.mm.yyyy (not mm/dd/yyyy)
- [ ] Info text says "Einflussfaktoren" (not "Medikamente")
- [ ] Settings tab "Grenzwerte" → "Referenzbereich"
- [ ] Existing data (Vitamin D3, K2, multibionta) migrated correctly
- [ ] All text uses i18n keys (DE + EN)

### Build & Deploy
```bash
cd ~/projects/sovereign-health/core-backend
cargo test
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"

cd ~/projects/sovereign-health/core-frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io -t registry.gitlab.com/sovereign-health/core-frontend:latest .
docker save registry.gitlab.com/sovereign-health/core-frontend:latest | ssh root@72.61.154.115 "docker load"

ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend && docker image prune -f"
```
