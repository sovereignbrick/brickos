'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { UnitPreferences } from '@/lib/types'
import { getDisplayUnit, convertValue } from '@/lib/units'

let cachedPrefs: UnitPreferences | null = null
let fetchPromise: Promise<UnitPreferences | null> | null = null

/** Invalidate the unit preferences cache and notify all hooks to re-fetch. */
export function invalidateUnitCache() {
  cachedPrefs = null
  fetchPromise = null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('unit-prefs-changed'))
  }
}

/**
 * Hook providing user unit preferences with conversion helpers.
 * Listens for 'unit-prefs-changed' events to auto-refresh when units are saved.
 */
export function useUnitPreferences() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<UnitPreferences | null>(cachedPrefs)

  const fetchPrefs = useCallback(() => {
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
  }, [])

  useEffect(() => {
    if (!user) return
    if (cachedPrefs) {
      setPrefs(cachedPrefs)
    } else {
      fetchPrefs()
    }
  }, [user, fetchPrefs])

  // Listen for cache invalidation events (fired when units are saved)
  useEffect(() => {
    const handler = () => {
      cachedPrefs = null
      fetchPrefs()
    }
    window.addEventListener('unit-prefs-changed', handler)
    return () => window.removeEventListener('unit-prefs-changed', handler)
  }, [fetchPrefs])

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
    invalidateCache: invalidateUnitCache,
  }
}
