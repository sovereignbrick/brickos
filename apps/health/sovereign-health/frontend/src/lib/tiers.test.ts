import { describe, it, expect } from 'vitest'
import { TIERS, UNLIMITED_TIERS, isUnlimitedTier, tierDisplayName, tierPriceLabel, nextUpgradeTier } from './tiers'

describe('TIERS constant', () => {

  it('has all 6 tier definitions', () => {
    expect(Object.keys(TIERS)).toHaveLength(6)
    expect(TIERS.core).toBeDefined()
    expect(TIERS.glimpse).toBeDefined()
    expect(TIERS.focus).toBeDefined()
    expect(TIERS.insight).toBeDefined()
    expect(TIERS.clarity).toBeDefined()
    expect(TIERS.horizon).toBeDefined()
  })

  it('has correct prices', () => {
    expect(TIERS.glimpse.price).toBe(0)
    expect(TIERS.focus.price).toBe(9.99)
    expect(TIERS.insight.price).toBe(24.99)
    expect(TIERS.clarity.price).toBe(49.99)
  })

  it('has correct doctor chat limits', () => {
    expect(TIERS.glimpse.doctorChat).toBe(1)
    expect(TIERS.focus.doctorChat).toBe(5)
    expect(TIERS.insight.doctorChat).toBe(15)
    expect(TIERS.clarity.doctorChat).toBeNull() // unlimited
    expect(TIERS.horizon.doctorChat).toBeNull() // unlimited
  })

  it('marks correct tiers as unlimited', () => {
    expect(TIERS.clarity.unlimited).toBe(true)
    expect(TIERS.horizon.unlimited).toBe(true)
    expect(TIERS.glimpse.unlimited).toBe(false)
    expect(TIERS.focus.unlimited).toBe(false)
    expect(TIERS.insight.unlimited).toBe(false)
  })

  it('each tier has a name', () => {
    for (const [slug, tier] of Object.entries(TIERS)) {
      expect(tier.name, `${slug} should have name`).toBeTruthy()
    }
  })
})

describe('UNLIMITED_TIERS', () => {

  it('contains clarity, horizon, and core', () => {
    expect(UNLIMITED_TIERS).toContain('clarity')
    expect(UNLIMITED_TIERS).toContain('horizon')
    expect(UNLIMITED_TIERS).toContain('core')
  })

  it('does not contain glimpse, focus, or insight', () => {
    expect(UNLIMITED_TIERS).not.toContain('glimpse')
    expect(UNLIMITED_TIERS).not.toContain('focus')
    expect(UNLIMITED_TIERS).not.toContain('insight')
  })
})

describe('isUnlimitedTier', () => {

  it('returns true for unlimited tiers', () => {
    expect(isUnlimitedTier('clarity')).toBe(true)
    expect(isUnlimitedTier('horizon')).toBe(true)
    expect(isUnlimitedTier('core')).toBe(true)
  })

  it('returns false for limited tiers', () => {
    expect(isUnlimitedTier('glimpse')).toBe(false)
    expect(isUnlimitedTier('focus')).toBe(false)
    expect(isUnlimitedTier('insight')).toBe(false)
  })

  it('returns false for unknown tier', () => {
    expect(isUnlimitedTier('nonexistent')).toBe(false)
  })
})

describe('tierDisplayName', () => {

  it('returns correct display name for each tier', () => {
    expect(tierDisplayName('glimpse')).toBe('Glimpse')
    expect(tierDisplayName('focus')).toBe('Focus')
    expect(tierDisplayName('insight')).toBe('Insight')
    expect(tierDisplayName('clarity')).toBe('Clarity')
    expect(tierDisplayName('horizon')).toBe('Horizon')
    expect(tierDisplayName('core')).toBe('Core')
  })

  it('returns input string for unknown tier', () => {
    expect(tierDisplayName('unknown')).toBe('unknown')
  })
})

describe('tierPriceLabel', () => {

  it('returns Free for glimpse', () => {
    const label = tierPriceLabel('glimpse')
    expect(label).toMatch(/free/i)
  })

  it('returns price for paid tiers', () => {
    expect(tierPriceLabel('focus')).toContain('9.99')
    expect(tierPriceLabel('insight')).toContain('24.99')
    expect(tierPriceLabel('clarity')).toContain('49.99')
  })

  it('returns Custom for horizon', () => {
    const label = tierPriceLabel('horizon')
    expect(label).toMatch(/custom/i)
  })
})

describe('nextUpgradeTier', () => {

  it('suggests Focus after Glimpse', () => {
    const next = nextUpgradeTier('glimpse')
    expect(next).toBeTruthy()
    expect(next!.slug).toBe('focus')
  })

  it('suggests Insight after Focus', () => {
    const next = nextUpgradeTier('focus')
    expect(next).toBeTruthy()
    expect(next!.slug).toBe('insight')
  })

  it('suggests Clarity after Insight', () => {
    const next = nextUpgradeTier('insight')
    expect(next).toBeTruthy()
    expect(next!.slug).toBe('clarity')
  })

  it('returns null for highest tier', () => {
    const next = nextUpgradeTier('horizon')
    expect(next).toBeNull()
  })

  it('returns null for unknown tier', () => {
    const next = nextUpgradeTier('nonexistent')
    expect(next).toBeNull()
  })
})
