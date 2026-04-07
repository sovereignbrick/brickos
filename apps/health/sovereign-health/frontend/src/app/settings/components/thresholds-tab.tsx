'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { UnitPreferences, CustomReferenceRange, MarkerWithZone, CalculatedMarkerDef } from '@/lib/types'
import { invalidateUnitCache } from '@/hooks/use-unit-preferences'
import {
  groupByZone,
  getMarkerUnitInfo,
  getAltUnits,
  normalizeDecimal,
  parseDecimal,
  MarkerInfoButton,
  MarkerNameLink,
} from './shared'

// --- Save status ---
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// --- Per-marker unit options with conversion factors ---
interface MarkerUnitDef {
  options: string[]
  group: string
  convert?: Record<string, Record<string, number>>
}

const MARKER_UNIT_MAP: Record<string, MarkerUnitDef> = {
  glucose: { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  fasting_glucose: { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  total_cholesterol: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  ldl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  hdl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  vldl: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  non_hdl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  triglycerides: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 88.57 }, 'mg/dL': { 'mmol/L': 1/88.57 } } },
  apo_b: { options: ['g/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'g/L': { 'mg/dL': 100 }, 'mg/dL': { 'g/L': 0.01 } } },
  lp_a: { options: ['nmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'nmol/L': { 'mg/dL': 0.4167 }, 'mg/dL': { 'nmol/L': 2.4 } } },
  uric_acid: { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/59.48 }, 'mg/dL': { '\u00b5mol/L': 59.48 } } },
  hemoglobin: { options: ['mmol/L', 'g/dL'], group: 'hemoglobin_unit', convert: { 'mmol/L': { 'g/dL': 1.61 }, 'g/dL': { 'mmol/L': 1/1.61 } } },
  insulin: { options: ['mU/L', 'pmol/L'], group: 'glucose_unit', convert: { 'mU/L': { 'pmol/L': 6.945 }, 'pmol/L': { 'mU/L': 1/6.945 } } },
  hba1c: { options: ['%', 'mmol/mol'], group: 'glucose_unit', convert: { '%': { 'mmol/mol': 10.93 }, 'mmol/mol': { '%': 1/10.93 } } },
  creatinine: { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/88.4 }, 'mg/dL': { '\u00b5mol/L': 88.4 } } },
  vitamin_d: { options: ['nmol/L', 'ng/mL'], group: 'glucose_unit', convert: { 'nmol/L': { 'ng/mL': 1/2.496 }, 'ng/mL': { 'nmol/L': 2.496 } } },
  calcium: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 4.0 }, 'mg/dL': { 'mmol/L': 0.25 } } },
  magnesium: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 2.43 }, 'mg/dL': { 'mmol/L': 1/2.43 } } },
  potassium: { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  sodium: { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  iron: { options: ['\u00b5mol/L', '\u00b5g/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { '\u00b5g/dL': 5.585 }, '\u00b5g/dL': { '\u00b5mol/L': 1/5.585 } } },
  weight: { options: ['kg', 'lbs'], group: 'weight_unit', convert: { 'kg': { 'lbs': 2.205 }, 'lbs': { 'kg': 1/2.205 } } },
  height: { options: ['cm', 'in'], group: 'height_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
  waist_circumference: { options: ['cm', 'in'], group: 'waist_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
}

// --- Lifestyle presets for thresholds ---
interface PresetRange {
  marker_slug: string
  green_min: number
  green_max: number
  orange_min: number
  orange_max: number
}

const CARNIVORE_PRESET: PresetRange[] = [
  { marker_slug: 'glucose', green_min: 4.5, green_max: 5.8, orange_min: 3.5, orange_max: 7.0 },
  { marker_slug: 'ketones', green_min: 0.3, green_max: 3.0, orange_min: 0.0, orange_max: 5.0 },
  { marker_slug: 'total_cholesterol', green_min: 4.0, green_max: 7.5, orange_min: 3.0, orange_max: 9.0 },
  { marker_slug: 'ldl_c', green_min: 1.5, green_max: 4.5, orange_min: 1.0, orange_max: 6.0 },
  { marker_slug: 'hdl_c', green_min: 1.3, green_max: 3.0, orange_min: 0.9, orange_max: 4.0 },
  { marker_slug: 'triglycerides', green_min: 0.3, green_max: 1.0, orange_min: 0.2, orange_max: 1.7 },
  { marker_slug: 'uric_acid', green_min: 250, green_max: 420, orange_min: 150, orange_max: 500 },
  { marker_slug: 'ferritin', green_min: 50, green_max: 350, orange_min: 20, orange_max: 500 },
  { marker_slug: 'alt', green_min: 7, green_max: 40, orange_min: 0, orange_max: 56 },
  { marker_slug: 'insulin', green_min: 2.0, green_max: 6.0, orange_min: 1.0, orange_max: 12.0 },
]

const KETO_PRESET: PresetRange[] = [
  ...CARNIVORE_PRESET.filter(r => r.marker_slug !== 'ketones' && r.marker_slug !== 'total_cholesterol'),
  { marker_slug: 'ketones', green_min: 0.5, green_max: 3.0, orange_min: 0.0, orange_max: 5.0 },
  { marker_slug: 'total_cholesterol', green_min: 4.0, green_max: 7.0, orange_min: 3.0, orange_max: 8.5 },
]

const VEGAN_PRESET: PresetRange[] = [
  { marker_slug: 'iron', green_min: 7, green_max: 25, orange_min: 5, orange_max: 30 },
  { marker_slug: 'ferritin', green_min: 20, green_max: 200, orange_min: 10, orange_max: 300 },
  { marker_slug: 'vitamin_b12', green_min: 150, green_max: 600, orange_min: 100, orange_max: 800 },
  { marker_slug: 'vitamin_d', green_min: 50, green_max: 125, orange_min: 30, orange_max: 150 },
  { marker_slug: 'hdl_c', green_min: 0.9, green_max: 2.0, orange_min: 0.7, orange_max: 2.5 },
]

const LIFESTYLE_PRESETS: Record<string, PresetRange[]> = {
  carnivore: CARNIVORE_PRESET,
  keto: KETO_PRESET,
  vegan: VEGAN_PRESET,
  omnivore: [],
}

/* ================================================================
   Threshold input that accepts commas, normalizes on blur
   ================================================================ */
function ThresholdInput({ value, onBlur, onChange, ring }: {
  value: number | null | undefined
  onBlur: (v: string) => void
  onChange: (v: string) => void
  ring: 'green' | 'orange'
}) {
  const [local, setLocal] = useState(value != null ? String(value) : '')
  const prevValue = useRef(value)

  // Sync from parent when value changes externally
  if (value !== prevValue.current) {
    prevValue.current = value
    const newLocal = value != null ? String(value) : ''
    if (newLocal !== local) setLocal(newLocal)
  }

  const ringColor = ring === 'green' ? 'focus:ring-green-500' : 'focus:ring-orange-500'

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={e => {
        const filtered = e.target.value.replace(/[^0-9.,-]/g, '')
        setLocal(filtered)
        onChange(filtered)
      }}
      onBlur={() => {
        const normalized = normalizeDecimal(local)
        setLocal(normalized)
        onBlur(normalized)
      }}
      className={`w-full h-8 bg-card border border-border rounded px-1.5 text-sm text-center focus:outline-none focus:ring-1 ${ringColor}`}
    />
  )
}

/* ================================================================
   Thresholds Tab (merged with Units: unit column + conversion)
   ================================================================ */
export function ThresholdsTab({
  markers, calculatedMarkers, customRanges, systemRanges, units, dietProtocol,
  onRefresh, onSwitchToProfile, onUnitsUpdate, setSaveStatus, showSaved,
}: {
  markers: MarkerWithZone[]
  calculatedMarkers: CalculatedMarkerDef[]
  customRanges: CustomReferenceRange[]
  systemRanges: CustomReferenceRange[]
  units: UnitPreferences
  dietProtocol: string | null
  onRefresh: () => void
  onSwitchToProfile: () => void
  onUnitsUpdate: (u: Partial<UnitPreferences>) => void
  setSaveStatus: (s: SaveStatus) => void
  showSaved: () => void
}) {
  const t = useTranslations('settings.thresholds')
  const tProfile = useTranslations('settings.profile')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tZones = useTranslations('zones')
  const { markers: contentMarkers } = useContent()

  // Map backend zone names to i18n keys
  const zoneTranslationMap: Record<string, string> = {
    'Energy & Metabolic': 'energy_metabolic',
    'Cardiovascular': 'cardiovascular_name',
    'Structural': 'structural_name',
    'Nutritional': 'nutritional_name',
    'Hormonal': 'hormonal_name',
    'Cognitive': 'cognitive_name',
    'Immune': 'immune_name',
    'Detoxification': 'detoxification_name',
    'Calculated Markers': '_calculated',
  }

  const translateZoneName = (name: string) => {
    const key = zoneTranslationMap[name]
    if (key === '_calculated') return tCommon('calculatedMarkers')
    if (key) return tZones(key as 'energy_metabolic')
    return name
  }
  const [filter, setFilter] = useState('')
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set())
  const [editedRanges, setEditedRanges] = useState<Map<string, CustomReferenceRange>>(new Map())
  const [rowSaveStatus, setRowSaveStatus] = useState<Map<string, 'saved' | 'error'>>(new Map())
  const [showPresetBanner, setShowPresetBanner] = useState(() => {
    // Only show banner if diet protocol changed since last dismissal
    if (typeof window === 'undefined' || !dietProtocol) return false
    try {
      const dismissed = localStorage.getItem('sh_preset_dismissed_for')
      return dismissed !== dietProtocol
    } catch { return false }
  })
  // Per-marker alternative unit selections (display-only, slug -> selected alt unit)
  const [altUnitSelections, setAltUnitSelections] = useState<Map<string, string>>(new Map())
  const [unitForm, setUnitForm] = useState(units)
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const rowStatusTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const unitSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build calculated markers as MarkerWithZone for the thresholds table
  const calcMarkersAsZone: MarkerWithZone[] = useMemo(() =>
    calculatedMarkers.map((cm, i) => ({
      marker_slug: cm.marker_slug,
      marker_name: cm.marker_name.replace(/\u2014/g, '-'),
      display_name: null,
      abbreviation: null,
      what_is: null,
      unit_canonical: cm.marker_slug === 'bmi' ? 'kg/m\u00b2' : (cm.marker_slug === 'homa_ir' || cm.marker_slug === 'tyg_index' ? 'index' : 'ratio'),
      display_order: i + 1,
      zone_slug: '_calculated',
      zone_name: 'Calculated Markers',
      zone_icon: '\ud83d\udcd0',
      zone_color: '#888',
      zone_order: 999,
    }))
  , [calculatedMarkers])

  // All markers including calculated
  const allMarkers = useMemo(() => [...markers, ...calcMarkersAsZone], [markers, calcMarkersAsZone])

  // Merge system + calculated defaults + custom + edited ranges
  const rangeMap = useMemo(() => {
    const map = new Map<string, CustomReferenceRange>()
    for (const r of systemRanges) map.set(r.marker_slug, r)
    for (const cm of calculatedMarkers) {
      const dt = cm.default_thresholds
      map.set(cm.marker_slug, {
        marker_slug: cm.marker_slug,
        marker_name: cm.marker_name,
        unit: cm.marker_slug === 'bmi' ? 'kg/m\u00b2' : 'ratio',
        protocol_context: 'standard',
        orange_min: dt.orange_min ?? null,
        green_min: dt.green_min ?? null,
        green_max: dt.green_max ?? null,
        orange_max: dt.orange_max ?? null,
      })
    }
    for (const r of customRanges) map.set(r.marker_slug, r)
    for (const [slug, r] of editedRanges) map.set(slug, r)
    return map
  }, [systemRanges, calculatedMarkers, customRanges, editedRanges])

  const grouped = useMemo(() => groupByZone(allMarkers), [allMarkers])

  const toggleZone = (slug: string) => {
    setCollapsedZones(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug); else next.add(slug)
      return next
    })
  }

  // Get current unit for a marker
  const getUnit = useCallback((m: MarkerWithZone) => {
    const info = getMarkerUnitInfo(m.marker_slug)
    if (!info) return m.unit_canonical
    const key = info.group as keyof UnitPreferences
    return (unitForm[key] as string) ?? m.unit_canonical
  }, [unitForm])

  // Handle unit change: convert thresholds and save
  const handleUnitChange = useCallback(async (m: MarkerWithZone, newUnit: string) => {
    const info = getMarkerUnitInfo(m.marker_slug)
    if (!info) return

    const oldUnit = getUnit(m)

    // Update unit preference locally
    const updates = { [info.group]: newUnit } as Partial<UnitPreferences>
    setUnitForm(f => ({ ...f, ...updates }))
    onUnitsUpdate(updates)

    // Only persist to backend if the unit is compatible with the preference field.
    // Markers like insulin (mU/L↔pmol/L), HbA1c (%↔mmol/mol), vitamin_d (nmol/L↔ng/mL)
    // share a group with glucose but have incompatible unit values.
    const BACKEND_ALLOWED: Record<string, string[]> = {
      glucose_unit: ['mmol/L', 'mg/dL'],
      cholesterol_unit: ['mmol/L', 'mg/dL'],
      uric_acid_unit: ['µmol/L', 'mg/dL'],
      hemoglobin_unit: ['mmol/L', 'g/dL'],
      weight_unit: ['kg', 'lbs'],
      height_unit: ['cm', 'in'],
      waist_unit: ['cm', 'in'],
      bp_unit: ['mmHg'],
      ketones_unit: ['mmol/L'],
    }
    const allowed = BACKEND_ALLOWED[info.group]
    if (allowed && allowed.includes(newUnit)) {
      if (unitSaveTimerRef.current) clearTimeout(unitSaveTimerRef.current)
      unitSaveTimerRef.current = setTimeout(async () => {
        try {
          await api.settings.updateUnits(updates)
          invalidateUnitCache()
        } catch {
          toast.error(tToast('unitSaveFailed'))
        }
      }, 300)
    }

    // Display conversion is handled by displayValue/toCanonical — DB stays in canonical units
  }, [getUnit, onUnitsUpdate])

  // Get display conversion factor for alt-unit markers (1 = canonical, >1 or <1 = converted)
  const getAltDisplayFactor = useCallback((slug: string): number => {
    const selectedAlt = altUnitSelections.get(slug)
    if (!selectedAlt) return 1
    const alts = getAltUnits(slug)
    if (!alts) return 1
    const match = alts.find(a => a.unit === selectedAlt)
    return match ? match.factor : 1
  }, [altUnitSelections])

  // Convert a canonical threshold value for display in the user's preferred unit
  const displayValue = useCallback((slug: string, val: number | null | undefined): number | null => {
    if (val == null) return null
    // Alt unit conversion (markers without MARKER_UNIT_MAP entries)
    const altFactor = getAltDisplayFactor(slug)
    if (altFactor !== 1) return Math.round(val * altFactor * 1000) / 1000
    // MARKER_UNIT_MAP conversion based on user preference
    const info = MARKER_UNIT_MAP[slug]
    if (info?.convert) {
      const canonical = allMarkers.find(m => m.marker_slug === slug)?.unit_canonical
      const preferred = unitForm[info.group as keyof UnitPreferences] as string | undefined
      if (canonical && preferred && canonical !== preferred) {
        const factor = info.convert[canonical]?.[preferred]
        if (factor) return Math.round(val * factor * 1000) / 1000
      }
    }
    return val
  }, [getAltDisplayFactor, allMarkers, unitForm])

  // Convert a displayed value back to canonical for saving
  const toCanonical = useCallback((slug: string, displayVal: string): string => {
    // Alt unit reverse
    const altFactor = getAltDisplayFactor(slug)
    if (altFactor !== 1) {
      const num = parseFloat(displayVal.replace(',', '.'))
      if (isNaN(num)) return displayVal
      return String(Math.round((num / altFactor) * 1000) / 1000)
    }
    // MARKER_UNIT_MAP reverse — convert from preferred back to canonical
    const info = MARKER_UNIT_MAP[slug]
    if (info?.convert) {
      const canonical = allMarkers.find(m => m.marker_slug === slug)?.unit_canonical
      const preferred = unitForm[info.group as keyof UnitPreferences] as string | undefined
      if (canonical && preferred && canonical !== preferred) {
        const factor = info.convert[canonical]?.[preferred]
        if (factor) {
          const num = parseFloat(displayVal.replace(',', '.'))
          if (isNaN(num)) return displayVal
          return String(Math.round((num / factor) * 1000) / 1000)
        }
      }
    }
    return displayVal
  }, [getAltDisplayFactor, allMarkers, unitForm])

  // Show brief per-row status
  const flashRowStatus = useCallback((slug: string, status: 'saved' | 'error') => {
    setRowSaveStatus(prev => new Map(prev).set(slug, status))
    const existing = rowStatusTimerRef.current.get(slug)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      setRowSaveStatus(prev => { const n = new Map(prev); n.delete(slug); return n })
    }, 2000)
    rowStatusTimerRef.current.set(slug, timer)
  }, [])

  // Debounced save for a single marker
  const saveRange = useCallback((slug: string, range: CustomReferenceRange) => {
    const existing = saveTimerRef.current.get(slug)
    if (existing) clearTimeout(existing)
    setSaveStatus('saving')

    const timer = setTimeout(async () => {
      try {
        await api.settings.updateReferenceRange(slug, {
          protocol_context: 'standard',
          orange_min: range.orange_min,
          green_min: range.green_min,
          green_max: range.green_max,
          orange_max: range.orange_max,
        })
        showSaved()
        flashRowStatus(slug, 'saved')
      } catch {
        setSaveStatus('error')
        flashRowStatus(slug, 'error')
      }
    }, 500)
    saveTimerRef.current.set(slug, timer)
  }, [setSaveStatus, showSaved, flashRowStatus])

  // Handle blur with comma normalization + validation
  const handleBlur = useCallback((m: MarkerWithZone, field: keyof CustomReferenceRange, rawValue: string) => {
    const numVal = parseDecimal(rawValue)
    if (rawValue !== '' && numVal === null) {
      toast.error(tCommon('invalidNumber', { value: rawValue }))
      return
    }
    const current = rangeMap.get(m.marker_slug) ?? {
      marker_slug: m.marker_slug, marker_name: m.marker_name,
      unit: m.unit_canonical, protocol_context: 'standard',
      orange_min: null, green_min: null, green_max: null, orange_max: null,
    }
    const updated = { ...current, [field]: numVal }
    setEditedRanges(prev => new Map(prev).set(m.marker_slug, updated))
    saveRange(m.marker_slug, updated)
  }, [rangeMap, saveRange])

  // Local edit (no save yet)
  const handleLocalEdit = useCallback((m: MarkerWithZone, field: keyof CustomReferenceRange, rawValue: string) => {
    const normalized = normalizeDecimal(rawValue)
    const numVal = normalized === '' ? null : parseFloat(normalized)
    const current = rangeMap.get(m.marker_slug) ?? {
      marker_slug: m.marker_slug, marker_name: m.marker_name,
      unit: m.unit_canonical, protocol_context: 'standard',
      orange_min: null, green_min: null, green_max: null, orange_max: null,
    }
    setEditedRanges(prev => new Map(prev).set(m.marker_slug, { ...current, [field]: isNaN(numVal as number) ? null : numVal }))
  }, [rangeMap])

  const resetOne = useCallback(async (slug: string) => {
    try {
      await api.settings.deleteReferenceRange(slug)
      setEditedRanges(prev => { const n = new Map(prev); n.delete(slug); return n })
      onRefresh()
      toast.success(tToast('thresholdResetSuccess'))
    } catch {
      toast.error(tToast('thresholdResetFailed'))
    }
  }, [onRefresh, tToast])

  // Apply preset from profile diet protocol
  const applyDietPreset = useCallback(async () => {
    if (!dietProtocol) return
    const presetRanges = LIFESTYLE_PRESETS[dietProtocol]
    if (!presetRanges || presetRanges.length === 0) {
      if (!confirm(t('resetAllConfirm'))) return
      try {
        await api.settings.deleteAllReferenceRanges()
        setEditedRanges(new Map())
        onRefresh()
        toast.success(tToast('thresholdResetAll'))
      } catch { toast.error(tToast('thresholdResetAllFailed')) }
      setShowPresetBanner(false)
    try { localStorage.setItem('sh_preset_dismissed_for', dietProtocol ?? '') } catch {}
      return
    }

    if (!confirm(t('applyPresetConfirm', { protocol: dietProtocol ?? '' }))) return

    setSaveStatus('saving')
    try {
      await api.settings.updateReferenceRangesBulk(
        presetRanges.map(r => ({
          marker_slug: r.marker_slug, protocol_context: 'standard',
          orange_min: r.orange_min, green_min: r.green_min,
          green_max: r.green_max, orange_max: r.orange_max,
        }))
      )
      setEditedRanges(new Map())
      onRefresh()
      showSaved()
      toast.success(tToast('presetApplied', { preset: dietProtocol }))
    } catch {
      setSaveStatus('error')
      toast.error(tToast('presetFailed'))
    }
    setShowPresetBanner(false)
    try { localStorage.setItem('sh_preset_dismissed_for', dietProtocol ?? '') } catch {}
  }, [dietProtocol, onRefresh, setSaveStatus, showSaved])

  const filterLower = filter.toLowerCase()
  const customSlugs = new Set(customRanges.map(r => r.marker_slug))
  const hasDietPreset = dietProtocol && LIFESTYLE_PRESETS[dietProtocol] && LIFESTYLE_PRESETS[dietProtocol].length > 0

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          {t('explanation')}
          {dietProtocol ? (
            <> (<button onClick={onSwitchToProfile} className="text-blue-400 hover:underline capitalize">{dietProtocol}</button>)</>
          ) : (
            <> {t('notSetProtocol')}</>
          )}. <button onClick={onSwitchToProfile} className="text-blue-400 hover:underline">{tProfile('changeInProfileTab')}</button>
        </p>
        <p className="text-xs">
          {t('explanationDetail')}
        </p>
      </div>

      {/* Banner when diet protocol has a preset */}
      {hasDietPreset && showPresetBanner && (
        <div className="flex items-center gap-3 bg-blue-950/30 border border-blue-800/50 rounded-lg px-4 py-3">
          <p className="text-sm flex-1">
            {t('applyPreset', { protocol: dietProtocol ?? '' })}
          </p>
          <button onClick={applyDietPreset} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">{t('applyButton')}</button>
          <button onClick={() => { setShowPresetBanner(false); try { localStorage.setItem('sh_preset_dismissed_for', dietProtocol ?? '') } catch {} }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{tCommon('keepCurrent')}</button>
        </div>
      )}

      {/* Filter */}
      <input type="text" placeholder={t('filterPlaceholder')} value={filter} onChange={e => setFilter(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />

      {/* Column headers */}
      <div className="border border-border rounded-lg overflow-hidden sticky-col-table scroll-hide">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[minmax(120px,1fr)_72px_68px_68px_68px_68px_46px] gap-1 px-3 py-2 bg-muted text-[10px] text-muted-foreground font-medium leading-tight">
            <span>{t('colMarker')}</span>
            <span className="text-center">{t('colUnit')}</span>
            <span className="text-center text-green-400">{t('colOptimalMin')}</span>
            <span className="text-center text-green-400">{t('colOptimalMax')}</span>
            <span className="text-center text-orange-400">{t('colLow')}</span>
            <span className="text-center text-orange-400">{t('colHigh')}</span>
            <span></span>
          </div>

          {grouped.map(zone => {
            const filtered = zone.markers.filter(m =>
              !filterLower || m.marker_name.toLowerCase().includes(filterLower) || m.marker_slug.includes(filterLower)
                || (m.display_name?.toLowerCase().includes(filterLower))
                || (m.abbreviation?.toLowerCase().includes(filterLower))
                || (contentMarkers[m.marker_slug]?.name?.toLowerCase().includes(filterLower))
                || (contentMarkers[m.marker_slug]?.description?.toLowerCase().includes(filterLower))
                || (contentMarkers[m.marker_slug]?.tooltip?.toLowerCase().includes(filterLower))
            )
            if (filtered.length === 0) return null
            const collapsed = collapsedZones.has(zone.slug)

            return (
              <div key={zone.slug}>
                <button onClick={() => toggleZone(zone.slug)} className="w-full flex items-center justify-between px-3 py-2 bg-accent text-sm font-medium hover:bg-white/[0.08] transition-colors" title={collapsed ? t('expand') : t('collapse')}>
                  <span>{zone.icon} {translateZoneName(zone.name)} ({filtered.length})</span>
                  <span className="text-muted-foreground w-5 h-5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </button>
                {!collapsed && filtered.map((m, idx) => {
                  const range = rangeMap.get(m.marker_slug)
                  const isCustom = customSlugs.has(m.marker_slug) || editedRanges.has(m.marker_slug)
                  const rowStatus = rowSaveStatus.get(m.marker_slug)
                  const unitInfo = getMarkerUnitInfo(m.marker_slug)
                  const hasUnitOptions = unitInfo && unitInfo.options.length > 1
                  const currentUnit = getUnit(m)
                  const altUnits = getAltUnits(m.marker_slug)
                  const selectedAlt = altUnitSelections.get(m.marker_slug)

                  return (
                    <div
                      key={`${m.marker_slug}-${idx}`}
                      className={`grid grid-cols-[minmax(120px,1fr)_72px_68px_68px_68px_68px_46px] gap-1 px-3 py-1 border-t border-border/50 items-center ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                    >
                      <span className="text-sm min-w-0">
                        <MarkerNameLink marker={m} />
                      </span>
                      {/* Unit column */}
                      <span className="text-center">
                        {hasUnitOptions ? (
                          <select
                            value={currentUnit}
                            onChange={e => handleUnitChange(m, e.target.value)}
                            className="bg-card border border-border rounded px-1 h-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          >
                            {unitInfo.options.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        ) : altUnits ? (
                          <select
                            value={selectedAlt ?? m.unit_canonical}
                            onChange={e => {
                              const val = e.target.value
                              setAltUnitSelections(prev => {
                                const next = new Map(prev)
                                if (val === m.unit_canonical) next.delete(m.marker_slug)
                                else next.set(m.marker_slug, val)
                                return next
                              })
                            }}
                            className="bg-card border border-border rounded px-1 h-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          >
                            <option value={m.unit_canonical}>{m.unit_canonical}</option>
                            {altUnits.map(a => <option key={a.unit} value={a.unit}>{a.unit}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground h-8 flex items-center justify-center">{m.unit_canonical}</span>
                        )}
                      </span>
                      {/* Threshold inputs - display-converted for alt units, save in canonical */}
                      <ThresholdInput value={displayValue(m.marker_slug, range?.green_min)} onBlur={v => handleBlur(m, 'green_min', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'green_min', toCanonical(m.marker_slug, v))} ring="green" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.green_max)} onBlur={v => handleBlur(m, 'green_max', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'green_max', toCanonical(m.marker_slug, v))} ring="green" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.orange_min)} onBlur={v => handleBlur(m, 'orange_min', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'orange_min', toCanonical(m.marker_slug, v))} ring="orange" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.orange_max)} onBlur={v => handleBlur(m, 'orange_max', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'orange_max', toCanonical(m.marker_slug, v))} ring="orange" />
                      <div className="flex items-center gap-0.5">
                        {rowStatus === 'saved' && <span className="text-green-400 text-xs">&#10003;</span>}
                        {rowStatus === 'error' && <span className="text-red-400 text-xs">&#10007;</span>}
                        <button onClick={() => resetOne(m.marker_slug)} className="text-base text-muted-foreground hover:text-red-400 transition-colors w-5 h-5 flex items-center justify-center" title={t('resetToDefault')}>
                          &#8635;
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
