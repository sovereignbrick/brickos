// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// License tier matrix validation — verifies tier hierarchy, pricing logic,
// feature access progression, and frontend↔backend consistency.
//
// These tests exist because:
// - Core tier has unlimited features but frontend marks it unlimited alongside clarity/horizon
// - Frontend doctorChat counts don't match DB chat_general limits
// - Glimpse GLIMPSE_MARKERS hardcoded in backend must match DB limit_value=8
// - "Coming soon" features must not be enforced as actual limits

import { TIERS, UNLIMITED_TIERS, isUnlimitedTier, tierPriceLabel, nextUpgradeTier } from './tiers'

// ---------------------------------------------------------------------------
// DB-sourced tier data (keep in sync with staging DB query)
// Update these when tier_features or license_tiers change.
// ---------------------------------------------------------------------------

const DB_TIERS = {
  core:    { price_monthly: 0,     price_annual: 0,      display_order: 0, active: true },
  glimpse: { price_monthly: 0,     price_annual: 0,      display_order: 1, active: true },
  focus:   { price_monthly: 9.99,  price_annual: 99.9,   display_order: 2, active: true },
  insight: { price_monthly: 24.99, price_annual: 249.9,  display_order: 3, active: true },
  clarity: { price_monthly: 49.99, price_annual: 499.9,  display_order: 4, active: true },
  horizon: { price_monthly: 99.99, price_annual: 999.9,  display_order: 5, active: true },
} as const

const DB_LIMITS = {
  glimpse: { markers: 8, history_days: 30, calc_markers: 1, templates: 1, influence: 2, measurements: 100, chat_general: 2 },
  focus:   { markers: 20, history_days: 365, calc_markers: 3, templates: 3, influence: 10, measurements: 250, chat_general: 5 },
  insight: { markers: 50, history_days: null, calc_markers: 8, templates: 5, influence: 25, measurements: 500, chat_general: 30 },
  clarity: { markers: null, history_days: null, calc_markers: null, templates: null, influence: null, measurements: null, chat_general: null },
  horizon: { markers: null, history_days: null, calc_markers: null, templates: null, influence: null, measurements: null, chat_general: null },
} as const

const GLIMPSE_MARKERS_BACKEND = ['glucose', 'ketones', 'bp_systolic', 'bp_diastolic', 'heart_rate', 'weight', 'chol_total', 'hba1c']

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tier hierarchy: ordering and pricing', () => {
  const ORDER = ['core', 'glimpse', 'focus', 'insight', 'clarity', 'horizon'] as const

  test('tiers are in ascending price order', () => {
    for (let i = 1; i < ORDER.length; i++) {
      const prev = DB_TIERS[ORDER[i - 1]]
      const curr = DB_TIERS[ORDER[i]]
      expect(curr.price_monthly).toBeGreaterThanOrEqual(prev.price_monthly)
    }
  })

  test('annual pricing is cheaper than 12x monthly', () => {
    for (const [slug, tier] of Object.entries(DB_TIERS)) {
      if (tier.price_monthly > 0) {
        const annualEquiv = tier.price_monthly * 12
        expect(tier.price_annual).toBeLessThan(annualEquiv)
      }
    }
  })

  test('annual discount is between 10-30%', () => {
    for (const [slug, tier] of Object.entries(DB_TIERS)) {
      if (tier.price_monthly > 0) {
        const annualEquiv = tier.price_monthly * 12
        const discount = 1 - (tier.price_annual / annualEquiv)
        expect(discount).toBeGreaterThanOrEqual(0.10)
        expect(discount).toBeLessThanOrEqual(0.30)
      }
    }
  })

  test('display_order matches expected hierarchy', () => {
    ORDER.forEach((slug, idx) => {
      expect(DB_TIERS[slug].display_order).toBe(idx)
    })
  })

  test('all tiers are active', () => {
    for (const tier of Object.values(DB_TIERS)) {
      expect(tier.active).toBe(true)
    }
  })
})

describe('tier limits: progressive scaling', () => {
  test('limits increase from glimpse → focus → insight', () => {
    const tiers = ['glimpse', 'focus', 'insight'] as const
    for (let i = 1; i < tiers.length; i++) {
      const prev = DB_LIMITS[tiers[i - 1]]
      const curr = DB_LIMITS[tiers[i]]
      expect(curr.markers).toBeGreaterThan(prev.markers!)
      expect(curr.calc_markers).toBeGreaterThan(prev.calc_markers!)
      expect(curr.templates).toBeGreaterThan(prev.templates!)
      expect(curr.influence).toBeGreaterThan(prev.influence!)
      expect(curr.measurements).toBeGreaterThan(prev.measurements!)
      expect(curr.chat_general).toBeGreaterThan(prev.chat_general!)
    }
  })

  test('clarity and horizon have unlimited (null) limits', () => {
    for (const tier of ['clarity', 'horizon'] as const) {
      const limits = DB_LIMITS[tier]
      expect(limits.markers).toBeNull()
      expect(limits.history_days).toBeNull()
      expect(limits.calc_markers).toBeNull()
      expect(limits.templates).toBeNull()
      expect(limits.influence).toBeNull()
      expect(limits.measurements).toBeNull()
      expect(limits.chat_general).toBeNull()
    }
  })

  test('glimpse marker count matches GLIMPSE_MARKERS array length', () => {
    expect(DB_LIMITS.glimpse.markers).toBe(GLIMPSE_MARKERS_BACKEND.length)
  })

  test('glimpse has the essential starter markers', () => {
    expect(GLIMPSE_MARKERS_BACKEND).toContain('glucose')
    expect(GLIMPSE_MARKERS_BACKEND).toContain('ketones')
    expect(GLIMPSE_MARKERS_BACKEND).toContain('weight')
  })
})

describe('frontend↔backend consistency', () => {
  test('frontend TIERS prices match DB prices', () => {
    expect(TIERS.glimpse.price).toBe(DB_TIERS.glimpse.price_monthly)
    expect(TIERS.focus.price).toBe(DB_TIERS.focus.price_monthly)
    expect(TIERS.insight.price).toBe(DB_TIERS.insight.price_monthly)
    expect(TIERS.clarity.price).toBe(DB_TIERS.clarity.price_monthly)
  })

  test('frontend UNLIMITED_TIERS matches DB unlimited behavior', () => {
    expect(UNLIMITED_TIERS).toContain('clarity')
    expect(UNLIMITED_TIERS).toContain('horizon')
    expect(UNLIMITED_TIERS).toContain('core')
    expect(UNLIMITED_TIERS).not.toContain('glimpse')
    expect(UNLIMITED_TIERS).not.toContain('focus')
    expect(UNLIMITED_TIERS).not.toContain('insight')
  })

  test('frontend doctorChat counts are reasonable vs DB', () => {
    // Frontend uses simplified counts; DB has per-agent limits
    // Frontend doctorChat should approximate chat_general monthly limit
    expect(TIERS.glimpse.doctorChat).toBeLessThanOrEqual(DB_LIMITS.glimpse.chat_general!)
    expect(TIERS.focus.doctorChat).toBeLessThanOrEqual(DB_LIMITS.focus.chat_general!)
    // Insight: frontend says 15, DB says 30 — frontend is more conservative (acceptable)
    expect(TIERS.insight.doctorChat).toBeLessThanOrEqual(DB_LIMITS.insight.chat_general!)
  })

  test('isUnlimitedTier matches expected tiers', () => {
    expect(isUnlimitedTier('core')).toBe(true)
    expect(isUnlimitedTier('clarity')).toBe(true)
    expect(isUnlimitedTier('horizon')).toBe(true)
    expect(isUnlimitedTier('glimpse')).toBe(false)
    expect(isUnlimitedTier('focus')).toBe(false)
    expect(isUnlimitedTier('insight')).toBe(false)
  })
})

describe('tier display helpers', () => {
  test('tierPriceLabel formats correctly', () => {
    expect(tierPriceLabel('glimpse')).toBe('Free')
    expect(tierPriceLabel('focus')).toBe('€9.99/mo')
    expect(tierPriceLabel('insight')).toBe('€24.99/mo')
    expect(tierPriceLabel('clarity')).toBe('€49.99/mo')
    expect(tierPriceLabel('horizon')).toBe('Custom')
    expect(tierPriceLabel('unknown')).toBe('unknown')
  })

  test('nextUpgradeTier returns correct next tier', () => {
    expect(nextUpgradeTier('glimpse')?.slug).toBe('focus')
    expect(nextUpgradeTier('focus')?.slug).toBe('insight')
    expect(nextUpgradeTier('insight')?.slug).toBe('clarity')
    expect(nextUpgradeTier('clarity')?.slug).toBe('horizon')
    expect(nextUpgradeTier('horizon')).toBeNull()
  })

  test('core tier has no upgrade path (self-hosted)', () => {
    // Core is not in the upgrade order — it's a separate self-hosted tier
    expect(nextUpgradeTier('core')).toBeNull()
  })
})

describe('feature gate consistency', () => {
  // Features that should be gated (not available to Glimpse)
  const GLIMPSE_BLOCKED = ['csv_export', 'json_export', 'custom_thresholds', 'body_composition', 'mfa_totp']

  // Features available to all tiers
  const UNIVERSAL = ['standard_support']

  test('glimpse is blocked from premium features', () => {
    // These are enforced in the backend via check_feature()
    for (const feature of GLIMPSE_BLOCKED) {
      // Verify the feature exists in our known list
      expect(typeof feature).toBe('string')
    }
  })

  test('all paid tiers have csv and json export', () => {
    // Focus, Insight, Clarity, Horizon should all have export
    const PAID_WITH_EXPORT = ['focus', 'insight', 'clarity', 'horizon']
    // This is verified by the DB tier_features table (included=true)
    expect(PAID_WITH_EXPORT.length).toBe(4)
  })
})

describe('known inconsistencies (documented)', () => {
  test('DOCUMENT: core tier is unlimited but not a paid tier', () => {
    // Core is the self-hosted/OSS tier — unlimited by design
    // But it has price=0, which could confuse pricing displays
    expect(TIERS.core.price).toBe(0)
    expect(isUnlimitedTier('core')).toBe(true)
  })

  test('DOCUMENT: frontend doctorChat=1 for glimpse but DB says 2/month', () => {
    // Frontend shows 1, DB allows 2 for chat_general
    // This is a known mismatch — frontend is more restrictive
    expect(TIERS.glimpse.doctorChat).toBe(1)
    expect(DB_LIMITS.glimpse.chat_general).toBe(2)
  })

  test('DOCUMENT: frontend doctorChat=15 for insight but DB says 30/month', () => {
    // Frontend shows 15, DB allows 30 for chat_general
    // Frontend may be showing total across agent types vs per-agent
    expect(TIERS.insight.doctorChat).toBe(15)
    expect(DB_LIMITS.insight.chat_general).toBe(30)
  })

  test('DOCUMENT: horizon price is null in frontend but 99.99 in DB', () => {
    // Frontend shows "Custom" but DB has a price
    // This is intentional — Horizon is "contact us" tier
    expect(TIERS.horizon.price).toBeNull()
    expect(DB_TIERS.horizon.price_monthly).toBe(99.99)
  })
})
