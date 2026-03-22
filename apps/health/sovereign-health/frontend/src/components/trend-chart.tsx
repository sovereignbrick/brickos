'use client'
import { useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine, Legend, CartesianGrid,
} from 'recharts'
import type { TrendPoint } from '@/lib/types'
import { statusColor } from '@/lib/status'
import Link from 'next/link'
import { formatShortDate, formatDate, formatTime } from '@/lib/date-format'
import { useTranslations } from 'next-intl'

interface TrendChartProps {
  points: TrendPoint[]
  markerName: string
  unit: string
  greenMin?: number | null
  greenMax?: number | null
  fastingGreenMin?: number | null
  fastingGreenMax?: number | null
  secondaryPoints?: TrendPoint[]
  secondaryName?: string
  secondaryUnit?: string
  markerSlug?: string
  countryCode?: string | null
}

interface ActivePoint {
  date: string
  fullDate: string
  time: string
  value: number
  unit: string
  status: string | null
  protocol_tag: string
  markerSlug?: string
}

// Format a numeric value to appropriate decimal places based on unit/marker context
function formatValue(value: unknown, u: string): string {
  const num = Number(value)
  if (!isFinite(num)) return String(value ?? '')
  // Blood pressure and heart rate: no decimals
  const integerUnits = ['bpm', 'mmHg']
  if (integerUnits.some(iu => u.includes(iu))) return num.toFixed(0)
  // Most biomarkers: 1 decimal
  return num.toFixed(1)
}

export function TrendChart({
  points,
  markerName,
  unit,
  greenMin,
  greenMax,
  fastingGreenMin,
  fastingGreenMax,
  secondaryPoints,
  secondaryName,
  secondaryUnit,
  markerSlug,
  countryCode,
}: TrendChartProps) {
  const t = useTranslations('trends')
  const tCommon = useTranslations('common')
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null)
  const hasStandardRange = greenMin != null && greenMax != null
  const hasFastingRange = fastingGreenMin != null && fastingGreenMax != null
  const [showStandardRange, setShowStandardRange] = useState(hasStandardRange)
  const [showFastingRange, setShowFastingRange] = useState(false)

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t('noDataInRange')}
      </div>
    )
  }

  const hasDual = secondaryPoints && secondaryPoints.length > 0 && secondaryName

  // Build unified chart data keyed by date string
  const dateMap = new Map<string, Record<string, unknown>>()

  for (const p of points) {
    const d = new Date(p.measured_at)
    const key = d.toISOString()
    const entry = dateMap.get(key) ?? {
      date: formatShortDate(d, countryCode),
      fullDate: formatDate(d, countryCode),
      time: formatTime(d, countryCode),
      ts: d.getTime(),
    }
    entry.primary = p.value
    entry.primaryStatus = p.status
    entry.primaryColor = statusColor(p.status as 'green' | 'orange' | 'red' | null)
    entry.protocol_tag = p.protocol_tag
    dateMap.set(key, entry)
  }

  if (hasDual && secondaryPoints) {
    for (const p of secondaryPoints) {
      const d = new Date(p.measured_at)
      const key = d.toISOString()
      const entry = dateMap.get(key) ?? {
        date: formatShortDate(d, countryCode),
        fullDate: formatDate(d, countryCode),
        time: formatTime(d, countryCode),
        ts: d.getTime(),
      }
      entry.secondary = p.value
      dateMap.set(key, entry)
    }
  }

  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => (a.ts as number) - (b.ts as number)
  )

  // Y-axis domain for primary  - include reference range values so bands don't fill entire chart
  const primaryValues = points.map(p => p.value)
  const rangeValues = [
    ...(showStandardRange && greenMin != null ? [greenMin] : []),
    ...(showStandardRange && greenMax != null ? [greenMax] : []),
    ...(showFastingRange && fastingGreenMin != null ? [fastingGreenMin] : []),
    ...(showFastingRange && fastingGreenMax != null ? [fastingGreenMax] : []),
  ]
  const allValues = [...primaryValues, ...rangeValues]
  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  const padding = dataMin === dataMax
    ? Math.max(dataMin * 0.05, 0.5)
    : Math.max((dataMax - dataMin) * 0.15, 0.5)
  const rawYMin = dataMin === dataMax ? dataMin * 0.95 : dataMin - padding
  const yMin = dataMin >= 0 ? Math.max(0, rawYMin) : rawYMin
  const yMax = dataMin === dataMax ? dataMax * 1.05 : dataMax + padding

  // Y-axis domain for secondary  - clamp minimum to 0 for non-negative markers
  let y2Min = 0
  let y2Max = 10
  if (hasDual && secondaryPoints && secondaryPoints.length > 0) {
    const sVals = secondaryPoints.map(p => p.value)
    const sMin = Math.min(...sVals)
    const sMax = Math.max(...sVals)
    const sPad = sMin === sMax ? Math.max(sMin * 0.05, 0.5) : Math.max((sMax - sMin) * 0.15, 0.5)
    const rawS2Min = sMin === sMax ? sMin * 0.95 : sMin - sPad
    y2Min = sMin >= 0 ? Math.max(0, rawS2Min) : rawS2Min
    y2Max = sMin === sMax ? sMax * 1.05 : sMax + sPad
  }

  // Collect fasting period ranges (consecutive fasting measurements) for shading
  const fastingPeriods: { startDate: string; endDate: string }[] = []
  let fastingStart: string | null = null
  for (const p of points) {
    if (p.protocol_tag !== 'standard') {
      if (!fastingStart) {
        fastingStart = formatShortDate(new Date(p.measured_at), countryCode)
      }
    } else {
      if (fastingStart) {
        // End the fasting period at the previous point
        const prevIdx = points.indexOf(p) - 1
        if (prevIdx >= 0) {
          fastingPeriods.push({
            startDate: fastingStart,
            endDate: formatShortDate(new Date(points[prevIdx].measured_at), countryCode),
          })
        }
        fastingStart = null
      }
    }
  }
  // Close open fasting period
  if (fastingStart) {
    fastingPeriods.push({
      startDate: fastingStart,
      endDate: formatShortDate(new Date(points[points.length - 1].measured_at), countryCode),
    })
  }

  // Always show dots — smaller radius for dense charts
  const dotRadius = chartData.length > 60 ? 2 : chartData.length > 30 ? 3 : 4

  // Determine tick count for x-axis based on data size
  const xTickCount = Math.min(chartData.length, 7)

  const handleClick = useCallback((data: Record<string, unknown>) => {
    if (!data || data.primary == null) return
    setActivePoint({
      date: data.fullDate as string,
      fullDate: data.fullDate as string,
      time: data.time as string,
      value: data.primary as number,
      unit,
      status: (data.primaryStatus as string) ?? null,
      protocol_tag: (data.protocol_tag as string) ?? 'standard',
      markerSlug,
    })
  }, [unit, markerSlug])

  return (
    <div className="relative">
      {/* Range toggle checkboxes */}
      {(hasStandardRange || hasFastingRange) && (
        <div className="flex items-center justify-end gap-4 mb-2">
          {hasStandardRange && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showStandardRange}
                onChange={e => setShowStandardRange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-muted checked:bg-emerald-500 checked:border-emerald-500 accent-emerald-500"
              />
              <span className="text-xs text-muted-foreground">{t('standardRange')}</span>
            </label>
          )}
          {hasFastingRange && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showFastingRange}
                onChange={e => setShowFastingRange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-muted checked:bg-blue-500 checked:border-blue-500 accent-blue-500"
              />
              <span className="text-xs text-muted-foreground">{t('fastingRange')}</span>
            </label>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: hasDual ? 65 : 20, bottom: 20, left: 20 }}
          onClick={(e: unknown) => {
            const ev = e as { activePayload?: { payload: Record<string, unknown> }[] } | null
            if (ev?.activePayload?.[0]?.payload) {
              handleClick(ev.activePayload[0].payload)
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, rgba(255,255,255,0.06))" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickCount={xTickCount}
            angle={chartData.length > 10 ? -45 : 0}
            textAnchor={chartData.length > 10 ? 'end' : 'middle'}
            height={chartData.length > 10 ? 50 : 30}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            domain={[yMin, yMax]}
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickFormatter={(v: number) => formatValue(v, unit)}
            width={55}
            label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: 10 }, offset: -5 }}
          />
          {hasDual && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[y2Min, y2Max]}
              tick={{ fill: '#fb923c', fontSize: 11 }}
              tickFormatter={(v: number) => formatValue(v, secondaryUnit ?? '')}
              width={55}
              label={{ value: secondaryUnit ?? '', angle: 90, position: 'insideRight', style: { fill: '#fb923c', fontSize: 10 }, offset: -5 }}
            />
          )}
          <Tooltip
            contentStyle={{ background: 'var(--color-card, #1a1a2e)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))', borderRadius: 8, color: 'var(--color-foreground, #fff)', padding: '8px 12px' }}
            labelStyle={{ color: 'var(--color-muted-foreground, #a1a1aa)', marginBottom: 4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const entry = payload[0]?.payload as Record<string, unknown> | undefined
              if (!entry) return null
              const color = (entry.primaryColor as string) ?? '#3b82f6'
              const status = entry.primaryStatus as string | null
              const value = entry.primary as number | undefined
              const protocol = entry.protocol_tag as string | undefined
              return (
                <div style={{ background: 'var(--color-card, #1a1a2e)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ color: 'var(--color-muted-foreground, #a1a1aa)', fontSize: 11, marginBottom: 4 }}>{label}</p>
                  {value != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ color, fontWeight: 600, fontSize: 13 }}>
                        {formatValue(value, unit)} {unit}
                      </span>
                    </div>
                  )}
                  {protocol && protocol !== 'standard' && (
                    <p style={{ fontSize: 10, color: '#a78bfa', marginTop: 1 }}>{protocol}</p>
                  )}
                  {hasDual && entry.secondary != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#fb923c', flexShrink: 0 }} />
                      <span style={{ color: '#fb923c', fontWeight: 600, fontSize: 13 }}>
                        {formatValue(entry.secondary, secondaryUnit ?? '')} {secondaryUnit}
                      </span>
                    </div>
                  )}
                </div>
              )
            }}
          />
          {hasDual && (
            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{ paddingBottom: 12 }}
              formatter={(value: string) => {
                if (value === 'primary') return markerName
                if (value === 'secondary') return secondaryName ?? ''
                return value
              }}
            />
          )}
          {/* Standard reference range band */}
          {showStandardRange && greenMin != null && greenMax != null && (
            <ReferenceArea yAxisId="left" y1={greenMin} y2={greenMax} fill="#4ade8018" strokeOpacity={0} />
          )}
          {/* Fasting reference range band */}
          {showFastingRange && fastingGreenMin != null && fastingGreenMax != null && (
            <ReferenceArea yAxisId="left" y1={fastingGreenMin} y2={fastingGreenMax} fill="#60a5fa18" strokeOpacity={0} />
          )}
          {/* Fasting period shading  - subtle background zones instead of text labels */}
          {fastingPeriods.map((fp, i) => (
            <ReferenceArea
              key={`fasting-${i}`}
              yAxisId="left"
              x1={fp.startDate}
              x2={fp.endDate}
              fill="#a78bfa"
              fillOpacity={0.06}
              strokeOpacity={0}
            />
          ))}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="primary"
            stroke="#3b82f6"
            strokeWidth={2}
            connectNulls
            dot={(props) => {
              const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload: { primaryColor?: string } }
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={dotRadius}
                  fill={payload.primaryColor ?? '#3b82f6'}
                  stroke="none"
                  style={{ cursor: 'pointer' }}
                />
              )
            }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
          {hasDual && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="secondary"
              stroke="#fb923c"
              strokeWidth={2}
              strokeDasharray="6 3"
              connectNulls
              dot={{ r: Math.max(dotRadius - 1, 2), fill: '#fb923c' }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Fasting period legend entry (if there are fasting periods) */}
      {fastingPeriods.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 -mt-2 mb-1 group relative cursor-help">
          <span className="inline-block w-3 h-3 rounded-sm bg-purple-400/20 border border-purple-400/30" />
          <span className="text-[10px] text-muted-foreground underline decoration-dotted">{t('fastingPeriod')}</span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 z-20">
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-xl text-[11px] text-muted-foreground leading-relaxed">
              {t('fastingPeriodTooltip')}
            </div>
          </div>
        </div>
      )}

      {/* Clickable data point detail popover */}
      {activePoint && (
        <div className="absolute top-2 right-2 z-10 bg-card border border-border rounded-xl p-3 shadow-xl max-w-[220px]">
          <button
            onClick={() => setActivePoint(null)}
            className="absolute top-1.5 right-2 text-muted-foreground hover:text-foreground text-xs"
          >
            x
          </button>
          <p className="text-xs text-muted-foreground mb-1">{activePoint.fullDate} {activePoint.time}</p>
          <p className="text-lg font-bold" style={{ color: statusColor(activePoint.status as 'green' | 'orange' | 'red' | null) }}>
            {formatValue(activePoint.value, activePoint.unit)} <span className="text-xs font-normal text-muted-foreground">{activePoint.unit}</span>
          </p>
          {activePoint.status && (
            <p className="text-xs mt-1">
              {tCommon('status')}: <span className="capitalize font-medium" style={{ color: statusColor(activePoint.status as 'green' | 'orange' | 'red' | null) }}>{activePoint.status}</span>
            </p>
          )}
          {activePoint.protocol_tag !== 'standard' && (
            <p className="text-xs text-purple-400 mt-0.5">{tCommon('protocol')}: {activePoint.protocol_tag}</p>
          )}
          {activePoint.markerSlug && (
            <Link
              href={`/markers/${activePoint.markerSlug}`}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              {t('viewDetails')} →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
