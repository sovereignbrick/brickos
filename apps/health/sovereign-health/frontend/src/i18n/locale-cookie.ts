'use client'

import { type Locale, defaultLocale, locales } from './config'

export function getLocaleCookie(): Locale {
  if (typeof document === 'undefined') return defaultLocale
  const match = document.cookie.match(/locale=([^;]+)/)
  const val = match?.[1] as Locale | undefined
  return val && locales.includes(val) ? val : defaultLocale
}

export function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
}
