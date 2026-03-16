export const TIERS = {
  core:    { name: 'Core',    price: 0,     doctorChat: 0,    unlimited: false },
  glimpse: { name: 'Glimpse', price: 0,     doctorChat: 1,    unlimited: false, trialDays: 30 },
  focus:   { name: 'Focus',   price: 9.99,  doctorChat: 5,    unlimited: false },
  insight: { name: 'Insight', price: 24.99, doctorChat: 15,   unlimited: false },
  clarity: { name: 'Clarity', price: 49.99, doctorChat: null, unlimited: true },
  horizon: { name: 'Horizon', price: null,  doctorChat: null, unlimited: true },
} as const

export type TierSlug = keyof typeof TIERS

export const UNLIMITED_TIERS: TierSlug[] = ['clarity', 'horizon', 'core']

export function isUnlimitedTier(tier: string): boolean {
  return UNLIMITED_TIERS.includes(tier as TierSlug)
}

export function tierDisplayName(tier: string): string {
  const t = TIERS[tier as TierSlug]
  return t?.name ?? tier
}

export function tierPriceLabel(tier: string): string {
  const t = TIERS[tier as TierSlug]
  if (!t) return tier
  if (t.price === null) return 'Custom'
  if (t.price === 0) return 'Free'
  return `€${t.price}/mo`
}

export function nextUpgradeTier(currentTier: string): { slug: string; name: string; price: string } | null {
  const order: TierSlug[] = ['glimpse', 'focus', 'insight', 'clarity', 'horizon']
  const idx = order.indexOf(currentTier as TierSlug)
  if (idx < 0 || idx >= order.length - 1) return null
  const next = order[idx + 1]
  const t = TIERS[next]
  return {
    slug: next,
    name: t.name,
    price: tierPriceLabel(next),
  }
}
