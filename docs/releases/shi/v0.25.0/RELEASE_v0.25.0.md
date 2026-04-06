# Release v0.25.0

**Date:** 2026-03-22
**Sprint:** 007 -- Production Polish
**Previous:** v0.24.0

---

## Highlights

- **Calculated markers auto-trigger** -- GKI, Dr. Boz Ratio, BMI, HOMA-IR, etc. now compute whenever their input data exists, regardless of whether markers were entered together or separately. Also fires on import.
- **Demo banner removed** -- the app is live, no more demo artifact in the navbar.
- **Marker zone corrections** -- 7 blood markers moved from Immune to Structural zone; weight now appears in both Energy & Metabolic and Structural.
- **Website tier limits corrected** -- 12 mismatches between website display and DB enforcement fixed across EN + DE.
- **Deploy pipeline hardening** -- version consistency checks, migration stability warnings, container age verification, Cloudflare purge for all environments.

---

## Features

### Calculated Markers
- **Auto-trigger from any source** -- calculated markers now fetch the user's latest values for missing inputs, so entering glucose today and ketones tomorrow still triggers Dr. Boz Ratio and GKI.
- **Import support** -- both lab import and table import now compute calculated markers after saving measurements (previously skipped entirely).

### Marker Matching
- **BPM recognition** -- added "bpm", "beats per minute", "beats/min", "Schlage pro Minute", "Schlage/min" as aliases for the heart_rate marker in the table importer.
- **AI extraction prompt** -- added BPM, SYS, DIA to the abbreviation mappings so the Vision API normalizes these labels.

### Deploy Pipeline
- **Version consistency check** -- pre-flight now fails if deploy.sh VERSION doesn't match lib.rs (ignoring build numbers).
- **Migration stability warning** -- warns if any migration file has uncommitted changes (prevents silent SQLx checksum mismatches).
- **Container age verification** -- post-deploy checks that containers were actually recreated (catches stale survivors).
- **Cloudflare cache purge** -- now runs automatically for both staging and production deploys.

---

## Fixes

### Data
- **Marker zone corrections** -- mcv, mch, mchc, rdw, rbc, hemoglobin, hematocrit moved from immune to structural zone. Creatinine removed from cognitive zone. Homocysteine added to cardiovascular zone.
- **Weight dual-zone** -- weight now appears in both Energy & Metabolic and Structural zones (was missing from Structural).
- **Website tier limits** -- 12 mismatches fixed: Glimpse chat 2->3/mo, Focus chat 5->10/mo, Glimpse markers 8->15, Focus/Insight markers to unlimited, Glimpse history 30->90 days, Focus history/calc markers to unlimited, Insight templates to unlimited.

### Frontend
- **Demo banner removed** -- deleted demo-banner.tsx and all imports (#192).
- **Hydration error #418** -- removed inline theme script that caused SSR/client mismatch. Kept suppressHydrationWarning on body for remaining browser-extension-related mismatches.

### Ops
- **Deploy.sh VERSION updated** -- was stale at 0.23.0, now 0.25.0 with pre-flight check to prevent recurrence.
- **Deploy version check** -- tolerates staging build numbers (0.25.0-b1 matches 0.25.0).
- **Migration checksum fix** -- manually fixed SHA-384 checksum for migration 20260312000056 on both staging and production DBs.

---

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260322000005` | Fix marker-to-zone assignments (7 blood markers immune->structural, creatinine from cognitive, homocysteine to cardiovascular) |
| `20260322000006` | Add weight to structural zone_markers |

All migrations are idempotent (ON CONFLICT DO NOTHING / conditional UPDATEs).

---

## Documentation

| Document | Description |
|----------|-------------|
| Design doc 020 | Admin settings audit: 15/53 active, 38 orphaned, remediation plan |
| Sprint 007 | Full sprint planning + retrospective |

---

## Issues Created

| # | Title |
|---|-------|
| #197 | BPM not recognized by table importer |
| #198 | Separate staging notification channels (ntfy + Telegram) |
| #199 | LinkedIn link preview shows placeholder |
| #200 | Migration checksum mismatch blocks subsequent migrations |

## Issues Closed

| # | Title |
|---|-------|
| #180 | Admin settings audit (doc only) |
| #183 | Deploy script production pre-flight |
| #184 | Doctor chat soft-delete filter (v0.24.0) |
| #187 | Deep health check + watchdog (v0.24.0) |
| #189 | React hydration error #418 |
| #191 | Trend chart dots (v0.24.0) |
| #192 | Remove demo banner |
| #193 | Website/tier consistency |
| #196 | Marker-to-zone assignments |
| #197 | BPM marker alias |

---

## Testing

- **Backend:** clippy clean, smoke + integration + property tests passing
- **Frontend:** pnpm build clean, no TS errors
- **Staging:** 4 deploys (v0.24.0-b1 through b3 + frontend-only), verified weight in structural, calculated markers firing, demo banner gone
- **Production:** v0.25.0 deployed, all endpoints 200 OK, version confirmed

---

## Stats

- **Commits:** 11
- **Files changed:** 23
- **Lines added:** ~540
- **Lines removed:** ~150
- **Staging deploys:** 4
- **Production deploys:** 1
