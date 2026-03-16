/**
 * Locale-aware number and date formatting.
 * Uses the app locale (cookie-based) rather than country code.
 */

import { type Locale } from './config'

const localeMap: Record<Locale, string> = {
  en: 'en-US',
  de: 'de-DE',
}

/** Format a number with locale-appropriate decimal/thousand separators. */
export function formatNumber(value: number, locale: Locale, decimals = 2): string {
  return new Intl.NumberFormat(localeMap[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Format a date using locale conventions. */
export function formatLocalizedDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(localeMap[locale], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Format date and time using locale conventions. */
export function formatLocalizedDateTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(localeMap[locale], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Format a relative time (e.g. "2 days ago", "vor 2 Tagen"). */
export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: 'auto' })

  if (diffMinutes < 1) return rtf.format(0, 'minute')
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute')
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  if (diffDays < 30) return rtf.format(-diffDays, 'day')
  if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), 'month')
  return rtf.format(-Math.floor(diffDays / 365), 'year')
}
