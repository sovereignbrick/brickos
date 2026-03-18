# Design: Symptom Journal

**Issue:** [#98](https://github.com/sovereignbrick/brickos/issues/98)
**Milestone:** [AI & Smart Features](https://github.com/sovereignbrick/brickos/milestone/16)
**Status:** Draft
**Date:** 2026-03-18

## Problem
Users experience symptoms (headaches, cramps, fatigue) that correlate with biomarker levels, but there's no way to log them. Dr. Alex can't connect the dots between "I feel awful" and "your magnesium is in the red zone" without symptom data.

## Current State
- Measurements have lifestyle context fields: sleep_hours, sleep_quality, stress_level (1-10), exercise_activity, lifestyle_note (300 char)
- `lifestyle_note` is the closest existing field but is unstructured free text
- Website marketing copy (EN + DE) lists "Symptom Journal" as coming soon
- 0% implemented

## Approach

### Phase 1: Symptom Entry on Measurements
- Extend measurement form with optional "Symptoms" section
- Pre-populated catalog of common symptoms with free-text fallback
- Body location + severity per symptom

### Phase 2: Symptom Timeline
- Standalone symptom history view
- Symptom frequency charts (e.g., "headache: 6x this month")

### Phase 3: Dr. Alex Correlation
- Pattern detection: "Leg cramps logged 4 times when magnesium was orange"
- Symptom-marker correlation API for trend overlays
- Proactive alerts: "You usually get headaches when your glucose drops below 3.5"

## Data Model

```sql
-- Pre-populated symptom catalog
CREATE TABLE symptom_catalog (
    slug VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,          -- pain, digestive, neurological, fatigue, skin, respiratory, musculoskeletal, mood, other
    name_en VARCHAR(255) NOT NULL,
    name_de VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_de TEXT,
    common_body_locations TEXT[],           -- suggested locations for this symptom
    display_order INTEGER DEFAULT 0
);

-- User-reported symptoms linked to measurements
CREATE TABLE measurement_symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symptom_slug VARCHAR(100),              -- NULL if custom symptom
    custom_symptom_name VARCHAR(255),       -- for symptoms not in catalog
    body_location VARCHAR(100),             -- "left leg", "temples", "lower back"
    severity VARCHAR(20) NOT NULL,          -- mild, moderate, severe
    duration_description VARCHAR(255),      -- "all day", "at night", "2 hours", "after meals"
    timing VARCHAR(50),                     -- before_measurement, during, after, ongoing
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurement_symptoms_user ON measurement_symptoms(user_id, created_at DESC);
CREATE INDEX idx_measurement_symptoms_slug ON measurement_symptoms(symptom_slug);
```

### Seed Data: Common Symptoms

```sql
INSERT INTO symptom_catalog (slug, category, name_en, name_de, common_body_locations, display_order) VALUES
-- Pain
('headache', 'pain', 'Headache', 'Kopfschmerzen', ARRAY['temples', 'forehead', 'back of head'], 1),
('migraine', 'pain', 'Migraine', 'Migräne', ARRAY['one side of head'], 2),
('muscle_cramp', 'musculoskeletal', 'Muscle Cramp', 'Muskelkrampf', ARRAY['calf', 'foot', 'thigh', 'hand'], 3),
('joint_pain', 'pain', 'Joint Pain', 'Gelenkschmerzen', ARRAY['knee', 'shoulder', 'wrist', 'hip', 'ankle'], 4),
('chest_pain', 'pain', 'Chest Pain', 'Brustschmerzen', ARRAY['chest', 'left chest', 'sternum'], 5),
-- Fatigue
('fatigue', 'fatigue', 'Fatigue', 'Müdigkeit', NULL, 10),
('brain_fog', 'neurological', 'Brain Fog', 'Gehirnnebel', NULL, 11),
('insomnia', 'fatigue', 'Insomnia', 'Schlaflosigkeit', NULL, 12),
('daytime_sleepiness', 'fatigue', 'Daytime Sleepiness', 'Tagesmüdigkeit', NULL, 13),
-- Digestive
('nausea', 'digestive', 'Nausea', 'Übelkeit', NULL, 20),
('bloating', 'digestive', 'Bloating', 'Blähungen', ARRAY['abdomen'], 21),
('heartburn', 'digestive', 'Heartburn', 'Sodbrennen', ARRAY['chest', 'throat'], 22),
('diarrhea', 'digestive', 'Diarrhea', 'Durchfall', NULL, 23),
('constipation', 'digestive', 'Constipation', 'Verstopfung', NULL, 24),
-- Neurological
('dizziness', 'neurological', 'Dizziness', 'Schwindel', NULL, 30),
('numbness_tingling', 'neurological', 'Numbness / Tingling', 'Taubheit / Kribbeln', ARRAY['hands', 'feet', 'fingers', 'toes'], 31),
('tremor', 'neurological', 'Tremor', 'Zittern', ARRAY['hands', 'fingers'], 32),
-- Cardiovascular
('heart_palpitations', 'cardiovascular', 'Heart Palpitations', 'Herzrasen', ARRAY['chest'], 40),
('cold_extremities', 'cardiovascular', 'Cold Hands/Feet', 'Kalte Hände/Füße', ARRAY['hands', 'feet'], 41),
-- Skin
('skin_rash', 'skin', 'Skin Rash', 'Hautausschlag', ARRAY['arms', 'legs', 'torso', 'face'], 50),
('dry_skin', 'skin', 'Dry Skin', 'Trockene Haut', ARRAY['hands', 'face', 'elbows'], 51),
('hair_loss', 'skin', 'Hair Loss', 'Haarausfall', ARRAY['scalp'], 52),
-- Mood
('anxiety', 'mood', 'Anxiety', 'Angst', NULL, 60),
('irritability', 'mood', 'Irritability', 'Reizbarkeit', NULL, 61);
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/symptoms/catalog` | List symptom catalog (for autocomplete) |
| — | `POST /api/v1/measurements` | Extend to accept optional `symptoms[]` array |
| GET | `/api/v1/symptoms/history?period=30d` | User's symptom timeline |
| GET | `/api/v1/symptoms/frequency` | Symptom frequency stats |
| GET | `/api/v1/symptoms/correlations` | Dr. Alex: symptom ↔ marker correlations |

## UI Changes
- **Measurement entry form:** collapsible "Symptoms" section below existing lifestyle fields
- **Symptom picker:** searchable dropdown from catalog + free text for custom
- **Per-symptom:** body location selector, severity toggle (mild/moderate/severe), optional duration
- **Dashboard:** recent symptoms widget or badge
- **Trends:** symptom overlay on marker trend charts (dots/markers on timeline)
- **Symptom history page:** filterable timeline view

## Open Questions
- [ ] Allow symptoms without a measurement? (standalone symptom logging throughout the day)
- [ ] Symptom-to-symptom correlations? (headache + fatigue often appear together)
- [ ] Export symptoms in GDPR data export?
- [ ] Maximum symptoms per measurement? (prevent abuse, keep UI clean — maybe 5?)

## References
- Measurement model: `api/src/models/measurement.rs`
- Measurement handler: `api/src/handlers/markers.rs`
- Existing lifestyle fields: `migrations/20260308000005_create_measurements.sql`
- Marketing copy: `website/src/locales/en.json:384-394`
