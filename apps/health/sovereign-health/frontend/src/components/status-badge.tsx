'use client'
import { statusColor, statusEmoji, Status } from '@/lib/status'
import { useTranslations } from 'next-intl'

interface StatusBadgeProps {
  status: Status | undefined | null
  showLabel?: boolean
}

export function StatusBadge({ status, showLabel }: StatusBadgeProps) {
  const t = useTranslations('status')
  const tCommon = useTranslations('common')
  const label = status ? t(status as 'green') : tCommon('noData')
  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-medium"
      style={{ color: statusColor(status) }}
      title={label}
    >
      {statusEmoji(status)}
      {showLabel && status && <span className="capitalize">{label}</span>}
    </span>
  )
}
