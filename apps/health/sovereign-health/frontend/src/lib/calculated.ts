// Client-side real-time calculation of derived markers

export interface SessionValues {
  glucose?: number
  ketones?: number
  weight?: number
  waist_circumference?: number
  hemoglobin?: number
  hematocrit?: number
  insulin?: number
}

export interface ComputedMarker {
  slug: string
  name: string
  formula: string
  value: number | null
  note?: string
}

export function computeMarkers(values: SessionValues, heightCm?: number): ComputedMarker[] {
  const results: ComputedMarker[] = []

  // GKI
  const { glucose, ketones } = values
  if (glucose !== undefined && ketones !== undefined) {
    if (ketones > 0) {
      results.push({
        slug: 'gki',
        name: 'GKI',
        formula: 'Glucose ÷ Ketones',
        value: glucose / ketones,
      })
      results.push({
        slug: 'dr_boz_ratio',
        name: 'Dr. Boz Ratio',
        formula: 'Glucose (mg/dL) ÷ Ketones',
        value: (glucose * 18) / ketones,
      })
    } else {
      results.push({ slug: 'gki', name: 'GKI', formula: 'Glucose ÷ Ketones', value: null, note: 'Ketones below detection' })
    }
  }

  // WHtR
  if (values.waist_circumference !== undefined && heightCm) {
    results.push({
      slug: 'whtr',
      name: 'WHtR',
      formula: 'Waist ÷ Height',
      value: values.waist_circumference / heightCm,
    })
  }

  // BMI
  if (values.weight !== undefined && heightCm) {
    const hm = heightCm / 100
    results.push({
      slug: 'bmi',
      name: 'BMI',
      formula: 'Weight ÷ Height²',
      value: values.weight / (hm * hm),
    })
  }

  // HCT/HB
  if (values.hematocrit !== undefined && values.hemoglobin !== undefined && values.hemoglobin > 0) {
    const hbGdl = values.hemoglobin * 1.61
    results.push({
      slug: 'hct_hb_ratio',
      name: 'HCT/HB',
      formula: 'Hematocrit ÷ Hemoglobin (g/dL)',
      value: values.hematocrit / hbGdl,
    })
  }

  // HOMA-IR
  if (values.glucose !== undefined && values.insulin !== undefined) {
    results.push({
      slug: 'homa_ir',
      name: 'HOMA-IR',
      formula: '(Glucose mg/dL × Insulin) ÷ 405',
      value: (values.glucose * 18.018 * values.insulin) / 405,
    })
  }

  return results
}
