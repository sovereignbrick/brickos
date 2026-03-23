# Sprint 008 - Import Reliability & Marker Coverage

**Started:** 2026-03-23
**Goal:** Fix production import failures -- add missing markers, improve error feedback for PDF quality issues and unmatched markers, log gaps for ongoing coverage improvement.

## Planned

| # | Title | Points | Area |
|---|-------|--------|------|
| [#202](https://github.com/sovereignbrick/brickos/issues/202) | fix: missing markers in import -- 19 alias fixes + 5 new markers + European naming | 10 | API |
| [#203](https://github.com/sovereignbrick/brickos/issues/203) | fix: toast error for unmatched markers during import | 3 | Frontend |
| [#204](https://github.com/sovereignbrick/brickos/issues/204) | fix: PDF quality failure gives no actionable error | 5 | Full-stack |
| [#205](https://github.com/sovereignbrick/brickos/issues/205) | feat: log unmatched marker names from imports | 3 | API |
| | **P0 Subtotal** | **21** | |

### P1 -- Backlog (pick after P0, ~15-20 pts remaining)

| # | Title | Points | Area |
|---|-------|--------|------|
| [#199](https://github.com/sovereignbrick/brickos/issues/199) | fix: LinkedIn preview / OG meta | 2 | Frontend |
| [#198](https://github.com/sovereignbrick/brickos/issues/198) | fix: staging notification verification | 2 | Ops |
| [#200](https://github.com/sovereignbrick/brickos/issues/200) | fix: migration checksum audit | 3 | API |
| [#185](https://github.com/sovereignbrick/brickos/issues/185) | fix: hydration suppressWarning cleanup | 2 | Frontend |
| #176-178 | GDPR cluster (privacy tab, consent, unsubscribe) | ~15 | Full-stack |

## Completed

| # | Title | Points | Commits |
|---|-------|--------|---------|
| #202 | fix: missing markers in import -- 19 alias fixes + 5 new markers + European naming + ua/tf/mg | 10 | ecee2d7 |
| #203 | fix: toast error for unmatched markers during import | 3 | ecee2d7 |
| #204 | fix: PDF quality failure -- resolved by #202 marker coverage | 5 | closed with #202 |
| #205 | feat: log unmatched marker names from imports | 3 | ecee2d7 |
| #199 | fix: LinkedIn preview / OG meta (app + website) | 2 | ecee2d7 |
| #200 | fix: migration checksum audit -- 118/118 clean | 3 | verified |
| #185 | fix: hydration suppressWarning -- intentional, no change needed | 2 | closed |
| #198 | fix: staging notification verification | 2 | 779f36a + ops |

## Carried Over

TBD

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| fix: docker-compose.dev.yml frontend build context | 1 | ecee2d7 |
| fix: upload menu label rename + file extension tooltips | 1 | ecee2d7 |
| fix: add UA alias for uric_acid | 0 | ecee2d7 |
| fix: tier-gate smart import buttons | 2 | 779f36a |
| feat: notification hooks (contact, newsletter, migration) | 2 | 779f36a |
| fix: deploy ntfy pre-flight check | 1 | 779f36a |
| fix: ntfy token + DNS on staging | 0 | ops |

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 21 pts (P0) + 9 pts (P1) = 30 pts |
| Completed (planned) | 30 pts |
| Completed (unplanned) | 7 pts |
| Carried over | 0 |
| Total delivered | 37 pts |

## Notes / Decisions

- Sprint follows v0.25.0 production release (2026-03-22)
- Doctor chat "missing markers" is the same root cause as #202 -- fix import matching, chat benefits downstream
- Multi-day sprint (2-3 days), budget ~40-50 pts total
- P1 items selected after P0 is complete
- Sprint 007 retro completed before sprint start

## #202 Marker Specification

### A. Alias-only fixes (19 markers -- slug + LOINC already in DB)

| DB Slug | LOINC | Zone | Aliases to Add |
|---|---|---|---|
| `calcium` | 17861-6 | structural | calcium, ca, kalzium, calcium gesamt |
| `magnesium` | 19123-9 | structural | magnesium, mg |
| `potassium` | 2823-3 | structural | potassium, kalium |
| `sodium` | 2951-2 | nutritional | sodium, natrium |
| `egfr` | 33914-3 | detoxification | egfr, gfr, glomeruläre filtrationsrate, estimated gfr |
| `ldh` | 2532-0 | detoxification | ldh, lactate dehydrogenase, laktatdehydrogenase |
| `free_testosterone` | 2991-8 | hormonal | free testosterone, freies testosteron, testosteron frei, ftest |
| `progesterone` | 10501-5 | hormonal | progesterone, progesteron, prog |
| `prolactin` | 2842-3 | hormonal | prolactin, prolaktin, prl, prol |
| `fsh` | 8302-2 | hormonal | fsh, follitropin, follikelstimulierendes hormon |
| `lh` | 10505-6 | hormonal | lh, lutropin, luteinisierendes hormon |
| `dha` | 35174-2 | nutritional | dha, docosahexaenoic acid, docosahexaensäure, docosahexaensaure |
| `epa` | 35173-4 | nutritional | epa, eicosapentaenoic acid, eicosapentaensäure, eicosapentaensaure |
| `omega3_index` | 88998-0 | nutritional | omega-3 index, omega3 index, omega 3 index |
| `transferrin` | 2502-3 | nutritional | transferrin, tf, trfe |
| `transferrin_sat` | -- | nutritional | transferrin saturation, transferrinsättigung, transferrinsattigung, tsat, tfs |
| `non_hdl_c` | 18262-6 | cardiovascular | non-hdl cholesterol, non-hdl-cholesterin, nicht-hdl-cholesterin, non hdl cholesterol |
| `vitamin_b2` | 2924-9 | nutritional | vitamin b2, riboflavin |
| `vitamin_b6` | 30552-4 | nutritional | vitamin b6, pyridoxal phosphate, pyridoxalphosphat, plp |

### B. European naming aliases for existing markers

| DB Slug | Aliases to Add |
|---|---|
| `alt` | alat, alanin-aminotransferase |
| `ast` | asat, aspartat-aminotransferase |
| `creatinine` | crea, krea |
| `iron` | fe |
| `bilirubin` | **Fix: remap all bilirubin aliases to `bilirubin_total` (DB slug)** |
| `free_androgen_index` | fti, free testosterone index |

### C. New markers (5 -- need migration + aliases + LOINC)

| Slug | Name | LOINC | Zone | Unit | Aliases |
|---|---|---|---|---|---|
| `amylase` | Amylase (Pancreatic) | 1805-1 | detoxification | U/L | amylase, pankreas-amylase, pamy, p-amylase |
| `lipase` | Lipase | 3040-3 | detoxification | U/L | lipase, pankreas-lipase, lip |
| `bun` | Urea (BUN) | 3094-0 | detoxification | mmol/L | bun, urea, harnstoff, hst, blood urea nitrogen |
| `igg` | IgG | 2465-3 | immune | g/L | igg, immunoglobulin g, immunglobulin g |
| `vldl_c` | VLDL Cholesterol | 13458-5 | cardiovascular | mmol/L | vldl, vldl-c, vldl cholesterol, vldl-cholesterin |

### D. Deferred

- LDL/HDL/VLDL particle sizes & diameters (NMR lipid panel -- rare)
- Urine markers (Nitrit, PH, specific gravity, Urobilinogen)
- % calculated markers from absolute values (future sprint)
- File upload limit increase (separate issue)
