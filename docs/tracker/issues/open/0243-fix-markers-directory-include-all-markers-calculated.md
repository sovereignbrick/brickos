---
number: 243
title: "fix: markers directory must include all markers + calculated markers"
labels: [bug, website, content]
milestone: ux-and-onboarding
---

## Description

The markers directory page at `sovereignhealth.io/markers/` may be missing recently added markers and does not include calculated markers. This page is used by visitors to understand what the platform tracks — it must be complete and up-to-date.

## Audit Required

### 1. Regular Markers
- Compare website markers list against `SELECT marker_slug, marker_name FROM markers` in production DB
- Identify any markers added in Sprints 008-011 that are missing:
  - Amylase, Lipase, BUN/Urea (Sprint 008)
  - IgG, VLDL-C (Sprint 008)
  - FSH (alias fix, Sprint 008)
  - Total Fatty Acids (Sprint 009)
  - Any others from recent migrations

### 2. Calculated Markers
- These are NOT in the `markers` table — they're in `calculated_markers`
- Must be added to the directory: GKI, BMI, WHtR, HOMA-IR, Dr. Boz Ratio, HCT/HB, TG/HDL, ApoB/ApoA1, Non-HDL-C, LDL/HDL, etc.
- 22+ calculated markers exist — verify count matches app
- Each needs: name, description, formula explanation, zone assignment, reference range

### 3. Website Data Source
- Check if markers directory reads from API or static JSON
- If static: needs regeneration from DB
- If API: verify the endpoint returns all markers + calculated

## Files to Check
- `website/src/app/markers/page.tsx` — markers directory component
- `website/src/data/` — static marker data files (if used)
- `api/src/handlers/content.rs` — content endpoints that serve marker data
- `api/migrations/*markers*` — recent marker additions

## Deliverables
- [ ] All regular markers from DB appear in directory
- [ ] All 22+ calculated markers added to directory
- [ ] Each marker has: name (EN+DE), description, zone, unit, reference range info
- [ ] Count in page header matches actual marker count ("85+ Biomarkers" — verify)
