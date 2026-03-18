# Design: Anti-Nutrient Analysis

**Issue:** [#94](https://github.com/sovereignbrick/brickos/issues/94)
**Milestone:** [AI & Smart Features](https://github.com/sovereignbrick/brickos/milestone/16)
**Status:** Draft
**Date:** 2026-03-18

## Problem
BrickOS recommends foods per marker but doesn't warn about anti-nutrients that block nutrient absorption. A user eating spinach for iron doesn't know that oxalates in spinach reduce iron absorption by up to 50%. This gap undermines the quality of dietary advice.

## Current State
- Food database: `website/data/foods.json` — keyed by marker, 14 food categories
- Supplement database: `website/data/supplements.json` — with dose + mechanism
- Anti-nutrients mentioned in app review spec as future feature but 0% implemented
- Dr. Alex has no anti-nutrient awareness

## Anti-Nutrient Categories

| Anti-Nutrient | Common Sources | Markers Affected | Mechanism |
|---|---|---|---|
| **Oxalates** | Spinach, beets, almonds, chocolate, rhubarb | calcium, iron, magnesium | Binds minerals, forms insoluble complexes |
| **Phytates** | Grains, legumes, nuts, seeds | iron, zinc, calcium, magnesium | Chelates divalent minerals in gut |
| **Lectins** | Beans, lentils, nightshades, wheat | (gut health, general absorption) | Damages gut lining, impairs nutrient uptake |
| **Tannins** | Tea, coffee, red wine, berries | iron | Binds non-heme iron, reduces absorption 50-70% |
| **Goitrogens** | Cruciferous (broccoli, kale, cabbage), soy | TSH, free_t4, free_t3 | Inhibits iodine uptake, disrupts thyroid |
| **Saponins** | Quinoa, legumes, oats | (cholesterol, gut permeability) | Disrupts cell membranes, may reduce cholesterol absorption |

## Approach

### Phase 1: Data Model + Seed Data
- Create anti-nutrient reference data
- Link foods ↔ anti-nutrients with severity levels
- Link anti-nutrients → affected markers

### Phase 2: Marker Detail Integration
- On marker detail page (e.g., iron), show warning: "Oxalates in spinach and phytates in lentils can reduce iron absorption"
- Food recommendation cards get anti-nutrient badges

### Phase 3: Mitigation Tips + Dr. Alex
- Show preparation tips that reduce anti-nutrients (soaking, sprouting, fermenting, cooking)
- Dr. Alex factors anti-nutrients into dietary advice

## Data Model

```sql
CREATE TABLE anti_nutrients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,    -- 'oxalates', 'phytates', 'lectins', etc.
    name_en VARCHAR(255) NOT NULL,
    name_de VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_de TEXT,
    mechanism_en TEXT,                      -- how it works
    mechanism_de TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE food_anti_nutrients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id VARCHAR(100) NOT NULL,         -- references foods.json IDs or new foods table
    anti_nutrient_id UUID NOT NULL REFERENCES anti_nutrients(id),
    severity VARCHAR(20) NOT NULL,          -- 'low', 'medium', 'high'
    amount_note_en TEXT,                    -- e.g., "750mg oxalate per 100g cooked"
    amount_note_de TEXT,
    UNIQUE(food_id, anti_nutrient_id)
);

CREATE TABLE anti_nutrient_marker_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anti_nutrient_id UUID NOT NULL REFERENCES anti_nutrients(id),
    marker_slug VARCHAR(100) NOT NULL,
    effect_en TEXT NOT NULL,               -- e.g., "Reduces iron absorption by 50-70%"
    effect_de TEXT NOT NULL,
    UNIQUE(anti_nutrient_id, marker_slug)
);

CREATE TABLE anti_nutrient_mitigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anti_nutrient_id UUID NOT NULL REFERENCES anti_nutrients(id),
    method_en VARCHAR(255) NOT NULL,       -- e.g., "Soak beans 12-24 hours before cooking"
    method_de VARCHAR(255) NOT NULL,
    reduction_note_en TEXT,                -- e.g., "Reduces phytate content by 60-80%"
    reduction_note_de TEXT
);
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/anti-nutrients` | List all anti-nutrients |
| GET | `/api/v1/markers/:slug/anti-nutrients` | Anti-nutrients affecting this marker |
| GET | `/api/v1/foods/:food_id/anti-nutrients` | Anti-nutrient profile for a food |

## UI Changes
- Marker detail → food recommendations: anti-nutrient warning badge per food
- Food detail popover: anti-nutrient profile with severity + mitigation tips
- New "Anti-Nutrients" info section on marker detail page

## Open Questions
- [ ] Move foods.json from website to API/database? Currently it's a static JSON file — need it in DB for relational queries.
- [ ] How granular on amounts? Exact mg per 100g, or just low/medium/high severity?
- [ ] Should we show anti-nutrient impact on the measurement entry screen (contextual tips)?

## References
- Food data: `website/data/foods.json`
- Supplement data: `website/data/supplements.json`
- Marker detail handler: `api/src/handlers/markers.rs`
- App review spec mention: `docs/specs/old specs/2026-03-11-app-review.md`
