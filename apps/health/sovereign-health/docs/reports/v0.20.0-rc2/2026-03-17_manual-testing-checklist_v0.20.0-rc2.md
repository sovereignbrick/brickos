# Manual Testing Checklist — v0.20.0-rc2

**Date:** 2026-03-17
**Scope:** Issues discovered and fixed during session; regression tests for staging deploy.

---

## Pre-Deploy Checks

### DEPLOY-01: Password hash integrity after SSH deploy
**Priority:** Critical
**Category:** Infrastructure / Deploy
**Root cause:** Shell `$` characters in Argon2 hashes are silently stripped when passed through SSH + psql, producing a corrupted hash that always fails verification.

| Step | Expected |
|---|---|
| 1. Deploy or reset a user password via SSH | Hash stored in DB |
| 2. Query `SELECT substring(password_hash, 1, 20)` | Must start with `$argon2id$v=19$m=` |
| 3. If hash starts with `=19=19456` or similar (missing `$argon2id$v`) | **FAIL — hash is corrupted** |
| 4. Attempt login with the password | Login succeeds |

**Fix pattern:** Always pipe SQL via `stdin` (heredoc or file), never inline `$`-containing strings in shell arguments:
```bash
# WRONG — $ gets interpreted by shell
ssh host "psql -c \"UPDATE users SET password_hash = '$HASH' ...\""

# CORRECT — pipe SQL file
cat fix_pw.sql | ssh host "docker exec -i db psql -U user -d db"
```

### DEPLOY-02: Rate limiter state after restart
**Priority:** Medium
**Category:** Infrastructure

| Step | Expected |
|---|---|
| 1. Trigger rate limit (multiple failed login attempts) | 429 Too Many Requests |
| 2. Restart backend container | Rate limiter clears (in-memory) |
| 3. Login succeeds immediately | No lingering rate limit |

---

## Authentication

### AUTH-01: Login with valid credentials
| Step | Expected |
|---|---|
| 1. Navigate to /login | Login form renders |
| 2. Enter `demo@sovereignhealth.io` / `Demo2026!` | Login succeeds |
| 3. Redirected to /dashboard | Dashboard loads with user data |

### AUTH-02: Login rate limiting
| Step | Expected |
|---|---|
| 1. Enter wrong password 10+ times | 429 "Too many requests" after threshold |
| 2. Wait or restart backend | Rate limit clears |

---

## Health Zones

### ZONE-01: Zone list loads without DB error
**Root cause:** SQL joined `zone_translations` on non-existent `zt.zone_slug` instead of `zt.zone_id`.

| Step | Expected |
|---|---|
| 1. Navigate to /dashboard | Zone cards render with names |
| 2. Click any zone tile (e.g. Immune) | Zone detail page loads |
| 3. All markers visible with values | No "page not available" error |
| 4. Check backend logs | No `column zt.zone_slug does not exist` errors |

---

## Measurements

### MEAS-01: Meal timing (Messzeitpunkt) displays correctly
**Root cause:** Marker tiles showed raw `protocol_tag` ("Fasting") instead of translated `meal_timing_tag`.

| Step | Expected |
|---|---|
| 1. Navigate to /markers/glucose | Recent measurements list visible |
| 2. Measurements with fasting state | Shows "Nüchtern (vor dem Essen)" in DE, not "Fasting" |
| 3. Measurements without meal timing | Shows "-" |
| 4. Hover over measurement (popover) | "Protokoll" shows translated meal timing label |

### MEAS-02: Measurement form grid layout
| Step | Expected |
|---|---|
| 1. Navigate to /measurements/new | Form renders |
| 2. Messzeitpunkt dropdown | Full text visible, not truncated ("Nüchtern (vor dem Essen)") |
| 3. Schlafstunden input | Narrow, proportional to field name |
| 4. Schlafqualität, Stresslevel | Normal width, unchanged |

### MEAS-03: Marker names translated on measurements list
**Root cause:** `m.marker_name` used raw English name instead of `contentMarkers[slug].name`.

| Step | Expected |
|---|---|
| 1. Set language to DE | |
| 2. Navigate to /measurements | Measurement list loads |
| 3. Marker names | German names (e.g. "Glukose", "Hämoglobin"), not English |

### MEAS-04: Popover translates lifestyle values
**Root cause:** Diet protocol, exercise, sleep quality shown as raw English strings.

| Step | Expected |
|---|---|
| 1. Hover over a measurement with diet/exercise data | Popover shows |
| 2. Ernährung field | "Karnivor" (DE) not "Carnivore" |
| 3. Bewegung field | "Krafttraining" (DE) not "Strength" |
| 4. Schlafqualität | Translated quality label |

---

## Lab Import (Dr. Chat)

### LAB-01: Image compression prevents Anthropic 5MB error
**Root cause:** Anthropic Vision API limits base64 to 5MB per image. Photos >3.75MB raw exceed this after base64 encoding.

| Step | Expected |
|---|---|
| 1. Upload 3 photos of medication packaging (~4-5MB each) | Upload succeeds |
| 2. Check backend logs | "Compressed image from X to Y bytes" logged |
| 3. AI extraction returns results | No "image exceeds 5 MB maximum" error |

### LAB-02: Lab entity created on import
| Step | Expected |
|---|---|
| 1. Import lab report via Dr. Chat | Review page shows lab fields |
| 2. Fill in lab name (e.g. "Synlab Berlin") | Editable input pre-filled from AI |
| 3. Fill address, PLZ, city, country | All fields editable |
| 4. Confirm import | Success message |
| 5. Navigate to /settings?tab=devices | New lab appears under "Laboranbieter" section |
| 6. Click "Bearbeiten" on the lab | Shows lab fields (address, PLZ, city, country), NOT Hersteller/Modell |
| 7. Validierung section | **Hidden** for lab type devices |

### LAB-03: Lab device reused on repeat import
| Step | Expected |
|---|---|
| 1. Import another lab report with same lab name | Uses existing lab device |
| 2. Check /settings?tab=devices | No duplicate lab entry created |
| 3. Address fields updated if AI extracted new info | Updated on existing device |

### LAB-04: Protocol dropdown dark theme
**Root cause:** Select used `bg-white/[0.05]` without option styling.

| Step | Expected |
|---|---|
| 1. Import a lab report, reach review page | |
| 2. Click Protocol dropdown | Options have dark background (zinc-900), white text |
| 3. No white/pink background flash | Consistent with other dropdowns |

---

## Device Settings

### DEV-01: Lab device shows lab-specific fields
| Step | Expected |
|---|---|
| 1. Navigate to /settings?tab=devices | Device list loads |
| 2. Edit a device with type "Laboranbieter" | Shows: Address, PLZ, Stadt, Land |
| 3. Does NOT show | Hersteller, Modell fields hidden |
| 4. Validierung section | Hidden for lab type |
| 5. Edit a device with type "Heimgerät" | Shows: Hersteller, Modell, Validierung |

### DEV-02: Lab device type change toggles fields
| Step | Expected |
|---|---|
| 1. Create new device, select type "Laboranbieter" | Lab fields appear |
| 2. Switch type to "Heimgerät" | Lab fields disappear, Hersteller/Modell appear |
| 3. Switch back to "Laboranbieter" | Lab fields reappear |

---

## i18n (Internationalization)

### I18N-01: All new strings translated EN + DE
| Area | EN key exists | DE key exists |
|---|---|---|
| `common.mealTimingLabels.*` (7 keys) | Yes | Yes |
| `import.*` (18 keys) | Yes | Yes |
| `devices.labAddress/labPostalCode/labCity/labCountry` | Yes | Yes |
| `devices.placeholders.labAddress/labCity/labCountry` | Yes | Yes |

### I18N-02: Meal timing labels render in active locale
| Step | Expected |
|---|---|
| 1. Switch to DE | |
| 2. Check /markers/glucose measurement tiles | "Nüchtern (vor dem Essen)", not "Fasting (before eating)" |
| 3. Switch to EN | "Fasting (before eating)" |

---

## Staging Deploy Verification

### STAGE-01: API health check
```bash
curl https://api-demo.sovereignhealth.io/health
# Expected: {"status":"ok","version":"0.20.0-rc2"}
```

### STAGE-02: Login works on staging
| Step | Expected |
|---|---|
| 1. Navigate to https://demo.sovereignhealth.io/login | Login page renders |
| 2. Login with demo@sovereignhealth.io / Demo2026! | Redirected to dashboard |

### STAGE-03: Migration applied on staging
| Step | Expected |
|---|---|
| 1. SSH to VPS, check `labs` table exists | `\d labs` shows schema |
| 2. Check `devices.lab_address` column exists | Column present |
| 3. Check `measurements.lab_id` column exists | Column present |

---

## Regression Tests (Quick Smoke)

| # | Test | Route | Expected |
|---|---|---|---|
| 1 | Dashboard loads | /dashboard | Zone cards, markers visible |
| 2 | Add measurement | /measurements/new | Form renders, save works |
| 3 | Marker detail | /markers/glucose | Chart + measurements render |
| 4 | Zone detail | /zones/immune | All markers with values |
| 5 | Device settings | /settings?tab=devices | Devices + labs listed |
| 6 | Dr. Chat | /doctor-chat | Chat loads, file upload works |
| 7 | Trends | /trends | Chart renders |
| 8 | Measurements list | /measurements | Translated marker names |
