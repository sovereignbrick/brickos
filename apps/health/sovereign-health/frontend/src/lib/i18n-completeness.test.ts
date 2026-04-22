// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// i18n completeness tests — catches missing keys, structure mismatches,
// hardcoded strings, and placeholder inconsistencies between EN and DE.
//
// These tests exist because:
// - We shipped "Language" hardcoded in English on the German settings page
// - "Keine Vorlage" was reused for the device dropdown instead of "Kein Gerät"
// - Missing keys cause silent fallback to the key name (e.g. "devices.archive")

import en from '@/i18n/messages/en.json'
import de from '@/i18n/messages/de.json'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NestedObject = { [key: string]: string | NestedObject }

/** Flatten nested JSON into dot-notation keys: { a: { b: "x" } } → ["a.b"] */
function flattenKeys(obj: NestedObject, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) {
      keys.push(...flattenKeys(v as NestedObject, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

/** Extract {placeholder} names from a string */
function extractPlaceholders(str: string): string[] {
  return [...str.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
}

/** Get value at dot path */
function getAtPath(obj: NestedObject, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const enKeys = flattenKeys(en as NestedObject)
const deKeys = flattenKeys(de as NestedObject)

describe('i18n: EN ↔ DE key parity', () => {
  test('every EN key exists in DE', () => {
    const missing = enKeys.filter(k => !deKeys.includes(k))
    if (missing.length > 0) {
      throw new Error(
        `${missing.length} EN keys missing in DE:\n${missing.map(k => `  - ${k}`).join('\n')}`
      )
    }
  })

  test('every DE key exists in EN', () => {
    const missing = deKeys.filter(k => !enKeys.includes(k))
    if (missing.length > 0) {
      throw new Error(
        `${missing.length} DE keys missing in EN:\n${missing.map(k => `  - ${k}`).join('\n')}`
      )
    }
  })

  test('no empty string values in EN', () => {
    const empty = enKeys.filter(k => getAtPath(en as NestedObject, k) === '')
    if (empty.length > 0) {
      throw new Error(
        `${empty.length} empty EN values:\n${empty.map(k => `  - ${k}`).join('\n')}`
      )
    }
  })

  test('no empty string values in DE', () => {
    const empty = deKeys.filter(k => getAtPath(de as NestedObject, k) === '')
    if (empty.length > 0) {
      throw new Error(
        `${empty.length} empty DE values:\n${empty.map(k => `  - ${k}`).join('\n')}`
      )
    }
  })
})

describe('i18n: placeholder consistency', () => {
  test('EN and DE placeholders match for every key', () => {
    const mismatches: string[] = []
    for (const key of enKeys) {
      const enVal = getAtPath(en as NestedObject, key)
      const deVal = getAtPath(de as NestedObject, key)
      if (!enVal || !deVal) continue

      const enPh = extractPlaceholders(enVal)
      const dePh = extractPlaceholders(deVal)
      if (enPh.join(',') !== dePh.join(',')) {
        mismatches.push(`  ${key}: EN={${enPh.join(',')}} DE={${dePh.join(',')}}`)
      }
    }
    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} placeholder mismatches:\n${mismatches.join('\n')}`
      )
    }
  })
})

describe('i18n: no untranslated values', () => {
  test('DE values are not identical to EN (catches copy-paste)', () => {
    // Allow: numbers, technical terms, brand names, short strings
    const ALLOWED_IDENTICAL = new Set([
      'common.keto', 'common.hiit', 'common.vegan',
      'fastingProtocols.16_8', 'fastingProtocols.omad',
      'fastingProtocols.36h', 'fastingProtocols.48h',
    ])
    const MIN_LENGTH = 8 // Only flag strings long enough to warrant translation

    const identical: string[] = []
    for (const key of enKeys) {
      if (ALLOWED_IDENTICAL.has(key)) continue
      const enVal = getAtPath(en as NestedObject, key)
      const deVal = getAtPath(de as NestedObject, key)
      if (enVal && deVal && enVal === deVal && enVal.length >= MIN_LENGTH) {
        identical.push(`  ${key}: "${enVal}"`)
      }
    }
    // Warn but don't fail — some strings are legitimately identical.
    // Sprint 049 #049-27: raised threshold from 20 -> 50. Proper nouns
    // (Sovereign Health Intelligence), technical abbreviations
    // (ApoB, GKI, TSH), tier labels (Glimpse, Clarity, Horizon), and
    // action codes are legitimately identical EN/DE. Threshold
    // catches a copy-paste flood (dozens at once) while tolerating
    // the slow accumulation of shared vocab.
    if (identical.length > 50) {
      throw new Error(
        `${identical.length} suspiciously identical EN/DE values (>50 suggests missing translations):\n${identical.slice(0, 10).join('\n')}\n  ... and ${identical.length - 10} more`
      )
    }
  })
})

describe('i18n: structure depth matches', () => {
  test('EN and DE have the same top-level sections', () => {
    const enSections = Object.keys(en).sort()
    const deSections = Object.keys(de).sort()
    expect(enSections).toEqual(deSections)
  })
})

// Sprint 050 #050-B2: pin the Sprint 048+049 keys so a future refactor
// doesn't silently drop them. These keys are user-visible and critical
// to the eval + consent + bulk-reminder flows; losing them = silent
// UX regression with no test signal.
describe('i18n: Sprint 048+049 keys present in both locales', () => {
  const criticalKeys = [
    // Sprint 048 #048-17 consent
    'organizationAccess.title',
    'organizationAccess.intro',
    'organizationAccess.toggleOn',
    'organizationAccess.toggleOff',
    'organizationAccess.revokeConfirmTitle',
    'organizationAccess.revokeConfirmButton',
    // Sprint 048 impersonation
    'impersonation.viewingAs',
    'impersonation.readOnly',
    'impersonation.exit',
    'impersonation.blockedDoctorChatTitle',
    'impersonation.blockedDoctorChatBody',
    'impersonation.backToCaseload',
    // Sprint 048 data access log
    'dataAccessLog.title',
    'dataAccessLog.intro',
    'dataAccessLog.empty',
    // Sprint 048 consent dashboard
    'platform.orgDetail.consent',
    'platform.orgDetail.consentGranted',
    'platform.orgDetail.consentRevoked',
    'platform.orgDetail.consentPending',
    // Sprint 049 demo surface
    'demoSurface.banner.title',
    'demoSurface.banner.subtitle',
    'demoSurface.banner.signUp',
    'demoSurface.banner.login',
    'demoSurface.badge',
    'demoSurface.landing.heading',
    'demoSurface.landing.subheading',
    // Sprint 049 bulk consent reminder
    'orgMembers.bulkReminderButton',
    'orgMembers.bulkReminderConfirm',
    'orgMembers.bulkReminderSent',
    'orgMembers.bulkReminderFailed',
  ]

  for (const key of criticalKeys) {
    test(`${key} exists in en`, () => {
      const v = getAtPath(en as NestedObject, key)
      expect(v, `missing en key: ${key}`).toBeDefined()
      expect(typeof v).toBe('string')
    })
    test(`${key} exists in de`, () => {
      const v = getAtPath(de as NestedObject, key)
      expect(v, `missing de key: ${key}`).toBeDefined()
      expect(typeof v).toBe('string')
    })
  }
})
