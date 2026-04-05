export const SAMPLE_PROFILES = {
  standard: {
    gender: 'male',
    age: 35,
    height_cm: 180,
  },
  keto: {
    gender: 'female',
    age: 42,
    height_cm: 165,
  },
} as const

export const SAMPLE_UNITS = {
  metric: {
    glucose_unit: 'mmol/L',
    weight_unit: 'kg',
    height_unit: 'cm',
  },
  imperial: {
    glucose_unit: 'mg/dL',
    weight_unit: 'lbs',
    height_unit: 'in',
  },
} as const
