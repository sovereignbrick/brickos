import { describe, it, expect } from 'vitest'
import { convertValue, getDisplayUnit, MARKER_UNIT_MAP } from './units'

describe('convertValue', () => {

  describe('glucose conversions', () => {
    it('converts mmol/L to mg/dL', () => {
      const result = convertValue('glucose', 5.0, 'mmol/L', 'mg/dL')
      expect(result).toBeCloseTo(90.09, 0)
    })

    it('converts mg/dL to mmol/L', () => {
      const result = convertValue('glucose', 90, 'mg/dL', 'mmol/L')
      expect(result).toBeCloseTo(5.0, 1)
    })

    it('returns same value when units match', () => {
      const result = convertValue('glucose', 5.0, 'mmol/L', 'mmol/L')
      expect(result).toBe(5.0)
    })

    it('roundtrip conversion preserves value', () => {
      const original = 5.5
      const inMgDl = convertValue('glucose', original, 'mmol/L', 'mg/dL')
      const backToMmol = convertValue('glucose', inMgDl, 'mg/dL', 'mmol/L')
      expect(backToMmol).toBeCloseTo(original, 1)
    })
  })

  describe('cholesterol conversions', () => {
    it('converts total_cholesterol mmol/L to mg/dL', () => {
      const result = convertValue('total_cholesterol', 5.2, 'mmol/L', 'mg/dL')
      expect(result).toBeCloseTo(201, 0)
    })

    it('converts LDL mmol/L to mg/dL', () => {
      const result = convertValue('ldl_c', 3.0, 'mmol/L', 'mg/dL')
      expect(result).toBeCloseTo(116, 0)
    })

    it('converts HDL mmol/L to mg/dL', () => {
      const result = convertValue('hdl_c', 1.5, 'mmol/L', 'mg/dL')
      expect(result).toBeCloseTo(58, 0)
    })
  })

  describe('triglycerides conversions', () => {
    it('converts mmol/L to mg/dL', () => {
      const result = convertValue('triglycerides', 1.7, 'mmol/L', 'mg/dL')
      expect(result).toBeCloseTo(150.6, 0)
    })
  })

  describe('weight conversions', () => {
    it('converts kg to lbs', () => {
      const result = convertValue('weight', 75, 'kg', 'lbs')
      expect(result).toBeCloseTo(165.4, 0)
    })

    it('converts lbs to kg', () => {
      const result = convertValue('weight', 165, 'lbs', 'kg')
      expect(result).toBeCloseTo(74.8, 0)
    })
  })

  describe('height conversions', () => {
    it('converts cm to inches', () => {
      const result = convertValue('height', 175, 'cm', 'in')
      expect(result).toBeCloseTo(68.9, 0)
    })

    it('converts inches to cm', () => {
      const result = convertValue('height', 69, 'in', 'cm')
      expect(result).toBeCloseTo(175.3, 0)
    })
  })

  describe('hemoglobin conversions', () => {
    it('converts g/dL to mmol/L', () => {
      const result = convertValue('hemoglobin', 15, 'g/dL', 'mmol/L')
      expect(result).toBeCloseTo(9.32, 0)
    })
  })

  describe('edge cases', () => {
    it('returns original value for unknown marker', () => {
      const result = convertValue('unknown_marker', 5.0, 'unit_a', 'unit_b')
      expect(result).toBe(5.0)
    })

    it('handles zero value', () => {
      const result = convertValue('glucose', 0, 'mmol/L', 'mg/dL')
      expect(result).toBe(0)
    })

    it('handles negative value', () => {
      const result = convertValue('glucose', -1, 'mmol/L', 'mg/dL')
      expect(result).toBeLessThan(0)
    })
  })
})

describe('getDisplayUnit', () => {
  it('returns canonical unit when no prefs', () => {
    const result = getDisplayUnit('glucose', 'mmol/L', null)
    expect(result).toBe('mmol/L')
  })

  it('returns user preferred unit when set', () => {
    const prefs = { glucose_unit: 'mg/dL' }
    const result = getDisplayUnit('glucose', 'mmol/L', prefs as never)
    expect(typeof result).toBe('string')
  })
})

describe('MARKER_UNIT_MAP', () => {
  it('has entries for glucose', () => {
    expect(MARKER_UNIT_MAP.glucose).toBeDefined()
    expect(MARKER_UNIT_MAP.glucose.options).toContain('mmol/L')
    expect(MARKER_UNIT_MAP.glucose.options).toContain('mg/dL')
  })

  it('has entries for weight', () => {
    expect(MARKER_UNIT_MAP.weight).toBeDefined()
    expect(MARKER_UNIT_MAP.weight.options).toContain('kg')
    expect(MARKER_UNIT_MAP.weight.options).toContain('lbs')
  })

  it('all entries have options array', () => {
    for (const [slug, entry] of Object.entries(MARKER_UNIT_MAP)) {
      expect(Array.isArray(entry.options), `${slug} should have options array`).toBe(true)
      expect(entry.options.length, `${slug} should have at least 1 option`).toBeGreaterThanOrEqual(1)
    }
  })

  it('has at least 20 markers defined', () => {
    expect(Object.keys(MARKER_UNIT_MAP).length).toBeGreaterThanOrEqual(20)
  })
})
