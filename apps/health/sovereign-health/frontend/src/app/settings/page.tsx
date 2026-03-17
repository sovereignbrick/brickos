'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useContent } from '@/lib/content-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { APP_CONFIG } from '@/lib/config'
import { toast } from '@/lib/toast'
import { Footer } from '@/components/layout/footer'
import type {
  UserSettings, UserProfile, UnitPreferences, CustomReferenceRange,
  LifestyleDefaults, MarkerWithZone, CalculatedMarkerDef, DeviceInfo,
} from '@/lib/types'
import { COUNTRIES } from './countries'
import { Breadcrumb } from '@/components/breadcrumb'
import { IS_OSS } from '@/lib/mode'
import { MedicationsTab } from '@/components/settings/medications-tab'
import { InfoTooltip, MarkerInfoTooltip } from '@/components/info-tooltip'

const TABS = ['Profile', 'Devices', 'Thresholds', 'Medications', 'License', 'Security', 'Data & Privacy'] as const
type Tab = (typeof TABS)[number]

const TAB_SLUGS: Record<string, Tab> = {
  profile: 'Profile',
  license: 'License',
  devices: 'Devices',
  thresholds: 'Thresholds',
  medications: 'Medications',
  'influence-factors': 'Medications',
  privacy: 'Data & Privacy',
  data: 'Data & Privacy',
  security: 'Security',
}
const TAB_TO_SLUG: Record<Tab, string> = {
  'Profile': 'profile',
  'License': 'license',
  'Devices': 'devices',
  'Thresholds': 'thresholds',
  'Medications': 'influence-factors',
  'Data & Privacy': 'privacy',
  'Security': 'security',
}

// --- Country-to-unit defaults ---
const COUNTRY_UNIT_DEFAULTS: Record<string, Record<string, string>> = {
  US: {
    glucose_unit: 'mg/dL', cholesterol_unit: 'mg/dL', uric_acid_unit: 'mg/dL',
    hemoglobin_unit: 'g/dL', weight_unit: 'lbs', height_unit: 'in', waist_unit: 'in',
    date_format: 'MM/DD/YYYY', time_format: '12h',
  },
  GB: {
    glucose_unit: 'mmol/L', cholesterol_unit: 'mmol/L', uric_acid_unit: '\u00b5mol/L',
    hemoglobin_unit: 'g/dL', weight_unit: 'lbs', height_unit: 'in', waist_unit: 'in',
    date_format: 'DD/MM/YYYY', time_format: '24h',
  },
}
const EU_DEFAULT: Record<string, string> = {
  glucose_unit: 'mmol/L', cholesterol_unit: 'mmol/L', uric_acid_unit: '\u00b5mol/L',
  hemoglobin_unit: 'mmol/L', weight_unit: 'kg', height_unit: 'cm', waist_unit: 'cm',
  date_format: 'DD/MM/YYYY', time_format: '24h',
}

function getCountryDefaults(cc: string | null): Record<string, string> {
  if (!cc) return EU_DEFAULT
  return COUNTRY_UNIT_DEFAULTS[cc] ?? EU_DEFAULT
}

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

function getMarkerUnitInfo(slug: string): MarkerUnitDef | null {
  return MARKER_UNIT_MAP[slug] ?? null
}

// --- Per-marker alternative units (display-only conversion, canonical values unchanged) ---
// factor = multiply canonical value by factor to get alternative unit value
const UNIT_ALTERNATIVES: Record<string, { unit: string; factor: number }[]> = {
  ketones: [{ unit: 'mg/dL', factor: 10.417 }],
  dheas: [{ unit: 'µg/dL', factor: 36.84 }],
  ft4: [{ unit: 'ng/dL', factor: 0.07769 }],
  ft3: [{ unit: 'pg/mL', factor: 0.6513 }],
  eosinophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  neutrophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  lymphocytes_abs: [{ unit: 'cells/µL', factor: 1000 }],
  monocytes_abs: [{ unit: 'cells/µL', factor: 1000 }],
  basophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  platelets: [{ unit: '10³/µL', factor: 1 }],
  wbc: [{ unit: '10³/µL', factor: 1 }],
  rbc: [{ unit: '10⁶/µL', factor: 1 }],
  vitamin_a: [{ unit: 'µg/dL', factor: 28.65 }],
  vitamin_e: [{ unit: 'mg/dL', factor: 0.04307 }],
  bilirubin_total: [{ unit: 'mg/dL', factor: 0.05847 }],
  bilirubin_direct: [{ unit: 'mg/dL', factor: 0.05847 }],
  ferritin: [{ unit: 'ng/mL', factor: 1 }],
  albumin: [{ unit: 'g/dL', factor: 0.1 }],
  total_protein: [{ unit: 'g/dL', factor: 0.1 }],
  testosterone: [{ unit: 'ng/dL', factor: 28.842 }],
  free_testosterone: [{ unit: 'pg/mL', factor: 0.2884 }],
  estradiol: [{ unit: 'pg/mL', factor: 0.2724 }],
  progesterone: [{ unit: 'ng/mL', factor: 0.3145 }],
  prolactin: [{ unit: 'ng/mL', factor: 0.04722 }],
  selenium: [{ unit: 'µmol/L', factor: 0.01266 }],
  zinc: [{ unit: 'µg/dL', factor: 6.538 }],
  phosphate: [{ unit: 'mg/dL', factor: 3.097 }],
  lpa: [{ unit: 'mg/dL', factor: 0.4167 }],
  tsh: [{ unit: 'µIU/mL', factor: 1 }],
  fsh: [{ unit: 'mIU/mL', factor: 1 }],
  lh: [{ unit: 'mIU/mL', factor: 1 }],
}

function getAltUnits(slug: string): { unit: string; factor: number }[] | null {
  // Skip markers already handled by MARKER_UNIT_MAP (they have their own dropdown)
  if (MARKER_UNIT_MAP[slug]) return null
  return UNIT_ALTERNATIVES[slug] ?? null
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

// --- Normalize decimal input ---
function normalizeDecimal(value: string): string {
  return value.replace(',', '.')
}

function parseDecimal(value: string): number | null {
  const normalized = normalizeDecimal(value)
  if (normalized === '') return null
  const n = parseFloat(normalized)
  return isNaN(n) ? null : n
}

// --- Save status ---
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// --- Zone grouping utility ---
function groupByZone(markers: MarkerWithZone[]) {
  const zones: { slug: string; name: string; icon: string; markers: MarkerWithZone[] }[] = []
  const zoneMap = new Map<string, MarkerWithZone[]>()
  const seen = new Set<string>()

  for (const m of markers) {
    if (seen.has(m.marker_slug)) continue
    seen.add(m.marker_slug)
    const zs = m.zone_slug ?? 'other'
    if (!zoneMap.has(zs)) zoneMap.set(zs, [])
    zoneMap.get(zs)!.push(m)
  }

  const zoneOrder = new Map<string, { name: string; icon: string; order: number }>()
  for (const m of markers) {
    if (m.zone_slug && !zoneOrder.has(m.zone_slug)) {
      zoneOrder.set(m.zone_slug, { name: m.zone_name ?? m.zone_slug, icon: m.zone_icon ?? '', order: m.zone_order })
    }
  }

  for (const slug of [...zoneMap.keys()].sort((a, b) => (zoneOrder.get(a)?.order ?? 999) - (zoneOrder.get(b)?.order ?? 999))) {
    const info = zoneOrder.get(slug)
    const zm = zoneMap.get(slug) ?? []
    zm.sort((a, b) => a.marker_name.localeCompare(b.marker_name))
    zones.push({ slug, name: info?.name ?? 'Other', icon: info?.icon ?? '', markers: zm })
  }
  return zones
}

// --- Info tooltip component ---
function MarkerInfoButton({ marker }: { marker: MarkerWithZone }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const { markers: contentMarkers } = useContent()

  const cm = contentMarkers[marker.marker_slug]
  const displayName = cm?.name ?? marker.display_name ?? marker.marker_name
  const abbr = marker.abbreviation ?? marker.marker_name
  const tooltipText = cm?.description ?? cm?.tooltip ?? marker.what_is
  const hasTooltip = displayName || tooltipText

  const onEnter = () => {
    if (!hasTooltip) return
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setPos({ top: rect.top, left: rect.right + 8 })
      }
      setShow(true)
    }, 300)
  }
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }
  const onTap = (e: React.MouseEvent) => {
    if (!hasTooltip) return
    e.preventDefault()
    e.stopPropagation()
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 280) })
    }
    setShow(s => !s)
  }

  return (
    <div className="relative inline-flex" ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href={`/markers/${marker.marker_slug}`}
        className="text-blue-400/60 hover:text-blue-400 transition-colors shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </Link>
      <button
        className="absolute inset-0 sm:hidden"
        onClick={onTap}
        aria-label={displayName}
      />
      {show && pos && createPortal(
        <div
          className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 text-xs"
          style={{ top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 320, whiteSpace: 'normal', wordWrap: 'break-word' }}
        >
          <p className="font-medium text-foreground">{displayName}</p>
          {abbr !== displayName && (
            <p className="text-muted-foreground">({abbr})</p>
          )}
          {tooltipText && (
            <p className="text-muted-foreground mt-1 leading-relaxed">{tooltipText}</p>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// --- Marker name + info button ---
function MarkerNameLink({ marker }: { marker: MarkerWithZone }) {
  const { markers: contentMarkers } = useContent()
  const translatedName = contentMarkers[marker.marker_slug]?.name ?? marker.display_name ?? marker.marker_name
  return (
    <span className="flex items-center gap-1 min-w-0">
      <span className="truncate">{translatedName}</span>
      <MarkerInfoButton marker={marker} />
    </span>
  )
}

function SettingsContent() {
  const { user, loading: authLoading, isDemo, isDemoOnly } = useAuth()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const tabParam = searchParams.get('tab')

  // Derive active tab from URL param
  const tab: Tab = TAB_SLUGS[tabParam ?? ''] ?? 'Profile'

  const setTab = useCallback((t: Tab) => {
    const slug = TAB_TO_SLUG[t]
    const params = new URLSearchParams(searchParams.toString())
    if (slug === 'profile') {
      params.delete('tab')
    } else {
      params.set('tab', slug)
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    if (authLoading) return
    if (isDemo || isDemoOnly) { router.push('/dashboard'); return }
    if (!user) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      router.push(`/login?return=${encodeURIComponent(returnUrl)}`)
      return
    }
    api.settings.get()
      .then(res => setSettings(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, authLoading, router, isDemo, isDemoOnly])

  const showSaved = useCallback(() => {
    setSaveStatus('saved')
    const t = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(t)
  }, [])

  if (authLoading || loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-muted-foreground">{tCommon('loading')}</div>
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-red-400">Error: {error}</div>
  if (!settings) return null

  const dietProtocol = settings.lifestyle_defaults.default_diet_protocol

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Fixed header area — never scrolls */}
      <div className="flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ backgroundColor: 'var(--background, #09090b)' }}>
      <div className="max-w-4xl mx-auto w-full px-4 pt-6 pb-0">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: t('title') },
          ]} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <span className="text-xs text-muted-foreground">
            {saveStatus === 'saving' && t('savingStatus')}
            {saveStatus === 'saved' && <span className="text-green-400">{t('allChangesSaved')}</span>}
            {saveStatus === 'error' && <span className="text-red-400">{t('saveFailedStatus')}</span>}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-0 border-b border-zinc-800 pb-0">
          {TABS.map(tb => {
            const tabLabelMap: Record<Tab, string> = {
              'Profile': t('tabs.profile'),
              'Devices': t('tabs.devices'),
              'Thresholds': t('tabs.thresholds'),
              'Medications': t('tabs.medications'),
              'License': tCommon('license'),
              'Security': t('tabs.security'),
              'Data & Privacy': t('tabs.dataPrivacy'),
            }
            return (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === tb
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabLabelMap[tb]}
              </button>
            )
          })}
        </div>
      </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-12 w-full">
        {tab === 'Profile' && (
          <ProfileTab
            profile={settings.profile}
            units={settings.units}
            lifestyle={settings.lifestyle_defaults}
            countryCode={settings.profile.country_code}
            onUpdate={p => setSettings({ ...settings, profile: { ...settings.profile, ...p } })}
            onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
            onLifestyleUpdate={l => setSettings({ ...settings, lifestyle_defaults: { ...settings.lifestyle_defaults, ...l } })}
            setSaveStatus={setSaveStatus}
            showSaved={showSaved}
          />
        )}
        {tab === 'Thresholds' && (
          <ThresholdsTab
            markers={settings.all_markers}
            calculatedMarkers={settings.calculated_markers ?? []}
            customRanges={settings.custom_reference_ranges}
            systemRanges={settings.system_reference_ranges}
            units={settings.units}
            dietProtocol={dietProtocol}
            onRefresh={() => api.settings.get().then(r => setSettings(r.data))}
            onSwitchToProfile={() => setTab('Profile')}
            onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
            setSaveStatus={setSaveStatus}
            showSaved={showSaved}
          />
        )}
        {tab === 'Devices' && <DevicesTab markers={settings.all_markers} />}
        {tab === 'License' && <LicenseTab />}
        {tab === 'Medications' && <MedicationsTab />}
        {tab === 'Data & Privacy' && <DataPrivacyTab shareAnonymousData={settings.share_anonymous_data ?? false} onToggle={(v) => setSettings({ ...settings, share_anonymous_data: v })} />}
        {tab === 'Security' && <SecurityTab />}
        </div>
        <Footer />
      </div>
    </div>
  )
}

/* ================================================================
   Devices Tab
   ================================================================ */

const DEVICE_TYPE_VALUES = ['home', 'lab', 'wearable', 'scale', 'other'] as const

const MANUFACTURER_SUGGESTIONS = [
  'ForaCare', 'Qardio', 'Abbott', 'Roche', 'Omron', 'Withings', 'Garmin', 'Apple', 'Oura', 'Dexcom',
]

// Device type labels now come from i18n (devices.deviceTypes.*)

function DevicesTab({ markers }: { markers: MarkerWithZone[] }) {
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tDev = useTranslations('devices')
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDevice, setEditDevice] = useState<DeviceInfo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(() => {
    api.devices.list()
      .then(r => setDevices(r.data ?? []))
      .catch(() => toast.error(tToast('loadDevicesFailed')))
      .finally(() => setLoading(false))
  }, [tToast])

  useEffect(() => { load() }, [load])

  const handleArchive = async (id: string) => {
    try {
      await api.devices.delete(id)
      setDevices(prev => prev.filter(d => d.id !== id))
      setDeleteConfirm(null)
      toast.success(tToast('deviceArchived'))
    } catch {
      toast.error(tToast('deviceArchiveFailed'))
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.devices.setDefault(id)
      setDevices(prev => prev.map(d => ({ ...d, is_default: d.id === id })))
      toast.success(tToast('defaultDeviceUpdated'))
    } catch {
      toast.error(tToast('defaultDeviceFailed'))
    }
  }

  const personalDevices = devices.filter(d => d.device_type !== 'lab')
  const labDevices = devices.filter(d => d.device_type === 'lab')

  if (loading) return <p className="text-muted-foreground">{tCommon('loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{tDev('title')}</h2>
        <button
          onClick={() => { setEditDevice(null); setShowModal(true) }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          {tDev('addDevice')}
        </button>
      </div>

      {personalDevices.length === 0 && labDevices.length === 0 && (
        <div className="border border-dashed border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-2">{tDev('noDevicesTitle')}</p>
          <p className="text-muted-foreground text-xs">{tDev('noDevicesDesc')}</p>
        </div>
      )}

      {personalDevices.length > 0 && (
        <div className="space-y-3">
          {personalDevices.map(d => (
            <DeviceCard
              key={d.id}
              device={d}
              markers={markers}
              onEdit={() => { setEditDevice(d); setShowModal(true) }}
              onDelete={() => setDeleteConfirm(d.id)}
              onSetDefault={() => handleSetDefault(d.id)}
            />
          ))}
        </div>
      )}

      {labDevices.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-6">{tDev('labProviders')}</h3>
          <div className="space-y-3">
            {labDevices.map(d => (
              <DeviceCard
                key={d.id}
                device={d}
                markers={markers}
                onEdit={() => { setEditDevice(d); setShowModal(true) }}
                onDelete={() => setDeleteConfirm(d.id)}
                onSetDefault={() => handleSetDefault(d.id)}
              />
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => { setEditDevice(null); setShowModal(true) }}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        {tDev('addDevice')}
      </button>

      <div className="border border-zinc-800 rounded-lg p-3 mt-4">
        <p className="text-xs text-muted-foreground">
          {tDev('tipText')}
        </p>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">{tDev('archiveTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {tDev('archiveWarning', { name: devices.find(d => d.id === deleteConfirm)?.device_name ?? '' })}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                {tCommon('cancel')}
              </button>
              <button onClick={() => handleArchive(deleteConfirm)} className="text-sm px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors">
                {tDev('archive')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <DeviceModal
          device={editDevice}
          markers={markers}
          onClose={() => { setShowModal(false); setEditDevice(null) }}
          onSaved={() => { setShowModal(false); setEditDevice(null); load() }}
        />
      )}
    </div>
  )
}

function DeviceCard({ device, markers, onEdit, onDelete, onSetDefault }: {
  device: DeviceInfo
  markers: MarkerWithZone[]
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const tDev = useTranslations('devices')
  const tCommon = useTranslations('common')
  const { markers: contentMarkers } = useContent()
  const markerNames = device.markers_measured
    .map(slug => {
      const cm = contentMarkers[slug]
      if (cm?.name) return cm.name
      const m = markers.find(mk => mk.marker_slug === slug)
      return m?.display_name ?? m?.marker_name ?? slug
    })
    .join(', ')

  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{device.device_name}</span>
          {device.is_default && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-800 font-medium">
              {tDev('default')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!device.is_default && (
            <button onClick={onSetDefault} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
              {tDev('setDefault')}
            </button>
          )}
          <button onClick={onEdit} className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1">
            {tCommon('edit')}
          </button>
          <button onClick={onDelete} className="text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-1">
            {tDev('archive')}
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          {device.manufacturer && <span>{device.manufacturer}</span>}
          {device.manufacturer && ' | '}
          {device.device_type === 'other' ? tCommon('other') : (tDev(`deviceTypes.${device.device_type}` as 'deviceTypes.home') || device.device_type)}
        </p>
        {device.markers_measured.length > 0 && (
          <p>{tDev('measures', { markers: markerNames })}</p>
        )}
        <p>
          {tDev('measurementCount', { count: device.measurement_count })}
          {device.last_used && ` | ${tDev('lastUsed', { date: new Date(device.last_used).toLocaleDateString() })}`}
        </p>
        {device.notes && <p>{tDev('notes', { notes: device.notes })}</p>}
        {device.validation_status && device.validation_date && (
          <p className="text-emerald-400/80">
            {tDev('validatedOn', { date: new Date(device.validation_date).toLocaleDateString() })}
            {device.validation_notes && `: ${device.validation_notes}`}
          </p>
        )}
      </div>
    </div>
  )
}

function DeviceModal({ device, markers, onClose, onSaved }: {
  device: DeviceInfo | null
  markers: MarkerWithZone[]
  onClose: () => void
  onSaved: () => void
}) {
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tDev = useTranslations('devices')
  const tZones = useTranslations('zones')
  const { markers: contentMarkers, zones: contentZones } = useContent()
  const isEdit = !!device
  const [name, setName] = useState(device?.device_name ?? '')
  const [manufacturer, setManufacturer] = useState(device?.manufacturer ?? '')
  const [model, setModel] = useState(device?.model ?? '')
  const [deviceType, setDeviceType] = useState(device?.device_type ?? 'home')
  const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(
    new Set(device?.markers_measured ?? [])
  )
  const [isDefault, setIsDefault] = useState(device?.is_default ?? false)
  const [notes, setNotes] = useState(device?.notes ?? '')
  const [markerSearch, setMarkerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [validationNotes, setValidationNotes] = useState(device?.validation_notes ?? '')
  const [validationStatus, setValidationStatus] = useState(device?.validation_status ?? '')

  // Group markers by zone (deduplicate by marker_slug)
  const zoneGroups = useMemo(() => {
    const seen = new Set<string>()
    const groups: Record<string, { name: string; icon: string; color: string; markers: MarkerWithZone[] }> = {}
    for (const m of markers) {
      if (seen.has(m.marker_slug)) continue
      seen.add(m.marker_slug)
      const zs = m.zone_slug ?? 'other'
      if (!groups[zs]) {
        const translatedZoneName = contentZones[zs]?.name ?? m.zone_name ?? 'Other'
        groups[zs] = {
          name: translatedZoneName,
          icon: m.zone_icon ?? '',
          color: m.zone_color ?? '#71717a',
          markers: [],
        }
      }
      groups[zs].markers.push(m)
    }
    return Object.entries(groups)
  }, [markers, contentZones])

  const filteredZoneGroups = useMemo(() => {
    if (!markerSearch.trim()) return zoneGroups
    const q = markerSearch.toLowerCase()
    return zoneGroups
      .map(([slug, group]) => {
        const filtered = group.markers.filter(m => {
          const cm = contentMarkers[m.marker_slug]
          return (cm?.name ?? m.display_name ?? m.marker_name).toLowerCase().includes(q) ||
            m.marker_slug.toLowerCase().includes(q) ||
            (m.abbreviation ?? '').toLowerCase().includes(q) ||
            (cm?.description ?? '').toLowerCase().includes(q) ||
            (m.what_is ?? '').toLowerCase().includes(q)
        })
        return [slug, { ...group, markers: filtered }] as const
      })
      .filter(([, g]) => g.markers.length > 0)
  }, [zoneGroups, markerSearch, contentMarkers])

  const toggleMarker = (slug: string) => {
    setSelectedMarkers(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(tToast('deviceNameRequired'))
      return
    }
    setSaving(true)
    try {
      if (isEdit && device) {
        await api.devices.update(device.id, {
          name: name.trim(),
          manufacturer: manufacturer || null,
          model: model || null,
          device_type: deviceType,
          markers: [...selectedMarkers],
          is_default: isDefault,
          notes: notes || null,
          validation_notes: validationNotes || null,
          validation_status: validationStatus || null,
          validation_date: validationStatus ? new Date().toISOString() : null,
        })
        toast.success(tToast('deviceUpdated'))
      } else {
        await api.devices.create({
          name: name.trim(),
          manufacturer: manufacturer || null,
          model: model || null,
          device_type: deviceType,
          markers: [...selectedMarkers],
          is_default: isDefault,
          notes: notes || null,
        })
        toast.success(tToast('deviceAdded'))
      }
      onSaved()
    } catch {
      toast.error(isEdit ? tToast('deviceUpdateFailed') : tToast('deviceAddFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold">{isEdit ? tDev('editDevice') : tDev('addDeviceTitle')}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{tCommon('nameLabel')} *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={tDev('placeholders.deviceName')}
              className="w-full bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{tDev('manufacturerLabel')}</label>
            <input
              type="text"
              value={manufacturer}
              onChange={e => setManufacturer(e.target.value)}
              placeholder={tDev('placeholders.manufacturer')}
              list="mfr-suggestions"
              className="w-full bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <datalist id="mfr-suggestions">
              {MANUFACTURER_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{tDev('modelLabel')}</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={tDev('placeholders.model')}
              className="w-full bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{tDev('typeLabel')} *</label>
            <select
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg px-3 py-2 text-sm [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
            >
              {DEVICE_TYPE_VALUES.map(v => <option key={v} value={v}>{v === 'other' ? tCommon('other') : tDev(`deviceTypes.${v}` as 'deviceTypes.home')}</option>)}
            </select>
          </div>

          {/* Markers */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {tDev('markersSelected', { count: selectedMarkers.size })}
            </label>
            <input
              type="text"
              value={markerSearch}
              onChange={e => setMarkerSearch(e.target.value)}
              placeholder={tCommon('searchMarkers')}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-lg">
              {filteredZoneGroups.map(([slug, group]) => (
                <div key={slug}>
                  <div
                    className="px-3 py-1.5 text-xs font-medium sticky top-0 bg-zinc-900 border-b border-zinc-800 flex items-center gap-1"
                    style={{ color: group.color }}
                  >
                    <span>{group.icon}</span> {group.name}
                  </div>
                  {group.markers.map((m, idx) => (
                    <label
                      key={`${m.marker_slug}-${idx}`}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarkers.has(m.marker_slug)}
                        onChange={() => toggleMarker(m.marker_slug)}
                        className="rounded"
                      />
                      <span className="flex-1 min-w-0 truncate">
                        {contentMarkers[m.marker_slug]?.name ?? m.display_name ?? m.marker_name}
                        {m.abbreviation && (
                          <span className="text-muted-foreground ml-1">({m.abbreviation})</span>
                        )}
                      </span>
                      <MarkerInfoTooltip slug={m.marker_slug} markers={contentMarkers} allMarkers={markers} />
                      <span className="text-xs text-muted-foreground shrink-0">{m.unit_canonical}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{tDev('setAsDefault')}</span>
            <InfoTooltip>{tDev('setAsDefaultTooltip')}</InfoTooltip>
          </label>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{tCommon('notesLabel')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={tDev('placeholders.notes')}
              rows={2}
              className="w-full bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Validation (edit only) */}
          {isEdit && (
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tDev('validation')}</p>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{tDev('statusLabel')}</label>
                <select
                  value={validationStatus}
                  onChange={e => setValidationStatus(e.target.value)}
                  className="w-full bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg px-3 py-2 text-sm [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
                >
                  <option value="">{tDev('notValidated')}</option>
                  <option value="validated">{tDev('validated')}</option>
                  <option value="pending">{tDev('pendingStatus')}</option>
                  <option value="deviation_noted">{tDev('deviationNoted')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{tDev('validationNotes')}</label>
                <input
                  type="text"
                  value={validationNotes}
                  onChange={e => setValidationNotes(e.target.value)}
                  placeholder={tDev('placeholders.validationNotes')}
                  className="w-full bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? tCommon('saving') : isEdit ? tDev('saveChanges') : tDev('addDeviceTitle')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Profile Tab (now includes date/time format from old Units tab)
   ================================================================ */
function ProfileTab({
  profile, units, lifestyle, countryCode, onUpdate, onUnitsUpdate, onLifestyleUpdate, setSaveStatus, showSaved,
}: {
  profile: UserProfile
  units: UnitPreferences
  lifestyle: LifestyleDefaults
  countryCode: string | null
  onUpdate: (p: Partial<UserProfile>) => void
  onUnitsUpdate: (u: Partial<UnitPreferences>) => void
  onLifestyleUpdate: (l: Partial<LifestyleDefaults>) => void
  setSaveStatus: (s: SaveStatus) => void
  showSaved: () => void
}) {
  const t = useTranslations('settings.profile')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tFasting = useTranslations('fastingProtocols')
  const tSleep = useTranslations('sleepQuality')
  const tStress = useTranslations('stressLevel')
  const [form, setForm] = useState(profile)
  const [lForm, setLForm] = useState(lifestyle)
  const [uForm, setUForm] = useState(units)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft-in'>('cm')
  const [waistUnit, setWaistUnit] = useState<'cm' | 'inches'>('cm')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [locale, setLocale] = useState(contentLocale)

  const localizedCountries = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'region' })
      return COUNTRIES.map(c => ({ code: c.code, name: dn.of(c.code) ?? c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, locale))
    } catch {
      return COUNTRIES
    }
  }, [locale])

  const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    setLocale(newLocale)
    setContentLocale(newLocale)
    // Save locale to backend profile
    try {
      await api.settings.updateProfile({ locale: newLocale })
    } catch {
      // Non-critical  - locale is also in cookie via setContentLocale
    }
  }

  const save = async () => {
    setSaving(true)

    setSaveStatus('saving')
    try {
      const heightCm = heightUnit === 'ft-in' && form.height_cm
        ? form.height_cm * 2.54 : form.height_cm
      const waistCm = waistUnit === 'inches' && form.default_waist_cm
        ? form.default_waist_cm * 2.54 : form.default_waist_cm
      const weightKg = weightUnit === 'lbs' && form.default_weight_kg
        ? form.default_weight_kg / 2.205 : form.default_weight_kg

      await api.settings.updateProfile({
        display_name: form.display_name,
        gender: form.gender,
        age: form.age,
        height_cm: heightCm ? Math.round(heightCm * 10) / 10 : null,
        default_waist_cm: waistCm ? Math.round(waistCm * 10) / 10 : null,
        default_weight_kg: weightKg ? Math.round(weightKg * 10) / 10 : null,
        country_code: form.country_code,
      })
      onUpdate(form)
      await api.settings.updateUnits({
        date_format: uForm.date_format,
        time_format: uForm.time_format,
      })
      onUnitsUpdate({ date_format: uForm.date_format, time_format: uForm.time_format })
      await api.settings.updateLifestyle(lForm)
      onLifestyleUpdate(lForm)
      setMsg(tToast('profileSaved'))
      showSaved()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : tToast('profileSaveFailed'))
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const displayHeight = heightUnit === 'ft-in' && form.height_cm
    ? Math.round(form.height_cm / 2.54 * 10) / 10 : form.height_cm
  const displayWaist = waistUnit === 'inches' && form.default_waist_cm
    ? Math.round(form.default_waist_cm / 2.54 * 10) / 10 : form.default_waist_cm
  const displayWeight = weightUnit === 'lbs' && form.default_weight_kg
    ? Math.round(form.default_weight_kg * 2.205 * 10) / 10 : form.default_weight_kg

  const tierLabel = (t: string) => {
    const map: Record<string, string> = {
      glimpse: 'Glimpse (Free)', core: 'Core (Self-Hosted)', focus: 'Focus', insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
    }
    return map[t] ?? 'Early Access'
  }

  const resetToCountryDefaults = async () => {
    const defaults = getCountryDefaults(form.country_code)
    const updates = defaults as Partial<UnitPreferences>
    setUForm(f => ({ ...f, ...updates }))
    onUnitsUpdate(updates)
    setSaveStatus('saving')
    try {
      await api.settings.updateUnits(updates)
      showSaved()
      toast.success(tToast('unitsReset'))
    } catch {
      setSaveStatus('error')
    }
  }

  const inp = "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
  const ro = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-muted-foreground cursor-not-allowed"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label={tCommon('email')}>
          <input type="email" value={profile.email} readOnly className={ro} />
        </Field>
        <Field label={t('displayName')}>
          <input type="text" value={form.display_name ?? ''} onChange={e => setForm({ ...form, display_name: e.target.value || null })} className={inp} placeholder={t('displayNamePlaceholder')} />
        </Field>
        <Field label={t('gender')}>
          <select value={form.gender ?? ''} onChange={e => setForm({ ...form, gender: e.target.value || null })} className={inp}>
            <option value="">{tCommon('notSet')}</option>
            <option value="male">{t('genderOptions.male')}</option>
            <option value="female">{t('genderOptions.female')}</option>
            <option value="other">{t('genderOptions.other')}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('country')}>
          <select value={form.country_code ?? ''} onChange={e => setForm({ ...form, country_code: e.target.value || null })} className={inp}>
            <option value="">{tCommon('notSet')}</option>
            {localizedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={tCommon('license')}>
          <input type="text" value={tierLabel(profile.tier)} readOnly className={ro} />
        </Field>
        <Field label={t('language')}>
          <select value={locale} onChange={handleLocaleChange} className={inp}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('dateFormat')}>
          <select value={uForm.date_format} onChange={e => setUForm({ ...uForm, date_format: e.target.value })} className={inp}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </Field>
        <Field label={t('timeFormat')}>
          <select value={uForm.time_format} onChange={e => setUForm({ ...uForm, time_format: e.target.value })} className={inp}>
            <option value="24h">{t('timeFormats.24h')}</option>
            <option value="12h">{t('timeFormats.12h')}</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button onClick={resetToCountryDefaults} className="text-xs text-muted-foreground hover:text-foreground border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
            {t('resetDefaults')}
          </button>
        </div>
      </div>

      {/* Body Measurements */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">{t('bodyMeasurements')}</h3>
        <p className="text-xs text-muted-foreground">{t('bodyMeasurementsDesc')}</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">{t('age')}</span>
              <InfoTooltip>{t('ageTooltip')}</InfoTooltip>
            </div>
            <input type="number" value={form.age ?? ''} onChange={e => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })} className={"w-16 " + inp} min={1} max={99} />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">{t('height')}</span>
              <InfoTooltip>{t('heightTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input type="number" value={displayHeight ?? ''} onChange={e => {
                const v = e.target.value ? Number(e.target.value) : null
                setForm({ ...form, height_cm: heightUnit === 'ft-in' && v ? Math.round(v * 2.54 * 10) / 10 : v })
              }} className={"w-16 " + inp} step={0.1} />
              <select value={heightUnit} onChange={e => setHeightUnit(e.target.value as 'cm' | 'ft-in')} className="w-14 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-foreground">
                <option value="cm">cm</option><option value="ft-in">in</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">{t('waist')}</span>
              <InfoTooltip>{t('waistTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input type="number" value={displayWaist ?? ''} onChange={e => {
                const v = e.target.value ? Number(e.target.value) : null
                setForm({ ...form, default_waist_cm: waistUnit === 'inches' && v ? Math.round(v * 2.54 * 10) / 10 : v })
              }} className={"w-20 " + inp} step={0.1} />
              <select value={waistUnit} onChange={e => setWaistUnit(e.target.value as 'cm' | 'inches')} className="w-14 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-foreground">
                <option value="cm">cm</option><option value="inches">in</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">{t('weight')}</span>
              <InfoTooltip>{t('weightTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input type="number" value={displayWeight ?? ''} onChange={e => {
                const v = e.target.value ? Number(e.target.value) : null
                setForm({ ...form, default_weight_kg: weightUnit === 'lbs' && v ? Math.round(v / 2.205 * 10) / 10 : v })
              }} className={"w-16 " + inp} step={0.1} />
              <select value={weightUnit} onChange={e => setWeightUnit(e.target.value as 'kg' | 'lbs')} className="w-14 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-foreground">
                <option value="kg">kg</option><option value="lbs">lbs</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lifestyle Defaults */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('lifestyleDefaults')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('lifestyleDefaultsDesc')}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
              <FieldWithInfo label={tCommon('dietProtocol')} items={['carnivore','keto','omnivore','vegetarian','vegan','paleo','mediterranean','other'].map(k => ({ name: tCommon(k as 'carnivore'), desc: t(`dietDescs.${k}` as 'dietDescs.carnivore') }))}>
                <select value={lForm.default_diet_protocol ?? ''} onChange={e => setLForm({ ...lForm, default_diet_protocol: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('notSet')}</option>
                  <option value="carnivore">{tCommon('carnivore')}</option>
                  <option value="keto">{tCommon('keto')}</option>
                  <option value="omnivore">{t('diets.omnivore')}</option>
                  <option value="vegetarian">{tCommon('vegetarian')}</option>
                  <option value="vegan">{tCommon('vegan')}</option>
                  <option value="paleo">{tCommon('paleo')}</option>
                  <option value="mediterranean">{tCommon('mediterranean')}</option>
                  <option value="other">{tCommon('other')}</option>
                </select>
                {lForm.default_diet_protocol && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`dietDescs.${lForm.default_diet_protocol}`)}</p>
                )}
              </FieldWithInfo>
              <FieldWithInfo label={tCommon('fastingProtocol')} items={['16_8','18_6','20_4','omad','36h','48h','extended'].map(k => ({ name: k === '16_8' || k === 'omad' || k === '36h' || k === '48h' || k === 'extended' ? tFasting(k as '16_8') : tCommon(k as '18_6'), desc: t(`fastingDescs.${k}` as 'fastingDescs.16_8') }))}>
                <select value={lForm.default_fasting_protocol ?? ''} onChange={e => setLForm({ ...lForm, default_fasting_protocol: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('none')}</option>
                  <option value="16_8">{tFasting('16_8')}</option>
                  <option value="18_6">{tCommon('18_6')}</option>
                  <option value="20_4">{tCommon('20_4')}</option>
                  <option value="omad">{tFasting('omad')}</option>
                  <option value="36h">{tFasting('36h')}</option>
                  <option value="48h">{tFasting('48h')}</option>
                  <option value="extended">{tFasting('extended')}</option>
                </select>
                {lForm.default_fasting_protocol && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`fastingDescs.${lForm.default_fasting_protocol}`)}</p>
                )}
              </FieldWithInfo>
              <FieldWithInfo label={t('exerciseLevel')} items={['strength','cardio','walking','hiit','rest'].map(k => ({ name: tCommon(k as 'strength'), desc: t(`exerciseDescs.${k}` as 'exerciseDescs.strength') }))}>
                <select value={lForm.default_exercise ?? ''} onChange={e => setLForm({ ...lForm, default_exercise: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('none')}</option>
                  <option value="strength">{tCommon('strength')}</option>
                  <option value="cardio">{tCommon('cardio')}</option>
                  <option value="walking">{tCommon('walking')}</option>
                  <option value="hiit">{tCommon('hiit')}</option>
                  <option value="rest">{tCommon('rest')}</option>
                </select>
                {lForm.default_exercise && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`exerciseDescs.${lForm.default_exercise}`)}</p>
                )}
              </FieldWithInfo>
              <Field label={t('sleepHoursLabel')}>
                <input type="number" value={lForm.default_sleep_hours ?? ''} onChange={e => setLForm({ ...lForm, default_sleep_hours: e.target.value ? Number(e.target.value) : null })} className={inp} min={0} max={24} step={0.5} />
              </Field>
              <Field label={t('sleepQualityLabel')}>
                <select value={lForm.default_sleep_quality ?? ''} onChange={e => setLForm({ ...lForm, default_sleep_quality: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('notSet')}</option>
                  <option value="excellent">{tSleep('excellent')}</option>
                  <option value="good">{tCommon('good')}</option>
                  <option value="fair">{tCommon('fair')}</option>
                  <option value="poor">{tSleep('poor')}</option>
                </select>
                {lForm.default_sleep_quality && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`sleepDescs.${lForm.default_sleep_quality}`)}</p>
                )}
              </Field>
              <Field label={t('stressLevelLabel')}>
                <select
                  value={lForm.default_stress_level ?? ''}
                  onChange={e => setLForm({ ...lForm, default_stress_level: e.target.value ? Number(e.target.value) : null })}
                  className={inp}
                >
                  <option value="">{tCommon('notSet')}</option>
                  <option value="1">{tStress('none')}</option>
                  <option value="3">{tStress('low')}</option>
                  <option value="5">{tStress('moderate')}</option>
                  <option value="7">{tStress('high')}</option>
                  <option value="9">{tStress('veryHigh')}</option>
                </select>
                {lForm.default_stress_level && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`stressDescs.${lForm.default_stress_level}`)}</p>
                )}
              </Field>
            </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {saving ? tCommon('saving') : t('saveProfile')}
        </button>
        {msg && <span className={msg === tToast('profileSaved') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{msg}</span>}
      </div>
    </div>
  )
}

/* ================================================================
   Thresholds Tab (merged with Units: unit column + conversion)
   ================================================================ */
function ThresholdsTab({
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
  const [showPresetBanner, setShowPresetBanner] = useState(true)
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

    // Update unit preference
    const updates = { [info.group]: newUnit } as Partial<UnitPreferences>
    setUnitForm(f => ({ ...f, ...updates }))
    onUnitsUpdate(updates)

    // Auto-save unit change
    if (unitSaveTimerRef.current) clearTimeout(unitSaveTimerRef.current)
    unitSaveTimerRef.current = setTimeout(async () => {
      try {
        await api.settings.updateUnits(updates)
      } catch {
        toast.error(tToast('unitSaveFailed'))
      }
    }, 300)

    // Convert threshold values for ALL markers in the same unit group
    if (oldUnit !== newUnit && info.convert?.[oldUnit]?.[newUnit]) {
      const factor = info.convert[oldUnit][newUnit]
      const affectedSlugs = Object.entries(MARKER_UNIT_MAP)
        .filter(([, def]) => def.group === info.group && def.convert)
        .map(([slug]) => slug)

      const bulkUpdates: { marker_slug: string; protocol_context: string; green_min: number | null; green_max: number | null; orange_min: number | null; orange_max: number | null }[] = []

      for (const slug of affectedSlugs) {
        const existing = rangeMap.get(slug)
        if (!existing) continue
        const converted: CustomReferenceRange = {
          ...existing,
          green_min: existing.green_min != null ? Math.round(existing.green_min * factor * 1000) / 1000 : null,
          green_max: existing.green_max != null ? Math.round(existing.green_max * factor * 1000) / 1000 : null,
          orange_min: existing.orange_min != null ? Math.round(existing.orange_min * factor * 1000) / 1000 : null,
          orange_max: existing.orange_max != null ? Math.round(existing.orange_max * factor * 1000) / 1000 : null,
        }
        setEditedRanges(prev => new Map(prev).set(slug, converted))
        bulkUpdates.push({
          marker_slug: slug,
          protocol_context: 'standard',
          green_min: converted.green_min,
          green_max: converted.green_max,
          orange_min: converted.orange_min,
          orange_max: converted.orange_max,
        })
      }

      // Bulk save converted values
      if (bulkUpdates.length > 0) {
        try {
          await api.settings.updateReferenceRangesBulk(bulkUpdates)
        } catch {
          // Conversions are visual-only if save fails
        }
      }
    }
  }, [getUnit, onUnitsUpdate, rangeMap])

  // Get display conversion factor for alt-unit markers (1 = canonical, >1 or <1 = converted)
  const getAltDisplayFactor = useCallback((slug: string): number => {
    const selectedAlt = altUnitSelections.get(slug)
    if (!selectedAlt) return 1
    const alts = getAltUnits(slug)
    if (!alts) return 1
    const match = alts.find(a => a.unit === selectedAlt)
    return match ? match.factor : 1
  }, [altUnitSelections])

  // Convert a threshold value for display (alt unit)
  const displayValue = useCallback((slug: string, val: number | null | undefined): number | null => {
    if (val == null) return null
    const factor = getAltDisplayFactor(slug)
    if (factor === 1) return val
    return Math.round(val * factor * 1000) / 1000
  }, [getAltDisplayFactor])

  // Convert a displayed value back to canonical for saving
  const toCanonical = useCallback((slug: string, displayVal: string): string => {
    const factor = getAltDisplayFactor(slug)
    if (factor === 1) return displayVal
    const num = parseFloat(displayVal.replace(',', '.'))
    if (isNaN(num)) return displayVal
    return String(Math.round((num / factor) * 1000) / 1000)
  }, [getAltDisplayFactor])

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
          <button onClick={() => setShowPresetBanner(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{tCommon('keepCurrent')}</button>
        </div>
      )}

      {/* Filter */}
      <input type="text" placeholder={t('filterPlaceholder')} value={filter} onChange={e => setFilter(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />

      {/* Column headers */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden sticky-col-table scroll-hide">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[minmax(120px,1fr)_72px_68px_68px_68px_68px_46px] gap-1 px-3 py-2 bg-zinc-800 text-[10px] text-muted-foreground font-medium leading-tight">
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
            )
            if (filtered.length === 0) return null
            const collapsed = collapsedZones.has(zone.slug)

            return (
              <div key={zone.slug}>
                <button onClick={() => toggleZone(zone.slug)} className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.05] text-sm font-medium hover:bg-white/[0.08] transition-colors" title={collapsed ? t('expand') : t('collapse')}>
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
                      className={`grid grid-cols-[minmax(120px,1fr)_72px_68px_68px_68px_68px_46px] gap-1 px-3 py-1 border-t border-zinc-800/50 items-center ${idx % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
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
                            className="bg-zinc-900 border border-zinc-700 rounded px-1 h-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
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
                            className="bg-zinc-900 border border-zinc-700 rounded px-1 h-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          >
                            <option value={m.unit_canonical}>{m.unit_canonical}</option>
                            {altUnits.map(a => <option key={a.unit} value={a.unit}>{a.unit}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground h-8 flex items-center justify-center">{m.unit_canonical}</span>
                        )}
                      </span>
                      {/* Threshold inputs  - display-converted for alt units, save in canonical */}
                      <ThresholdInput value={displayValue(m.marker_slug, range?.green_min)} onBlur={v => handleBlur(m, 'green_min', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'green_min', toCanonical(m.marker_slug, v))} ring="green" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.green_max)} onBlur={v => handleBlur(m, 'green_max', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'green_max', toCanonical(m.marker_slug, v))} ring="green" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.orange_min)} onBlur={v => handleBlur(m, 'orange_min', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'orange_min', toCanonical(m.marker_slug, v))} ring="orange" />
                      <ThresholdInput value={displayValue(m.marker_slug, range?.orange_max)} onBlur={v => handleBlur(m, 'orange_max', toCanonical(m.marker_slug, v))} onChange={v => handleLocalEdit(m, 'orange_max', toCanonical(m.marker_slug, v))} ring="orange" />
                      <div className="flex items-center gap-0.5">
                        {rowStatus === 'saved' && <span className="text-green-400 text-xs">&#10003;</span>}
                        {rowStatus === 'error' && <span className="text-red-400 text-xs">&#10007;</span>}
                        <button onClick={() => resetOne(m.marker_slug)} className="text-base text-muted-foreground hover:text-red-400 transition-colors w-5 h-5 flex items-center justify-center" title={t('resetToDefault')}>
                          ↻
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

/* Threshold input that accepts commas, normalizes on blur */
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
        setLocal(e.target.value)
        onChange(e.target.value)
      }}
      onBlur={() => {
        const normalized = normalizeDecimal(local)
        setLocal(normalized)
        onBlur(normalized)
      }}
      className={`w-full h-8 bg-zinc-900 border border-zinc-700 rounded px-1.5 text-sm text-center focus:outline-none focus:ring-1 ${ringColor}`}
    />
  )
}

/* ================================================================
   Data & Privacy Tab
   ================================================================ */
function DataPrivacyTab({ shareAnonymousData, onToggle }: { shareAnonymousData: boolean; onToggle: (v: boolean) => void }) {
  const t = useTranslations('settings.dataPrivacy')
  const tCommon = useTranslations('common')
  const { logout } = useAuth()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toggling, setToggling] = useState(false)
  // Reports state
  const [reportPeriod, setReportPeriod] = useState('3m')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingJson, setExportingJson] = useState(false)
  const [quota, setQuota] = useState<{ used: number; limit: number | null; period: string } | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; report_type: string; period: string; file_size_bytes: number | null; created_at: string }>>([])

  useEffect(() => {
    api.reports.quota().then(r => setQuota(r.data)).catch(() => {})
    api.reports.history().then(r => setHistory(r.data || [])).catch(() => {})
  }, [])

  const handleToggleAnonymous = async () => {
    setToggling(true)
    try {
      await api.settings.updateAnonymousData(!shareAnonymousData)
      onToggle(!shareAnonymousData)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('updateFailed'))
    } finally {
      setToggling(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)

    try {
      const res = await api.reports.healthPdf(reportPeriod)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || 'PDF generation failed')
      }
      const blob = await res.blob()
      downloadBlob(blob, `health-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success(t('pdfDownloaded'))
      api.reports.quota().then(r => setQuota(r.data)).catch(() => {})
      api.reports.history().then(r => setHistory(r.data || [])).catch(() => {})
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('pdfFailed'))
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleExportCsv = async () => {
    setExportingCsv(true)

    try {
      const res = await api.reports.exportCsv({ period: reportPeriod })
      if (!res.ok) throw new Error('CSV export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(t('csvExported'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('csvFailed'))
    } finally {
      setExportingCsv(false)
    }
  }

  const handleExportJson = async () => {
    setExportingJson(true)

    try {
      const res = await api.reports.exportJson({ period: reportPeriod })
      if (!res.ok) throw new Error('JSON export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-export-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success(t('jsonExported'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('jsonFailed'))
    } finally {
      setExportingJson(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const res = await api.settings.exportAll()
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-full-export-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success(t('exportDownloaded'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tCommon('exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await api.settings.deleteAccount()
      logout()
      router.push('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('deleteFailed'))
      setDeleting(false)
    }
  }, [logout, router])

  return (
    <div className="space-y-8">
      <div className="border border-zinc-800 rounded-lg p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t('anonymousDataTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('anonymousDataDesc')}</p>
          </div>
          <button
            onClick={handleToggleAnonymous}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
              shareAnonymousData ? 'bg-blue-600' : 'bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              shareAnonymousData ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Health Reports */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('healthReports')}</h3>
        <p className="text-sm text-muted-foreground">{t('healthReportsDesc')}</p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">{t('period')}</label>
          <select
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="7d">{t('last7d')}</option>
            <option value="30d">{t('last30d')}</option>
            <option value="3m">{t('last3m')}</option>
            <option value="6m">{t('last6m')}</option>
            <option value="1y">{t('last1y')}</option>
            <option value="all">{t('allTime')}</option>
          </select>

        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {generatingPdf ? t('generating') : t('generatePdf')}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="border border-zinc-700 hover:bg-white/5 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {exportingCsv ? t('exporting') : tCommon('exportCsv')}
          </button>
          <button
            onClick={handleExportJson}
            disabled={exportingJson}
            className="border border-zinc-700 hover:bg-white/5 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {exportingJson ? t('exporting') : t('exportJson')}
          </button>
        </div>

        {quota && (
          <p className="text-xs text-muted-foreground">
            {t('quotaUsed', { used: quota.used, limit: quota.limit !== null ? t('quotaLimit', { max: quota.limit, period: quota.period }) : t('quotaUnlimited') })}
          </p>
        )}

        {history.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('recentReports')}</p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {[...history]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map(h => {
                  const typeLabel = h.report_type === 'health_pdf' ? t('pdfReport')
                    : h.report_type === 'json_export' ? t('jsonExport')
                    : h.report_type === 'csv_export' ? t('csvExport')
                    : h.report_type;
                  const d = new Date(h.created_at);
                  const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={h.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{typeLabel} ({h.period})</span>
                      <span>{dateStr} {timeStr}{h.file_size_bytes ? ` - ${(h.file_size_bytes / 1024).toFixed(0)} KB` : ''}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div className="border border-zinc-800 rounded-lg p-6 space-y-3">
        <h3 className="font-medium">{t('exportAllTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('exportAllDesc')}</p>
        <button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {exporting ? t('preparingExport') : t('downloadExport')}
        </button>
      </div>

      <div className="border border-red-900/50 rounded-lg p-6 space-y-3">
        <h3 className="font-medium text-red-400">{t('deleteAccountTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('deleteAccountDesc')}</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600/30 transition-colors">{t('deleteButton')}</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300 font-medium">{t('confirmDeletePrompt')}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500 transition-colors">{deleting ? t('deleting') : t('confirmDeleteButton')}</button>
              <button onClick={() => setConfirmDelete(false)} className="border border-zinc-700 text-muted-foreground hover:text-foreground hover:bg-white/5 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

/* ================================================================
   License Tab (Task 8) - merged with billing features (B-0063)
   ================================================================ */

const LICENSE_TIER_ORDER = ['glimpse', 'core', 'focus', 'insight', 'clarity', 'horizon']

const LICENSE_TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  focus: { monthly: 999, annual: 9999 },
  insight: { monthly: 2499, annual: 24999 },
  clarity: { monthly: 4999, annual: 49999 },
}

function formatLicenseCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`
}

interface LicenseInvoice {
  id: string
  date: string
  amount_cents: number | null
  currency: string
  tier: string | null
  status: string
  pdf_url: string | null
  hosted_url: string | null
  invoice_number: string | null
}

interface StripePaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface StripeInvoice {
  id: string
  number: string
  amount_paid: number
  currency: string
  status: string
  created: number
  invoice_pdf: string
  hosted_invoice_url: string
}

function LicenseTab() {
  const t = useTranslations('settings.license')
  const tCommon = useTranslations('common')
  const { user, isDemo } = useAuth()
  const [tierInfo, setTierInfo] = useState<{ slug: string; name: string } | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentCanceled, setPaymentCanceled] = useState(false)
  const [cardInfo, setCardInfo] = useState<StripePaymentMethod | null>(null)
  const [stripeInvoices, setStripeInvoices] = useState<StripeInvoice[]>([])
  const [billingLoading, setBillingLoading] = useState(true)

  const tierNames: Record<string, string> = {
    glimpse: 'Glimpse', core: 'Core', focus: 'Focus',
    insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
  }

  const [subscription, setSubscription] = useState<{
    tier_slug: string; billing_interval: string; status: string;
    current_period_end: string; cancel_at_period_end: boolean;
  } | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [changingInterval, setChangingInterval] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [invoices, setInvoices] = useState<LicenseInvoice[]>([])
  const [portalLoading, setPortalLoading] = useState(false)
  const billingCacheRef = useRef<{ ts: number } | null>(null)

  const applySyncResult = (data: {
    synced: boolean; tier_slug?: string; billing_interval?: string;
    status?: string; current_period_end?: string; cancel_at_period_end?: boolean;
    payment_method?: StripePaymentMethod | null;
    invoices?: StripeInvoice[];
  }) => {
    if (data.synced && data.tier_slug) {
      const n = tierNames[data.tier_slug] || data.tier_slug
      setTierInfo({ slug: data.tier_slug, name: n })
      if (data.tier_slug && data.billing_interval && data.status && data.current_period_end) {
        setSubscription({
          tier_slug: data.tier_slug,
          billing_interval: data.billing_interval,
          status: data.status,
          current_period_end: data.current_period_end,
          cancel_at_period_end: data.cancel_at_period_end || false,
        })
      }
    }
    if (data.payment_method) setCardInfo(data.payment_method)
    if (data.invoices) setStripeInvoices(data.invoices)
  }

  // Handle payment success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentParam = params.get('payment')
    if (paymentParam === 'success' || paymentParam === 'canceled') {
      if (paymentParam === 'success') setPaymentSuccess(true)
      if (paymentParam === 'canceled') setPaymentCanceled(true)
      params.delete('payment')
      const qs = params.toString()
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      window.history.replaceState({}, '', newUrl)
      if (paymentParam === 'success') {
        const timer = setTimeout(() => {
          Promise.all([
            api.billing.sync().catch(() => null),
            api.billing.status().catch(() => null),
          ]).then(([syncRes, statusRes]) => {
            if (syncRes?.data) applySyncResult(syncRes.data)
            if (statusRes?.data) {
              setStripeEnabled(statusRes.data.stripe_enabled)
              setSubscription(statusRes.data.subscription)
              if (statusRes.data.subscription?.tier_slug) {
                const n = tierNames[statusRes.data.subscription.tier_slug] || statusRes.data.subscription.tier_slug
                setTierInfo({ slug: statusRes.data.subscription.tier_slug, name: n })
              }
            }
            billingCacheRef.current = { ts: Date.now() }
            setBillingLoading(false)
          })
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  // Load billing data in parallel (with 60s cache)
  useEffect(() => {
    if (IS_OSS) { setBillingLoading(false); return }
    if (billingCacheRef.current && Date.now() - billingCacheRef.current.ts < 60000) {
      setBillingLoading(false)
      return
    }

    Promise.all([
      api.billing.status().catch(() => null),
      api.billing.sync().catch(() => null),
      api.invoices.list().catch(() => null),
    ]).then(([statusRes, syncRes, invoicesRes]) => {
      if (statusRes?.data) {
        setStripeEnabled(statusRes.data.stripe_enabled)
        setSubscription(statusRes.data.subscription)
      }
      if (syncRes?.data) applySyncResult(syncRes.data)
      if (invoicesRes?.data?.invoices) setInvoices(invoicesRes.data.invoices)
      billingCacheRef.current = { ts: Date.now() }
    }).finally(() => setBillingLoading(false))
  }, [])

  const tierColors: Record<string, string> = {
    glimpse: 'bg-zinc-600', core: 'bg-blue-600', focus: 'bg-emerald-600',
    insight: 'bg-purple-600', clarity: 'bg-amber-600', horizon: 'bg-rose-600',
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await api.billing.portal()
      window.location.href = res.data.portal_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setPortalLoading(false)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      const res = await api.billing.reactivate()
      toast.success(res.data.message)
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false } : null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setReactivating(false)
    }
  }

  const handleChangeInterval = async () => {
    if (!subscription) return
    setChangingInterval(true)
    const newInterval = subscription.billing_interval === 'annual' ? 'monthly' : 'annual'
    try {
      const res = await api.billing.changeInterval(newInterval)
      toast.success(res.data.message)
      const statusRes = await api.billing.status()
      setSubscription(statusRes.data.subscription)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setChangingInterval(false)
    }
  }

  const handleChangePlan = async (newTier: string) => {
    if (!subscription) return
    setChangingPlan(true)
    try {
      const res = await api.billing.changePlan(newTier, subscription.billing_interval)
      toast.success(res.data.message)
      setShowChangePlan(false)
      const statusRes = await api.billing.status()
      setSubscription(statusRes.data.subscription)
      if (statusRes.data.subscription) {
        const newName = tierNames[statusRes.data.subscription.tier_slug] || statusRes.data.subscription.tier_slug
        setTierInfo({ slug: statusRes.data.subscription.tier_slug, name: newName })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setChangingPlan(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await api.billing.cancel(cancelReason || undefined)
      toast.success(res.data.message)
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null)
      setShowCancelModal(false)
      setCancelReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setCancelling(false)
    }
  }

  if (IS_OSS) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('currentPlan')}</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">Core</span>
              {t('coreSelfHosted')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t('allFeaturesIncluded')}</p>
        </div>
      </div>
    )
  }

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('demoProfilePlan')}</p>
            <p className="text-lg font-semibold">{tierInfo?.name || 'Clarity'}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t('registerPrompt')}</p>
          <Link href="/signup" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Register
          </Link>
        </div>
      </div>
    )
  }

  // Show plan info immediately from user data (no full-page spinner)
  const slug = tierInfo?.slug || user?.tier || 'glimpse'
  const name = tierNames[slug] || tierInfo?.name || 'Glimpse'
  const color = tierColors[slug] || 'bg-zinc-600'
  const isAnnual = subscription?.billing_interval === 'annual'
  const currentTierRank = LICENSE_TIER_ORDER.indexOf(slug)
  const availableTiers = ['focus', 'insight', 'clarity'].filter(tier => tier !== slug)
  const allInvoices = stripeInvoices.length > 0 ? stripeInvoices : []
  const hasPaidPlan = subscription || slug !== 'glimpse'

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {paymentSuccess && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center gap-3">
          <span className="text-green-400 text-lg">&#10003;</span>
          <div>
            <p className="font-medium text-green-300">{t('paymentSuccessTitle')}</p>
            <p className="text-sm text-green-400/80">{t('paymentSuccessDesc', { tier: name })}</p>
          </div>
        </div>
      )}
      {paymentCanceled && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center gap-3">
          <span className="text-zinc-400 text-lg">&#8505;</span>
          <p className="text-sm text-zinc-300">{t('paymentCanceled')}</p>
        </div>
      )}

      {/* Current plan info - renders immediately from user data */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-5">
        <h3 className="font-medium">{tCommon('currentPlan')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('plan')}</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${color}`}>{name}</span>
              {name} {subscription ? `(${isAnnual ? tCommon('annual') : tCommon('monthly')})` : `(${tCommon('free')})`}
            </p>
          </div>
          {subscription && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{tCommon('status')}</p>
                <p className={`text-lg font-semibold ${
                  subscription.status === 'active' && !subscription.cancel_at_period_end ? 'text-green-400'
                  : subscription.status === 'past_due' ? 'text-yellow-400' : 'text-zinc-400'
                }`}>
                  {subscription.cancel_at_period_end
                    ? t('cancellingOn', { date: formatDate(subscription.current_period_end) })
                    : subscription.status === 'past_due' ? t('pastDue') : tCommon('active')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tCommon('nextBilling')}</p>
                <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t('memberSince')}</p>
            <p className="font-medium">{user?.created_at ? formatDate(user.created_at) : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Payment Method - with Manage button */}
      {hasPaidPlan && (
        <div className="border border-zinc-800 rounded-lg p-6 space-y-3">
          <h3 className="font-medium">{t('paymentMethodTitle')}</h3>
          {billingLoading ? (
            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
          ) : cardInfo ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium capitalize">
                {t('cardEndingIn', { brand: cardInfo.brand, last4: cardInfo.last4 })}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('cardExpires', {
                  month: String(cardInfo.exp_month).padStart(2, '0'),
                  year: String(cardInfo.exp_year),
                })}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noPaymentMethod')}</p>
          )}
          {subscription && stripeEnabled && (
            <div>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm rounded-lg transition-colors"
              >
                {portalLoading ? '...' : tCommon('managePayment')}
              </button>
              <p className="text-xs text-muted-foreground mt-1">{t('managePaymentDesc')}</p>
            </div>
          )}
        </div>
      )}

      {/* Plan actions */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('planActions')}</h3>
        <div className="space-y-4">
          {/* No subscription - show upgrade options */}
          {!subscription && stripeEnabled && (
            <a href={`${APP_CONFIG.websiteUrl}/pricing`} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              {t('upgrade')}
            </a>
          )}

          {/* Active subscription actions */}
          {subscription && !subscription.cancel_at_period_end && (
            <>
              <div>
                <button onClick={() => setShowChangePlan(true)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors">
                  {tCommon('changePlan')}
                </button>
                <p className="text-xs text-muted-foreground mt-1">{t('changePlanDesc')}</p>
              </div>
              <div>
                <button
                  onClick={handleChangeInterval}
                  disabled={changingInterval}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm rounded-lg transition-colors"
                >
                  {changingInterval ? '...' : isAnnual ? t('switchToMonthly') : t('switchToYearly')}
                </button>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAnnual ? t('switchMonthlyDesc') : t('switchYearlyDesc')}
                </p>
              </div>
            </>
          )}

          {/* Cancelled - show reactivate */}
          {subscription?.cancel_at_period_end && (
            <button onClick={handleReactivate} disabled={reactivating} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {reactivating ? tCommon('reactivating') : t('reactivateSubscription')}
            </button>
          )}

          {/* Past due - update payment */}
          {subscription?.status === 'past_due' && stripeEnabled && (
            <button onClick={handlePortal} disabled={portalLoading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {portalLoading ? '...' : t('updatePaymentMethod')}
            </button>
          )}
        </div>

        {/* Cancel section */}
        {subscription && (
          <div className="border-t border-zinc-800 pt-4">
            {subscription.cancel_at_period_end ? (
              <p className="text-sm text-muted-foreground">
                {t('endingOn', { date: formatDate(subscription.current_period_end) })}
              </p>
            ) : (
              <div>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('cancelSubscription')}
                </button>
                <p className="text-xs text-muted-foreground mt-1">{t('cancelDesc')}</p>
              </div>
            )}
          </div>
        )}

        <a href={`${APP_CONFIG.websiteUrl}/pricing`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
          {t('viewPricing')}
        </a>
      </div>

      {/* Payment History - Stripe invoices + DB invoices */}
      {hasPaidPlan && (
        <div className="border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{t('invoicesTitle')}</h3>
            {stripeEnabled && subscription && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {portalLoading ? '...' : t('viewAllInvoices')}
              </button>
            )}
          </div>
          {billingLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-5 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : allInvoices.length > 0 ? (
            <div className="space-y-3">
              {allInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(inv.created * 1000).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                  <span>{inv.number || '-'}</span>
                  <span>{formatLicenseCents(inv.amount_paid)}</span>
                  <span className="text-green-400">{tCommon('paid')}</span>
                  {inv.invoice_pdf ? (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                      title={tCommon('downloadInvoice')}
                    >
                      PDF
                    </a>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(inv.date)}</span>
                  <span>{inv.tier ? tierNames[inv.tier] || inv.tier : '-'}</span>
                  <span>{inv.amount_cents ? formatLicenseCents(inv.amount_cents) : '-'}</span>
                  <span className="text-green-400">{tCommon('paid')}</span>
                  {inv.pdf_url ? (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                      title={tCommon('downloadInvoice')}
                    >
                      PDF
                    </a>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
          )}
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlan && subscription && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{tCommon('changePlanTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {tCommon('currentPlanLabel', {
                tier: tierNames[subscription.tier_slug] || subscription.tier_slug,
                price: LICENSE_TIER_PRICES[subscription.tier_slug]
                  ? formatLicenseCents(isAnnual
                    ? LICENSE_TIER_PRICES[subscription.tier_slug].annual
                    : LICENSE_TIER_PRICES[subscription.tier_slug].monthly)
                    + (isAnnual ? '/yr' : '/mo')
                  : ''
              })}
            </p>

            <div className="space-y-2">
              {availableTiers.map(tier => {
                const prices = LICENSE_TIER_PRICES[tier]
                const price = prices
                  ? formatLicenseCents(isAnnual ? prices.annual : prices.monthly) + (isAnnual ? '/yr' : '/mo')
                  : ''
                return (
                  <button
                    key={tier}
                    onClick={() => handleChangePlan(tier)}
                    disabled={changingPlan}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 transition-colors"
                  >
                    <span className="font-medium">{tierNames[tier]}</span>
                    <span className="text-sm text-muted-foreground">{price}</span>
                  </button>
                )
              })}
              <button
                disabled
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 opacity-60"
              >
                <span className="font-medium">Horizon</span>
                <span className="text-sm text-muted-foreground">{tCommon('contactForPlan')}</span>
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t('upgradeNote')}</p>
              <p>{t('downgradeNote')}</p>
            </div>

            <button
              onClick={() => setShowChangePlan(false)}
              className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && subscription && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{t('cancelConfirmTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('cancelConfirmText', {
                tier: tierNames[subscription.tier_slug] || subscription.tier_slug,
                date: formatDate(subscription.current_period_end),
              })}
            </p>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">{tCommon('cancelReason')}</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-</option>
                <option value="too_expensive">{tCommon('reasonTooExpensive')}</option>
                <option value="not_using">{t('reasonNotUsing')}</option>
                <option value="switching">{tCommon('reasonSwitching')}</option>
                <option value="missing_features">{tCommon('reasonMissingFeatures')}</option>
                <option value="other">{tCommon('reasonOther')}</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason('') }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                {tCommon('keepPlan')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {cancelling ? tCommon('cancelling') : t('cancelSubscription')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Security Tab (Task 7)
   ================================================================ */
function SecurityTab() {
  const t = useTranslations('settings.security')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const { isDemo } = useAuth()
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // MFA setup flow state
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'recovery' | 'done'>('idle')
  const [setupData, setSetupData] = useState<{ setup_token: string; qr_svg: string; secret_base32: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [setupSubmitting, setSetupSubmitting] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [recoveryAcked, setRecoveryAcked] = useState(false)

  // Disable flow
  const [showDisable, setShowDisable] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  // Regenerate flow
  const [showRegen, setShowRegen] = useState(false)
  const [regenCode, setRegenCode] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // Change password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMfaCode, setPwMfaCode] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    api.mfa.status().then(res => {
      setMfaEnabled(res.data.enabled)
      setMfaVerifiedAt(res.data.verified_at)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [isDemo])

  const handleEnableMfa = async () => {
    try {
      const res = await api.mfa.setup()
      setSetupData(res.data)
      setSetupStep('qr')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    }
  }

  const handleVerifySetup = async () => {
    if (!setupData) return
    setSetupSubmitting(true)
    try {
      const res = await api.mfa.verifySetup(setupData.setup_token, setupCode)
      setRecoveryCodes(res.data.recovery_codes)
      setSetupStep('recovery')
      setMfaEnabled(true)
      setMfaVerifiedAt(new Date().toISOString())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setSetupSubmitting(false)
    }
  }

  const handleDisableMfa = async () => {
    setDisabling(true)
    try {
      await api.mfa.disable(disableCode)
      setMfaEnabled(false)
      setMfaVerifiedAt(null)
      setShowDisable(false)
      setDisableCode('')
      toast.success(tToast('mfaDisabled'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setDisabling(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await api.mfa.regenerateRecovery(regenCode)
      setRecoveryCodes(res.data.recovery_codes)
      setShowRegen(false)
      setRegenCode('')
      setSetupStep('recovery')
      setRecoveryAcked(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setRegenerating(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast.error(tToast('passwordMismatch')); return }
    if (newPw.length < 8) { toast.error(tToast('passwordTooShort')); return }
    setChangingPw(true)
    try {
      const res = await api.changePassword(currentPw, newPw, mfaEnabled ? pwMfaCode || undefined : undefined)
      toast.success(res.data.message)
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwMfaCode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setChangingPw(false)
    }
  }

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    toast.success(tToast('recoveryCodesCopied'))
  }

  const downloadRecoveryCodes = () => {
    const text = `Sovereign Health - Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n\nEach code can only be used once.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'recovery-codes.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center text-muted-foreground py-8">{tCommon('loading')}</div>

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Security settings are not available in demo mode.</p>
        </div>
      </div>
    )
  }

  // Recovery codes modal
  if (setupStep === 'recovery' && recoveryCodes.length > 0) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
          <h3 className="font-medium">{t('recoveryCodes')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('recoveryCodesDesc')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-center">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={copyRecoveryCodes} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors">
              {t('copyAll')}
            </button>
            <button onClick={downloadRecoveryCodes} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors">
              {t('downloadCodes')}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recoveryAcked} onChange={e => setRecoveryAcked(e.target.checked)} className="rounded" />
            I have saved my recovery codes
          </label>
          <button
            onClick={() => { setSetupStep('done'); setRecoveryCodes([]) }}
            disabled={!recoveryAcked}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // MFA QR setup step
  if (setupStep === 'qr' && setupData) {
    return (
      <div className="space-y-6">
        <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
          <h3 className="font-medium">{t('setupMfa')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('scanQr')}
          </p>
          <div className="flex justify-center bg-white rounded-lg p-4 max-w-[240px] mx-auto" dangerouslySetInnerHTML={{ __html: setupData.qr_svg }} />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('manualEntry')}</p>
            <p className="font-mono text-sm bg-zinc-900 border border-zinc-800 rounded px-3 py-2 select-all break-all">
              {setupData.secret_base32}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">
              {t('enterCode')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={setupCode}
              onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-white/5 border rounded-lg px-3 py-3 text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleVerifySetup}
              disabled={setupSubmitting || setupCode.length < 6}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {setupSubmitting ? 'Verifying...' : t('verify')}
            </button>
            <button
              onClick={() => { setSetupStep('idle'); setSetupData(null); setSetupCode('') }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('twoFactor')}</h3>
        {mfaEnabled ? (
          <>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">Enabled</span>
              {mfaVerifiedAt && (
                <span className="text-xs text-muted-foreground">
                  since {new Date(mfaVerifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowRegen(true)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                {t('regenerate')}
              </button>
              <button
                onClick={() => setShowDisable(true)}
                className="px-4 py-2 text-sm text-red-400 border border-red-800 rounded-lg hover:bg-red-600/10 transition-colors"
              >
                {t('disableMfa')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('twoFactorDesc')}
            </p>
            <button
              onClick={handleEnableMfa}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              {t('enableMfa')}
            </button>
          </>
        )}
      </div>

      {/* Disable MFA modal */}
      {showDisable && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Disable Two-Factor Authentication?</h2>
            <p className="text-sm text-muted-foreground">
              This will remove the extra security from your account.
              Enter your current authenticator code to confirm.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDisable(false); setDisableCode('') }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={disabling || disableCode.length < 6}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {disabling ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate recovery codes modal */}
      {showRegen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Regenerate Recovery Codes</h2>
            <p className="text-sm text-muted-foreground">
              Enter your current authenticator code to generate new recovery codes.
              This will invalidate all existing recovery codes.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={regenCode}
              onChange={e => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowRegen(false); setRegenCode('') }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || regenCode.length < 6}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('changePassword')}</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('currentPassword')}</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{tCommon('newPassword')}</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {newPw.length > 0 && newPw.length < 8 && (
              <p className="text-xs text-yellow-400 mt-1">{t('security.passwordTooShort')}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('confirmNewPassword')}</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <p className="text-xs text-red-400 mt-1">{t('security.passwordMismatch')}</p>
            )}
          </div>
          {mfaEnabled && (
            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('mfaCode')}</label>
              <input type="text" inputMode="numeric" maxLength={6} value={pwMfaCode}
                onChange={e => setPwMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={changingPw || !currentPw || newPw.length < 8 || newPw !== confirmPw}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {changingPw ? t('changing') : t('changeButton')}
          </button>
        </div>
      </div>

    </div>
  )
}

/* ================================================================
   Shared
   ================================================================ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function FieldWithInfo({ label, items, children }: { label: string; items: { name: string; desc: string }[]; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = () => {
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) })
      }
      setShow(true)
    }, 200)
  }
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave} className="inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        {show && pos && createPortal(
          <div
            className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 text-xs"
            style={{ top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 320 }}
            onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
            onMouseLeave={onLeave}
          >
            <p className="font-medium text-foreground mb-2">{label}</p>
            <ul className="space-y-1">
              {items.map(it => (
                <li key={it.name} className="text-muted-foreground leading-snug">
                  <span className="text-foreground font-medium">{it.name}</span>: {it.desc}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
