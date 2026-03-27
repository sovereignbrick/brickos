'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useOffline } from '@/lib/offline-context'
import { useSync } from '@/lib/sync-context'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { CalculatedMarkerCard } from '@/components/calculated-marker-card'
import { computeMarkers, SessionValues } from '@/lib/calculated'
import { computeStatus, DEFAULT_RANGES } from '@/lib/status'
import type { DeviceInfo, MeasurementTemplate, MarkerWithZone, UnitPreferences } from '@/lib/types'
import { Breadcrumb } from '@/components/breadcrumb'
import { DateTimePicker } from '@/components/date-time-picker'
import { getDisplayUnit, convertValue } from '@/lib/units'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import Link from 'next/link'

// -- Helpers ---------------------------------------------------------------

function formatLocalDatetime(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function getDeviceBadge(slug: string, devices: DeviceInfo[]): string | null {
  const dev = devices.find(d => d.markers_measured.includes(slug))
  if (dev) return dev.device_name
  if (slug === 'waist_circumference') return 'Manual'
  return null
}

const MARKERS_PER_PAGE = 10

// -- Sub-components --------------------------------------------------------

function StatusDot({ slug, value, canonicalUnit, displayUnit }: {
  slug: string; value: string; canonicalUnit: string; displayUnit: string
}) {
  const n = parseFloat(value)
  if (!value || isNaN(n)) return null
  const canonical = convertValue(slug, n, displayUnit, canonicalUnit)
  const range = DEFAULT_RANGES[slug]
  if (!range) return null
  const status = computeStatus(canonical, range)
  const dot = status === 'green' ? '🟢' : status === 'orange' ? '🟡' : status === 'red' ? '🔴' : null
  return dot ? <span className="text-sm leading-none">{dot}</span> : null
}

function MarkerInfoTooltip({ slug }: { slug: string }) {
  const { markers: contentMarkers } = useContent()
  const desc = contentMarkers[slug]?.description
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  if (!desc) return null

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ x: r.right + 8, y: r.top + r.height / 2 })
    }
    setShow(true)
  }

  const cm = contentMarkers[slug]

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="text-blue-500 dark:text-muted-foreground/50 hover:text-blue-600 dark:hover:text-muted-foreground cursor-help shrink-0 text-xs"
      >
        ⓘ
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateY(-50%)', zIndex: 9999 }}
          className="max-w-xs bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-xl pointer-events-none"
        >
          <div className="space-y-1">
            <div className="font-medium">{cm?.name ?? slug}</div>
            <div>{desc}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function ZoneIconTooltip({ name, icon, color }: { name: string; icon: string; color: string }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ x: r.left + r.width / 2, y: r.top })
    }
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="text-[9px] px-1 py-0.5 rounded shrink-0 hidden sm:inline-block cursor-help"
        style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
      >
        {icon}
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y - 6, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
          className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground shadow-xl pointer-events-none whitespace-nowrap"
        >
          {icon} {name}
        </div>,
        document.body,
      )}
    </>
  )
}

function BadgeTooltip({ label, className, style }: { label: string; className: string; style?: React.CSSProperties }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ x: r.left + r.width / 2, y: r.top }); } setShow(true); }}
        onMouseLeave={() => setShow(false)}
        className={className}
        style={style}
      >
        {label}
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y - 6, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
          className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground shadow-xl pointer-events-none whitespace-nowrap"
        >
          {label}
        </div>,
        document.body,
      )}
    </>
  )
}

function MarkerRow({ marker, value, displayUnit, badge, onChange, onRemove, zoneBadge }: {
  marker: MarkerWithZone
  value: string
  displayUnit: string
  badge: string | null
  onChange: (slug: string, val: string) => void
  onRemove: (slug: string) => void
  zoneBadge?: { name: string; icon: string; color: string } | null
}) {
  const tCommon = useTranslations('common')
  const { markers: contentMarkers } = useContent()
  const name = contentMarkers[marker.marker_slug]?.name ?? marker.display_name ?? marker.marker_name

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm truncate">
          {name}
        </span>
        {marker.abbreviation && (
          <span className="text-xs text-muted-foreground shrink-0">({marker.abbreviation})</span>
        )}
        <MarkerInfoTooltip slug={marker.marker_slug} />
        <span className="flex-1" />
        {badge && (
          <BadgeTooltip
            label={badge}
            className="text-[10px] text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline-block cursor-help"
          />
        )}
        {zoneBadge && (
          <ZoneIconTooltip name={zoneBadge.name} icon={zoneBadge.icon} color={zoneBadge.color} />
        )}
      </div>
      <input
        id={`meas-new-marker-${marker.marker_slug}`}
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="-"
        onInput={e => {
          const el = e.currentTarget
          el.value = el.value.replace(/[^0-9.,-]/g, '').replace(',', '.')
        }}
        onChange={e => onChange(marker.marker_slug, e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.'))}
        className="w-20 shrink-0 bg-accent border rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">{displayUnit}</span>
      <div className="w-5 shrink-0 flex justify-center">
        <StatusDot
          slug={marker.marker_slug}
          value={value}
          canonicalUnit={marker.unit_canonical}
          displayUnit={displayUnit}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(marker.marker_slug)}
        className="text-muted-foreground hover:text-foreground text-sm w-5 shrink-0 text-center"
        aria-label={tCommon('removeMarker')}
      >
        ✕
      </button>
    </div>
  )
}

// -- Constants -------------------------------------------------------------

const STRESS_OPTIONS = [
  { key: 'notRecorded' as const, value: '' },
  { key: 'none' as const,        value: '1' },
  { key: 'low' as const,         value: '3' },
  { key: 'moderate' as const,    value: '5' },
  { key: 'high' as const,        value: '7' },
  { key: 'veryHigh' as const,    value: '9' },
]

// -- Main page -------------------------------------------------------------

export default function NewMeasurementPage() {
  const { user, loading, isDemo } = useAuth()
  const { isOffline } = useOffline()
  const { queueWrite } = useSync()
  const router = useRouter()
  const t = useTranslations('newMeasurement')
  const tSync = useTranslations('sync')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const tMeasurements = useTranslations('measurements')
  const tProtocols = useTranslations('protocols')
  const tFasting = useTranslations('fastingProtocols')
  const tExercise = useTranslations('exercise')
  const tSleepQuality = useTranslations('sleepQuality')
  const tStressLevel = useTranslations('stressLevel')
  const { markers: contentMarkers, zones: contentZones } = useContent()

  // API data
  const [allMarkers, setAllMarkers] = useState<MarkerWithZone[]>([])
  const [units, setUnits] = useState<UnitPreferences | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Profile defaults
  const heightCm = (user as (typeof user & { height_cm?: number }) | null)?.height_cm ?? undefined

  // Marker values: slug -> input string (in display unit)
  const [values, setValues] = useState<Record<string, string>>({})

  // Active marker slugs (flat list, no zone grouping)
  const [activeSlugs, setActiveSlugs] = useState<Set<string>>(new Set())

  // Template state
  const [activeTemplate, setActiveTemplate] = useState<string>('')
  const [templateOriginalSlugs, setTemplateOriginalSlugs] = useState<Set<string> | null>(null)

  // Add marker browser state
  const [addMarkerSearch, setAddMarkerSearch] = useState('')
  const [addMarkerPage, setAddMarkerPage] = useState(0)

  // Marker search filter (for "My Markers" section)
  const [markerFilter, setMarkerFilter] = useState('')

  // Device state
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  // Form state
  const [measuredAt, setMeasuredAt]     = useState(formatLocalDatetime(new Date()))
  const [protocol, setProtocol]         = useState<'standard' | 'fasting'>('standard')
  const [dietProtocol, setDietProtocol] = useState('')
  const [fastingProtocol, setFastingProtocol] = useState('16_8')
  const [fastStart, setFastStart]       = useState('')
  const [mealTiming, setMealTiming]     = useState('no_tag')
  const [exercise, setExercise]         = useState('')
  const [sleepHours, setSleepHours]     = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [stressLevel, setStressLevel]   = useState('')
  const [note, setNote]                 = useState('')
  const [submitting, setSubmitting]     = useState(false)

  // Build zone lookup for badges
  const zoneLookup = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>()
    for (const m of allMarkers) {
      if (m.zone_slug && !map.has(m.marker_slug)) {
        map.set(m.marker_slug, {
          name: contentZones[m.zone_slug]?.name ?? m.zone_name ?? m.zone_slug,
          icon: contentZones[m.zone_slug]?.zone_icon ?? m.zone_icon ?? '',
          color: contentZones[m.zone_slug]?.zone_color ?? m.zone_color ?? '#71717a',
        })
      }
    }
    return map
  }, [allMarkers, contentZones])

  // Zone list for grouping
  const zoneList = useMemo(() => {
    const zones: { slug: string; name: string; icon: string; color: string }[] = []
    const seen = new Set<string>()
    for (const m of allMarkers) {
      if (m.zone_slug && !seen.has(m.zone_slug)) {
        seen.add(m.zone_slug)
        zones.push({
          slug: m.zone_slug,
          name: contentZones[m.zone_slug]?.name ?? m.zone_name ?? m.zone_slug,
          icon: contentZones[m.zone_slug]?.zone_icon ?? m.zone_icon ?? '',
          color: contentZones[m.zone_slug]?.zone_color ?? m.zone_color ?? '#71717a',
        })
      }
    }
    return zones
  }, [allMarkers, contentZones])

  // Is template modified?
  const isTemplateModified = useMemo(() => {
    if (!templateOriginalSlugs) return false
    if (activeSlugs.size !== templateOriginalSlugs.size) return true
    for (const s of activeSlugs) {
      if (!templateOriginalSlugs.has(s)) return true
    }
    return false
  }, [activeSlugs, templateOriginalSlugs])

  // Collect current form defaults for template saving
  const collectDefaults = useCallback(() => ({
    meal_timing: mealTiming !== 'no_tag' ? mealTiming : undefined,
    sleep_hours: sleepHours || undefined,
    sleep_quality: sleepQuality || undefined,
    stress_level: stressLevel || undefined,
    protocol: protocol !== 'standard' ? protocol : undefined,
    fasting_protocol: protocol === 'fasting' ? fastingProtocol : undefined,
    note: note || undefined,
  }), [mealTiming, sleepHours, sleepQuality, stressLevel, protocol, fastingProtocol, note])

  // Apply template
  const applyTemplate = useCallback((template: MeasurementTemplate) => {
    const slugs = new Set(template.marker_slugs)
    setActiveSlugs(slugs)
    setTemplateOriginalSlugs(new Set(slugs))
    // Restore saved defaults
    const d = template.defaults
    if (d) {
      if (d.meal_timing) setMealTiming(d.meal_timing)
      if (d.sleep_hours) setSleepHours(d.sleep_hours)
      if (d.sleep_quality) setSleepQuality(d.sleep_quality)
      if (d.stress_level) setStressLevel(d.stress_level)
      if (d.protocol === 'fasting') { setProtocol('fasting'); if (d.fasting_protocol) setFastingProtocol(d.fasting_protocol) }
      if (d.note) setNote(d.note)
    }
  }, [])

  // Add a marker to the form
  const addMarker = useCallback((slug: string) => {
    setActiveSlugs(prev => {
      const next = new Set(prev)
      next.add(slug)
      return next
    })
  }, [])

  // Remove a marker from the form
  const removeMarker = useCallback((slug: string) => {
    setActiveSlugs(prev => {
      const next = new Set(prev)
      next.delete(slug)
      return next
    })
    setValues(prev => {
      if (!(slug in prev)) return prev
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }, [])

  // Load data on mount
  useEffect(() => {
    if (!loading && !user && !isDemo) { router.push('/login'); return }
    if (user && !dataLoaded) {
      Promise.all([
        api.settings.get(),
        api.devices.list().catch(() => ({ data: [] as DeviceInfo[] })),
        api.templates.list().catch(() => ({ data: [] as MeasurementTemplate[] })),
      ]).then(([settingsRes, devicesRes, templatesRes]) => {
        const settings = settingsRes.data
        if (settings) {
          setAllMarkers(settings.all_markers ?? [])
          setUnits(settings.units)

          // Load lifestyle defaults
          const ld = settings.lifestyle_defaults
          if (ld) {
            if (ld.default_diet_protocol) setDietProtocol(ld.default_diet_protocol)
            if (ld.default_fasting_protocol) {
              setFastingProtocol(ld.default_fasting_protocol)
              setProtocol('fasting')
            }
            if (ld.default_exercise) setExercise(ld.default_exercise)
            if (ld.default_sleep_hours != null) setSleepHours(String(ld.default_sleep_hours))
            if (ld.default_sleep_quality) setSleepQuality(ld.default_sleep_quality)
            if (ld.default_stress_level != null) setStressLevel(String(ld.default_stress_level))
          }
        }

        const deviceList = devicesRes.data ?? []
        setDevices(deviceList)
        const defaultDev = deviceList.find(d => d.is_default)
        const tpls = templatesRes.data ?? []
        setTemplates(tpls)

        // Priority: default device → default template → last-used template → empty
        if (defaultDev) {
          // Auto-populate markers from the default device
          setSelectedDeviceId(defaultDev.id)
          setActiveSlugs(new Set(defaultDev.markers_measured))
        } else {
          // No default device — fall back to template logic
          const def = tpls.find(tp => tp.is_default)
          if (def) {
            setActiveTemplate(def.id)
            const slugs = new Set(def.marker_slugs)
            setActiveSlugs(slugs)
            setTemplateOriginalSlugs(new Set(slugs))
          } else if (tpls.length > 0) {
            // Pick most recently used template
            const sorted = [...tpls].sort((a, b) => {
              if (a.last_used_at && b.last_used_at) return b.last_used_at.localeCompare(a.last_used_at)
              if (a.last_used_at) return -1
              if (b.last_used_at) return 1
              return 0
            })
            const lastUsed = sorted[0]
            if (lastUsed.last_used_at) {
              setActiveTemplate(lastUsed.id)
              const slugs = new Set(lastUsed.marker_slugs)
              setActiveSlugs(slugs)
              setTemplateOriginalSlugs(new Set(slugs))
            }
          }
        }

        setDataLoaded(true)
      }).catch(() => {
        setDataLoaded(true)
      })
    }
  }, [user, loading, router, dataLoaded])

  // Value change handler
  const handleValueChange = useCallback((slug: string, val: string) => {
    setValues(prev => {
      if (val === '' && !(slug in prev)) return prev
      if (val === '') {
        const next = { ...prev }
        delete next[slug]
        return next
      }
      return { ...prev, [slug]: val }
    })
  }, [])

  // Computed session values for calculated markers (in canonical units)
  const sessionValues: SessionValues = useMemo(() => {
    const sv: Record<string, number> = {}
    for (const [slug, val] of Object.entries(values)) {
      const n = parseFloat(val)
      if (isNaN(n)) continue
      const marker = allMarkers.find(m => m.marker_slug === slug)
      if (!marker) continue
      const displayUnit = getDisplayUnit(slug, marker.unit_canonical, units)
      sv[slug] = convertValue(slug, n, displayUnit, marker.unit_canonical)
    }
    return sv
  }, [values, allMarkers, units])

  const computed = computeMarkers(sessionValues, heightCm)

  // Device-filtered markers
  const selectedDevice = devices.find(d => d.id === selectedDeviceId)
  const deviceMarkerSet = useMemo(() => {
    if (!selectedDevice) return null
    return new Set(selectedDevice.markers_measured)
  }, [selectedDevice])

  // Ranked search scoring: prioritize exact/word matches over substring, name over description
  const scoreMarker = useCallback((m: MarkerWithZone, q: string): number => {
    const name = (contentMarkers[m.marker_slug]?.name ?? m.display_name ?? m.marker_name).toLowerCase()
    const rawName = (m.display_name ?? m.marker_name).toLowerCase()
    const abbr = (m.abbreviation ?? '').toLowerCase()
    const slug = m.marker_slug.toLowerCase()
    const zone = (m.zone_name ?? '').toLowerCase()
    const desc = (contentMarkers[m.marker_slug]?.description ?? m.what_is ?? '').toLowerCase()

    // Exact name match
    if (name === q || rawName === q || abbr === q) return 100
    // Name starts with query
    if (name.startsWith(q) || rawName.startsWith(q)) return 80
    // Word boundary match in name (e.g. "muscle" matches "Skeletal Muscle Index")
    const wordBoundary = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    if (wordBoundary.test(name) || wordBoundary.test(rawName)) return 70
    // Abbreviation starts with
    if (abbr.startsWith(q)) return 65
    // Name contains (substring)
    if (name.includes(q) || rawName.includes(q)) return 50
    // Abbreviation contains
    if (abbr.includes(q)) return 45
    // Slug contains
    if (slug.includes(q)) return 30
    // Description/what_is contains query word
    if (wordBoundary.test(desc)) return 20
    if (desc.includes(q)) return 15
    // Zone name matches
    if (zone.includes(q)) return 10
    return 0
  }, [contentMarkers])

  // Visible markers: active markers filtered by search and optionally by device
  const visibleMarkers = useMemo(() => {
    // Deduplicate by marker_slug (devices may list a marker that also exists in the catalog)
    const seen = new Set<string>()
    let active = allMarkers.filter(m => {
      if (!activeSlugs.has(m.marker_slug)) return false
      if (seen.has(m.marker_slug)) return false
      seen.add(m.marker_slug)
      return true
    })
    // When a device is selected, show device markers first, then any others with values
    if (deviceMarkerSet) {
      active = active.filter(m =>
        deviceMarkerSet.has(m.marker_slug) || (values[m.marker_slug] && values[m.marker_slug].trim())
      )
    }
    if (!markerFilter.trim()) return active
    const q = markerFilter.toLowerCase()
    return active
      .map(m => ({ m, score: scoreMarker(m, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ m }) => m)
  }, [allMarkers, activeSlugs, markerFilter, deviceMarkerSet, values, contentMarkers, scoreMarker])

  // Markers for "Add Markers" browser: grouped by zone, filtered, paginated
  const addBrowserMarkers = useMemo(() => {
    let filtered = allMarkers
    if (addMarkerSearch.trim()) {
      const q = addMarkerSearch.toLowerCase()
      const scored = allMarkers
        .map(m => ({ m, score: scoreMarker(m, q) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
      filtered = scored.map(({ m }) => m)
    }
    // Group by zone, maintaining zone order
    const grouped: { zone: { slug: string; name: string; icon: string; color: string } | null; markers: MarkerWithZone[] }[] = []
    const zoneMap = new Map<string, MarkerWithZone[]>()
    const noZone: MarkerWithZone[] = []
    for (const m of filtered) {
      if (m.zone_slug) {
        const list = zoneMap.get(m.zone_slug) ?? []
        list.push(m)
        zoneMap.set(m.zone_slug, list)
      } else {
        noZone.push(m)
      }
    }
    for (const z of zoneList) {
      const markers = zoneMap.get(z.slug)
      if (markers && markers.length > 0) {
        grouped.push({ zone: z, markers })
      }
    }
    if (noZone.length > 0) {
      grouped.push({ zone: null, markers: noZone })
    }
    return { grouped, total: filtered.length }
  }, [allMarkers, addMarkerSearch, contentMarkers, zoneList, scoreMarker])

  // Paginated flat list for add browser
  const paginatedAddMarkers = useMemo(() => {
    // Flatten grouped markers for pagination
    const flat: { marker: MarkerWithZone; zoneHeader?: { name: string; icon: string; color: string } }[] = []
    for (const group of addBrowserMarkers.grouped) {
      for (let i = 0; i < group.markers.length; i++) {
        flat.push({
          marker: group.markers[i],
          zoneHeader: i === 0 && group.zone ? group.zone : undefined,
        })
      }
    }
    const start = addMarkerPage * MARKERS_PER_PAGE
    const pageItems = flat.slice(start, start + MARKERS_PER_PAGE)
    // If first item on page doesn't have a zone header but belongs to a zone that started on a previous page, add it
    if (pageItems.length > 0 && !pageItems[0].zoneHeader && start > 0) {
      const m = pageItems[0].marker
      if (m.zone_slug) {
        const z = zoneList.find(z => z.slug === m.zone_slug)
        if (z) pageItems[0] = { ...pageItems[0], zoneHeader: z }
      }
    }
    return { items: pageItems, totalFlat: flat.length }
  }, [addBrowserMarkers, addMarkerPage, zoneList])

  const totalAddPages = Math.max(1, Math.ceil(paginatedAddMarkers.totalFlat / MARKERS_PER_PAGE))

  // Submit
  const handleSubmit = async () => {
    const measurementValues: { marker_slug: string; value: number }[] = []

    for (const [slug, val] of Object.entries(values)) {
      if (!val.trim()) continue
      if (!activeSlugs.has(slug)) continue
      const n = parseFloat(val)
      if (isNaN(n)) {
        const marker = allMarkers.find(m => m.marker_slug === slug)
        toast.error(t('invalidNumber', { marker: contentMarkers[slug]?.name ?? marker?.marker_name ?? slug }))
        return
      }
      const marker = allMarkers.find(m => m.marker_slug === slug)
      if (!marker) continue
      const displayUnit = getDisplayUnit(slug, marker.unit_canonical, units)
      const canonical = convertValue(slug, n, displayUnit, marker.unit_canonical)
      measurementValues.push({ marker_slug: slug, value: canonical })
    }

    if (measurementValues.length === 0) {
      toast.error(t('enterAtLeastOne'))
      return
    }

    const payload = {
      measured_at: new Date(measuredAt).toISOString(),
      values: measurementValues,
      device_id: selectedDeviceId || undefined,
      protocol_tag: protocol,
      diet_protocol: dietProtocol || undefined,
      fasting_protocol: protocol === 'fasting' ? fastingProtocol : undefined,
      fast_start_datetime: protocol === 'fasting' && fastStart ? new Date(fastStart).toISOString() : undefined,
      meal_timing_tag: mealTiming,
      exercise_activity: exercise || undefined,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
      sleep_quality: sleepQuality || undefined,
      stress_level: stressLevel ? parseInt(stressLevel) : undefined,
      lifestyle_note: note || undefined,
    }

    setSubmitting(true)
    try {
      if (isOffline) {
        await queueWrite('measurements', 'create', payload)
        toast.success(tSync('savedOffline'))
      } else {
        await api.measurements.create(payload)
        // Touch active template to update last_used_at
        if (activeTemplate) {
          api.templates.touch(activeTemplate).catch(() => {})
        }
        toast.success(t('saved'))
      }
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  // Save current markers as template
  const saveAsTemplate = async () => {
    const currentSlugs = [...activeSlugs]
    if (currentSlugs.length === 0) {
      toast.error(t('templateAddMarker'))
      return
    }
    const name = prompt(t('saveTemplateName'))
    if (!name?.trim()) return
    const setDefault = confirm(t('saveTemplatePrompt'))
    try {
      const res = await api.templates.create({
        name: name.trim(),
        marker_slugs: currentSlugs,
        is_default: setDefault,
        defaults: collectDefaults(),
      })
      if (res.data) {
        if (setDefault) {
          setTemplates(prev => [...prev.map(tp => ({ ...tp, is_default: false })), res.data])
        } else {
          setTemplates(prev => [...prev, res.data])
        }
        setActiveTemplate(res.data.id)
        setTemplateOriginalSlugs(new Set(currentSlugs))
        toast.success(setDefault ? t('templateSavedDefault') : t('templateSaved'))
      }
    } catch {
      toast.error(t('templateSaveFailed'))
    }
  }

  // Update existing template
  const saveTemplate = async () => {
    if (!activeTemplate) return
    const tpl = templates.find(tp => tp.id === activeTemplate)
    if (!tpl) return
    const currentSlugs = [...activeSlugs]
    try {
      await api.templates.update(activeTemplate, {
        name: tpl.name,
        marker_slugs: currentSlugs,
        is_default: tpl.is_default,
        defaults: collectDefaults(),
      })
      setTemplates(prev => prev.map(tp => tp.id === activeTemplate ? { ...tp, marker_slugs: currentSlugs } : tp))
      setTemplateOriginalSlugs(new Set(currentSlugs))
      toast.success(t('templateUpdated'))
    } catch {
      toast.error(t('templateUpdateFailed'))
    }
  }

  // Delete template
  const deleteTemplate = async () => {
    if (!activeTemplate) return
    const tpl = templates.find(tp => tp.id === activeTemplate)
    if (!tpl) return
    if (!confirm(`Delete template "${tpl.name}"?`)) return
    try {
      await api.templates.delete(activeTemplate)
      setTemplates(prev => prev.filter(tp => tp.id !== activeTemplate))
      setActiveTemplate('')
      setTemplateOriginalSlugs(null)
      setActiveSlugs(new Set())
      toast.success(t('templateDeleted'))
    } catch {
      toast.error(t('templateDeleteFailed'))
    }
  }

  if (loading || !dataLoaded) return (
    <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>
  )

  const filledCount = Object.entries(values).filter(([slug, v]) => activeSlugs.has(slug) && v.trim()).length

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: t('title') },
          ]} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold">{t('title')}</h1>
          <button
            type="button"
            onClick={() => {
              const hasValues = Object.values(values).some(v => v.trim())
              if (hasValues) {
                if (confirm('You have unsaved changes. Discard?')) router.back()
              } else {
                router.back()
              }
            }}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* ── Row 1: Date/Time + Device + Template controls ─────────── */}
        <div className="rounded-xl border px-4 py-3 mb-3">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">{t('dateTime')}</label>
              <DateTimePicker
                value={measuredAt}
                onChange={setMeasuredAt}
                countryCode={user?.country_code}
              />
            </div>
            <div>
              <label htmlFor="meas-new-device" className="text-[10px] text-muted-foreground block mb-0.5">{tMeasurements('device')}</label>
              <select
                id="meas-new-device"
                value={selectedDeviceId}
                onChange={e => {
                  const id = e.target.value
                  setSelectedDeviceId(id)
                  if (id) {
                    const dev = devices.find(d => d.id === id)
                    if (dev) {
                      setActiveSlugs(new Set(dev.markers_measured))
                      setActiveTemplate('')
                      setTemplateOriginalSlugs(null)
                    }
                  } else {
                    setActiveSlugs(new Set())
                    setActiveTemplate('')
                    setTemplateOriginalSlugs(null)
                  }
                }}
                className="w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-popover [&>option]:text-foreground"
              >
                <option value="">{t('noDevice')}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.device_name}{d.is_default ? ` (${tMeasurements('default')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label htmlFor="meas-new-template" className="text-[10px] text-muted-foreground">{t('template')}</label>
                {!selectedDeviceId && (
                  <div className="flex items-center gap-2">
                    {activeTemplate && isTemplateModified && (
                      <button type="button" onClick={saveTemplate} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">{t('saveTemplate')}</button>
                    )}
                    <button type="button" onClick={saveAsTemplate} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">{t('saveAs')}</button>
                    {activeTemplate && (
                      <button type="button" onClick={deleteTemplate} className="text-[10px] text-red-400 hover:text-red-300 transition-colors whitespace-nowrap">{tCommon('delete')}</button>
                    )}
                  </div>
                )}
              </div>
              <select
                id="meas-new-template"
                value={activeTemplate}
                disabled={!!selectedDeviceId}
                onChange={e => {
                  const id = e.target.value
                  setActiveTemplate(id)
                  if (id === '') {
                    setActiveSlugs(new Set())
                    setTemplateOriginalSlugs(null)
                  } else {
                    const tpl = templates.find(tp => tp.id === id)
                    if (tpl) applyTemplate(tpl)
                  }
                }}
                className={`w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-popover [&>option]:text-foreground ${selectedDeviceId ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <option value="">{t('noTemplate')}</option>
                {templates.map(tp => (
                  <option key={tp.id} value={tp.id}>
                    {tp.is_default ? `${tp.name} (default)` : tp.name}{activeTemplate === tp.id && isTemplateModified ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Row 2: Lifestyle context (compact) ─────────────── */}
        <div className="rounded-xl border px-4 py-3 mb-3 space-y-3">
          {/* Profile defaults — collapsed into a single text line */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/[0.02] rounded-lg px-3 py-2">
            <span className="shrink-0">
              {tCommon('dietProtocol')}: <span className="text-foreground">{dietProtocol ? (dietProtocol === 'only_fish' ? tProtocols('onlyFish') : dietProtocol === 'standard' ? tProtocols('standard') : tCommon(dietProtocol)) : '–'}</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span className="shrink-0">
              {tCommon('fastingProtocol')}: <span className="text-foreground">{protocol === 'fasting' && fastingProtocol
                ? (['none', '18_6', '20_4'].includes(fastingProtocol) ? tCommon(fastingProtocol) : tFasting(fastingProtocol))
                : tCommon('none')}</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span className="shrink-0">
              {t('lifestyle.exercise')}: <span className="text-foreground">{exercise ? (['cardio', 'cycling', 'hiit', 'none', 'pilates', 'rest', 'strength', 'swimming', 'walking', 'yoga'].includes(exercise) ? tCommon(exercise) : tExercise(exercise)) : '–'}</span>
            </span>
            <span className="flex-1" />
            <Link href="/settings?tab=profile" className="text-blue-400 hover:text-blue-300 shrink-0">{t('lifestyle.editInSettings')}</Link>
          </div>

          {/* Session overrides — single compact row */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label htmlFor="meas-new-meal-timing" className="text-[10px] text-muted-foreground block mb-0.5">{t('lifestyle.mealTiming')}</label>
              <select
                id="meas-new-meal-timing"
                value={mealTiming}
                onChange={e => setMealTiming(e.target.value)}
                className="w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-popover [&>option]:text-foreground"
              >
                <option value="no_tag">{t('mealTiming.noTag')}</option>
                <option value="fasting">{t('mealTiming.fasting')}</option>
                <option value="before">{t('mealTiming.before')}</option>
                <option value="30m_after">{t('mealTiming.30mAfter')}</option>
                <option value="1h_after">{t('mealTiming.1hAfter')}</option>
                <option value="2h_after">{t('mealTiming.2hAfter')}</option>
                <option value="3h_after">{t('mealTiming.3hAfter')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="meas-new-sleep-hours" className="text-[10px] text-muted-foreground block mb-0.5">{t('lifestyle.sleepHours')}</label>
              <input
                id="meas-new-sleep-hours"
                type="text"
                inputMode="decimal"
                value={sleepHours}
                onInput={e => {
                  const el = e.currentTarget
                  el.value = el.value.replace(/[^0-9.,-]/g, '').replace(',', '.')
                }}
                onChange={e => setSleepHours(e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.'))}
                placeholder="-"
                className="w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-new-sleep-quality" className="text-[10px] text-muted-foreground block mb-0.5">{t('lifestyle.sleepQuality')}</label>
              <select
                id="meas-new-sleep-quality"
                value={sleepQuality}
                onChange={e => setSleepQuality(e.target.value)}
                className="w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-popover [&>option]:text-foreground"
              >
                <option value="">-</option>
                <option value="poor">{tSleepQuality('poor')}</option>
                <option value="fair">{tCommon('fair')}</option>
                <option value="good">{tCommon('good')}</option>
                <option value="excellent">{tSleepQuality('excellent')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="meas-new-stress-level" className="text-[10px] text-muted-foreground block mb-0.5">{t('lifestyle.stressLevel')}</label>
              <select
                id="meas-new-stress-level"
                value={stressLevel}
                onChange={e => setStressLevel(e.target.value)}
                className="w-full bg-popover border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-popover [&>option]:text-foreground"
              >
                {STRESS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{tStressLevel(o.key)}</option>
                ))}
              </select>
            </div>
            {/* Fast started field removed: fasting duration derived from measurement timestamps + protocol settings */}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="meas-new-note" className="text-xs text-muted-foreground block mb-1">{t('lifestyle.note')}</label>
            <textarea
              id="meas-new-note"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 300))}
              rows={2}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder={t('lifestyle.notePlaceholder')}
            />
            <p className="text-xs text-muted-foreground text-right">{t('lifestyle.charCount', { chars: note.length })}</p>
          </div>
        </div>

        {/* ── "My Markers" section ─────────────────────────────────── */}
        <div className="rounded-xl border mb-4">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('myMarkers')}</span>
            {activeSlugs.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('markersFilled', { filled: filledCount, total: activeSlugs.size })}
              </span>
            )}
          </div>

          {activeSlugs.size > 0 && (
            <div className="px-4 pt-2 pb-1">
              <input
                type="text"
                value={markerFilter}
                onChange={e => setMarkerFilter(e.target.value)}
                placeholder={tCommon('searchMarkers')}
                className="w-full bg-accent border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {activeSlugs.size === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">{t('noMarkersHint')}</p>
            </div>
          ) : visibleMarkers.length === 0 && markerFilter ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">{t('noMatchingMarkers', { filter: markerFilter })}</p>
            </div>
          ) : (
            <div className="px-4 py-2 divide-y divide-border">
              {visibleMarkers.map((marker, index) => {
                const displayUnit = getDisplayUnit(marker.marker_slug, marker.unit_canonical, units)
                const badge = getDeviceBadge(marker.marker_slug, devices)
                const zoneBadge = zoneLookup.get(marker.marker_slug)
                return (
                  <MarkerRow
                    key={`${marker.marker_slug}-${index}`}
                    marker={marker}
                    value={values[marker.marker_slug] ?? ''}
                    displayUnit={displayUnit}
                    badge={badge}
                    onChange={handleValueChange}
                    onRemove={removeMarker}
                    zoneBadge={zoneBadge}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Calculated markers */}
        {computed.length > 0 && (
          <div className="rounded-xl border p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {tCommon('calculatedMarkers')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {computed.map(m => <CalculatedMarkerCard key={m.slug} marker={m} />)}
            </div>
          </div>
        )}

        {/* Submit button — above Add Markers for daily workflow */}
        {isDemo && !user && (
          <div className="rounded-xl border border-dashed border-border p-4 mb-4 text-center">
            <p className="text-sm text-muted-foreground">{t('loginToRecord')}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || activeSlugs.size === 0 || (isDemo && !user)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition-colors mb-6"
        >
          {submitting ? tCommon('saving') : t('saveButton')}
        </button>

        {/* ── "Add Markers" browser section (hidden when a device is selected) */}
        {!selectedDeviceId && <div className="rounded-xl border mb-4">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('addMarkerSection')}</span>
          </div>

          <div className="px-4 pt-2 pb-1">
            <input
              type="text"
              value={addMarkerSearch}
              onChange={e => { setAddMarkerSearch(e.target.value); setAddMarkerPage(0) }}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-accent border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="px-2 py-1">
            {paginatedAddMarkers.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noMatching')}</p>
            ) : (
              paginatedAddMarkers.items.map(({ marker, zoneHeader }, index) => {
                const isActive = activeSlugs.has(marker.marker_slug)
                const displayUnit = getDisplayUnit(marker.marker_slug, marker.unit_canonical, units)
                return (
                  <div key={`${marker.marker_slug}-${index}`}>
                    {zoneHeader && (
                      <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: zoneHeader.color }}
                        >
                          {zoneHeader.icon} {zoneHeader.name}
                        </span>
                        <div className="flex-1 border-t" style={{ borderColor: zoneHeader.color + '33' }} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { if (!isActive) addMarker(marker.marker_slug) }}
                      disabled={isActive}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'opacity-40 cursor-default'
                          : 'hover:bg-accent cursor-pointer'
                      }`}
                    >
                      {isActive ? (
                        <span className="text-emerald-400 w-5 shrink-0 text-center">✓</span>
                      ) : (
                        <span className="text-blue-400 w-5 shrink-0 text-center">+</span>
                      )}
                      <span className="flex-1 min-w-0 truncate">
                        {contentMarkers[marker.marker_slug]?.name ?? marker.display_name ?? marker.marker_name}
                        {marker.abbreviation && (
                          <span className="text-muted-foreground ml-1">({marker.abbreviation})</span>
                        )}
                      </span>
                      <MarkerInfoTooltip slug={marker.marker_slug} />
                      <span className="text-xs text-muted-foreground shrink-0">{displayUnit}</span>
                      <span className="text-xs shrink-0 w-16 text-right">
                        {isActive ? (
                          <span className="text-emerald-400/70">{t('alreadyAdded')}</span>
                        ) : (
                          <span className="text-blue-400">{t('addToTemplate')}</span>
                        )}
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalAddPages > 1 && (
            <div className="px-4 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('markersPerPage', {
                  from: addMarkerPage * MARKERS_PER_PAGE + 1,
                  to: Math.min((addMarkerPage + 1) * MARKERS_PER_PAGE, paginatedAddMarkers.totalFlat),
                  total: paginatedAddMarkers.totalFlat,
                })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAddMarkerPage(p => Math.max(0, p - 1))}
                  disabled={addMarkerPage === 0}
                  className="px-2 py-1 text-xs rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="text-xs text-muted-foreground px-2">
                  {addMarkerPage + 1} / {totalAddPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAddMarkerPage(p => Math.min(totalAddPages - 1, p + 1))}
                  disabled={addMarkerPage >= totalAddPages - 1}
                  className="px-2 py-1 text-xs rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>}
      </main>
      <Footer />
    </div>
  )
}
