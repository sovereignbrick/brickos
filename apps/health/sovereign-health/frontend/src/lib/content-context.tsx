'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from './api'
import { APP_CONFIG } from './config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoneContent {
  id: string
  zone_slug: string
  zone_icon: string
  zone_color: string
  name: string
  description: string | null
  short_description: string | null
}

export interface MarkerContent {
  marker_slug: string
  name: string
  description: string | null
  tooltip: string | null
  unit: string
  zone_slug: string | null
}

export interface TierContent {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  price_monthly_eur: number | null
  price_annual_eur: number | null
}

export interface DietProtocolContent {
  slug: string
  name: string
  category_label: string | null
  short_description: string | null
}

export interface EatingPatternContent {
  slug: string
  name: string
  description: string | null
}

interface ContentContextType {
  locale: string
  setLocale: (locale: string) => void
  loading: boolean
  /** Get a UI string by key, with fallback to the key itself */
  t: (key: string) => string
  zones: Record<string, ZoneContent>
  markers: Record<string, MarkerContent>
  tiers: Record<string, TierContent>
  dietProtocols: Record<string, DietProtocolContent>
  eatingPatterns: Record<string, EatingPatternContent>
  /** Force refetch all content */
  refresh: () => void
}

const ContentContext = createContext<ContentContextType>({
  locale: 'en',
  setLocale: () => {},
  loading: true,
  t: (key) => key,
  zones: {},
  markers: {},
  tiers: {},
  dietProtocols: {},
  eatingPatterns: {},
  refresh: () => {},
})

export function useContent() {
  return useContext(ContentContext)
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const CACHE_KEY = 'sh_content_cache'
const CACHE_TTL = APP_CONFIG.contentCacheTtlMs

interface CachedContent {
  locale: string
  timestamp: number
  uiStrings: Record<string, string>
  zones: Record<string, ZoneContent>
  markers: Record<string, MarkerContent>
  tiers: Record<string, TierContent>
  dietProtocols: Record<string, DietProtocolContent>
  eatingPatterns: Record<string, EatingPatternContent>
}

function loadCache(locale: string): CachedContent | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedContent = JSON.parse(raw)
    if (cached.locale !== locale) return null
    if (Date.now() - cached.timestamp > CACHE_TTL) return null
    return cached
  } catch {
    return null
  }
}

function saveCache(content: CachedContent) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content))
  } catch {
    // localStorage might be full or disabled
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function getInitialLocale(): string {
  if (typeof window === 'undefined') return 'en'
  // Check URL param first (from website redirect, e.g. ?lang=de)
  const params = new URLSearchParams(window.location.search)
  const urlLang = params.get('lang')
  if (urlLang && ['en', 'de'].includes(urlLang)) {
    // Persist to cookie so it sticks across navigation
    document.cookie = `locale=${urlLang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
    return urlLang
  }
  // Check cookie (set by settings page or previous URL param)
  const match = document.cookie.match(/locale=([^;]+)/)
  if (match?.[1]) return match[1]
  // Browser language
  const nav = navigator.language?.slice(0, 2)
  if (nav === 'de') return 'de'
  return 'en'
}

export function ContentProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  const [locale, setLocaleState] = useState(initialLocale || getInitialLocale)
  const [loading, setLoading] = useState(true)
  const [uiStrings, setUiStrings] = useState<Record<string, string>>({})
  const [zones, setZones] = useState<Record<string, ZoneContent>>({})
  const [markers, setMarkers] = useState<Record<string, MarkerContent>>({})
  const [tiers, setTiers] = useState<Record<string, TierContent>>({})
  const [dietProtocols, setDietProtocols] = useState<Record<string, DietProtocolContent>>({})
  const [eatingPatterns, setEatingPatterns] = useState<Record<string, EatingPatternContent>>({})

  const fetchContent = useCallback(async (loc: string) => {
    // Try cache first
    const cached = loadCache(loc)
    if (cached) {
      setUiStrings(cached.uiStrings)
      setZones(cached.zones)
      setMarkers(cached.markers)
      setTiers(cached.tiers)
      setDietProtocols(cached.dietProtocols)
      setEatingPatterns(cached.eatingPatterns)
      setLoading(false)
      return
    }

    try {
      const [uiRes, zonesRes, markersRes, tiersRes, dpRes, epRes] = await Promise.all([
        api.content.uiStrings(loc).catch(() => ({ data: [] })),
        api.content.zones(loc).catch(() => ({ data: [] })),
        api.content.markers(loc).catch(() => ({ data: [] })),
        api.content.tiers(loc).catch(() => ({ data: [] })),
        api.content.dietProtocols(loc).catch(() => ({ data: [] })),
        api.content.eatingPatterns(loc).catch(() => ({ data: [] })),
      ])

      const uiMap: Record<string, string> = {}
      for (const s of uiRes.data) uiMap[s.key] = s.value

      const zoneMap: Record<string, ZoneContent> = {}
      for (const z of zonesRes.data) zoneMap[z.zone_slug] = { id: z.id, zone_slug: z.zone_slug, zone_icon: z.zone_icon, zone_color: z.zone_color, name: z.name, description: z.description, short_description: z.short_description }

      const markerMap: Record<string, MarkerContent> = {}
      for (const m of markersRes.data) markerMap[m.marker_slug] = { marker_slug: m.marker_slug, name: m.name, description: m.description, tooltip: m.tooltip, unit: m.unit_canonical, zone_slug: m.zone_slug }

      const tierMap: Record<string, TierContent> = {}
      for (const t of tiersRes.data) tierMap[t.slug] = { slug: t.slug, name: t.name, tagline: t.tagline, description: t.description, price_monthly_eur: t.price_monthly_eur, price_annual_eur: t.price_annual_eur }

      const dpMap: Record<string, DietProtocolContent> = {}
      for (const dp of dpRes.data) dpMap[dp.slug] = { slug: dp.slug, name: dp.name, category_label: dp.category_label, short_description: dp.short_description }

      const epMap: Record<string, EatingPatternContent> = {}
      for (const ep of epRes.data) epMap[ep.slug] = { slug: ep.slug, name: ep.name, description: ep.description }

      setUiStrings(uiMap)
      setZones(zoneMap)
      setMarkers(markerMap)
      setTiers(tierMap)
      setDietProtocols(dpMap)
      setEatingPatterns(epMap)

      saveCache({
        locale: loc,
        timestamp: Date.now(),
        uiStrings: uiMap,
        zones: zoneMap,
        markers: markerMap,
        tiers: tierMap,
        dietProtocols: dpMap,
        eatingPatterns: epMap,
      })
    } catch {
      // API failed  - try to use stale cache
      const stale = loadCache(loc)
      if (stale) {
        setUiStrings(stale.uiStrings)
        setZones(stale.zones)
        setMarkers(stale.markers)
        setTiers(stale.tiers)
        setDietProtocols(stale.dietProtocols)
        setEatingPatterns(stale.eatingPatterns)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContent(locale)
  }, [locale, fetchContent])

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale)
    // Update cookie for server-side i18n
    document.cookie = `locale=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
    // Clear cache to force refetch
    localStorage.removeItem(CACHE_KEY)
  }, [])

  const t = useCallback((key: string): string => {
    return uiStrings[key] ?? key
  }, [uiStrings])

  const refresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
    fetchContent(locale)
  }, [locale, fetchContent])

  return (
    <ContentContext.Provider value={{ locale, setLocale, loading, t, zones, markers, tiers, dietProtocols, eatingPatterns, refresh }}>
      {children}
    </ContentContext.Provider>
  )
}
