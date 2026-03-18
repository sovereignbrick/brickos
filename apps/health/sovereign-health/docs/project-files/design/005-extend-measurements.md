# Design: Extended Measurements + Custom Markers

**Issue:** [#95](https://github.com/sovereignbrick/brickos/issues/95)
**Milestone:** [AI & Smart Features](https://github.com/sovereignbrick/brickos/milestone/16)
**Status:** Draft
**Date:** 2026-03-18

## Problem
Two gaps in the marker system:
1. **Missing markers:** Users get lab results for hormones, inflammatory markers, and nutrients that BrickOS doesn't track yet (e.g., cortisol, DHEA-S, IL-6, CoQ10).
2. **Unrecognized markers:** When Dr. Alex can't match a user's lab result to the catalog, there's no fallback — the data is lost.

## Current State
- 84+ predefined markers (70+ standard + 8 free / 22+ premium calculated)
- Adding markers requires SQL migrations (documented in `docs/src/guides/adding-markers.md`)
- No user-facing custom marker creation
- Dr. Alex has no fuzzy matching or "create custom marker" fallback
- Marker catalog: `migrations/20260308000002_create_markers.sql`

## Part 1: Extend Built-in Markers

### Proposed New Markers

**Hormones:**
| Marker | Slug | Unit | Source |
|--------|------|------|--------|
| Cortisol | `cortisol` | nmol/L | lab |
| DHEA-S | `dhea_s` | µmol/L | lab |
| Progesterone | `progesterone` | nmol/L | lab |
| SHBG | `shbg` | nmol/L | lab |
| Prolactin | `prolactin` | mIU/L | lab |
| IGF-1 | `igf_1` | ng/mL | lab |

**Inflammation:**
| Marker | Slug | Unit | Source |
|--------|------|------|--------|
| Interleukin-6 | `il_6` | pg/mL | lab |
| TNF-alpha | `tnf_alpha` | pg/mL | lab |
| Fibrinogen | `fibrinogen` | g/L | lab |

**Nutrients:**
| Marker | Slug | Unit | Source |
|--------|------|------|--------|
| Omega-3 Index | `omega_3_index` | % | lab |
| CoQ10 | `coq10` | µg/mL | lab |
| Selenium | `selenium` | µg/L | lab |
| Iodine (urinary) | `iodine` | µg/L | lab |
| Glutathione | `glutathione` | µmol/L | lab |

**Cardiac:**
| Marker | Slug | Unit | Source |
|--------|------|------|--------|
| NT-proBNP | `nt_probnp` | pg/mL | lab |
| Homocysteine | `homocysteine` | µmol/L | lab |

**Gut Health:**
| Marker | Slug | Unit | Source |
|--------|------|------|--------|
| Zonulin | `zonulin` | ng/mL | lab |
| Calprotectin | `calprotectin` | µg/g | lab |

Each new marker needs: migration (marker + reference ranges), zone assignment, i18n (EN + DE), food/supplement associations.

## Part 2: User-Defined Custom Markers

### Flow
1. User enters a measurement → types marker name (e.g., "25-OH Vitamin D3")
2. Dr. Alex fuzzy-matches against catalog: suggests `vitamin_d` (similarity: 92%)
3. If user accepts → measurement stored against existing marker
4. If no match or user declines → offer "Create custom marker"
5. User provides: name, unit, optional green/orange ranges
6. Custom marker created, measurement stored

### Fuzzy Matching Strategy
- Exact slug match → direct hit
- Synonym map: `{"vit D": "vitamin_d", "25-OH": "vitamin_d", "HbA1c": "hba1c", "A1C": "hba1c", "GGT": "ggt", "gamma GT": "ggt"}`
- Levenshtein distance + trigram similarity on marker_name
- Threshold: > 80% similarity → suggest, < 80% → offer custom creation

## Data Model

```sql
-- Synonym map for fuzzy matching
CREATE TABLE marker_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_slug VARCHAR(100) NOT NULL,
    synonym VARCHAR(255) NOT NULL,         -- e.g., "vit D", "25-hydroxyvitamin D"
    locale VARCHAR(10) DEFAULT 'en',
    UNIQUE(synonym, locale)
);

-- User-created custom markers
CREATE TABLE user_custom_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marker_slug VARCHAR(100) NOT NULL,      -- user-scoped slug
    marker_name VARCHAR(255) NOT NULL,
    unit_canonical VARCHAR(50) NOT NULL,
    zone_id UUID REFERENCES zones(id),
    source_type VARCHAR(20) DEFAULT 'lab',
    orange_min DOUBLE PRECISION,
    orange_max DOUBLE PRECISION,
    green_min DOUBLE PRECISION,
    green_max DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, marker_slug)
);

-- Admin review: track popular custom markers for promotion
CREATE VIEW popular_custom_markers AS
SELECT marker_name, unit_canonical, COUNT(DISTINCT user_id) AS user_count
FROM user_custom_markers
GROUP BY marker_name, unit_canonical
HAVING COUNT(DISTINCT user_id) >= 3
ORDER BY user_count DESC;
```

## API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/markers/match` | Fuzzy match a marker name, return suggestions |
| POST | `/api/v1/markers/custom` | Create user-defined custom marker |
| PATCH | `/api/v1/markers/custom/:slug` | Update custom marker ranges |
| DELETE | `/api/v1/markers/custom/:slug` | Delete custom marker |
| GET | `/api/v1/markers/custom` | List user's custom markers |
| GET | `/admin/markers/popular-custom` | Admin: popular custom markers for promotion |

## UI Changes
- Measurement entry: marker search with fuzzy autocomplete (existing + custom)
- "Create custom marker" flow when no match found
- Dashboard: custom markers appear alongside built-in markers
- Settings → Markers: manage custom markers (edit ranges, delete)
- Admin → Markers: view popular custom markers, one-click promote to built-in

## Open Questions
- [ ] Should custom markers support calculated formulas? Or only direct measurements?
- [ ] Custom marker sharing: can users share their custom marker definitions? (e.g., community-contributed markers)
- [ ] Zone assignment for custom markers: auto-assign "Other" zone or let user pick?
- [ ] How to handle unit variants? (mg/dL vs mmol/L for the same marker)

## References
- Adding markers guide: `docs/src/guides/adding-markers.md`
- Marker migration: `migrations/20260308000002_create_markers.sql`
- Reference ranges: `migrations/20260308000006_create_reference_ranges.sql`
- Marker handler: `api/src/handlers/markers.rs`
