'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { TrendData, MarkerDetail, MarkerDef } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { TrendChart } from '@/components/trend-chart'
import { useDemoProfile } from '@/lib/demo-profile-context'
import { DEFAULT_RANGES } from '@/lib/status'
import { Breadcrumb } from '@/components/breadcrumb'
import { useContent } from '@/lib/content-context'


// ── Period selector matching marker detail page ─────────────────────────────

const PERIODS = ['7d', '30d', '3m', '6m', '1y', 'all'] as const
type Period = (typeof PERIODS)[number]

function periodToDays(p: Period): number {
  switch (p) {
    case '7d': return 7
    case '30d': return 30
    case '3m': return 90
    case '6m': return 180
    case '1y': return 365
    case 'all': return 365
  }
}

// ── Zone grouping for marker selector ───────────────────────────────────────

const ZONE_CONFIG: { slug: string; nameKey: string; icon: string }[] = [
  { slug: 'energy_metabolic', nameKey: 'energy_metabolic', icon: '⚡' },
  { slug: 'cardiovascular', nameKey: 'cardiovascular_name', icon: '🫀' },
  { slug: 'structural', nameKey: 'structural_name', icon: '💪' },
  { slug: 'nutritional', nameKey: 'nutritional_name', icon: '🌱' },
  { slug: 'hormonal', nameKey: 'hormonal_name', icon: '🎯' },
  { slug: 'cognitive', nameKey: 'cognitive_name', icon: '🧠' },
  { slug: 'immune', nameKey: 'immune_name', icon: '🛡️' },
  { slug: 'detoxification', nameKey: 'detoxification_name', icon: '🔄' },
]

interface GroupedMarker {
  slug: string
  name: string
  zone_slug: string
}

// ── Grouped marker selector ─────────────────────────────────────────────────

function MarkerSelector({
  markers,
  value,
  onChange,
  label,
  allowEmpty,
}: {
  markers: GroupedMarker[]
  value: string
  onChange: (slug: string) => void
  label: string
  allowEmpty?: boolean
}) {
  const t = useTranslations('trends')
  const tCommon = useTranslations('common')
  const tZones = useTranslations('zones')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = markers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = ZONE_CONFIG.map(zone => ({
    ...zone,
    markers: filtered.filter(m => m.zone_slug === zone.slug),
  })).filter(g => g.markers.length > 0)

  const selectedName = markers.find(m => m.slug === value)?.name ?? value

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-accent border rounded-lg px-3 py-2 text-sm text-left min-w-[180px] flex items-center justify-between gap-2 hover:bg-white/8 transition-colors"
      >
        <span className="truncate">{value ? selectedName : tCommon('none')}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 max-h-80 overflow-y-auto rounded-xl border bg-popover shadow-xl">
          <div className="sticky top-0 bg-popover p-2 border-b border-border">
            <input
              type="text"
              placeholder={tCommon('searchMarkers')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-accent border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {allowEmpty && (
            <button
              onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${!value ? 'text-blue-400' : 'text-muted-foreground'}`}
            >
              {t('noneCompare')}
            </button>
          )}
          {grouped.map(zone => (
            <div key={zone.slug}>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky">
                {zone.icon} {tZones(zone.nameKey)} ({zone.markers.length})
              </div>
              {zone.markers.map((m, idx) => (
                <button
                  key={`${m.slug}-${idx}`}
                  onClick={() => { onChange(m.slug); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-6 py-2 text-sm hover:bg-accent transition-colors ${m.slug === value ? 'text-blue-400 bg-blue-600/10' : ''}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">{t('noMarkersFound')}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function TrendsPage() {
  const { user, loading, isDemo } = useAuth()
  const { profile } = useDemoProfile()
  const t = useTranslations('trends')
  const { markers: contentMarkers } = useContent()
  const [markerSlug, setMarkerSlug] = useState('glucose')
  const [secondarySlug, setSecondarySlug] = useState('')
  const [period, setPeriod] = useState<Period>('30d')
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [secondaryTrend, setSecondaryTrend] = useState<TrendData | null>(null)
  const [fetching, setFetching] = useState(false)
  const [availableMarkers, setAvailableMarkers] = useState<GroupedMarker[]>([])
  const [markerDetail, setMarkerDetail] = useState<MarkerDetail | null>(null)

  // Fetch available markers (only those with data)
  useEffect(() => {
    if (loading) return
    if (!isDemo && !user) return

    const fetchMarkers = async () => {
      try {
        const res = isDemo
          ? await (fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/demo/measurements?per_page=1000&profile=${profile}`).then(r => r.json()) as Promise<{ data: { marker_slug: string; marker_name: string }[] }>)
          : await api.markers.list()

        if (isDemo) {
          // Deduplicate from measurements
          const seen = new Map<string, string>()
          for (const m of (res.data ?? [])) {
            if (!seen.has(m.marker_slug)) seen.set(m.marker_slug, contentMarkers[m.marker_slug]?.name ?? m.marker_name)
          }
          // Map to zone slugs using DEFAULT_RANGES or just assign unknown
          const markers: GroupedMarker[] = Array.from(seen.entries()).map(([slug, name]) => ({
            slug,
            name,
            zone_slug: guessZone(slug),
          }))
          setAvailableMarkers(markers)
        } else {
          const defs = (res as { data: MarkerDef[] }).data ?? []
          // Fetch measurement filters to determine which markers have data
          let markersWithData: Set<string> | null = null
          try {
            const filtersRes = await api.measurements.filters()
            const filterMarkers = filtersRes?.data?.markers ?? []
            markersWithData = new Set(filterMarkers.filter(m => m.count > 0).map(m => m.slug))
          } catch {
            // If fetch fails, show all markers
          }
          const allMarkers = defs.map(d => ({
            slug: d.marker_slug,
            name: contentMarkers[d.marker_slug]?.name ?? d.marker_name,
            zone_slug: d.zone_slug ?? guessZone(d.marker_slug),
          }))
          setAvailableMarkers(markersWithData && markersWithData.size > 0 ? allMarkers.filter(m => markersWithData!.has(m.slug)) : allMarkers)
        }
      } catch {
        // Fallback to hardcoded
        setAvailableMarkers(FALLBACK_MARKERS)
      }
    }
    fetchMarkers()
  }, [loading, user, isDemo, profile, contentMarkers])

  // Fetch primary trend
  const fetchTrend = useCallback(async (slug: string, p: Period) => {
    if (!slug) return null
    const days = periodToDays(p)
    try {
      const res = isDemo
        ? await api.demo.markerTrend(slug, p, profile)
        : await api.markers.trend(slug, p)
      return res.data
    } catch {
      // Fallback to old days-based endpoint
      try {
        const res = isDemo
          ? await api.demo.trends(slug, days, profile)
          : await api.trends.get(slug, days)
        return res.data
      } catch {
        return null
      }
    }
  }, [isDemo, profile])

  // Fetch marker detail for reference ranges
  useEffect(() => {
    if (loading || (!isDemo && !user)) return
    const fn = isDemo
      ? () => api.demo.markerDetail(markerSlug, profile)
      : () => api.markers.detail(markerSlug)
    fn().then(res => setMarkerDetail(res.data)).catch(() => setMarkerDetail(null))
  }, [markerSlug, loading, user, isDemo, profile])

  useEffect(() => {
    if (loading || (!isDemo && !user)) return

    const load = async () => {
      setFetching(true)
      const [primary, secondary] = await Promise.all([
        fetchTrend(markerSlug, period),
        secondarySlug ? fetchTrend(secondarySlug, period) : Promise.resolve(null),
      ])
      setTrendData(primary)
      setSecondaryTrend(secondary)
      setFetching(false)
    }
    load()
  }, [user, loading, isDemo, markerSlug, secondarySlug, period, fetchTrend])

  const points = trendData?.points ?? []
  const values = points.map(p => p.value)
  const min = values.length > 0 ? Math.min(...values) : null
  const max = values.length > 0 ? Math.max(...values) : null
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

  // Reference range from marker detail or DEFAULT_RANGES
  const range = markerDetail?.reference_range
  const greenMin = range?.green_min ?? DEFAULT_RANGES[markerSlug]?.green_min ?? null
  const greenMax = range?.green_max ?? DEFAULT_RANGES[markerSlug]?.green_max ?? null
  const fastingRange = markerDetail?.fasting_range
  const fastingGreenMin = fastingRange?.green_min ?? null
  const fastingGreenMax = fastingRange?.green_max ?? null

  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tCommon('loading')}</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: tNav('trends') },
          ]} />
        </div>
        <div className="mb-6">
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <MarkerSelector
            markers={availableMarkers}
            value={markerSlug}
            onChange={setMarkerSlug}
            label={t('primaryMarker')}
          />
          <MarkerSelector
            markers={availableMarkers.filter(m => m.slug !== markerSlug)}
            value={secondarySlug}
            onChange={setSecondarySlug}
            label={t('compareWith')}
            allowEmpty
          />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('period')}</label>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-xs px-2.5 py-2 rounded-lg transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-white/10'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary marker clear button */}
        {secondarySlug && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-muted-foreground">
              {t('comparing', {
                marker1: availableMarkers.find(m => m.slug === markerSlug)?.name ?? markerSlug,
                marker2: availableMarkers.find(m => m.slug === secondarySlug)?.name ?? secondarySlug,
              })}
            </span>
            <button
              onClick={() => setSecondarySlug('')}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              {t('clearComparison')}
            </button>
          </div>
        )}

        {/* Chart */}
        <div className="rounded-2xl border p-4 mb-4">
          <h2 className="text-sm font-semibold mb-4">
            {availableMarkers.find(m => m.slug === markerSlug)?.name ?? markerSlug}
            {trendData && <span className="text-muted-foreground font-normal ml-2">({trendData.unit})</span>}
          </h2>
          {fetching ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {tCommon('loading')}
            </div>
          ) : (
            <TrendChart
              points={points}
              markerName={availableMarkers.find(m => m.slug === markerSlug)?.name ?? markerSlug}
              unit={trendData?.unit ?? ''}
              greenMin={greenMin}
              greenMax={greenMax}
              fastingGreenMin={fastingGreenMin}
              fastingGreenMax={fastingGreenMax}
              secondaryPoints={secondaryTrend?.points}
              secondaryName={availableMarkers.find(m => m.slug === secondarySlug)?.name}
              secondaryUnit={secondaryTrend?.unit}
              markerSlug={markerSlug}
              countryCode={user?.country_code}
            />
          )}
        </div>

        {/* Stats */}
        {points.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('min'), value: min },
              { label: t('avg'), value: avg },
              { label: t('max'), value: max },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-bold">
                  {value !== null ? value.toFixed(2) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{trendData?.unit ?? ''}</p>
              </div>
            ))}
          </div>
        )}

        {!fetching && availableMarkers.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">{t('addMeasurementsFirst')}</p>
          </div>
        )}
        {!fetching && availableMarkers.length > 0 && points.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">{t('noData')}</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function guessZone(slug: string): string {
  const map: Record<string, string> = {
    glucose: 'energy_metabolic', ketones: 'energy_metabolic', insulin: 'energy_metabolic',
    gki: 'energy_metabolic', dr_boz_ratio: 'energy_metabolic', homa_ir: 'energy_metabolic',
    total_cholesterol: 'cardiovascular', bp_systolic: 'cardiovascular', bp_diastolic: 'cardiovascular',
    heart_rate: 'cardiovascular', apob: 'cardiovascular',
    weight: 'structural', waist_circumference: 'structural', bmi: 'structural', whtr: 'structural',
    hemoglobin: 'nutritional', hematocrit: 'nutritional', hct_hb_ratio: 'nutritional',
    uric_acid: 'nutritional', iron: 'nutritional', ferritin: 'nutritional',
  }
  return map[slug] ?? 'nutritional'
}

const FALLBACK_MARKERS: GroupedMarker[] = [
  { slug: 'glucose', name: 'Glucose', zone_slug: 'energy_metabolic' },
  { slug: 'ketones', name: 'Ketones', zone_slug: 'energy_metabolic' },
  { slug: 'insulin', name: 'Insulin', zone_slug: 'energy_metabolic' },
  { slug: 'total_cholesterol', name: 'Total Cholesterol', zone_slug: 'cardiovascular' },
  { slug: 'bp_systolic', name: 'BP Systolic', zone_slug: 'cardiovascular' },
  { slug: 'bp_diastolic', name: 'BP Diastolic', zone_slug: 'cardiovascular' },
  { slug: 'heart_rate', name: 'Heart Rate', zone_slug: 'cardiovascular' },
  { slug: 'weight', name: 'Weight', zone_slug: 'structural' },
  { slug: 'waist_circumference', name: 'Waist Circumference', zone_slug: 'structural' },
  { slug: 'hemoglobin', name: 'Hemoglobin', zone_slug: 'nutritional' },
  { slug: 'hematocrit', name: 'Hematocrit', zone_slug: 'nutritional' },
  { slug: 'uric_acid', name: 'Uric Acid', zone_slug: 'nutritional' },
]
