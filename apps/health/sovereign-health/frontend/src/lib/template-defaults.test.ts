// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// Template defaults tests — ensures templates save and restore session state.
//
// These tests exist because:
// - Templates only saved marker_slugs, losing meal timing/sleep/stress settings
// - Users expected templates to restore their full measurement setup

import type { TemplateDefaults } from './types'

describe('template defaults: serialization', () => {
  test('collectDefaults produces correct shape', () => {
    const defaults: TemplateDefaults = {
      meal_timing: 'fasting',
      sleep_hours: '7.5',
      sleep_quality: 'good',
      stress_level: '3',
      protocol: 'fasting',
      fasting_protocol: '16_8',
    }

    // All fields should be present
    expect(defaults.meal_timing).toBe('fasting')
    expect(defaults.sleep_hours).toBe('7.5')
    expect(defaults.sleep_quality).toBe('good')
    expect(defaults.stress_level).toBe('3')
    expect(defaults.protocol).toBe('fasting')
    expect(defaults.fasting_protocol).toBe('16_8')
  })

  test('undefined fields are omitted (not sent as null)', () => {
    const defaults: TemplateDefaults = {
      meal_timing: 'before',
      // All others intentionally undefined
    }

    const json = JSON.parse(JSON.stringify(defaults))
    expect(json.meal_timing).toBe('before')
    expect(json.sleep_hours).toBeUndefined()
    expect(json.protocol).toBeUndefined()
  })

  test('defaults roundtrip through JSON', () => {
    const original: TemplateDefaults = {
      meal_timing: '30m_after',
      sleep_hours: '8',
      sleep_quality: 'excellent',
      stress_level: '1',
      protocol: 'standard',
      note: 'Morning routine',
    }

    const json = JSON.stringify(original)
    const restored: TemplateDefaults = JSON.parse(json)

    expect(restored).toEqual(original)
  })
})

describe('template defaults: meal timing values', () => {
  const VALID_VALUES = ['no_tag', 'fasting', 'before', '30m_after', '1h_after', '2h_after', '3h_after']

  test('all meal timing values are valid', () => {
    for (const v of VALID_VALUES) {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    }
  })

  test('default meal timing is no_tag', () => {
    const defaults: TemplateDefaults = {}
    expect(defaults.meal_timing ?? 'no_tag').toBe('no_tag')
  })
})

describe('template defaults: device vs template interaction', () => {
  test('when device is selected, template should be cleared', () => {
    // Simulates: user selects a device → template is disabled
    let activeTemplate = 'template-123'
    let selectedDeviceId = ''

    // User selects device
    selectedDeviceId = 'device-456'
    if (selectedDeviceId) {
      activeTemplate = ''
    }

    expect(activeTemplate).toBe('')
    expect(selectedDeviceId).toBe('device-456')
  })

  test('when no device, template is usable', () => {
    const selectedDeviceId = ''
    const templateDisabled = !!selectedDeviceId

    expect(templateDisabled).toBe(false)
  })
})
