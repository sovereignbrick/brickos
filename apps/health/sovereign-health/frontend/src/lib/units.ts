import type { UnitPreferences } from './types'

// Unit conversion definitions for markers that support multiple units.
// The `group` field maps to a key in UnitPreferences (e.g. 'glucose_unit').

export interface UnitConversion {
  options: string[]
  group: string
  convert?: Record<string, Record<string, number>>
}

export const MARKER_UNIT_MAP: Record<string, UnitConversion> = {
  glucose:            { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  fasting_glucose:    { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  total_cholesterol:  { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  ldl_c:              { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  hdl_c:              { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  vldl:               { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  non_hdl_c:          { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  triglycerides:      { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 88.57 }, 'mg/dL': { 'mmol/L': 1/88.57 } } },
  apo_b:              { options: ['g/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'g/L': { 'mg/dL': 100 }, 'mg/dL': { 'g/L': 0.01 } } },
  lp_a:               { options: ['nmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'nmol/L': { 'mg/dL': 0.4167 }, 'mg/dL': { 'nmol/L': 2.4 } } },
  uric_acid:          { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/59.48 }, 'mg/dL': { '\u00b5mol/L': 59.48 } } },
  hemoglobin:         { options: ['mmol/L', 'g/dL'], group: 'hemoglobin_unit', convert: { 'mmol/L': { 'g/dL': 1.61 }, 'g/dL': { 'mmol/L': 1/1.61 } } },
  insulin:            { options: ['mU/L', 'pmol/L'], group: 'glucose_unit', convert: { 'mU/L': { 'pmol/L': 6.945 }, 'pmol/L': { 'mU/L': 1/6.945 } } },
  hba1c:              { options: ['%', 'mmol/mol'], group: 'glucose_unit', convert: { '%': { 'mmol/mol': 10.93 }, 'mmol/mol': { '%': 1/10.93 } } },
  creatinine:         { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/88.4 }, 'mg/dL': { '\u00b5mol/L': 88.4 } } },
  vitamin_d:          { options: ['nmol/L', 'ng/mL'], group: 'glucose_unit', convert: { 'nmol/L': { 'ng/mL': 1/2.496 }, 'ng/mL': { 'nmol/L': 2.496 } } },
  calcium:            { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 4.0 }, 'mg/dL': { 'mmol/L': 0.25 } } },
  magnesium:          { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 2.43 }, 'mg/dL': { 'mmol/L': 1/2.43 } } },
  potassium:          { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  sodium:             { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  iron:               { options: ['\u00b5mol/L', '\u00b5g/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { '\u00b5g/dL': 5.585 }, '\u00b5g/dL': { '\u00b5mol/L': 1/5.585 } } },
  weight:             { options: ['kg', 'lbs'], group: 'weight_unit', convert: { 'kg': { 'lbs': 2.205 }, 'lbs': { 'kg': 1/2.205 } } },
  height:             { options: ['cm', 'in'], group: 'height_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
  waist_circumference:{ options: ['cm', 'in'], group: 'waist_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
}

export function getDisplayUnit(
  slug: string,
  canonicalUnit: string,
  prefs: UnitPreferences | null
): string {
  if (!prefs) return canonicalUnit
  const info = MARKER_UNIT_MAP[slug]
  if (!info) return canonicalUnit
  const preferred = (prefs as unknown as Record<string, unknown>)[info.group]
  if (typeof preferred === 'string' && info.options.includes(preferred)) return preferred
  return canonicalUnit
}

export function convertValue(
  slug: string,
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  if (fromUnit === toUnit) return value
  const info = MARKER_UNIT_MAP[slug]
  const factor = info?.convert?.[fromUnit]?.[toUnit]
  if (!factor) return value
  return value * factor
}
