# Issue #304: Add missing body composition markers for smart scale app imports

**Type:** feature
**Priority:** medium
**Component:** backend / markers + marker matcher + import pipeline
**Found during:** manual testing with smart scale app screenshots (2026-04-02)

## Description

Smart scale apps (e.g. Renpho, Withings, Xiaomi) report advanced body composition markers that are not yet defined in the markers table or the marker matcher. Users importing screenshots from these apps will have most markers silently dropped.

Additionally, the Dr. Alex import flow needs to handle these various app screenshot formats (grid layouts, comparison views, glucose meter logs) more reliably.

## Missing Markers (need new DB definitions + aliases)

| German label | English name | Unit | Slug (proposed) | Notes |
|-------------|-------------|------|-----------------|-------|
| Skelettmuskel | Skeletal muscle % | % | `skeletal_muscle_pct` | Different from `muscle_pct` (total muscle) |
| Muskelmasse | Muscle mass | kg | `muscle_mass_kg` | Absolute mass, vs `muscle_pct` which is % |
| Subkutanes Fett | Subcutaneous fat | % | `subcutaneous_fat_pct` | Fat under the skin |
| Viszeralfett | Visceral fat | level (1-59) | `visceral_fat` | Unitless index, not a percentage |
| Fettfreies Körpergewicht | Fat-free body mass | kg | `fat_free_mass` | Lean mass = weight - fat mass |
| Grundumsatz | Basal metabolic rate (BMR) | kcal | `bmr` | Resting energy expenditure |
| Stoffwechselalter | Metabolic age | years | `metabolic_age` | Estimated by scale algorithm |
| Protein | Body protein % | % | `body_protein_pct` | NOT total_protein (blood test) |
| Knochenmasse | Bone mass | kg | `bone_mass_kg` | Absolute mass, vs `bone_mass_pct` which is % |

## Existing Markers Needing Alias Updates

| German label | Existing slug | Missing aliases |
|-------------|--------------|-----------------|
| Körperfett | `body_fat_pct` | Already has "körperfett" -- OK |
| Körperwasser | `body_water_pct` | Already has "körperwasser" -- OK |
| Knochenmasse (%) | `bone_mass_pct` | Already has "knochenmasse" -- but need to distinguish kg vs % |
| Muskelmasse (%) | `muscle_pct` | Has "muskelmasse" -- but need to distinguish kg vs % |

## Import Format Challenges

### 1. Smart scale grid layout (Image 1)
- 3x4 grid with value + label pairs
- Labels are German: Gewicht, BMI, Körperfett, etc.
- Values have mixed units inline: "51.6kg", "21.1%", "1249 kcal"
- AI needs to parse grid structure and associate each value with its label

### 2. Smart scale comparison view (Image 2)
- Before/after format with date range
- Two columns of values with delta indicators
- Need to import the current (right) column values at the latest date

### 3. Blood glucose meter app (Image 3)
- German date format: "Freitag, 20. Februar 2026"
- Single glucose reading per entry with time + mg/dL
- Icons for meal context (fasting, before meal, after meal)
- Multiple entries per screen, each with separate date/time

## Migration Spec

All markers: structural zone, source_type: home.

| Slug | EN Name | DE Name | Unit | LOINC | Green (M) | Green (F) |
|------|---------|---------|------|-------|-----------|-----------|
| skeletal_muscle_pct | Skeletal Muscle | Skelettmuskel | % | 73965-6 | 33–43 | 25–35 |
| muscle_mass_kg | Muscle Mass | Muskelmasse | kg | 73964-9 | trend-only | trend-only |
| subcutaneous_fat_pct | Subcutaneous Fat | Subkutanes Fett | % | 41982-0 | 8–20 | 15–25 |
| visceral_fat | Visceral Fat | Viszeralfett | level | — | 1–12 | 1–12 |
| fat_free_mass | Fat-Free Mass | Fettfreie Masse | kg | 8342-8 | trend-only | trend-only |
| bmr | Basal Metabolic Rate | Grundumsatz | kcal | — | 1500–1900 | 1200–1500 |
| metabolic_age | Metabolic Age | Stoffwechselalter | years | — | ≤ chrono age | ≤ chrono age |
| body_protein_pct | Body Protein | Körperprotein | % | — | 16–20 | 16–20 |
| bone_mass_kg | Bone Mass | Knochenmasse | kg | 101686-4 | 2.65–3.69 | 1.95–2.90 |

## Marker Matcher Aliases

| Slug | Aliases |
|------|---------|
| skeletal_muscle_pct | skeletal muscle, skelettmuskel, skeletal muscle % |
| muscle_mass_kg | muscle mass, muskelmasse, muscle mass kg, muskelmasse kg |
| subcutaneous_fat_pct | subcutaneous fat, subkutanes fett, subkutan, subcutaneous fat % |
| visceral_fat | visceral fat, viszeralfett, visceral fat level, viszerales fett |
| fat_free_mass | fat-free mass, fat free mass, lean mass, fettfreie masse, fettfreies körpergewicht, lean body mass |
| bmr | bmr, basal metabolic rate, grundumsatz, resting metabolic rate |
| metabolic_age | metabolic age, stoffwechselalter |
| body_protein_pct | body protein, körperprotein, protein %, body protein % |
| bone_mass_kg | bone mass kg, knochenmasse kg |

## kg vs % Disambiguation

The marker matcher must check the extracted unit to resolve ambiguous German labels:
- "Knochenmasse 2.04 kg" → `bone_mass_kg` (new)
- "Knochenmasse 6%" → `bone_mass_pct` (existing)
- "Muskelmasse 25.3 kg" → `muscle_mass_kg` (new)
- "Muskelmasse 38%" → `muscle_pct` (existing)

When unit is ambiguous or missing, flag in pre-import review for user confirmation via dropdown.

## Protocol Notes (informational, no threshold overrides in v1)

- **Carnivore:** expect higher muscle mass, skeletal muscle %, bone mass; lower visceral fat
- **Vegan:** bone mass may trend 4–6% lower; body protein % may be lower range
- **Standard:** reference baseline — all BIA calibration uses omnivore norms

Protocol-specific threshold overrides can be added in a future sprint based on real user data.

## Scope

1. **Migration:** Create 9 new marker definitions with LOINC codes, reference ranges, i18n (EN + DE)
2. **Marker matcher:** Add German + English aliases for all 9 markers
3. **Unit handling:** kg vs % disambiguation by extracted unit; ambiguous → user confirms in review
4. **i18n:** Add EN + DE content keys for all 9 marker names + descriptions

## Location

- Markers migration: `apps/health/sovereign-health/api/migrations/`
- Marker matcher: `apps/health/sovereign-health/api/src/services/marker_matcher.rs`
- Import handler: `apps/health/sovereign-health/api/src/handlers/import.rs`
- Import review UI: `apps/health/sovereign-health/frontend/src/components/doctor-chat/import-review.tsx`
- i18n: `apps/health/sovereign-health/frontend/src/content/` (EN + DE)
