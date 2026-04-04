# Issue #306: User-selected unit in reference range settings has no effect on displayed values

**Type:** bug
**Priority:** high
**Component:** frontend + backend / measurements display
**Found during:** manual testing (2026-04-02)

## Description

In the user settings (reference ranges), each marker has a unit dropdown that allows the user to change the display unit (e.g. mg/dL → mmol/L for glucose, or kg → lbs for weight). However, changing this unit has no effect on how values are displayed throughout the app. All measurement values are always shown in the system-normalized (canonical) unit regardless of the user's preference.

## Current Behavior

1. User goes to Settings > Reference Ranges
2. User changes glucose unit from mg/dL to mmol/L
3. User navigates to measurements / dashboard / trend charts
4. Values are still displayed in mg/dL (the canonical storage unit)

## Expected Behavior

When a user selects a different unit for a marker, all measurement values for that marker should be converted and displayed in the user's preferred unit across the entire app:
- Measurement list / cards
- Trend charts (Y-axis + data points)
- Dashboard widgets
- Dr. Alex chat context
- PDF reports
- Import preview

The conversion should happen at display time — stored values remain in canonical units.

## Implementation Notes

### Backend
- Values are stored in canonical units (`value_canonical`, `unit_canonical`) in the measurements table
- User unit preferences are already stored in the reference range settings
- Need an endpoint or field that returns the user's preferred unit per marker
- `marker_matcher.rs` already has `convert_unit()` — may need an inverse function or a general bidirectional converter

### Frontend
- Need a utility function that converts canonical → user-preferred unit
- Must be applied consistently across all components that display measurement values
- Conversion factors need to be defined (mg/dL ↔ mmol/L, kg ↔ lbs, °C ↔ °F, etc.)

### Conversion table (common)
| Marker type | Canonical | Alternative | Factor |
|------------|-----------|-------------|--------|
| Glucose | mg/dL | mmol/L | ÷ 18.016 |
| Cholesterol | mg/dL | mmol/L | ÷ 38.67 |
| Triglycerides | mg/dL | mmol/L | ÷ 88.57 |
| Weight | kg | lbs | × 2.20462 |
| Height | cm | in | ÷ 2.54 |
| Temperature | °C | °F | × 1.8 + 32 |
| Creatinine | mg/dL | µmol/L | × 88.42 |
| Uric acid | mg/dL | µmol/L | × 59.48 |

## Location

- User unit preferences: reference range settings (backend + frontend)
- Display components: measurement cards, charts, dashboard, reports
- Conversion logic: `marker_matcher.rs` (backend) + new frontend utility
