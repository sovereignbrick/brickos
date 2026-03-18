'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Measurement, MeasurementFilters } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StatusBadge } from '@/components/status-badge'
import Link from 'next/link'
import { useDemoProfile } from '@/lib/demo-profile-context'
import { toast } from '@/lib/toast'
import { Download, X } from 'lucide-react'
import { MeasurementPopover } from '@/components/measurement-popover'
import { useRouter, useSearchParams } from 'next/navigation'
import { Breadcrumb } from '@/components/breadcrumb'
import { formatDateTime } from '@/lib/date-format'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'

const PER_PAGE = 20

function MeasurementsContent() {
  const { user, loading, isDemo } = useAuth()
  const { profile } = useDemoProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('measurements')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const tMealTiming = useTranslations('common.mealTimingLabels')
  const { markers: contentMarkers } = useContent()
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [filters, setFilters] = useState<MeasurementFilters | null>(null)

  // Filter state - initialized from URL params
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '')
  const [toDate, setToDate] = useState(searchParams.get('to') || '')
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>(
    searchParams.get('marker')?.split(',').filter(Boolean) || []
  )
  const [selectedDevice, setSelectedDevice] = useState(searchParams.get('device_id') || '')
  const [selectedProtocol, setSelectedProtocol] = useState(searchParams.get('protocol_tag') || '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch filter options
  useEffect(() => {
    if (loading) return
    if (!isDemo && !user) return

    const fetchFilters = async () => {
      try {
        const res = isDemo
          ? await api.demo.measurementFilters(profile)
          : await api.measurements.filters()
        setFilters(res.data)
      } catch {
        // silently fail
      }
    }
    fetchFilters()
  }, [user, loading, isDemo, profile])

  // Build query params from filter state
  const buildParams = useCallback(() => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(PER_PAGE),
    }
    if (fromDate) params.from = new Date(fromDate + 'T00:00:00Z').toISOString()
    if (toDate) params.to = new Date(toDate + 'T23:59:59Z').toISOString()
    if (selectedMarkers.length > 0) params.marker = selectedMarkers.join(',')
    if (selectedDevice) params.device_id = selectedDevice
    if (selectedProtocol) params.protocol_tag = selectedProtocol
    if (isDemo) params.profile = profile
    return params
  }, [page, fromDate, toDate, selectedMarkers, selectedDevice, selectedProtocol, isDemo, profile])

  // Update URL params
  const updateUrl = useCallback(() => {
    const urlParams = new URLSearchParams()
    if (fromDate) urlParams.set('from', fromDate)
    if (toDate) urlParams.set('to', toDate)
    if (selectedMarkers.length > 0) urlParams.set('marker', selectedMarkers.join(','))
    if (selectedDevice) urlParams.set('device_id', selectedDevice)
    if (selectedProtocol) urlParams.set('protocol_tag', selectedProtocol)
    const qs = urlParams.toString()
    router.replace(`/measurements${qs ? '?' + qs : ''}`, { scroll: false })
  }, [fromDate, toDate, selectedMarkers, selectedDevice, selectedProtocol, router])

  // Fetch measurements
  useEffect(() => {
    if (loading) return
    if (!isDemo && !user) return

    const fetchData = async () => {
      setFetching(true)
      try {
        const params = buildParams()
        const res = isDemo
          ? await api.demo.measurements(params)
          : await api.measurements.list(params)
        setMeasurements(res.data ?? [])
        setTotal(res.meta?.total ?? 0)
      } catch {
        setMeasurements([])
        setTotal(0)
      } finally {
        setFetching(false)
      }
    }
    fetchData()
  }, [user, loading, isDemo, page, fromDate, toDate, selectedMarkers, selectedDevice, selectedProtocol, profile, buildParams])

  // Debounced URL update when filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fromDate, toDate, selectedMarkers, selectedDevice, selectedProtocol, updateUrl])

  const totalPages = Math.ceil(total / PER_PAGE)

  const hasActiveFilters = fromDate || toDate || selectedMarkers.length > 0 || selectedDevice || selectedProtocol

  const clearAllFilters = () => {
    setFromDate('')
    setToDate('')
    setSelectedMarkers([])
    setSelectedDevice('')
    setSelectedProtocol('')
    setPage(1)
  }

  const resetPage = () => setPage(1)

  const handleExport = async () => {
    if (isDemo) {
      toast.info(t('exportRegistered'))
      return
    }
    toast.info(t('downloading'))
    try {
      const params: Record<string, string> = {}
      if (fromDate) params.from = new Date(fromDate + 'T00:00:00Z').toISOString()
      if (toDate) params.to = new Date(toDate + 'T23:59:59Z').toISOString()
      if (selectedMarkers.length > 0) params.markers = selectedMarkers.join(',')
      if (selectedDevice) params.device_id = selectedDevice
      if (selectedProtocol) params.protocol_tag = selectedProtocol

      const res = await api.export.csv(Object.keys(params).length > 0 ? params : undefined)
      if (!res.ok) {
        if (res.status === 403) {
          const body = await res.json().catch(() => null)
          if (body?.error?.code === 'upgrade_required') {
            toast.error(body.error.message || tCommon('upgradeRequired'))
            return
          }
        }
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const suffix = hasActiveFilters ? '-filtered' : ''
      a.download = `sovereign-health-export-${new Date().toISOString().slice(0, 10)}${suffix}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('exportComplete'))
    } catch {
      toast.error(t('exportFailed'))
    }
  }

  // Toggle marker in multi-select
  const toggleMarker = (slug: string) => {
    setSelectedMarkers(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
    resetPage()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tCommon('loading')}</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-8">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: t('breadcrumbHistory') },
          ]} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          {!isDemo && (
            <Link
              href="/measurements/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {tNav('addMeasurement')}
            </Link>
          )}
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border p-4 mb-5 space-y-3">
          {/* Row 1: Date range + Device */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('from')}</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); resetPage() }}
                className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('to')}</label>
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); resetPage() }}
                className="w-full bg-accent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('device')}</label>
              <select
                value={selectedDevice}
                onChange={e => { setSelectedDevice(e.target.value); resetPage() }}
                className="w-full bg-popover border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-popover [&>option]:text-white"
              >
                <option value="">{t('allDevices')}</option>
                {filters?.devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Marker + Protocol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('marker')} {selectedMarkers.length > 0 && `(${selectedMarkers.length})`}
              </label>
              <MarkerMultiSelect
                options={filters?.markers || []}
                selected={selectedMarkers}
                onToggle={toggleMarker}
                allLabel={t('allMarkers')}
                countLabel={(count: number) => t('markersCount', { count })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{tCommon('protocol')}</label>
              <select
                value={selectedProtocol}
                onChange={e => { setSelectedProtocol(e.target.value); resetPage() }}
                className="w-full bg-popover border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-popover [&>option]:text-white"
              >
                <option value="">{t('allProtocols')}</option>
                {filters?.protocols.map(p => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Actions */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {fetching ? tCommon('loading') : hasActiveFilters
                ? tCommon('showing', { count: total })
                : tCommon('items', { count: total })}
            </p>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} />
                  {tCommon('clearAll')}
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 bg-accent hover:bg-white/10 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download size={12} />
                {hasActiveFilters ? t('exportCsv', { count: total }) : t('exportAll')}
              </button>
            </div>
          </div>
        </div>

        {/* Measurement List */}
        {fetching ? (
          <div className="py-20 text-center text-muted-foreground text-sm">{tCommon('loading')}</div>
        ) : measurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              {hasActiveFilters ? t('noMatch') : tCommon('noMeasurements')}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {t('clearFilters')}
              </button>
            ) : !isDemo ? (
              <Link
                href="/measurements/new"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
              >
                {t('recordMeasurement')}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {measurements.map(m => (
              <MeasurementPopover key={m.id} data={m} countryCode={user?.country_code}>
                {isDemo ? (
                  <div className="rounded-xl border p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contentMarkers[m.marker_slug]?.name ?? m.marker_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.timestamp, user?.country_code)} · <span>{m.meal_timing_tag && m.meal_timing_tag !== 'no_tag' && m.meal_timing_tag !== 'unspecified' ? tMealTiming(m.meal_timing_tag) : '-'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="text-sm font-semibold">{m.value} {m.unit}</span>
                      <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/measurements/${m.id}`}
                    className="rounded-xl border p-3 flex items-center justify-between hover:bg-accent transition-colors block"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contentMarkers[m.marker_slug]?.name ?? m.marker_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.timestamp, user?.country_code)} · <span>{m.meal_timing_tag && m.meal_timing_tag !== 'no_tag' && m.meal_timing_tag !== 'unspecified' ? tMealTiming(m.meal_timing_tag) : '-'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="text-sm font-semibold">{m.value} {m.unit}</span>
                      <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                    </div>
                  </Link>
                )}
              </MeasurementPopover>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent text-muted-foreground hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              {tCommon('prev')}
            </button>
            <span className="text-sm text-muted-foreground">
              {tCommon('page', { page, totalPages })}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent text-muted-foreground hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              {tCommon('next')}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

// Marker multi-select dropdown component
function MarkerMultiSelect({
  options,
  selected,
  onToggle,
  allLabel,
  countLabel,
}: {
  options: { slug: string; name: string; count: number }[]
  selected: string[]
  onToggle: (slug: string) => void
  allLabel: string
  countLabel: (count: number) => string
}) {
  const t = useTranslations('measurements')
  const tCommon = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  const label = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? options.find(o => o.slug === selected[0])?.name || selected[0]
      : countLabel(selected.length)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-accent border rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground ml-1 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder={tCommon('searchMarkers')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-accent border rounded px-2 py-1 text-sm focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.map(o => (
              <button
                key={o.slug}
                type="button"
                onClick={() => onToggle(o.slug)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                  selected.includes(o.slug) ? 'bg-blue-600 border-blue-600 text-white' : 'border-border'
                }`}>
                  {selected.includes(o.slug) && '\u2713'}
                </span>
                <span className="truncate">{o.name}</span>
                <span className="text-muted-foreground text-xs ml-auto shrink-0">({o.count})</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{tCommon('noData')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading&hellip;</div>}>
      <MeasurementsContent />
    </Suspense>
  )
}
