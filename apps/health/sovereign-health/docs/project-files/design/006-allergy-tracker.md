# Design: Allergy & Sensitivity Tracker

**Issue:** [#97](https://github.com/sovereignbrick/brickos/issues/97)
**Milestone:** [AI & Smart Features](https://github.com/sovereignbrick/brickos/milestone/16)
**Status:** Draft
**Date:** 2026-03-18

## Problem
Dr. Alex recommends foods per marker but has no knowledge of user allergies. A nut-allergic user might get almond recommendations for magnesium. Seasonal allergies (pollen) also affect inflammatory markers (hs-CRP, WBC) but this correlation isn't tracked.

## Current State
- User profile only stores: gender, age, height_cm
- `user_medications` table exists (supplements/medications) — similar per-user profile data pattern
- Website marketing copy (EN + DE) lists "Allergy & Sensitivity Tracker" as coming soon
- 0% implemented

## Approach

### Phase 1: Profile Data
- User adds allergies in Settings → Profile
- Stored per-user with type, severity, seasonal flags

### Phase 2: Dr. Alex Integration
- Active allergies injected into Dr. Alex system prompt
- Food recommendations filtered/flagged against user allergies
- Cross-reactivity awareness (birch pollen ↔ apple, celery, hazelnuts)

### Phase 3: Correlation Analysis
- Seasonal allergy timeline overlaid with inflammatory markers
- "Your hs-CRP spikes every March-May, coinciding with your birch pollen allergy"

## Data Model

```sql
CREATE TABLE user_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergy_type VARCHAR(50) NOT NULL,     -- food, pollen, medication, insect, latex, mold, pet, other
    allergen_name VARCHAR(255) NOT NULL,   -- "peanuts", "birch pollen", "penicillin"
    severity VARCHAR(20) NOT NULL,          -- mild, moderate, severe, anaphylactic
    reaction_description TEXT,              -- "hives, throat swelling"
    seasonal BOOLEAN DEFAULT false,
    season_months INTEGER[],               -- [3,4,5] for spring
    diagnosed BOOLEAN DEFAULT false,        -- clinically confirmed vs self-reported
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_allergies_user ON user_allergies(user_id) WHERE is_active = true;

-- Cross-reactivity reference data
CREATE TABLE allergy_cross_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_allergen VARCHAR(255) NOT NULL,   -- "birch pollen"
    cross_reactive_food VARCHAR(255) NOT NULL, -- "apple", "celery", "hazelnut"
    reaction_likelihood VARCHAR(20),           -- common, occasional, rare
    note_en TEXT,
    note_de TEXT
);
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/profile/allergies` | List user's allergies |
| POST | `/api/v1/profile/allergies` | Add allergy |
| PATCH | `/api/v1/profile/allergies/:id` | Update allergy |
| DELETE | `/api/v1/profile/allergies/:id` | Remove allergy |
| GET | `/api/v1/profile/allergies/cross-reactions` | Get cross-reactive foods for user's allergies |

## UI Changes
- **Settings → Profile:** allergy list section (add/edit/remove)
- **Allergy entry form:** type selector, allergen name (autocomplete from common list), severity, seasonal toggle with month picker
- **Marker detail → food recommendations:** warning badge on foods that match user allergies
- **Dr. Alex chat sidebar:** allergy context shown

## Open Questions
- [ ] Pre-populated allergen list or free text only? A curated list improves consistency and cross-reactivity matching.
- [ ] Should severity affect how prominently warnings are shown? (anaphylactic = block recommendation vs mild = info badge)
- [ ] Track allergy test results (IgE levels)? Or keep it simple with type + severity?

## References
- User medications pattern: `migrations/20260310000034_batch15_knowledge_medications.sql`
- Marketing copy: `website/src/locales/en.json:384-394`
- Dr. Alex prompt: `api/src/handlers/doctor_chat.rs`
