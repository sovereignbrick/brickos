'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { isUnlimitedTier, nextUpgradeTier } from '@/lib/tiers'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import type { LicenseInfo } from '@/lib/types'

interface UsageData {
  measurements: { used: number; limit: number | null }
  aiChats: { used: number; limit: number | null }
  tier: string
}

function progressColor(ratio: number): string {
  if (ratio >= 0.8) return 'bg-red-500'
  if (ratio >= 0.6) return 'bg-yellow-500'
  return 'bg-green-500'
}

function statusLabel(
  ratio: number,
  t: (key: string) => string,
): string | null {
  if (ratio >= 1) return t('limitReached')
  if (ratio >= 0.8) return t('approachingLimit')
  return null
}

function ProgressRow({
  label,
  used,
  limit,
  t,
}: {
  label: string
  used: number
  limit: number | null
  t: (key: string) => string
}) {
  if (limit === null) return null
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0
  const color = progressColor(ratio)
  const status = statusLabel(ratio, t)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used} {t('of')} {limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {status && (
        <p className={`text-xs ${ratio >= 1 ? 'text-red-400' : 'text-yellow-400'}`}>
          {status}
        </p>
      )}
    </div>
  )
}

export function UsageWidget() {
  const { user } = useAuth()
  const t = useTranslations('usage')
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Skip for unlimited tiers
    if (isUnlimitedTier(user.tier)) {
      setLoading(false)
      return
    }

    api.license
      .get()
      .then((res) => {
        if (!res.data) return
        const info: LicenseInfo = res.data

        // Sum up all chat quotas
        const chatUsed = info.chat_quota.reduce((sum, q) => sum + q.used, 0)
        const chatLimit = info.chat_quota.reduce(
          (sum, q) => sum + (q.limit ?? 0),
          0,
        )

        const limits = info.limits as Record<string, unknown>
        const measurementLimit =
          typeof limits?.max_measurements_monthly === 'number'
            ? limits.max_measurements_monthly
            : typeof limits?.max_markers === 'number'
              ? limits.max_markers
              : null
        const measurementsUsed =
          typeof limits?.measurements_used === 'number'
            ? limits.measurements_used
            : 0

        setData({
          measurements: {
            used: measurementsUsed as number,
            limit: measurementLimit as number | null,
          },
          aiChats: {
            used: chatUsed,
            limit: chatLimit > 0 ? chatLimit : null,
          },
          tier: info.tier.slug,
        })
      })
      .catch(() => {
        // silently fail — widget is non-critical
      })
      .finally(() => setLoading(false))
  }, [user])

  // Don't render for unlimited tiers
  if (!user || isUnlimitedTier(user.tier)) return null
  if (loading) return null
  if (!data) return null

  const hasLimits =
    data.measurements.limit !== null || data.aiChats.limit !== null
  if (!hasLimits) return null

  const measurementRatio =
    data.measurements.limit && data.measurements.limit > 0
      ? data.measurements.used / data.measurements.limit
      : 0
  const upgrade = nextUpgradeTier(data.tier)

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
      <h3 className="text-sm font-semibold">{t('title')}</h3>

      <ProgressRow
        label={t('measurements')}
        used={data.measurements.used}
        limit={data.measurements.limit}
        t={t}
      />

      <ProgressRow
        label={t('aiChats')}
        used={data.aiChats.used}
        limit={data.aiChats.limit}
        t={t}
      />

      {measurementRatio >= 1 && upgrade && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-2">
          <p className="text-xs text-red-300">
            {t('measurementCapReached', {
              used: data.measurements.used,
              limit: data.measurements.limit ?? 0,
              tier: upgrade.name,
            })}
          </p>
          <Link
            href="/settings?tab=license"
            className="inline-block text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md transition-colors"
          >
            {t('upgradeNow')}
          </Link>
        </div>
      )}
    </div>
  )
}
