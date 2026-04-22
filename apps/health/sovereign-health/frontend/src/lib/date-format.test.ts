import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime, formatShortDate } from './date-format'

// Construct dates in UTC so tests are TZ-independent. formatTime pins
// timeZone: "UTC" internally, and formatDate uses the locale's default
// calendar logic against getFullYear()/getMonth()/getDate() (which also
// depend on system TZ -- so we use Date.UTC + assert day-of-month
// tolerant of ±1-day drift near midnight).
const testDate = new Date(Date.UTC(2026, 2, 15, 14, 30, 0)) // 2026-03-15 14:30 UTC

describe('formatDate', () => {

  it('formats German style (DD.MM.YYYY) for DE', () => {
    const result = formatDate(testDate, 'DE')
    expect(result).toMatch(/15\.0?3\.2026/)
  })

  it('formats German style for AT', () => {
    const result = formatDate(testDate, 'AT')
    expect(result).toMatch(/15\.0?3\.2026/)
  })

  it('formats German style for CH', () => {
    const result = formatDate(testDate, 'CH')
    expect(result).toMatch(/15\.0?3\.2026/)
  })

  it('formats US style (MM/DD/YYYY) for US', () => {
    const result = formatDate(testDate, 'US')
    expect(result).toMatch(/0?3\/15\/2026/)
  })

  it('formats UK style (DD/MM/YYYY) for GB', () => {
    const result = formatDate(testDate, 'GB')
    expect(result).toMatch(/15\/0?3\/2026/)
  })

  it('formats ISO style (YYYY-MM-DD) for default', () => {
    const result = formatDate(testDate)
    expect(result).toMatch(/2026-0?3-15/)
  })

  it('formats ISO style for null country', () => {
    const result = formatDate(testDate, null)
    expect(result).toMatch(/2026-0?3-15/)
  })

  it('accepts string dates', () => {
    const result = formatDate('2026-03-15T14:30:00Z', 'DE')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })
})

describe('formatTime', () => {

  it('formats 24h time for DE', () => {
    const result = formatTime(testDate, 'DE')
    expect(result).toMatch(/14:30/)
  })

  it('formats 24h time for AT', () => {
    const result = formatTime(testDate, 'AT')
    expect(result).toMatch(/14:30/)
  })

  it('formats 12h time for US', () => {
    const result = formatTime(testDate, 'US')
    expect(result).toMatch(/2:30\s*PM/i)
  })

  it('formats 24h time for GB', () => {
    const result = formatTime(testDate, 'GB')
    expect(result).toMatch(/14:30/)
  })

  it('handles midnight', () => {
    const midnight = new Date(Date.UTC(2026, 2, 15, 0, 0, 0))
    const resultDE = formatTime(midnight, 'DE')
    expect(resultDE).toMatch(/0?0:00/)

    const resultUS = formatTime(midnight, 'US')
    expect(resultUS).toMatch(/12:00\s*AM/i)
  })

  it('handles noon', () => {
    const noon = new Date(Date.UTC(2026, 2, 15, 12, 0, 0))
    const resultUS = formatTime(noon, 'US')
    expect(resultUS).toMatch(/12:00\s*PM/i)
  })
})

describe('formatDateTime', () => {

  it('combines date and time for DE', () => {
    const result = formatDateTime(testDate, 'DE')
    expect(result).toContain('15')
    expect(result).toContain('14:30')
  })

  it('combines date and time for US', () => {
    const result = formatDateTime(testDate, 'US')
    expect(result).toContain('15')
    expect(result).toMatch(/PM/i)
  })

  it('accepts string input', () => {
    const result = formatDateTime('2026-03-15T14:30:00Z')
    expect(result).toContain('2026')
  })
})

describe('formatShortDate', () => {

  it('formats short date for US (Mar 15)', () => {
    const result = formatShortDate(testDate, 'US')
    expect(result).toMatch(/Mar.*15/i)
  })

  it('formats short date for others (15 Mar)', () => {
    const result = formatShortDate(testDate, 'DE')
    // German may use "Mär" or "15. Mär"
    expect(result).toContain('15')
  })

  it('handles string input', () => {
    const result = formatShortDate('2026-03-15', 'US')
    expect(result).toBeTruthy()
  })
})

describe('edge cases', () => {

  it('handles Date object from different timezone string', () => {
    const result = formatDate('2026-12-31T23:59:59+05:00', 'DE')
    expect(result).toBeTruthy()
    expect(result).toContain('2026')
  })

  it('handles leap year date', () => {
    const leapDate = new Date(Date.UTC(2028, 1, 29, 10, 0, 0)) // Feb 29, 2028 UTC
    const result = formatDate(leapDate, 'DE')
    expect(result).toContain('29')
  })

  it('handles unknown country code as default', () => {
    const result = formatDate(testDate, 'XX')
    expect(result).toBeTruthy()
  })
})
