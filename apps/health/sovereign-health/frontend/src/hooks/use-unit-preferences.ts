'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { UnitPreferences } from '@/lib/types'
import { getDisplayUnit, convertValue } from '@/lib/units'

let cachedPrefs: UnitPreferences | null = null
let fetchPromise: Promise<UnitPreferences | null> | null = null

/**
 * Hook providing user unit preferences with conversion helpers.
 * Caches preferences in memory — fetched once per session.
 *
 * Usage:
 *   const { displayValue, displayUnit } = useUnitPreferences()
 *   const val = displayValue('glucose', 5.5, 'mmol/L')  // converts if user prefers mg/dL
 *   const unit = displayUnit('glucose', 'mmol/L')         // returns user's preferred unit
 */
export function useUnitPreferences() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<UnitPreferences | null>(cachedPrefs)

  useEffect(() => {
    if (!user || cachedPrefs) {
      if (cachedPrefs) setPrefs(cachedPrefs)
      return
    }

    if (!fetchPromise) {
      fetchPromise = api.settings.get()
        .then(res => {
          cachedPrefs = res.data.units
          return cachedPrefs
        })
        .catch(() => null)
        .finally(() => { fetchPromise = null })
    }

    fetchPromise.then(p => {
      if (p) setPrefs(p)
    })
  }, [user])

  const dUnit = useCallback(
    (slug: string, canonicalUnit: string): string =>
      getDisplayUnit(slug, canonicalUnit, prefs),
    [prefs]
  )

  const dValue = useCallback(
    (slug: string, value: number, canonicalUnit: string): number => {
      const target = getDisplayUnit(slug, canonicalUnit, prefs)
      return convertValue(slug, value, canonicalUnit, target)
    },
    [prefs]
  )

  const formatDisplay = useCallback(
    (slug: string, value: number, canonicalUnit: string): { value: number; unit: string; formatted: string } => {
      const unit = getDisplayUnit(slug, canonicalUnit, prefs)
      const converted = convertValue(slug, value, canonicalUnit, unit)
      const integerUnits = ['bpm', 'mmHg', 'lbs', 'kg', 'cm', 'in']
      const decimals = integerUnits.some(u => unit.includes(u)) ? 0 : 1
      return {
        value: converted,
        unit,
        formatted: `${converted.toFixed(decimals)} ${unit}`,
      }
    },
    [prefs]
  )

  return {
    prefs,
    displayUnit: dUnit,
    displayValue: dValue,
    formatDisplay,
    invalidateCache: () => { cachedPrefs = null },
  }
}
