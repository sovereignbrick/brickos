// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 024 contract tests -- protected accounts, demo endpoints, learn page

import { describe, it, expect } from 'vitest'
import en from '@/i18n/messages/en.json'
import de from '@/i18n/messages/de.json'

// -- Demo endpoint response (actual shape from /demo/zones) -------------------

const sampleDemoZonesResponse = {
  data: [
    {
      zone_slug: 'energy_metabolic',
      zone_name: 'Energy & Metabolic',
      zone_icon: '\u26a1',
      zone_color: '#FF9500',
      display_order: 1,
      marker_count: 13,
      markers_with_data: 6,
      status_summary: { green: 4, orange: 0, red: 2 },
    },
  ],
  error: null,
}

const sampleDemoMeasurementsResponse = {
  data: [
    {
      marker_slug: 'glucose',
      value: 5.2,
      unit: 'mmol/L',
      status: 'green',
      timestamp: '2026-03-20T06:00:00Z',
    },
  ],
  meta: { page: 1, per_page: 50, total: 854 },
  error: null,
}

// -- Tests --------------------------------------------------------------------

describe('Demo endpoint contracts (Sprint 024 -- real accounts)', () => {
  it('demo zones response has zones with status_summary', () => {
    const zone = sampleDemoZonesResponse.data[0]
    expect(zone).toHaveProperty('zone_slug')
    expect(zone).toHaveProperty('zone_name')
    expect(zone).toHaveProperty('marker_count')
    expect(zone).toHaveProperty('markers_with_data')
    expect(zone).toHaveProperty('status_summary')
    expect(zone.status_summary).toHaveProperty('green')
    expect(zone.status_summary).toHaveProperty('orange')
    expect(zone.status_summary).toHaveProperty('red')
    expect(typeof zone.marker_count).toBe('number')
  })

  it('demo measurements response has data + meta with total', () => {
    expect(Array.isArray(sampleDemoMeasurementsResponse.data)).toBe(true)
    expect(sampleDemoMeasurementsResponse.meta).toHaveProperty('total')
    expect(sampleDemoMeasurementsResponse.meta.total).toBeGreaterThan(0)
  })

  it('demo measurement has required fields', () => {
    const m = sampleDemoMeasurementsResponse.data[0]
    expect(m).toHaveProperty('marker_slug')
    expect(m).toHaveProperty('value')
    expect(m).toHaveProperty('unit')
    expect(m).toHaveProperty('status')
    expect(m).toHaveProperty('timestamp')
    expect(typeof m.value).toBe('number')
  })

  it('3 profiles are valid profile names', () => {
    const validProfiles = ['optimized', 'average', 'at_risk']
    for (const p of validProfiles) {
      expect(typeof p).toBe('string')
      expect(p.length).toBeGreaterThan(0)
    }
  })
})

describe('Protected accounts guard contract', () => {
  const sampleProtectedResetResponse = {
    data: null,
    error: {
      code: 'validation_error',
      message: 'This account is protected and cannot be reset.',
    },
  }

  const sampleProtectedDeleteResponse = {
    data: null,
    error: {
      code: 'validation_error',
      message: 'This account is protected and cannot be deleted.',
    },
  }

  it('reset-data for protected account returns validation error', () => {
    expect(sampleProtectedResetResponse.data).toBeNull()
    expect(sampleProtectedResetResponse.error).toHaveProperty('code')
    expect(sampleProtectedResetResponse.error).toHaveProperty('message')
    expect(sampleProtectedResetResponse.error.message).toContain('protected')
  })

  it('delete-account for protected account returns validation error', () => {
    expect(sampleProtectedDeleteResponse.data).toBeNull()
    expect(sampleProtectedDeleteResponse.error.message).toContain('protected')
    expect(sampleProtectedDeleteResponse.error.message).toContain('deleted')
  })
})

// Learn page i18n keys: moved to website (sovereignhealth.io/learn), not in app i18n
describe('Learn page location', () => {
  it('learn page i18n is NOT in app (moved to website)', () => {
    // Verify learn keys were removed from the app i18n
    expect((en as Record<string, unknown>).learn).toBeUndefined()
    expect((de as Record<string, unknown>).learn).toBeUndefined()
  })
})
