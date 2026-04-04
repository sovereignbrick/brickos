# v0.32.0 RC Test Checklist — Sprint 019

**Date:** 2026-04-03
**Environment:** localhost (docker-compose.dev.yml)
**Tester:** manual

---

## Pre-flight

- [ ] Backend starts without migration crash (was #311 crash loop)
- [ ] Backend logs show all migrations applied successfully
- [ ] Frontend loads at http://localhost:3000
- [ ] Login works with demo credentials

---

## #311 — Migration crash fix

- [ ] Backend starts cleanly (no crash loop)
- [ ] Demo profiles show calculated markers (GKI, BMI, WHtR, Dr. Boz, HOMA-IR)
- [ ] "average" and "at_risk" demo profiles have realistic values on dashboard

---

## #303 — German marker aliases

- [ ] Import a German lab PDF with "GFR (MDRD-kurz)" → matched as eGFR
- [ ] Import a lab with "HbA1c (HPLC)" → matched as HbA1c
- [ ] "Cholesterin Ges." → matched as Total Cholesterol
- [ ] "Alkal. Phosphatase" → matched as ALP
- [ ] "Bilirubin Ges." → matched as Bilirubin Total
- [ ] "Calprotectin i.St." → matched as Calprotectin (new marker)

---

## #299 — Import rollback button

- [ ] Navigate to Measurements > Imports
- [ ] Confirm import sessions are listed with rollback buttons
- [ ] Click rollback → confirmation dialog appears
- [ ] Confirm rollback → measurements deleted, entry removed from list
- [ ] Verify in measurements list that rolled-back data is gone

---

## #305 — Dr. Alex 360-day window

- [ ] Open Dr. Alex chat
- [ ] Ask "What are my trends?" or "Analyze my health"
- [ ] Dr. Alex should reference data older than 30 days (if present)
- [ ] Verify context includes up to 360 days of measurements

---

## #300 — Mobile smart import buttons

- [ ] Open Dr. Alex chat on mobile viewport (< 430px)
- [ ] Smart import buttons (Lab PDF, Medication, Table) should wrap to 2 rows
- [ ] All buttons fully visible and tappable
- [ ] No horizontal overflow

---

## #304 — 9 body composition markers

- [ ] New markers visible in Settings > Reference Ranges:
  - Skeletal Muscle (%)
  - Muscle Mass (kg)
  - Subcutaneous Fat (%)
  - Visceral Fat (level)
  - Fat-Free Mass (kg)
  - BMR (kcal)
  - Metabolic Age (years)
  - Body Protein (%)
  - Bone Mass (kg)
- [ ] Each marker has EN and DE translations
- [ ] Markers appear in the Structural zone

---

## #302 — Renpho smart scale import

- [ ] Import a Renpho smart scale screenshot via Dr. Alex
- [ ] Body composition markers extracted: weight, body fat, skeletal muscle, visceral fat, etc.
- [ ] German labels recognized (Gewicht, Körperfett, Skelettmuskel, etc.)
- [ ] Comma decimals parsed correctly (69,20 → 69.20)
- [ ] Ambiguous kg/% mappings shown for user confirmation in review
- [ ] BMI computed automatically after weight import
- [ ] Confidence scores shown in review table

---

## #307 — Lab deduplication + dropdown

- [ ] Import a lab PDF → review screen shows "Assign to Lab" dropdown
- [ ] If lab exists, it's pre-selected in dropdown
- [ ] User can select a different existing lab from dropdown
- [ ] User can select "Create new lab" option
- [ ] When selecting existing lab, address fields auto-fill
- [ ] Confirm import → measurement linked to selected lab (not duplicate created)
- [ ] Import a second PDF from same lab → auto-matched to existing lab

---

## Post-test

- [ ] No console errors in browser DevTools
- [ ] No backend panics or error logs (check docker logs sh-backend)
- [ ] All 38 automated tests pass: `cargo test -p sovereign-health-backend --lib`
