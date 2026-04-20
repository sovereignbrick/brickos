'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Measurement, MeasurementFilters } from '@/lib/types'
import { DateOnlyPicker } from '@/components/date-time-picker'
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
import { MultiSelect } from '@brickos/ui'
import { useUnitPreferences } from '@/hooks/use-unit-preferences'

const PER_PAGE = 20

function tryTranslate(t: (key: string) => string, key: string): string {
  try {
    const result = t(key)
    if (result === key || result.startsWith('common.')) return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
    return result
  } catch {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
  }
}

function MeasurementsContent() {
  const { user, loading, isDemo } = useAuth()
  const { profile } = useDemoProfile()
  // When logged in on demo hostname, use authenticated endpoints (not demo)
  const useDemoApi = isDemo && !user
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('measurements')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const tMealTiming = useTranslations('common.mealTimingLabels')
  const tFasting = useTranslations('fastingProtocols')
  const tImport = useTranslations('import')
  const { markers: contentMarkers } = useContent()
  const { formatDisplay } = useUnitPreferences()
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
  const [selectedDevices, setSelectedDevices] = useState<string[]>(searchParams.get('device_id')?.split(',').filter(Boolean) || [])
  const [selectedLabs, setSelectedLabs] = useState<string[]>(searchParams.get('lab_id')?.split(',').filter(Boolean) || [])
  const [selectedProtocol, setSelectedProtocol] = useState(searchParams.get('protocol_tag') || '')
  const [selectedDiets, setSelectedDiets] = useState<string[]>(searchParams.get('diet_protocol')?.split(',').filter(Boolean) || [])
  const [selectedFastings, setSelectedFastings] = useState<string[]>(searchParams.get('fasting_protocol')?.split(',').filter(Boolean) || [])

  const toggleDevice = (id: string) => { setSelectedDevices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); resetPage() }
  const toggleLab = (id: string) => { setSelectedLabs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); resetPage() }
  const toggleDiet = (key: string) => { setSelectedDiets(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]); resetPage() }
  const toggleFasting = (key: string) => { setSelectedFastings(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]); resetPage() }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show rollback success toast if redirected from import history
  useEffect(() => {
    const rollbackCount = searchParams.get('rollback')
    if (rollbackCount) {
      toast.success(`${rollbackCount} measurements rolled back`)
      // Clean up URL param
      const url = new URL(window.location.href)
      url.searchParams.delete('rollback')
      window.history.replaceState({}, '', url.toString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch filter options
  useEffect(() => {
    if (loading) return
    if (!useDemoApi && !user) return

    const fetchFilters = async () => {
      try {
        const res = useDemoApi
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
    const deviceIds = [...selectedDevices, ...selectedLabs]
    if (deviceIds.length > 0) params.device_id = deviceIds.join(',')
    if (selectedProtocol) params.protocol_tag = selectedProtocol
    if (selectedDiets.length > 0) params.diet_protocol = selectedDiets.join(',')
    if (selectedFastings.length > 0) params.fasting_protocol = selectedFastings.join(',')
    if (useDemoApi) params.profile = profile
    return params
  }, [page, fromDate, toDate, selectedMarkers, selectedDevices, selectedLabs, selectedProtocol, selectedDiets, selectedFastings, isDemo, profile])

  // Update URL params
  const updateUrl = useCallback(() => {
    const urlParams = new URLSearchParams()
    if (fromDate) urlParams.set('from', fromDate)
    if (toDate) urlParams.set('to', toDate)
    if (selectedMarkers.length > 0) urlParams.set('marker', selectedMarkers.join(','))
    if (selectedDevices.length > 0) urlParams.set('device_id', selectedDevices.join(','))
    if (selectedLabs.length > 0) urlParams.set('lab_id', selectedLabs.join(','))
    if (selectedProtocol) urlParams.set('protocol_tag', selectedProtocol)
    if (selectedDiets.length > 0) urlParams.set('diet_protocol', selectedDiets.join(','))
    if (selectedFastings.length > 0) urlParams.set('fasting_protocol', selectedFastings.join(','))
    const qs = urlParams.toString()
    router.replace(`/sovereign-health/measurements${qs ? '?' + qs : ''}`, { scroll: false })
  }, [fromDate, toDate, selectedMarkers, selectedDevices, selectedLabs, selectedProtocol, selectedDiets, selectedFastings, router])

  // Fetch measurements
  useEffect(() => {
    if (loading) return
    if (!useDemoApi && !user) return

    const fetchData = async () => {
      setFetching(true)
      try {
        const params = buildParams()
        const res = useDemoApi
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
  }, [user, loading, isDemo, page, fromDate, toDate, selectedMarkers, selectedDevices, selectedLabs, selectedProtocol, selectedDiets, selectedFastings, profile, buildParams])

  // Debounced URL update when filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fromDate, toDate, selectedMarkers, selectedDevices, selectedLabs, selectedProtocol, selectedDiets, selectedFastings, updateUrl])

  const totalPages = Math.ceil(total / PER_PAGE)

  const hasActiveFilters = fromDate || toDate || selectedMarkers.length > 0 || selectedDevices.length > 0 || selectedLabs.length > 0 || selectedProtocol || selectedDiets.length > 0 || selectedFastings.length > 0

  const clearAllFilters = () => {
    setFromDate('')
    setToDate('')
    setSelectedMarkers([])
    setSelectedDevices([])
    setSelectedLabs([])
    setSelectedProtocol('')
    setSelectedDiets([])
    setSelectedFastings([])
    setPage(1)
  }

  const resetPage = () => setPage(1)

  const handleExport = async () => {
    if (useDemoApi) {
      toast.info(t('exportRegistered'))
      return
    }
    toast.info(t('downloading'))
    try {
      const params: Record<string, string> = {}
      if (fromDate) params.from = new Date(fromDate + 'T00:00:00Z').toISOString()
      if (toDate) params.to = new Date(toDate + 'T23:59:59Z').toISOString()
      if (selectedMarkers.length > 0) params.markers = selectedMarkers.join(',')
      const deviceIds = [...selectedDevices, ...selectedLabs]
      if (deviceIds.length > 0) params.device_id = deviceIds.join(',')
      if (selectedProtocol) params.protocol_tag = selectedProtocol
      if (selectedDiets.length > 0) params.diet_protocol = selectedDiets.join(',')
      if (selectedFastings.length > 0) params.fasting_protocol = selectedFastings.join(',')

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

  if (loading) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-8">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/sovereign-health/dashboard' },
            { label: t('breadcrumbHistory') },
          ]} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          {!isDemo && (
            <div className="flex items-center gap-2">
              <Link
                href="/sovereign-health/measurements/imports"
                className="border border-border text-muted-foreground hover:text-foreground text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {tImport('historyTitle')}
              </Link>
              <Link
                href="/sovereign-health/measurements/new"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {tNav('addMeasurement')}
              </Link>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border p-4 mb-5 space-y-3">
          {/* Row 1: Date range + Device + Lab */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('from')}</label>
              <DateOnlyPicker
                value={fromDate}
                onChange={v => { setFromDate(v); resetPage() }}
                countryCode={user?.country_code}
                placeholder={t('from')}
                className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('to')}</label>
              <DateOnlyPicker
                value={toDate}
                onChange={v => { setToDate(v); resetPage() }}
                countryCode={user?.country_code}
                placeholder={t('to')}
                className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('device')}</label>
              <MultiSelect
                options={(filters?.devices ?? []).filter(d => d.device_type !== 'lab').map(d => ({ key: d.id, label: d.name }))}
                selected={selectedDevices}
                onToggle={toggleDevice}
                allLabel={t('allDevices')}
                countLabel={(n) => `${n} ${t('device')}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('labProvider')}</label>
              <MultiSelect
                options={(filters?.devices ?? []).filter(d => d.device_type === 'lab').map(d => ({ key: d.id, label: d.name }))}
                selected={selectedLabs}
                onToggle={toggleLab}
                allLabel={t('allLabs')}
                countLabel={(n) => `${n} ${t('labProvider')}`}
              />
            </div>
          </div>

          {/* Row 2: Marker + Diet + Fasting */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('marker')} {selectedMarkers.length > 0 && `(${selectedMarkers.length})`}
              </label>
              <MarkerMultiSelect
                id="meas-list-marker"
                options={filters?.markers || []}
                selected={selectedMarkers}
                onToggle={toggleMarker}
                allLabel={t('allMarkers')}
                countLabel={(count: number) => t('markersCount', { count })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('dietProtocol')}</label>
              <MultiSelect
                options={['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'carnivore', 'paleo', 'mediterranean'].map(k => ({ key: k, label: tCommon(k) }))}
                selected={selectedDiets}
                onToggle={toggleDiet}
                allLabel={t('allProtocols')}
                countLabel={(n) => `${n} ${t('dietProtocol')}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('fastingProtocol')}</label>
              <MultiSelect
                options={['16_8', '18_6', '20_4', 'omad', '36h', '48h', '72h', 'extended'].map(k => ({ key: k, label: tFasting(k) }))}
                selected={selectedFastings}
                onToggle={toggleFasting}
                allLabel={t('allProtocols')}
                countLabel={(n) => `${n} ${t('fastingProtocol')}`}
              />
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
                href="/sovereign-health/measurements/new"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
              >
                {t('recordMeasurement')}
              </Link>
            ) : null}
          </div>
        ) : (
          <>
          {/* Desktop: structured table */}
          <div className="hidden sm:block border rounded-xl relative">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-accent text-muted-foreground text-xs">
                  <th className="text-left px-3 py-2.5 font-medium">{t('colDate')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('colMarker')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('colDevice')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('dietProtocol')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('fastingProtocol')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('colValue')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('colUnit')}</th>
                  <th className="px-1 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, i) => {
                  const mealLabel = m.meal_timing_tag && m.meal_timing_tag !== 'no_tag' && m.meal_timing_tag !== 'unspecified' ? tMealTiming(m.meal_timing_tag) : null
                  return (
                    <tr key={m.id} className={`border-b border-border hover:bg-accent/50 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDateTime(m.timestamp, user?.country_code)}
                        </td>
                        <td className="px-3 py-2.5 font-medium truncate">
                          {contentMarkers[m.marker_slug]?.name ?? m.marker_name}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs truncate">
                          {m.device_name || m.lab_name || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                          {m.diet_protocol ? tryTranslate(tCommon, m.diet_protocol) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          {m.fasting_protocol ? (
                            <span className="text-purple-400">{tryTranslate(tFasting, m.fasting_protocol)}</span>
                          ) : m.protocol_tag === 'fasting' ? (
                            <span className="text-purple-400">{t('fasting')}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatDisplay(m.marker_slug, m.value, m.unit).formatted.split(' ')[0]}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDisplay(m.marker_slug, m.value, m.unit).unit}
                        </td>
                        <td className="px-1 py-2.5">
                          <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                        </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {measurements.map(m => (
              <MeasurementPopover key={m.id} data={m} countryCode={user?.country_code}>
                {isDemo ? (
                  <div className="rounded-xl border p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contentMarkers[m.marker_slug]?.name ?? m.marker_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.timestamp, user?.country_code)} · {m.device_name || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="text-sm font-semibold">{formatDisplay(m.marker_slug, m.value, m.unit).formatted}</span>
                      <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/sovereign-health/measurements/${m.id}`}
                    className="rounded-xl border p-3 flex items-center justify-between hover:bg-accent transition-colors block"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contentMarkers[m.marker_slug]?.name ?? m.marker_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.timestamp, user?.country_code)} · {m.device_name || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="text-sm font-semibold">{formatDisplay(m.marker_slug, m.value, m.unit).formatted}</span>
                      <StatusBadge status={m.status as 'green' | 'orange' | 'red' | null} />
                    </div>
                  </Link>
                )}
              </MeasurementPopover>
            ))}
          </div>
          </>
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

function MarkerMultiSelect({
  options,
  selected,
  onToggle,
  allLabel,
  countLabel,
  id,
}: {
  options: { slug: string; name: string; count: number }[]
  selected: string[]
  onToggle: (slug: string) => void
  allLabel: string
  countLabel: (count: number) => string
  id?: string
}) {
  const tCommon = useTranslations('common')
  return (
    <MultiSelect
      options={options.map(o => ({ key: o.slug, label: o.name, count: o.count }))}
      selected={selected}
      onToggle={onToggle}
      allLabel={allLabel}
      countLabel={countLabel}
      searchable
      searchPlaceholder={tCommon('searchMarkers')}
    />
  )
}

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" suppressHydrationWarning>Loading&hellip;</div>}>
      <MeasurementsContent />
    </Suspense>
  )
}
