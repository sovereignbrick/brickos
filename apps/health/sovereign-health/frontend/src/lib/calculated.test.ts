import { describe, it, expect } from 'vitest'
import { computeMarkers, type SessionValues } from './calculated'

describe('computeMarkers', () => {

  describe('GKI (Glucose Ketone Index)', () => {
    it('calculates GKI correctly with valid glucose and ketones', () => {
      const values: SessionValues = { glucose: 5.5, ketones: 1.1 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki).toBeDefined()
      expect(gki!.value).toBeCloseTo(5.0, 1)
    })

    it('returns null GKI when ketones is zero', () => {
      const values: SessionValues = { glucose: 5.5, ketones: 0 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki).toBeDefined()
      expect(gki!.value).toBeNull()
    })

    it('does not include GKI when glucose is missing', () => {
      const values: SessionValues = { ketones: 1.0 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki).toBeUndefined()
    })

    it('does not include GKI when ketones is missing', () => {
      const values: SessionValues = { glucose: 5.5 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki).toBeUndefined()
    })

    it('handles high GKI (not in ketosis)', () => {
      const values: SessionValues = { glucose: 6.0, ketones: 0.3 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki!.value).toBeCloseTo(20.0, 1)
    })

    it('handles low GKI (deep ketosis)', () => {
      const values: SessionValues = { glucose: 3.5, ketones: 3.5 }
      const results = computeMarkers(values)
      const gki = results.find(r => r.slug === 'gki')
      expect(gki!.value).toBeCloseTo(1.0, 1)
    })
  })

  describe('Dr. Boz Ratio', () => {
    it('calculates Dr. Boz Ratio correctly', () => {
      const values: SessionValues = { glucose: 5.0, ketones: 1.0 }
      const results = computeMarkers(values)
      const boz = results.find(r => r.slug === 'dr_boz_ratio')
      expect(boz).toBeDefined()
      // (glucose * 18) / ketones = (5.0 * 18) / 1.0 = 90
      expect(boz!.value).toBeCloseTo(90, 0)
    })

    it('does not include Dr. Boz when ketones is zero', () => {
      const values: SessionValues = { glucose: 5.0, ketones: 0 }
      const results = computeMarkers(values)
      const boz = results.find(r => r.slug === 'dr_boz_ratio')
      expect(boz).toBeUndefined()
    })

    it('does not include Dr. Boz when inputs missing', () => {
      const values: SessionValues = {}
      const results = computeMarkers(values)
      const boz = results.find(r => r.slug === 'dr_boz_ratio')
      expect(boz).toBeUndefined()
    })
  })

  describe('WHtR (Waist-to-Height Ratio)', () => {
    it('calculates WHtR correctly', () => {
      const values: SessionValues = { waist_circumference: 87.5 }
      const results = computeMarkers(values, 175)
      const whtr = results.find(r => r.slug === 'whtr')
      expect(whtr).toBeDefined()
      expect(whtr!.value).toBeCloseTo(0.5, 2)
    })

    it('does not include WHtR when height is missing', () => {
      const values: SessionValues = { waist_circumference: 87.5 }
      const results = computeMarkers(values)
      const whtr = results.find(r => r.slug === 'whtr')
      expect(whtr).toBeUndefined()
    })

    it('does not include WHtR when waist is missing', () => {
      const values: SessionValues = {}
      const results = computeMarkers(values, 175)
      const whtr = results.find(r => r.slug === 'whtr')
      expect(whtr).toBeUndefined()
    })

    it('does not include WHtR when height is zero', () => {
      const values: SessionValues = { waist_circumference: 87.5 }
      const results = computeMarkers(values, 0)
      const whtr = results.find(r => r.slug === 'whtr')
      expect(whtr).toBeUndefined()
    })
  })

  describe('BMI', () => {
    it('calculates BMI correctly', () => {
      const values: SessionValues = { weight: 75 }
      const results = computeMarkers(values, 175)
      const bmi = results.find(r => r.slug === 'bmi')
      expect(bmi).toBeDefined()
      // 75 / (1.75 * 1.75) = 24.49
      expect(bmi!.value).toBeCloseTo(24.49, 1)
    })

    it('does not include BMI when weight is missing', () => {
      const values: SessionValues = {}
      const results = computeMarkers(values, 175)
      const bmi = results.find(r => r.slug === 'bmi')
      expect(bmi).toBeUndefined()
    })

    it('does not include BMI when height is zero', () => {
      const values: SessionValues = { weight: 75 }
      const results = computeMarkers(values, 0)
      const bmi = results.find(r => r.slug === 'bmi')
      expect(bmi).toBeUndefined()
    })

    it('calculates underweight BMI', () => {
      const values: SessionValues = { weight: 50 }
      const results = computeMarkers(values, 180)
      const bmi = results.find(r => r.slug === 'bmi')
      expect(bmi!.value).toBeLessThan(18.5)
    })

    it('calculates obese BMI', () => {
      const values: SessionValues = { weight: 120 }
      const results = computeMarkers(values, 170)
      const bmi = results.find(r => r.slug === 'bmi')
      expect(bmi!.value).toBeGreaterThan(30)
    })
  })

  describe('HCT/HB Ratio', () => {
    it('calculates HCT/HB correctly (hemoglobin converted via *1.61)', () => {
      const values: SessionValues = { hematocrit: 45, hemoglobin: 15 }
      const results = computeMarkers(values)
      const ratio = results.find(r => r.slug === 'hct_hb_ratio')
      expect(ratio).toBeDefined()
      // 45 / (15 * 1.61) = 45 / 24.15 = 1.863
      expect(ratio!.value).toBeCloseTo(1.863, 2)
    })

    it('does not include HCT/HB when hemoglobin is zero', () => {
      const values: SessionValues = { hematocrit: 45, hemoglobin: 0 }
      const results = computeMarkers(values)
      const ratio = results.find(r => r.slug === 'hct_hb_ratio')
      expect(ratio).toBeUndefined()
    })
  })

  describe('HOMA-IR', () => {
    it('calculates HOMA-IR correctly', () => {
      const values: SessionValues = { glucose: 5.0, insulin: 10 }
      const results = computeMarkers(values)
      const homa = results.find(r => r.slug === 'homa_ir')
      expect(homa).toBeDefined()
      // (glucose * 18.018 * insulin) / 405 = (5.0 * 18.018 * 10) / 405 = 2.22
      expect(homa!.value).toBeCloseTo(2.22, 1)
    })

    it('does not include HOMA-IR when insulin is missing', () => {
      const values: SessionValues = { glucose: 5.0 }
      const results = computeMarkers(values)
      const homa = results.find(r => r.slug === 'homa_ir')
      expect(homa).toBeUndefined()
    })

    it('healthy HOMA-IR is under 1.0', () => {
      const values: SessionValues = { glucose: 4.5, insulin: 4 }
      const results = computeMarkers(values)
      const homa = results.find(r => r.slug === 'homa_ir')
      expect(homa!.value).toBeLessThan(1.5)
    })
  })

  describe('edge cases', () => {
    it('returns empty array when no inputs provided', () => {
      const results = computeMarkers({})
      expect(results.length).toBe(0)
    })

    it('returns all 6 markers when all inputs provided', () => {
      const values: SessionValues = {
        glucose: 5.0, ketones: 1.0, weight: 75,
        waist_circumference: 85, hematocrit: 45,
        hemoglobin: 15, insulin: 8,
      }
      const results = computeMarkers(values, 175)
      expect(results.length).toBe(6)
      results.forEach(r => {
        expect(r.slug).toBeTruthy()
        expect(r.name).toBeTruthy()
        expect(r.formula).toBeTruthy()
        expect(r.value).not.toBeNull()
      })
    })
  })
})
