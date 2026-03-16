'use client'
import { statusColor, statusEmoji, Status } from '@/lib/status'

interface StatusBadgeProps {
  status: Status | undefined | null
  showLabel?: boolean
}

export function StatusBadge({ status, showLabel }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-medium"
      style={{ color: statusColor(status) }}
      title={status ?? 'no data'}
    >
      {statusEmoji(status)}
      {showLabel && status && <span className="capitalize">{status}</span>}
    </span>
  )
}
