'use client'
import { computeStatus, statusColor, DEFAULT_RANGES } from '@/lib/status'
import type { ComputedMarker } from '@/lib/calculated'

export function CalculatedMarkerCard({ marker }: { marker: ComputedMarker }) {
  const range = DEFAULT_RANGES[marker.slug]
  const status = marker.value !== null && range ? computeStatus(marker.value, range) : null

  return (
    <div className="rounded-xl border p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{marker.name}</p>
        <p className="text-xs text-muted-foreground">{marker.formula}</p>
        {marker.note && <p className="text-xs text-muted-foreground mt-1">{marker.note}</p>}
      </div>
      {marker.value !== null ? (
        <div className="text-right">
          <p
            className="text-lg font-bold"
            style={{ color: statusColor(status) }}
          >
            {marker.value.toFixed(2)}
          </p>
          <p className="text-xs capitalize" style={{ color: statusColor(status) }}>
            {status ?? ''}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">-</p>
      )}
    </div>
  )
}
