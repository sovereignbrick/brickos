# Release v0.31.0

**Date:** 2026-03-28
**Sprint:** 018 -- Import Pipeline Reliability
**Previous:** v0.30.0
**Velocity:** 16 pts
**Commits:** 4
**Duration:** 1 day

---

## Highlights

- **Calculated markers computed per-date during import** -- tabular imports now iterate unique dates and compute GKI/Dr. Boz/HOMA-IR at each, instead of only at `Utc::now()`
- **ON CONFLICT DO UPDATE for import calc markers** -- prevents duplicate entries from repeated imports or backfills
- **SHBG marker alias** -- English (no-hyphen) and German aliases added; SHBG now recognized in lab PDF imports
- **Lab name and address extraction** -- PDF parser extracts lab metadata and upserts to labs table
- **Import history page** -- new `/measurements/imports` page lists past import sessions with rollback option
- **German lab aliases expanded** -- Sexualhormonbindendes, Follikelstim., GFR (CKD-EPI-Formel), Omega-3-Index, Fettsäuren

---

## Bug Fixes

| Issue | Description | Impact |
|-------|-------------|--------|
| #298 | Calculated markers only computed at `Utc::now()` during tabular import | Trend charts now show full history |
| #298 | Plain INSERT without ON CONFLICT for calc markers | No more duplicate entries |
| -- | Import `/history` route placed after `/{id}`, causing UUID parse error | Route order fixed |
| -- | `extract_field_str` assumed JSON object; Claude returns array | Lab metadata extraction works |

---

## New Features

### Per-Date Calculated Marker Computation (#298)
- New `enrich_with_values_at_date()` function for historical lookups
- After inserting measurements, iterates unique dates where calc inputs exist
- Computes GKI, Dr. Boz Ratio, HOMA-IR at each historical date
- Uses `ON CONFLICT (user_id, calculated_marker_id, measured_at) DO UPDATE` to prevent duplicates

### SHBG Marker Alias (#295)
- Added aliases: "Sex Hormone Binding Globulin" (no hyphen), "Sexualhormonbindendes Globulin"
- Additional German aliases: Follikelstim., GFR (CKD-EPI-Formel), Omega-3-Index (EPA und DHA), Fettsäuren gesamt

### Lab Name & Address Extraction (#296)
- PDF parser extracts lab header metadata
- Upserts lab info to labs table on import session
- Handles Claude JSON array response format

### Import History Page (#297)
- New frontend page at `/measurements/imports`
- Lists past import sessions with date, file name, marker count
- Rollback button per session (see Known Issues)
- i18n: EN + DE translations

---

## Infrastructure

- **Version:** 0.30.0 -> 0.31.0 in lib.rs and deploy.sh
- **Website content refreshed** with latest marker/zone translations

---

## Known Issues

- **Import rollback button not functional** -- the rollback button on `/measurements/imports` does not trigger the rollback action (issue #299)
- **ntfy pre-flight failing (HTTP 000)** -- carried from v0.30.0, NTFY_TOKEN on VPS needs rotation
- **CF_API_TOKEN not set** -- Cloudflare cache purge requires manual action

---

## Production URLs

- App: https://app.sovereignhealth.io/
- API: https://api.sovereignhealth.io/health
- Website: https://sovereignhealth.io/
