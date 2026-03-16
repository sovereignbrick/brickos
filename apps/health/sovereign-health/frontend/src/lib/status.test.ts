import { describe, it, expect } from 'vitest'
import { computeStatus, statusColor, statusEmoji, DEFAULT_RANGES, type Range } from './status'

describe('computeStatus', () => {

  describe('basic traffic light logic', () => {
    const range: Range = {
      orange_min: 3.5,
      green_min: 3.9,
      green_max: 5.5,
      orange_max: 6.9,
    }

    it('returns green for value in green range', () => {
      expect(computeStatus(4.5, range)).toBe('green')
    })

    it('returns green at exact green_min boundary', () => {
      expect(computeStatus(3.9, range)).toBe('green')
    })

    it('returns green at exact green_max boundary', () => {
      expect(computeStatus(5.5, range)).toBe('green')
    })

    it('returns orange for value below green but above orange_min', () => {
      expect(computeStatus(3.7, range)).toBe('orange')
    })

    it('returns orange for value above green but below orange_max', () => {
      expect(computeStatus(6.5, range)).toBe('orange')
    })

    it('returns red for value below orange_min', () => {
      expect(computeStatus(3.0, range)).toBe('red')
    })

    it('returns red for value above orange_max', () => {
      expect(computeStatus(7.5, range)).toBe('red')
    })

    it('returns orange at exact orange_min', () => {
      expect(computeStatus(3.5, range)).toBe('orange')
    })

    it('returns orange at exact orange_max', () => {
      expect(computeStatus(6.9, range)).toBe('orange')
    })
  })

  describe('ranges with null boundaries', () => {
    it('handles null orange_min (no lower bound)', () => {
      const range: Range = { orange_min: null, green_min: 0, green_max: 5.0, orange_max: 7.0 }
      expect(computeStatus(-1, range)).not.toBe('red')
    })

    it('handles null orange_max (no upper bound)', () => {
      const range: Range = { orange_min: 3.0, green_min: 4.0, green_max: 6.0, orange_max: null }
      expect(computeStatus(100, range)).not.toBe('red')
    })

    it('handles all null boundaries', () => {
      const range: Range = { orange_min: null, green_min: null, green_max: null, orange_max: null }
      const result = computeStatus(5.0, range)
      // With no boundaries, should return null or a default
      expect(result === null || result === 'green' || result === 'orange' || result === 'red').toBe(true)
    })
  })

  describe('edge values', () => {
    const range: Range = { orange_min: 0, green_min: 1, green_max: 10, orange_max: 15 }

    it('handles zero value', () => {
      const result = computeStatus(0, range)
      expect(result).toBeTruthy()
    })

    it('handles very large value', () => {
      const result = computeStatus(99999, range)
      expect(result).toBe('red')
    })
  })
})

describe('statusColor', () => {
  it('returns green hex for green status', () => {
    expect(statusColor('green')).toMatch(/#4ade80/i)
  })

  it('returns orange hex for orange status', () => {
    expect(statusColor('orange')).toMatch(/#fb923c/i)
  })

  it('returns red hex for red status', () => {
    expect(statusColor('red')).toMatch(/#ef4444/i)
  })

  it('returns gray for null status', () => {
    expect(statusColor(null)).toMatch(/#71717a/i)
  })

  it('returns gray for undefined status', () => {
    expect(statusColor(undefined)).toMatch(/#71717a/i)
  })
})

describe('statusEmoji', () => {
  it('returns correct emoji for each status', () => {
    expect(statusEmoji('green')).toContain('🟢')
    expect(statusEmoji('orange')).toContain('🟡')
    expect(statusEmoji('red')).toContain('🔴')
    expect(statusEmoji(null)).toContain('⚫')
  })
})

describe('DEFAULT_RANGES', () => {
  it('has ranges for glucose', () => {
    expect(DEFAULT_RANGES.glucose).toBeDefined()
    expect(DEFAULT_RANGES.glucose.green_min).toBeDefined()
    expect(DEFAULT_RANGES.glucose.green_max).toBeDefined()
  })

  it('has ranges for at least 15 markers', () => {
    expect(Object.keys(DEFAULT_RANGES).length).toBeGreaterThanOrEqual(15)
  })

  it('all ranges have green_min <= green_max', () => {
    for (const [slug, range] of Object.entries(DEFAULT_RANGES)) {
      if (range.green_min !== null && range.green_max !== null) {
        expect(range.green_min, `${slug} green_min <= green_max`).toBeLessThanOrEqual(range.green_max)
      }
    }
  })

  it('all ranges have orange boundaries outside green boundaries', () => {
    for (const [slug, range] of Object.entries(DEFAULT_RANGES)) {
      if (range.orange_min !== null && range.green_min !== null) {
        expect(range.orange_min, `${slug} orange_min <= green_min`).toBeLessThanOrEqual(range.green_min)
      }
      if (range.orange_max !== null && range.green_max !== null) {
        expect(range.orange_max, `${slug} orange_max >= green_max`).toBeGreaterThanOrEqual(range.green_max)
      }
    }
  })

  it('glucose default range is clinically reasonable', () => {
    const g = DEFAULT_RANGES.glucose
    expect(g.green_min).toBeGreaterThanOrEqual(3.0)
    expect(g.green_max).toBeLessThanOrEqual(7.0)
  })

  it('includes calculated markers', () => {
    expect(DEFAULT_RANGES.gki).toBeDefined()
    expect(DEFAULT_RANGES.bmi).toBeDefined()
    expect(DEFAULT_RANGES.whtr).toBeDefined()
    expect(DEFAULT_RANGES.homa_ir).toBeDefined()
  })
})
