# Design: Health Ecosystem Integrations

**Issue:** [#93](https://github.com/sovereignbrick/brickos/issues/93)
**Milestone:** [Health Ecosystem Integrations](https://github.com/sovereignbrick/brickos/milestone/22)
**Status:** Draft
**Date:** 2026-03-18

## Problem
Users track health data across multiple platforms (Apple Health, Google Health Connect, wearables). Currently BrickOS only supports manual entry and 3 specific devices (Fora 6, Qardio Arm, Qardiobase 2). Users must re-enter data that already exists elsewhere.

## Current Device/Import State
- 84+ biomarkers (home + lab sources)
- Devices: Fora 6 Connect (glucose, ketones, cholesterol, uric acid, hemoglobin, hematocrit), Qardio Arm (BP, heart rate), Qardiobase 2 (weight)
- Manual entry for all markers
- No third-party health app integration

## Target Ecosystems

### Apple Health (HealthKit)
- **Available data:** Blood glucose, heart rate, BP, weight, body fat %, SpO2, sleep, HRV, body temperature, respiratory rate
- **Access:** Native iOS app (Swift/HealthKit) or React Native bridge (expo-health-connect planned for iOS)
- **Direction:** Read (import) initially, write (sync back) later

### Google Health Connect (Android)
- **Available data:** Blood glucose, heart rate, BP, weight, body temperature, SpO2, sleep stages, exercise, nutrition
- **Access:** Android app with Health Connect API or React Native bridge
- **Direction:** Read (import) initially

### Linux / Open Ecosystem
- **Gadgetbridge:** Open-source Android app syncing from Amazfit, Fitbit, Garmin, Mi Band, etc. — exports to JSON/CSV
- **Open mHealth:** Standard JSON schema for health data
- **FHIR:** Clinical interoperability standard — for lab imports from clinics
- **CSV/JSON manual import** as universal fallback

## Approach

### Phase 1: Import Framework
Build a generic import pipeline that maps external data to BrickOS markers:
1. Import source adapter (Apple Health, Google Health Connect, CSV, etc.)
2. Marker mapping layer (external data type → marker_slug)
3. Deduplication (same marker + timestamp = skip or merge)
4. Conflict resolution (manual entry wins over import)
5. User controls (toggle per marker, per source)

### Phase 2: Apple Health + Google Health Connect
- Mobile app wrapper (Capacitor or React Native) with health SDK bridges
- Background sync option (periodic pull)

### Phase 3: Open Formats
- CSV/JSON import UI (upload file, map columns to markers)
- Gadgetbridge JSON format support
- FHIR R4 observation import (future, for clinic integration)

## Data Model

```sql
CREATE TABLE import_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    source_type VARCHAR(50) NOT NULL,  -- 'apple_health', 'google_health_connect', 'csv', 'gadgetbridge', 'fhir'
    source_name VARCHAR(255),           -- display name
    enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_cursor JSONB,                  -- source-specific pagination/cursor state
    marker_config JSONB,                -- per-marker: {marker_slug: {enabled: true, direction: 'import'}}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES import_sources(id),
    user_id UUID NOT NULL REFERENCES users(id),
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,    -- duplicates
    error_count INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Marker mapping: external type names → BrickOS marker_slugs
CREATE TABLE marker_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    external_type VARCHAR(255) NOT NULL, -- e.g., 'HKQuantityTypeIdentifierBloodGlucose'
    marker_slug VARCHAR(100) NOT NULL,   -- BrickOS marker slug
    unit_conversion TEXT,                -- formula if unit differs, e.g., 'mg/dL → mmol/L'
    UNIQUE(source_type, external_type)
);
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/import/sources` | List configured import sources |
| POST | `/api/v1/import/sources` | Add import source |
| PATCH | `/api/v1/import/sources/:id` | Update source config (enable/disable markers) |
| DELETE | `/api/v1/import/sources/:id` | Remove source |
| POST | `/api/v1/import/sources/:id/sync` | Trigger sync |
| POST | `/api/v1/import/upload` | CSV/JSON file upload import |
| GET | `/api/v1/import/log` | Import history |

## Open Questions
- [ ] Mobile app: Capacitor (wrap existing React app) vs React Native (rewrite)? Capacitor is lower effort.
- [ ] Background sync: how often? Every hour? On app open only?
- [ ] Should imported measurements be visually distinguished from manual entries in the UI?
- [ ] Apple Health write-back: do users want to push BrickOS data back to Apple Health?
- [ ] FHIR: too early? Only relevant when clinic/org features land (milestones #9, #10).

## References
- Current device model: `migrations/20260308000004_create_devices.sql`
- Measurement handler: `api/src/handlers/markers.rs`
- Marker definitions: `migrations/20260308000002_create_markers.sql`
