'use client'

import { APP_CONFIG } from '@/lib/config'
import { useTranslations } from 'next-intl'

interface QuotaBadgeProps {
  remaining: number
  limit: number
  resetsAt?: string
  tier?: string
}

const UNLIMITED_TIERS = ['clarity', 'horizon', 'core']

const UPGRADE_SUGGESTIONS: Record<string, { tier: string; price: string }> = {
  glimpse: { tier: 'Focus', price: '€9.99/mo' },
  focus: { tier: 'Insight', price: '€24.99/mo' },
  insight: { tier: 'Clarity', price: '€49.99/mo' },
}

export function QuotaBadge({ remaining, limit, resetsAt, tier }: QuotaBadgeProps) {
  const t = useTranslations('doctorChat')

  if (tier && UNLIMITED_TIERS.includes(tier)) {
    return (
      <span className="text-xs text-white/40">
        {t('unlimited')}
      </span>
    )
  }

  const colorClass =
    remaining === 0
      ? 'text-red-400'
      : remaining === 1
        ? 'text-orange-400'
        : 'text-white/60'

  const suggestion = tier ? UPGRADE_SUGGESTIONS[tier] : null

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${colorClass}`}>
        {t('questionsRemaining', { remaining: String(remaining), limit: String(limit) })}
        {resetsAt && remaining === 0 && (
          <span className="ml-1 text-white/40">
            · {t('resets', { date: new Date(resetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
          </span>
        )}
      </span>
      {remaining === 0 && (
        <a
          href={`${APP_CONFIG.websiteUrl}/pricing`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-colors"
        >
          {suggestion
            ? t('upgradeTo', { tier: suggestion.tier, price: suggestion.price })
            : t('upgradeButton')}
        </a>
      )}
    </div>
  )
}
