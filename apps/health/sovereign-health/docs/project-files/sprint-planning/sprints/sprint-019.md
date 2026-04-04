# Sprint 019 -- Import Quality & Dr. Alex Intelligence

**Started:** 2026-04-03
**Duration:** 2 days (2026-04-03 → 2026-04-04)
**Status:** CLOSED — tested and verified 2026-04-03
**Goal:** Fix migration crash, improve German lab import coverage, add lab dedup with user-facing dropdown, expand body composition import for Renpho smart scale, and extend Dr. Alex analysis window to 360 days.

## Context

v0.31.0 (Sprint 018) shipped import history and per-date calculated markers but introduced a migration crash (#311) on staging and left the rollback button non-functional (#299). Users importing German lab PDFs still hit missing aliases (#303), and Renpho smart scale screenshots lose most body composition markers (#302, #304). Dr. Alex only analyses 30 days of data, which is too narrow for quarterly lab users (#305). Lab imports always create duplicate lab entries instead of reusing existing ones (#307).

Development happens on localhost containers first, then staging demo.

## Sprint Backlog

### M1: Import Stability (Day 1)

| # | Title | Points | Area |
|---|-------|--------|------|
| #311 | Fix migration crash -- encrypted value cast as double precision | 2 | Backend / Migration |
| #303 | German marker aliases (GFR MDRD, HbA1c variants, abbreviations, calprotectin) | 3 | Backend / Marker Matcher |
| #299 | Import rollback button not triggering API call | 2 | Frontend |
| | **M1 Subtotal** | **7** | |

### M2: Dr. Alex Intelligence (Day 1)

| # | Title | Points | Area |
|---|-------|--------|------|
| #305 | Extend Dr. Alex analysis window 30 → 360 days | 1 | Backend |
| #300 | Dr. Alex mobile smart import buttons flex-wrap | 1 | Frontend / CSS |
| | **M2 Subtotal** | **2** | |

### M3: Import Coverage (Day 2)

| # | Title | Points | Area |
|---|-------|--------|------|
| #304 | Add 9 body composition markers for smart scale imports | 5 | Backend / Migration + Matcher |
| #302 | Fix tabular import for Renpho body composition screenshots | 3 | Backend / AI Extraction |
| #307 | Lab dedup with user dropdown in import review | 5 | Full-stack |
| | **M3 Subtotal** | **13** | |

## Velocity Budget

| Milestone | Points |
|-----------|--------|
| M1 -- Import Stability | 7 pts |
| M2 -- Dr. Alex Intelligence | 2 pts |
| M3 -- Import Coverage | 13 pts |
| **Total Planned** | **22 pts** |

## Dependency Graph

```
DAY 1 -- Fix & Stabilize
═════════════════════════

#311 (P0) Migration crash fix
  ↓ unblocks all staging deploys

  ├── #303 German marker aliases        (independent)
  ├── #299 Rollback button wiring       (independent)
  ├── #305 Dr. Alex 360-day window      (independent, 1-line change)
  └── #300 Mobile button flex-wrap      (independent, CSS-only)

DAY 2 -- Expand & Polish
═════════════════════════

#304 Add 9 body composition markers
  ↓ markers must exist before matching
#302 Fix Renpho tabular import extraction
  ↓ depends on #304 (new markers) + #303 (aliases)

#307 Lab dedup + dropdown              (independent)
  ↓ benefits from #303 being done (more labs to match)

Final: localhost RC test → staging deploy
```

## Execution Order

```
DAY 1
1. #311 Migration crash      -- replace encrypted-column queries with hardcoded demo values   ~45 min
2. #303 German aliases       -- add ~20 aliases + calprotectin marker definition              ~1.5 hrs
3. #299 Rollback button      -- wire onClick to POST /import/sessions/:id/rollback            ~30 min
4. #305 Dr. Alex window      -- change INTERVAL '30 days' → '360 days' + update prompt text   ~15 min
5. #300 Mobile buttons       -- flex-wrap on action buttons container                          ~15 min
6. Localhost test pass        -- cargo test + pnpm build                                       ~30 min

DAY 2
7. #304 Body comp markers    -- migration + matcher aliases + i18n + LOINC codes              ~2 hrs
8. #302 Renpho extraction    -- update AI prompt + add confidence flagging in review UI        ~2 hrs
9. #307 Lab dedup + dropdown -- normalize matching + dropdown in import-review.tsx             ~3 hrs
10. Full RC test + staging   -- end-to-end import test on localhost, then staging deploy       ~1 hr
```

## Issue Details

### #311 -- Migration crash (P0 CRITICAL)

**Root cause:** `20260326000001_seed_calculated_markers_avg_atrisk.sql` casts `ms.value_canonical::float8` but `value_canonical` contains AES ciphertext (`v1:...`). Demo data is encrypted like production data.

**Fix:** Replace all `ms.value_canonical::float8` queries with hardcoded known demo values. The demo seed data is deterministic — we know the exact glucose, ketone, weight, waist, and insulin values that were seeded. Compute GKI, Dr. Boz, BMI, WHtR, HOMA-IR from those known constants.

**Migration strategy:** Delete the failed row from `_sqlx_migrations` on staging (migration never succeeded — crash loop), replace the migration file content, re-run.

### #303 -- German marker aliases

Add ~20 missing aliases to `marker_matcher.rs`:
- GFR MDRD variants → `egfr`
- HbA1c with method suffixes (HPLC, IFCC) → `hba1c`
- German abbreviations (Ges., Alkal.) → respective markers
- New `calprotectin` marker + aliases (requires migration)

### #299 -- Rollback button

Frontend-only fix. Wire the onClick handler in `/measurements/imports/page.tsx` to call `POST /import/sessions/:id/rollback`. Add confirmation dialog before executing.

### #305 -- Dr. Alex 360-day window

One-line change in `doctor_chat.rs:58`: `INTERVAL '30 days'` → `INTERVAL '360 days'`. Keep 200-row limit. Update tier description in `dr_alex_public_prompt.txt`.

### #300 -- Mobile smart import buttons

CSS fix: add `flex-wrap: wrap` + appropriate gap on the action buttons container in Dr. Alex chat.

### #304 -- 9 body composition markers

**New markers (all structural zone, source_type: home):**

| Slug | Unit | LOINC | Green (M) | Green (F) |
|------|------|-------|-----------|-----------|
| skeletal_muscle_pct | % | 73965-6 | 33–43 | 25–35 |
| muscle_mass_kg | kg | 73964-9 | trend-only | trend-only |
| subcutaneous_fat_pct | % | 41982-0 | 8–20 | 15–25 |
| visceral_fat | level | — | 1–12 | 1–12 |
| fat_free_mass | kg | 8342-8 | trend-only | trend-only |
| bmr | kcal | — | 1500–1900 | 1200–1500 |
| metabolic_age | years | — | ≤ chrono age | ≤ chrono age |
| body_protein_pct | % | — | 16–20 | 16–20 |
| bone_mass_kg | kg | 101686-4 | 2.65–3.69 | 1.95–2.90 |

**kg vs % disambiguation:** Marker matcher checks extracted unit:
- "Knochenmasse 2.04 kg" → `bone_mass_kg`
- "Knochenmasse 6%" → `bone_mass_pct` (existing)
- Ambiguous cases → flagged in pre-import review for user confirmation

### #302 -- Renpho tabular import

**Source format:** Renpho app grid layout with German labels, comma decimals, two-line-per-row format.

**Fix approach:**
1. Update AI extraction prompt to handle Renpho grid layouts
2. Add confidence scoring to extracted marker mappings
3. Low-confidence mappings shown as editable dropdowns in import review
4. User confirms/corrects before final import
5. Ensure BMI is computed post-import via `enrich_with_latest_values`

### #307 -- Lab dedup + dropdown

**Backend:**
- Add `normalize_lab_name()` — lowercase, strip titles (Dr., med., Prof., Dipl.), trim, collapse spaces
- Import upload response includes `suggested_lab_id` + full `existing_labs` list
- Matching: exact match after normalization → auto-select; no match → user picks

**Frontend (import-review.tsx):**
- Add lab dropdown below detected lab name: existing labs + "Create new lab"
- Pre-select if normalized name matches
- If user selects existing lab → send `lab_id` in confirm
- If user picks "Create new" → send `lab_name` (current behavior)

## Success Criteria

1. **Staging no longer crash-loops** — migration #311 fixed
2. **German lab import matches GFR MDRD, HbA1c (HPLC/IFCC), abbreviated markers, calprotectin**
3. **Import rollback button works** — triggers API call + removes measurements
4. **Dr. Alex analyses 360 days of data** — quarterly lab users get full trend context
5. **Smart import buttons wrap on mobile** — no overflow on narrow screens
6. **Renpho smart scale screenshot imports all body composition markers** — with user confirmation for ambiguous mappings
7. **Lab dedup dropdown in import review** — user can assign to existing lab or create new
8. **All tests pass** — cargo test + pnpm build green on localhost before staging

## Risk Assessment

- **#304 (9 markers)** is the largest single item. Migration + aliases + i18n + LOINC for 9 markers is substantial but mechanical.
- **#302 (Renpho extraction)** depends on AI prompt quality. May need iteration on the extraction prompt to handle the grid format reliably.
- **#307 (lab dedup)** has good existing infrastructure (labs table, CRUD endpoints, import confirm already accepts lab_id). Main work is the frontend dropdown and normalization logic.
- **#311 (migration)** requires careful staging DB cleanup. Must verify the `_sqlx_migrations` row is deleted before re-deploying.
