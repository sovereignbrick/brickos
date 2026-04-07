'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { MarkerDetail, MarkerMeasurement, TrendData, MarkerReferenceRange, MarkerContent, MarkerFood, MarkerSupplement, MarkerReference } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StatusBadge } from '@/components/status-badge'
import dynamic from 'next/dynamic'

const TrendChart = dynamic(
  () => import('@/components/trend-chart').then(m => ({ default: m.TrendChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-48 text-muted-foreground text-sm animate-pulse">Loading chart...</div> }
)
import { useDemoProfile } from '@/lib/demo-profile-context'
import { MeasurementPopover } from '@/components/measurement-popover'
import { Breadcrumb } from '@/components/breadcrumb'
import { useDemoHref } from '@/lib/use-demo-href'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'
import { formatDate, formatShortDate, formatTime } from '@/lib/date-format'
import { useContent } from '@/lib/content-context'
import { useMemo } from 'react'
import { useUnitPreferences } from '@/hooks/use-unit-preferences'

// ── Reference Range Bar ───────────────────────────────────────────────────────

function RangeBar({ range, value }: { range: MarkerReferenceRange; value: number | null }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { yellow_low_min, yellow_low_max, green_min, green_max, yellow_high_min, yellow_high_max } = range

  // If no green bounds, nothing to draw
  if (green_min == null && green_max == null) return null

  // Build display domain — extend 10% beyond outer boundaries for red zones
  const outerLo = yellow_low_min ?? green_min ?? 0
  const outerHi = yellow_high_max ?? green_max ?? 1
  const padding = (outerHi - outerLo) * 0.12
  const lo = outerLo - padding
  const hi = outerHi + padding
  const span = hi - lo || 1
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100))

  // Segments: [redL, yellowL, green, yellowH, redR]
  const segments: { color: string; bg: string; from: number; to: number }[] = []

  const yllL = yellow_low_min != null ? pct(yellow_low_min) : 0
  const grnL = green_min != null ? pct(green_min) : (yellow_low_max != null ? pct(yellow_low_max) : yllL)
  const grnR = green_max != null ? pct(green_max) : 100
  const yllR = yellow_high_max != null ? pct(yellow_high_max) : grnR

  // Red low zone
  if (yllL > 0) segments.push({ color: 'red', bg: 'bg-red-500/70', from: 0, to: yllL })
  // Yellow low zone
  if (grnL > yllL) segments.push({ color: 'yellow', bg: 'bg-amber-400/80', from: yllL, to: grnL })
  // Green optimal zone
  segments.push({ color: 'green', bg: 'bg-emerald-500', from: grnL, to: grnR })
  // Yellow high zone
  if (yllR > grnR) segments.push({ color: 'yellow', bg: 'bg-amber-400/80', from: grnR, to: yllR })
  // Red high zone
  if (yllR < 100) segments.push({ color: 'red', bg: 'bg-red-500/70', from: yllR, to: 100 })

  const pinPct = value != null ? pct(value) : null
  const pinColor = value != null && green_min != null && green_max != null
    ? (value >= green_min && value <= green_max
      ? '#4ade80'
      : ((yellow_low_min != null && value >= yellow_low_min && value < green_min) || (yellow_high_max != null && value > green_max && value <= yellow_high_max))
        ? '#fbbf24'
        : '#ef4444')
    : '#ffffff'

  // Boundary labels
  const labels: { pct: number; val: number }[] = []
  if (yellow_low_min != null) labels.push({ pct: pct(yellow_low_min), val: yellow_low_min })
  if (green_min != null)      labels.push({ pct: pct(green_min),      val: green_min })
  if (green_max != null)      labels.push({ pct: pct(green_max),      val: green_max })
  if (yellow_high_max != null) labels.push({ pct: pct(yellow_high_max), val: yellow_high_max })

  return (
    <div className="w-full select-none">
      {/* Bar + marker wrapper — no overflow-hidden so circle isn't clipped */}
      <div className="relative py-3">
        {/* Color bar */}
        <div className="h-5 rounded-full overflow-hidden flex">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`${seg.bg} h-full`}
              style={{ width: `${seg.to - seg.from}%`, flexShrink: 0 }}
            />
          ))}
        </div>
        {/* Circle marker — positioned on top of bar, not inside overflow-hidden */}
        {pinPct != null && value != null && (
          <div
            className="absolute top-1/2 cursor-pointer z-10"
            style={{ left: `${pinPct}%`, transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              className="w-6 h-6 rounded-full border-[3px] border-white dark:border-zinc-200 shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: pinColor, boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.2)' }}
            />
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-20">
                <span className="text-[11px] font-bold text-foreground bg-card border border-border px-2 py-1 rounded-lg whitespace-nowrap shadow-lg block">
                  {value} {range.unit}
                </span>
                <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-border block mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boundary labels */}
      <div className="relative h-4">
        {labels.map((lb, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-muted-foreground"
            style={{ left: `${lb.pct}%`, transform: 'translateX(-50%)' }}
          >
            {lb.val}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Source type badge ─────────────────────────────────────────────────────────

function SourceBadge({ sourceType, deviceName, t }: { sourceType: string; deviceName?: string | null; t: (key: string) => string }) {
  const map: Record<string, { cls: string; fallbackKey: string }> = {
    home:       { cls: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', fallbackKey: 'homeDevice' },
    lab:        { cls: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', fallbackKey: 'labTest' },
    calculated: { cls: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700', fallbackKey: 'calculated' },
    hybrid:     { cls: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700', fallbackKey: 'labAndHome' },
  }
  const entry = map[sourceType] ?? { cls: 'bg-muted text-muted-foreground border-border', fallbackKey: '' }
  const label = deviceName ?? (entry.fallbackKey ? t(entry.fallbackKey) : sourceType)
  const isClickable = sourceType === 'home' || sourceType === 'lab' || sourceType === 'hybrid'
  if (isClickable) {
    return (
      <Link
        href="/settings?tab=devices"
        className={`text-xs border px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity ${entry.cls}`}
        title={`View ${label} in device settings`}
      >
        {label}
      </Link>
    )
  }
  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${entry.cls}`}>
      {label}
    </span>
  )
}

// ── Statistics ────────────────────────────────────────────────────────────────

function Statistics({ trend, t, convertValue, displayUnitStr }: {
  trend: TrendData | null;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  convertValue?: (v: number) => number;
  displayUnitStr?: string;
}) {
  const labels = [t('min'), t('avg'), t('max')]
  if (!trend || trend.points.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {labels.map(label => (
          <div key={label} className="rounded-xl border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-lg font-bold text-muted-foreground">-</p>
          </div>
        ))}
      </div>
    )
  }

  const conv = convertValue ?? ((v: number) => v)
  const unit = displayUnitStr ?? trend.unit
  const pts = trend.points
  const values = pts.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const minPt = pts.find(p => p.value === min)!
  const maxPt = pts.find(p => p.value === max)!

  const fmt = (v: number) => parseFloat(conv(v).toFixed(2))
  const fmtDate = (ts: string) => formatShortDate(ts)

  const stats = [
    { label: t('min'), value: fmt(min), date: fmtDate(minPt.measured_at), status: minPt.status },
    { label: t('avg'), value: fmt(avg), date: t('readings', { count: pts.length }), status: null },
    { label: t('max'), value: fmt(max), date: fmtDate(maxPt.measured_at), status: maxPt.status },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p
            className="text-xl font-bold"
            style={{ color: s.status === 'green' ? '#4ade80' : s.status === 'orange' ? '#fb923c' : s.status === 'red' ? '#ef4444' : undefined }}
          >
            {s.value}
            <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{s.date}</p>
        </div>
      ))}
    </div>
  )
}

// ── Content type display config ───────────────────────────────────────────────

const CONTENT_CARD_CONFIG: Record<string, { icon: string; bg: string }> = {
  what_is:          { icon: '🔬', bg: 'from-blue-900/30 to-blue-800/20' },
  did_you_know:     { icon: '💡', bg: 'from-amber-900/30 to-amber-800/20' },
  health_facts:     { icon: '📊', bg: 'from-emerald-900/30 to-emerald-800/20' },
  food_for_thought: { icon: '🧠', bg: 'from-purple-900/30 to-purple-800/20' },
  fun_facts:        { icon: '🎯', bg: 'from-pink-900/30 to-pink-800/20' },
  why_it_matters:   { icon: '❗', bg: 'from-red-900/30 to-red-800/20' },
}

const FOOD_CATEGORIES: Record<string, { emoji: string; labelKey: string }> = {
  meat:       { emoji: '🥩', labelKey: 'animalProteins' },
  poultry:    { emoji: '🍗', labelKey: 'animalProteins' },
  fish:       { emoji: '🐟', labelKey: 'animalProteins' },
  seafood:    { emoji: '🦐', labelKey: 'animalProteins' },
  organ_meat: { emoji: '🫁', labelKey: 'animalProteins' },
  egg:        { emoji: '🥚', labelKey: 'animalProteins' },
  vegetable:  { emoji: '🥬', labelKey: 'vegetables' },
  fruit:      { emoji: '🍎', labelKey: 'fruits' },
  nut_seed:   { emoji: '🌰', labelKey: 'nutsSeeds' },
  legume:     { emoji: '🫘', labelKey: 'legumes' },
  dairy:      { emoji: '🧀', labelKey: 'dairy' },
  fermented:  { emoji: '🥒', labelKey: 'fermentedFoods' },
  grain:      { emoji: '🌾', labelKey: 'grains' },
  herb_spice: { emoji: '🌿', labelKey: 'herbsSpices' },
  oil_fat:    { emoji: '🫒', labelKey: 'oilsFats' },
  beverage:   { emoji: '🍵', labelKey: 'beverages' },
  other:      { emoji: '🍽️', labelKey: 'other' },
}

const FOOD_GROUP_ORDER = ['animalProteins', 'vegetables', 'fruits', 'nutsSeeds', 'legumes', 'dairy', 'fermentedFoods', 'grains', 'herbsSpices', 'oilsFats', 'beverages', 'other']

// Diet-based food category filtering
const DIET_ALLOWED_CATEGORIES: Record<string, Set<string>> = {
  carnivore:     new Set(['meat', 'poultry', 'fish', 'seafood', 'organ_meat', 'egg']),
  keto:          new Set(['meat', 'poultry', 'fish', 'seafood', 'organ_meat', 'egg', 'oil_fat', 'nut_seed', 'vegetable', 'dairy', 'herb_spice', 'beverage']),
  vegan:         new Set(['vegetable', 'fruit', 'nut_seed', 'legume', 'grain', 'herb_spice', 'oil_fat', 'fermented', 'beverage', 'other']),
  vegetarian:    new Set(['vegetable', 'fruit', 'nut_seed', 'legume', 'dairy', 'grain', 'herb_spice', 'oil_fat', 'fermented', 'egg', 'beverage', 'other']),
  paleo:         new Set(['meat', 'poultry', 'fish', 'seafood', 'organ_meat', 'egg', 'vegetable', 'fruit', 'nut_seed', 'oil_fat', 'herb_spice', 'beverage', 'other']),
}

function filterFoodsByDiet(foods: MarkerFood[], dietProtocol: string | null): MarkerFood[] {
  if (!dietProtocol) return foods
  const allowed = DIET_ALLOWED_CATEGORIES[dietProtocol]
  if (!allowed) return foods // omnivore, mediterranean, mixed, other, unknown → show all
  return foods.filter(f => allowed.has(f.food_category ?? 'other'))
}

function foodEmoji(category: string | null): string {
  return FOOD_CATEGORIES[category ?? '']?.emoji ?? '🍽️'
}

function groupFoodsByCategory(foods: MarkerFood[], tFood: (key: string) => string): { labelKey: string; label: string; emoji: string; items: MarkerFood[] }[] {
  const grouped = new Map<string, { emoji: string; items: MarkerFood[] }>()
  for (const f of foods) {
    const cat = FOOD_CATEGORIES[f.food_category ?? ''] ?? { emoji: '🍽️', labelKey: 'other' }
    const existing = grouped.get(cat.labelKey)
    if (existing) {
      existing.items.push(f)
    } else {
      grouped.set(cat.labelKey, { emoji: cat.emoji, items: [f] })
    }
  }
  return FOOD_GROUP_ORDER
    .filter(key => grouped.has(key))
    .map(key => ({ labelKey: key, label: tFood(key), ...grouped.get(key)! }))
}

// ── Period selector ───────────────────────────────────────────────────────────

const PERIODS = ['7d', '30d', '3m', '6m', '1y', 'all'] as const
type Period = typeof PERIODS[number]

// ── Main page ────────────────────────────────────────────────────────────────

export default function MarkerDetailPage() {
  const { user, loading, isDemo } = useAuth()
  const { profile } = useDemoProfile()
  const params = useParams()
  const router = useRouter()
  const markerId = params.markerId as string
  const demoHref = useDemoHref()
  const t = useTranslations('markers')
  const tCommon = useTranslations('common')
  const tMealTiming = useTranslations('common.mealTimingLabels')
  const tNav = useTranslations('nav')

  const { formatDisplay, displayUnit, displayValue } = useUnitPreferences()

  // Convert all range values from canonical to user's preferred unit
  const convertRange = useCallback((range: MarkerReferenceRange, unit: string): MarkerReferenceRange => {
    const conv = (v: number | null | undefined) => v != null ? displayValue(markerId, v, unit) : v
    return {
      ...range,
      green_min: conv(range.green_min) ?? null,
      green_max: conv(range.green_max) ?? null,
      yellow_low_min: conv(range.yellow_low_min) ?? null,
      yellow_low_max: conv(range.yellow_low_max) ?? null,
      yellow_high_min: conv(range.yellow_high_min) ?? null,
      yellow_high_max: conv(range.yellow_high_max) ?? null,
      red_low_max: conv(range.red_low_max) ?? null,
      red_high_min: conv(range.red_high_min) ?? null,
      unit: displayUnit(markerId, unit),
    }
  }, [markerId, displayValue, displayUnit])

  const [marker, setMarker] = useState<MarkerDetail | null>(null)
  const [measurements, setMeasurements] = useState<MarkerMeasurement[]>([])
  const [trend, setTrend] = useState<TrendData | null>(null)
  const [period, setPeriod] = useState<Period>('3m')
  const [fetching, setFetching] = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<MarkerContent[]>([])
  const [foods, setFoods] = useState<MarkerFood[]>([])
  const [supplements, setSupplements] = useState<MarkerSupplement[]>([])
  const [references, setReferences] = useState<MarkerReference[]>([])
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const carouselResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [userDietProtocol, setUserDietProtocol] = useState<string | null>(null)
  const { locale } = useContent()

  // Fetch marker detail + recent measurements on mount
  useEffect(() => {
    if (loading) return
    if (!isDemo && !user) return

    const fetchDetail = isDemo
      ? () => api.demo.markerDetail(markerId, profile)
      : () => api.markers.detail(markerId)
    const fetchMeasurements = isDemo
      ? () => api.demo.markerMeasurements(markerId, 5, profile)
      : () => api.markers.measurements(markerId, 5)

    const fetchContent = isDemo
      ? () => api.demo.markerContent(markerId)
      : () => api.markers.content(markerId)
    const fetchFoods = isDemo
      ? () => api.demo.markerFoods(markerId)
      : () => api.markers.foods(markerId)
    const fetchSupplements = isDemo
      ? () => api.demo.markerSupplements(markerId)
      : () => api.markers.supplements(markerId)
    const fetchReferences = isDemo
      ? () => api.demo.markerReferences(markerId)
      : () => api.markers.references(markerId)

    Promise.all([fetchDetail(), fetchMeasurements(), fetchContent(), fetchFoods(), fetchSupplements(), fetchReferences()])
      .then(([det, meas, cont, fds, supps, refs]) => {
        setMarker(det.data)
        setMeasurements(meas.data ?? [])
        setContent(cont.data ?? [])
        setFoods(fds.data ?? [])
        setSupplements(supps.data ?? [])
        setReferences(refs.data ?? [])
      })
      .catch(() => setError('Failed to load marker data'))
      .finally(() => setFetching(false))
  }, [loading, user, isDemo, markerId, profile, locale])

  // Fetch user diet protocol for food filtering
  useEffect(() => {
    if (!user || isDemo) return
    api.settings.get()
      .then(res => {
        const ld = res.data?.lifestyle_defaults
        if (ld?.default_diet_protocol) setUserDietProtocol(ld.default_diet_protocol)
      })
      .catch(() => {})
  }, [user, isDemo])

  // Filter foods by user's diet protocol and localize names
  const filteredFoods = useMemo(() => {
    const dietFiltered = filterFoodsByDiet(foods, userDietProtocol)
    if (locale === 'de') {
      return dietFiltered.map(f => ({
        ...f,
        food_name: f.food_name_de ?? f.food_name,
      }))
    }
    return dietFiltered
  }, [foods, userDietProtocol, locale])

  // Fetch trend data when period changes
  const fetchTrend = useCallback((p: Period) => {
    if (!isDemo && !user) return
    setTrendLoading(true)
    const fn = isDemo
      ? () => api.demo.markerTrend(markerId, p, profile)
      : () => api.markers.trend(markerId, p)
    fn()
      .then(res => setTrend(res.data))
      .catch(() => setTrend(null))
      .finally(() => setTrendLoading(false))
  }, [user, isDemo, markerId, profile])

  useEffect(() => {
    if (!fetching) fetchTrend(period)
  }, [fetching, period, fetchTrend])

  const handlePeriod = (p: Period) => {
    setPeriod(p)
    fetchTrend(p)
  }

  // Build carousel cards: content cards + "Why It Matters" from marker data
  const carouselCards = (() => {
    const cards = content
      .filter(c => c.content_type !== 'how_to_stay_in_range')
      .map(c => ({ content_type: c.content_type, title: c.title, body_text: c.body_text }))
    if (marker?.why_it_matters) {
      cards.push({
        content_type: 'why_it_matters',
        title: t('whyItMatters'),
        body_text: marker.why_it_matters,
      })
    }
    return cards
  })()

  // Auto-rotate content carousel
  const carouselCardCount = carouselCards.length
  useEffect(() => {
    if (carouselPaused || carouselCardCount <= 1) return
    const interval = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % carouselCardCount)
    }, 6000)
    return () => clearInterval(interval)
  }, [carouselPaused, carouselCardCount])

  const pauseCarousel = () => {
    setCarouselPaused(true)
    if (carouselResumeRef.current) clearTimeout(carouselResumeRef.current)
  }
  const resumeCarousel = () => {
    if (carouselResumeRef.current) clearTimeout(carouselResumeRef.current)
    carouselResumeRef.current = setTimeout(() => setCarouselPaused(false), 3000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this measurement?')) return
    try {
      await api.measurements.delete(id)
      setMeasurements(prev => prev.filter(m => m.id !== id))
      toast.success(t('measurementDeleted'))
    } catch {
      toast.error(t('measurementDeleteFailed'))
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading || fetching) {
    return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>
  }

  if (error || !marker) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">{error ?? t('biomarkerNotFound')}</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">{tCommon('back')}</Link>
        </main>
      </div>
    )
  }

  const trendPoints = trend?.points.map(p => ({
    measured_at: p.measured_at,
    value: p.value,
    status: p.status,
    protocol_tag: p.protocol_tag,
  })) ?? []

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8 space-y-5">

        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: tNav('overview'), href: '/dashboard' },
          ...(marker.zones[0] ? [{ label: `${marker.zones[0].icon} ${marker.zones[0].name}`, href: `/zones/${marker.zones[0].slug}` }] : []),
          { label: marker.name },
        ]} />

        {/* ── SECTION 1: Hero + Reference Range Bar ───────────────────────── */}
        <div className="rounded-2xl border p-5 space-y-4">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{marker.name}</h1>

              {/* Latest value */}
              {marker.latest ? (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-3xl font-bold tabular-nums">{formatDisplay(markerId, marker.latest.value, marker.latest.unit).formatted.split(' ')[0]}</span>
                  <span className="text-muted-foreground text-sm">{displayUnit(markerId, marker.latest.unit)}</span>
                  <StatusBadge status={marker.latest.status as 'green' | 'orange' | 'red' | null} showLabel />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(marker.latest.timestamp, user?.country_code)}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm mt-1">{t('noDataRecorded')}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <SourceBadge sourceType={marker.source_type} deviceName={marker.latest?.device_name} t={t} />
              {marker.zones.map(z => (
                <Link
                  key={z.slug}
                  href={demoHref(`/zones/${z.slug}`)}
                  className="text-xs border border-border bg-muted/50 hover:bg-accent transition-colors px-2 py-0.5 rounded-full"
                >
                  {z.icon} {z.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Description */}
          {marker.description && (
            <div className="space-y-2">
              {(() => {
                // Split description for calculated markers: main text, formula, base markers
                const lines = marker.description.split('\n').filter(l => l.trim())
                const formulaLine = lines.find(l => l.startsWith('Formula:'))
                const basedOnLine = lines.find(l => l.startsWith('Based on:'))
                const descLines = lines.filter(l => !l.startsWith('Formula:') && !l.startsWith('Based on:'))

                return (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {descLines.join(' ')}
                    </p>
                    {formulaLine && (
                      <div className="border border-dashed border-border rounded-lg px-3 py-2 space-y-1">
                        <p className="text-xs">
                          <span className="text-amber-400 font-medium">{t('formula')}:</span>{' '}
                          <span className="text-foreground font-mono text-xs">{formulaLine.replace('Formula: ', '')}</span>
                        </p>
                        {basedOnLine && (
                          <p className="text-xs text-muted-foreground">
                            {t('basedOn')}:{' '}
                            {basedOnLine.replace('Based on: ', '').split(', ').map((part, i, arr) => {
                              const match = part.match(/^(.+?)\s*\((\w+)\)$/)
                              if (match) {
                                return (
                                  <span key={match[2]}>
                                    <Link href={demoHref(`/markers/${match[2]}`)} className="text-blue-400 hover:text-blue-300 transition-colors">
                                      {match[1]}
                                    </Link>
                                    {i < arr.length - 1 ? ` ${t('and')} ` : ''}
                                  </span>
                                )
                              }
                              return <span key={i}>{part}{i < arr.length - 1 ? ', ' : ''}</span>
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Formula fallback for calculated markers without description */}
          {!marker.description && marker.is_calculated && marker.formula && (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2">
              <span className="text-amber-400 font-medium">{t('formula')}:</span> {marker.formula}
            </p>
          )}

          {/* Reference Range Bar */}
          {marker.reference_range ? (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">{t('referenceRange')}</p>
              <RangeBar
                range={convertRange(marker.reference_range, marker.unit)}
                value={marker.latest ? displayValue(markerId, marker.latest.value, marker.unit) : null}
              />
              {marker.fasting_range && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                    ▸ {t('fastingRange')}
                  </summary>
                  <p className="text-[13px] text-muted-foreground mt-3 mb-3">
                    {marker.fasting_explanation ?? t('fastingExplanation')}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mb-3">
                    {t('fastingNote')}
                  </p>
                  <div>
                    <RangeBar
                      range={convertRange(marker.fasting_range, marker.unit)}
                      value={marker.latest ? displayValue(markerId, marker.latest.value, marker.unit) : null}
                    />
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">{t('noUniversalRange')}</p>
            </div>
          )}
        </div>

        {/* ── SECTION 2: Trend Chart ───────────────────────────────────────── */}
        <div className="rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trend</h2>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriod(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {trendLoading ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">{tCommon('loading')}</div>
          ) : (
            <TrendChart
              points={trendPoints.map(p => ({ ...p, value: displayValue(markerId, p.value, marker.unit) }))}
              markerName={marker.name}
              unit={displayUnit(markerId, marker.unit)}
              greenMin={marker.reference_range?.green_min != null ? displayValue(markerId, marker.reference_range.green_min, marker.unit) : undefined}
              greenMax={marker.reference_range?.green_max != null ? displayValue(markerId, marker.reference_range.green_max, marker.unit) : undefined}
              fastingGreenMin={marker.fasting_range?.green_min != null ? displayValue(markerId, marker.fasting_range.green_min, marker.unit) : undefined}
              fastingGreenMax={marker.fasting_range?.green_max != null ? displayValue(markerId, marker.fasting_range.green_max, marker.unit) : undefined}
              countryCode={user?.country_code}
            />
          )}
        </div>

        {/* ── SECTION 3: Statistics ────────────────────────────────────────── */}
        <Statistics
          trend={trend}
          t={t}
          convertValue={(v: number) => displayValue(markerId, v, marker.unit)}
          displayUnitStr={displayUnit(markerId, marker.unit)}
        />

        {/* ── SECTION 4: Recent Measurements ──────────────────────────────── */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('recentMeasurementsFor', { name: marker.name })}</h2>

          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('noMeasurementsYet')}</p>
          ) : (
            <div className="divide-y divide-border">
              {measurements.map(m => (
                <MeasurementPopover
                  key={m.id}
                  data={m}
                  countryCode={user?.country_code}
                  onEdit={!isDemo ? (mid) => router.push(`/measurements/${mid}/edit`) : undefined}
                  onDelete={!isDemo ? handleDelete : undefined}
                >
                  <div className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition-colors">
                    <div className="text-xs text-muted-foreground tabular-nums min-w-[90px]">
                      {formatShortDate(m.timestamp, user?.country_code)}
                      <span className="block">
                        {formatTime(m.timestamp, user?.country_code)}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-bold tabular-nums">{formatDisplay(markerId, m.value, m.unit).value.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{displayUnit(markerId, m.unit)}</span>
                      <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                    </div>

                    {m.device_name ? (
                      <Link
                        href="/settings?tab=devices"
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground min-w-[70px] truncate transition-colors"
                        title={`View ${m.device_name} in device settings`}
                      >
                        {m.device_name}
                      </Link>
                    ) : (
                      <span className="hidden sm:inline text-xs text-muted-foreground min-w-[70px] truncate">-</span>
                    )}

                    <span className="hidden sm:inline text-xs text-muted-foreground min-w-[60px] truncate">
                      {m.meal_timing_tag && m.meal_timing_tag !== 'no_tag' && m.meal_timing_tag !== 'unspecified'
                        ? tMealTiming(m.meal_timing_tag)
                        : '-'}
                    </span>

                    {!isDemo && (
                      <div className="flex items-center gap-1 ml-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/measurements/${m.id}/edit`) }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={tCommon('edit')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                          title={tCommon('delete')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </MeasurementPopover>
              ))}
            </div>
          )}

          <div className="pt-1 border-t border-border">
            <Link
              href={`/measurements?marker=${markerId}`}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('viewAllHistory')}
            </Link>
          </div>
        </div>

        {/* ── SECTION 5: Content Carousel (includes "Why It Matters") ── */}
        {(() => {
          if (carouselCards.length === 0) return null
          const cfg = CONTENT_CARD_CONFIG[carouselCards[carouselIdx]?.content_type] ?? { icon: '📌', bg: 'from-card to-muted' }
          const card = carouselCards[carouselIdx]
          return (
            <div
              className="rounded-2xl border overflow-hidden"
              onMouseEnter={pauseCarousel}
              onMouseLeave={resumeCarousel}
              onTouchStart={pauseCarousel}
              onTouchEnd={resumeCarousel}
            >
              {/* Card display */}
              <div className={`bg-gradient-to-br ${cfg.bg} p-5 min-h-[160px] flex flex-col gap-2`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cfg.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{card.title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body_text}</p>
              </div>
              {/* Navigation dots */}
              {carouselCards.length > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
                  {carouselCards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      className={`rounded-full transition-all ${i === carouselIdx ? 'w-4 h-2 bg-blue-500' : 'w-2 h-2 bg-muted-foreground hover:bg-zinc-400'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* "Why It Matters" is now part of the carousel above */}
        {/* "When to Worry" removed from UI per sprint 014 feedback */}

        {/* ── SECTION 6: How to Stay in Range ──────────────────────────── */}
        {(() => {
          const howTo = content.find(c => c.content_type === 'how_to_stay_in_range')
          if (!howTo) return null
          const tips = howTo.body_text.split('\n').filter(t => t.trim().length > 0)
          return (
            <div className="rounded-2xl border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('howToKeepInRange', { name: marker.name })}</h2>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    <span className="text-foreground/90">{tip.replace(/^[•\-\*]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}

        {/* ── SECTION 7: Foods That Help ────────────────────────────────── */}
        {filteredFoods.length > 0 && (
          <div className="rounded-2xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('foodsToBoost', { name: marker.name })}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('foodsIntro')}</p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">{t('foodsFilterNote')}</p>
            {groupFoodsByCategory(filteredFoods, (key: string) => key === 'other' ? tCommon('other') : t(`foodCategories.${key}`)).map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{group.emoji}</span>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map(f => (
                    <div key={f.id} className="flex items-start gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5 group/food relative">
                      <span className="text-xl shrink-0 mt-0.5">{foodEmoji(f.food_category)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{f.food_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed pt-1">
              {t('foodDisclaimer')}
            </p>
          </div>
        )}

        {/* ── SECTION 8: Supplements ────────────────────────────────────── */}
        {supplements.length > 0 && (
          <div className="rounded-2xl border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('supplementsFor', { name: marker.name })}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {supplements.map(s => (
                <div key={s.id} className="flex items-start gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5">
                  <span className="text-xl shrink-0">💊</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.supplement_name}</p>
                    {s.typical_dose && <p className="text-xs text-muted-foreground">{s.typical_dose}</p>}
                    {s.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{s.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 9: Scientific References ─────────────────────────── */}
        {references.length > 0 && (
          <div className="rounded-2xl border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('scientificReferences')}</h2>
            <ol className="space-y-2">
              {references.map((ref, i) => (
                <li key={ref.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0 tabular-nums">[{i + 1}]</span>
                  <div className="min-w-0">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {ref.title}
                      </a>
                    ) : (
                      <span>{ref.title}</span>
                    )}
                    {(ref.source || ref.year) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[ref.source, ref.year?.toString()].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
