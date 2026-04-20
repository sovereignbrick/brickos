'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { ZoneDetail, MarkerLatest } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StatusBadge } from '@/components/status-badge'
import Link from 'next/link'
import { useDemoProfile } from '@/lib/demo-profile-context'
import { useContent } from '@/lib/content-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { formatShortDate } from '@/lib/date-format'
import { useDemoHref } from '@/lib/use-demo-href'
import { useTranslations } from 'next-intl'

const ZONE_SLUG_TO_KEY: Record<string, string> = {
  energy_metabolic: 'energy',
  structural: 'structural',
  cardiovascular: 'cardiovascular',
  cognitive: 'cognitive',
  immune: 'immune',
  nutritional: 'nutritional',
  hormonal: 'hormonal',
  detoxification: 'detoxification',
}

export default function ZoneDetailPage() {
  const { user, loading, isDemo } = useAuth()
  const { profile } = useDemoProfile()
  const params = useParams()
  const slug = params.slug as string
  const demoHref = useDemoHref()
  const tZones = useTranslations('zones')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const { locale } = useContent()

  const [zone, setZone] = useState<ZoneDetail | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!isDemo && !user) return

    const fetchZone = isDemo
      ? () => api.demo.zone(slug, profile).then(res => setZone(res.data))
      : () => api.zones.get(slug).then(res => setZone(res.data))

    fetchZone()
      .catch(() => setZone(null))
      .finally(() => setFetching(false))
  }, [user, loading, isDemo, slug, profile, locale])

  if (loading || fetching) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  if (!zone) return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">{tZones('zoneNotFound')}</p>
        <Link href="/sovereign-health/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          ← {tNav('overview')}
        </Link>
      </main>
    </div>
  )

  const zoneKey = ZONE_SLUG_TO_KEY[zone.zone_slug]
  const description = zoneKey && tZones.has(zoneKey as 'energy') ? tZones(zoneKey as 'energy') : ''
  const noDataCount = zone.markers_total - zone.markers_with_data
  const statusCounts = zone.markers.reduce(
    (acc, m) => {
      if (m.status === 'green') acc.green++
      else if (m.status === 'orange') acc.orange++
      else if (m.status === 'red') acc.red++
      return acc
    },
    { green: 0, orange: 0, red: 0 }
  )

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        <div className="mb-6">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/sovereign-health/dashboard' },
            { label: zone.zone_name },
          ]} />
        </div>

        {/* Zone header with description */}
        <div className="rounded-2xl border p-6 mb-6" style={{ borderLeftWidth: 4, borderLeftColor: zone.zone_color, borderColor: zone.zone_color + '44' }}>
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: zone.zone_color + '22' }}
            >
              {zone.zone_icon}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: zone.zone_color }}>
                {zone.zone_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {zone.markers_with_data > 0
                  ? tZones('markersHaveData', { n: zone.markers_with_data, m: zone.markers_total })
                  : tZones('markerCount', { n: zone.markers_total })
                }
              </p>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
          )}
          {/* Status summary dots */}
          <div className="flex flex-wrap gap-3 text-xs">
            {statusCounts.green > 0 && (
              <span className="text-[#4ade80]">🟢 {statusCounts.green} {tZones('optimal')}</span>
            )}
            {statusCounts.orange > 0 && (
              <span className="text-[#fb923c]">🟡 {statusCounts.orange} {tZones('borderline')}</span>
            )}
            {statusCounts.red > 0 && (
              <span className="text-[#ef4444]">🔴 {statusCounts.red} {tZones('outOfRange')}</span>
            )}
            {noDataCount > 0 && (
              <span className="text-muted-foreground">⚪ {noDataCount} {tZones('noDataStatus')}</span>
            )}
          </div>
        </div>

        {/* Markers list */}
        {zone.markers.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">{tZones('noBiomarkersYet')}</p>
            {!isDemo && (
              <Link
                href="/sovereign-health/measurements/new"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-block mt-4"
              >
                {tZones('addMeasurement')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...zone.markers].sort((a, b) => {
              const aHas = a.latest_value !== null ? 0 : 1
              const bHas = b.latest_value !== null ? 0 : 1
              if (aHas !== bHas) return aHas - bHas
              return a.marker_name.localeCompare(b.marker_name)
            }).map((marker: MarkerLatest, index: number) => {
              const hasData = marker.latest_value !== null
              const isCalc = marker.marker_type === 'calculated'
              const isArchived = marker.device_archived === true
              const isLab = marker.source_type === 'lab'
              const sourceLabel = isCalc
                ? null
                : isLab ? tZones('labTest') : (marker.device_name ?? tZones('homeDevice'))
              const tagCls = isLab
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                : isArchived
                  ? 'border-dashed border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
              return (
                <Link
                  key={`${marker.marker_slug}-${index}`}
                  href={demoHref(`/sovereign-health/markers/${marker.marker_slug}`)}
                  className={`rounded-xl border p-4 flex items-center justify-between hover:border-border hover:bg-muted/50 hover:scale-[1.01] transition-all duration-150 block ${!hasData ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{marker.marker_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isCalc ? (
                        <span className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                          📐 {tZones('calculated')}
                        </span>
                      ) : sourceLabel ? (
                        <span
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = '/settings?tab=devices' }}
                          className={`shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${tagCls}`}
                          title={isArchived ? tZones('deviceArchivedTooltip', { name: sourceLabel }) : undefined}
                        >{sourceLabel}</span>
                      ) : null}
                      {marker.measured_at ? (
                        <span className="text-xs text-muted-foreground">
                          {formatShortDate(marker.measured_at, user?.country_code)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">{tZones('noDataYet')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasData ? (
                      <>
                        <span className="text-sm font-semibold">
                          {marker.latest_value} <span className="text-xs text-muted-foreground">{marker.unit}</span>
                        </span>
                        <StatusBadge status={marker.status as 'green' | 'orange' | 'red' | null} />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">{marker.unit}</span>
                    )}
                    <span className="text-muted-foreground text-xs">›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!isDemo && (
          <div className="mt-6 text-center">
            <Link
              href="/sovereign-health/measurements/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
            >
              {tZones('addMeasurementButton')}
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
