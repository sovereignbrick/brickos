'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/date-format'
import { useTranslations } from 'next-intl'

function tryTranslate(t: (key: string) => string, key: string): string {
  try {
    const result = t(key)
    if (result === key || result.startsWith('common.')) return key.charAt(0).toUpperCase() + key.slice(1)
    return result
  } catch {
    return key.charAt(0).toUpperCase() + key.slice(1)
  }
}

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
  meal_timing_tag?: string
  lab_name?: string | null
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
  className,
  onEdit,
  onDelete,
}: {
  data: PopoverData
  children: React.ReactNode
  countryCode?: string | null
  className?: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const t = useTranslations('measurements.popover')
  const tCommon = useTranslations('common')
  const tMealTiming = useTranslations('common.mealTimingLabels')
  const tStress = useTranslations('stressLevel')

  // Simple wrapper - no popover, just pass through children in a div
  return (
    <div
      className={className || 'relative'}
    >
      {children}
    </div>
  )
}
