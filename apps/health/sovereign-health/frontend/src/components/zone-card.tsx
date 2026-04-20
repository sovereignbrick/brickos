'use client'
import { Zone } from '@/lib/types'
import Link from 'next/link'
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

export function ZoneCard({ zone }: { zone: Zone }) {
  const total = zone.status_summary.green + zone.status_summary.orange + zone.status_summary.red
  const demoHref = useDemoHref()
  const tZones = useTranslations('zones')

  const zoneKey = ZONE_SLUG_TO_KEY[zone.zone_slug]
  const description = zoneKey && tZones.has(zoneKey as 'energy') ? tZones(zoneKey as 'energy') : ''

  return (
    <Link
      href={demoHref(`/sovereign-health/zones/${zone.zone_slug}`)}
      className="block rounded-2xl border p-5 hover:bg-accent transition-colors"
      style={{ borderColor: zone.zone_color + '44' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
          style={{
            backgroundColor: zone.zone_color + '30',
            filter: `drop-shadow(0 0 4px ${zone.zone_color}99)`,
          }}
        >
          {zone.zone_icon}
        </div>
        <div className="flex gap-1">
          {zone.status_summary.green > 0 && (
            <span className="text-xs text-[#4ade80]">🟢{zone.status_summary.green}</span>
          )}
          {zone.status_summary.orange > 0 && (
            <span className="text-xs text-[#fb923c]">🟡{zone.status_summary.orange}</span>
          )}
          {zone.status_summary.red > 0 && (
            <span className="text-xs text-[#ef4444]">🔴{zone.status_summary.red}</span>
          )}
        </div>
      </div>
      <p className="font-semibold text-sm" style={{ color: zone.zone_color }}>
        {zone.zone_name}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {zone.markers_with_data > 0
          ? tZones('markersWithData', { n: zone.markers_with_data, m: zone.marker_count })
          : tZones('markers', { n: zone.marker_count })
        }
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-snug">
          {description}
        </p>
      )}
    </Link>
  )
}
