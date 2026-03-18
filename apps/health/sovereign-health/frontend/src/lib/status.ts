// Client-side traffic light status calculation matching backend logic

export type Status = 'green' | 'orange' | 'red' | null

export interface Range {
  orange_min: number | null
  green_min: number | null
  green_max: number | null
  orange_max: number | null
}

export function computeStatus(value: number, range: Range): Status {
  const { orange_min, green_min, green_max, orange_max } = range
  if (orange_min === null && green_min === null && green_max === null && orange_max === null) {
    return null
  }
  if (orange_min !== null && value < orange_min) return 'red'
  if (orange_max !== null && value > orange_max) return 'red'
  const inGreen =
    (green_min === null || value >= green_min) &&
    (green_max === null || value <= green_max)
  return inGreen ? 'green' : 'orange'
}

export function statusColor(status: Status | undefined | null): string {
  switch (status) {
    case 'green':  return '#4ade80'
    case 'orange': return '#fb923c'
    case 'red':    return '#ef4444'
    default:       return '#71717a'
  }
}

export function statusEmoji(status: Status | undefined | null): string {
  switch (status) {
    case 'green':  return '🟢'
    case 'orange': return '🟡'
    case 'red':    return '🔴'
    default:       return '⚫'
  }
}

// Default reference ranges for client-side calculation
export const DEFAULT_RANGES: Record<string, Range> = {
  glucose:             { orange_min: 3.5, green_min: 3.9, green_max: 5.5, orange_max: 6.9 },
  ketones:             { orange_min: 0.0, green_min: 0.0, green_max: 0.5, orange_max: 1.0 },
  total_cholesterol:   { orange_min: 3.0, green_min: 3.5, green_max: 5.0, orange_max: 6.5 },
  uric_acid:           { orange_min: 150, green_min: 180, green_max: 360, orange_max: 450 },
  hemoglobin:          { orange_min: 6.5, green_min: 7.5, green_max: 11.0, orange_max: 12.5 },
  hematocrit:          { orange_min: 33,  green_min: 36,  green_max: 50,   orange_max: 53 },
  bp_systolic:         { orange_min: 80,  green_min: 90,  green_max: 120,  orange_max: 130 },
  bp_diastolic:        { orange_min: 55,  green_min: 60,  green_max: 80,   orange_max: 90 },
  heart_rate:          { orange_min: 40,  green_min: 50,  green_max: 80,   orange_max: 100 },
  weight:              { orange_min: null, green_min: null, green_max: null, orange_max: null },
  waist_circumference: { orange_min: null, green_min: null, green_max: null, orange_max: null },
  insulin:             { orange_min: 2,   green_min: 3,   green_max: 10,   orange_max: 18 },
  // Calculated markers
  gki:                 { orange_min: 3.0, green_min: 3.0, green_max: 6.0,  orange_max: 9.0 },
  dr_boz_ratio:        { orange_min: 0,   green_min: 0,   green_max: 40,   orange_max: 80 },
  whtr:                { orange_min: 0.35, green_min: 0.40, green_max: 0.50, orange_max: 0.58 },
  bmi:                 { orange_min: 17,  green_min: 18.5, green_max: 24.9, orange_max: 29.9 },
  hct_hb_ratio:        { orange_min: 2.5, green_min: 2.7, green_max: 3.5,  orange_max: 3.7 },
  homa_ir:             { orange_min: 0,   green_min: 0,   green_max: 1.0,  orange_max: 2.0 },
}
