'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/date-format'
import { useTranslations } from 'next-intl'

interface PopoverData {
  id?: string
  timestamp: string
  value: number
  unit: string
  status: string | null
  protocol_tag?: string
  fasting_protocol?: string | null
  fasting_hours?: number | null
  diet_protocol?: string | null
  exercise_activity?: string | null
  sleep_hours?: number | null
  sleep_quality?: string | null
  stress_level?: number | null
  lifestyle_note?: string | null
  device_name?: string | null
}

export function MeasurementPopover({
  data,
  children,
  countryCode,
  onEdit,
  onDelete,
}: {
  data: PopoverData
  children: React.ReactNode
  countryCode?: string | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [above, setAbove] = useState(true)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('measurements.popover')
  const tCommon = useTranslations('common')
  const tStress = useTranslations('stressLevel')

  const show = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setAbove(rect.top > 280)
      }
      setVisible(true)
    }, 300)
  }, [])

  const hide = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => setVisible(false), 150)
  }, [])

  const cancelHide = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
  }, [])

  // Mobile: tap to toggle, tap outside to dismiss
  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    }
  }, [])

  function stressLabel(level: number): string {
    if (level <= 2) return tStress('none')
    if (level <= 4) return tStress('low')
    if (level <= 6) return tStress('moderate')
    if (level <= 8) return tStress('high')
    return tStress('veryHigh')
  }

  const fields: { label: string; value: string }[] = []

  fields.push({ label: t('date'), value: formatDateTime(data.timestamp, countryCode) })

  if (data.device_name) {
    fields.push({ label: t('device'), value: data.device_name })
  }

  if (data.protocol_tag && data.protocol_tag !== 'standard') {
    fields.push({ label: t('protocol'), value: data.protocol_tag.charAt(0).toUpperCase() + data.protocol_tag.slice(1) })
  }

  if (data.fasting_protocol) {
    fields.push({ label: t('fastingType'), value: data.fasting_protocol.replace(/_/g, ' ') })
  }

  if (data.fasting_hours != null && data.fasting_hours > 0) {
    fields.push({ label: t('fastingHours'), value: `${data.fasting_hours}h` })
  }

  if (data.diet_protocol) {
    fields.push({ label: t('diet'), value: data.diet_protocol.charAt(0).toUpperCase() + data.diet_protocol.slice(1) })
  }

  if (data.exercise_activity) {
    fields.push({ label: t('exercise'), value: data.exercise_activity.charAt(0).toUpperCase() + data.exercise_activity.slice(1) })
  }

  if (data.sleep_hours != null) {
    const qual = data.sleep_quality ? ` (${data.sleep_quality})` : ''
    fields.push({ label: t('sleep'), value: `${data.sleep_hours}h${qual}` })
  }

  if (data.stress_level != null) {
    fields.push({ label: t('stressLevel'), value: stressLabel(data.stress_level) })
  }

  if (data.lifestyle_note) {
    fields.push({ label: t('note'), value: data.lifestyle_note })
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => {
        if ('ontouchstart' in window) {
          e.preventDefault()
          setVisible(v => !v)
        }
      }}
    >
      {children}

      {visible && (
        <div
          ref={popoverRef}
          onMouseEnter={cancelHide}
          onMouseLeave={hide}
          className={`absolute z-50 w-[300px] max-w-[90vw] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl p-3 animate-in fade-in duration-150 ${
            above
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
        >
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
              above
                ? 'top-full border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-zinc-700'
                : 'bottom-full border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-zinc-700'
            }`}
          />

          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
            <span className="text-lg font-bold tabular-nums">{data.value}</span>
            <span className="text-xs text-muted-foreground">{data.unit}</span>
            <StatusBadge status={data.status as 'green' | 'orange' | 'red' | null} />
          </div>

          <div className="space-y-1.5">
            {fields.map((f, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground shrink-0">{f.label}</span>
                <span className="text-foreground text-right truncate">{f.value}</span>
              </div>
            ))}
          </div>

          {data.id && (onEdit || onDelete) && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-800">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(data.id!) }}
                  className="flex-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg py-1.5 transition-colors"
                >
                  {tCommon('edit')}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(data.id!) }}
                  className="flex-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg py-1.5 transition-colors"
                >
                  {tCommon('delete')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
