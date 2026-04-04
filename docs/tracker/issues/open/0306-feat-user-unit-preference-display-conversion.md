# Issue #306: User unit preferences must apply to all displayed values

**Type:** bug
**Priority:** high
**Component:** frontend + backend / measurements display
**Found during:** manual testing (2026-04-02)
**Sprint:** 021

## Description

In Settings > Reference Ranges, each marker has a unit dropdown (e.g. mg/dL vs mmol/L for glucose, kg vs lbs for weight). This represents the user's unit preference for that marker. Currently, changing this unit has **no effect** on displayed values anywhere in the app — all measurements always show in the canonical (storage) unit.

The reference range table's unit column IS the user's unit preference. The app must respect this selection everywhere.

## Current State (code audit confirmed)

1. **User preferences stored:** `user_preferences` table has per-group unit fields (glucose_unit, cholesterol_unit, weight_unit, etc.)
2. **Backend `convert_unit()`** in `marker_matcher.rs` only converts **TO canonical** (import direction) — no reverse conversion exists
3. **Frontend `MARKER_UNIT_MAP`** in `thresholds-tab.tsx` has bidirectional conversion factors for 50+ markers — but is **only used within the settings page itself**
4. **All display components** (measurement list, trend charts, popovers, dashboard, Dr. Alex) receive canonical values from the API and display them as-is

## Expected Behavior

When a user selects a preferred unit for a marker, **all** measurement values for that marker are converted and displayed in that unit across the entire app:

| Component | File | Conversion needed |
|-----------|------|-------------------|
| Measurement list/cards | `app/measurements/page.tsx` | value + unit label |
| Trend charts (Y-axis + tooltips) | `components/trend-chart.tsx` | axis scale + data points |
| Measurement popover | `components/measurement-popover.tsx` | value + unit label |
| Marker detail page | `app/markers/[markerId]/page.tsx` | latest value + history |
| Dr. Alex chat context | `services/doctor_chat.rs` | values in AI context window |
| Import preview | `components/import/import-review.tsx` | pre-confirm display |
| PDF reports | health report generation | exported values |
| Dashboard widgets | `app/dashboard/` | summary values |
| Reference range zones | `components/zone-card.tsx` | zone boundaries |

Values remain stored in canonical units — conversion is display-time only.

## Implementation Plan

### Backend
1. **Bidirectional `convert_unit()`** — extend `marker_matcher.rs` to support canonical → user-preferred conversion (inverse of existing function)
2. **Include user unit preferences in settings API response** — already done via `GET /settings` → `units` field
3. **Dr. Alex context:** When building AI context, convert measurement values to user's preferred units so AI responses use the user's units

### Frontend
1. **Shared `useUnitConversion()` hook** — reads user preferences from settings context, exposes `convertValue(markerSlug, canonicalValue, canonicalUnit) → { value, unit }`
2. **Extract `MARKER_UNIT_MAP`** from `thresholds-tab.tsx` into a shared utility (`lib/unit-conversion.ts`) — it already has all bidirectional factors for 50+ markers
3. **Apply hook** in every component listed above
4. **Format values** with appropriate decimal places per unit type (e.g. mmol/L gets 1 decimal, mg/dL gets 0)

### Conversion Table (confirmed from existing `MARKER_UNIT_MAP`)
| Group | Canonical | Alternative | Factor |
|-------|-----------|-------------|--------|
| Glucose | mmol/L | mg/dL | ×18.018 |
| Cholesterol (total, LDL, HDL) | mmol/L | mg/dL | ×38.67 |
| Triglycerides | mmol/L | mg/dL | ×88.57 |
| Uric acid | µmol/L | mg/dL | ÷59.48 |
| Hemoglobin | mmol/L | g/dL | ×1.61 |
| HbA1c | % | mmol/mol | (% - 2.15) / 0.0915 |
| Creatinine | µmol/L | mg/dL | ÷88.4 |
| Vitamin D | nmol/L | ng/mL | ÷2.496 |
| Iron | µmol/L | µg/dL | ÷0.179 |
| Testosterone | nmol/L | ng/dL | ÷0.0347 |
| Cortisol | nmol/L | µg/dL | ÷27.59 |
| Weight | kg | lbs | ×2.20462 |
| Height | cm | in | ÷2.54 |
| Waist | cm | in | ÷2.54 |
| Temperature | °C | °F | ×1.8 + 32 |

## Location
- User unit preferences: `user_preferences` table, `GET /settings` → `units`
- Conversion factors: `frontend/src/app/settings/components/thresholds-tab.tsx` (to extract)
- Backend converter: `api/src/services/marker_matcher.rs:1089-1173`
- Target shared utility: `frontend/src/lib/unit-conversion.ts` (new)
- Target shared hook: `frontend/src/hooks/use-unit-conversion.ts` (new)

## Acceptance Criteria
1. Changing unit in reference range settings immediately affects all displayed values
2. Trend chart Y-axis and tooltips show values in user's preferred unit
3. Measurement list shows converted values with correct unit label
4. Dr. Alex references values in user's preferred unit
5. PDF reports use user's preferred units
6. Import preview shows values in user's preferred unit
7. No conversion errors — round-trip (canonical → display → canonical) preserves precision
