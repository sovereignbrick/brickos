'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/navbar'
import { api } from '@/lib/api'
import type { SearchResponse, SearchResult } from '@/lib/api'
import { Search, ExternalLink, Loader2, AlertTriangle, MessageCircle } from 'lucide-react'

const TABS = [
  { key: 'all', filter: '', labelKey: 'tabAll' },
  { key: 'marker', filter: 'marker', labelKey: 'tabMarkers' },
  { key: 'food', filter: 'food', labelKey: 'tabFood' },
  { key: 'supplement', filter: 'supplement', labelKey: 'tabSupplements' },
  { key: 'zone', filter: 'zone', labelKey: 'tabZones' },
  { key: 'chat', filter: 'chat', labelKey: 'tabChat' },
  { key: 'more', filter: 'more', labelKey: 'tabMore' },
] as const

const BADGE_COLORS: Record<string, string> = {
  marker: 'bg-blue-500',
  food: 'bg-emerald-500',
  supplement: 'bg-purple-500',
  zone: 'bg-teal-500',
  chat: 'bg-amber-500',
  reference: 'bg-zinc-400',
  content: 'bg-indigo-500',
  web_content: 'bg-slate-500',
  calculated_marker: 'bg-blue-400',
}

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
}

function StatusDot({ status }: { status: string | null }) {
  if (!status) return null
  const color = STATUS_COLORS[status] || 'bg-zinc-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

function ResultCard({ result, t }: { result: SearchResult; t: ReturnType<typeof useTranslations<'search'>> }) {
  const router = useRouter()
  const isExternal = !!result.external_url
  const href = result.url_path || result.external_url || '#'

  const handleClick = () => {
    if (isExternal && result.external_url) {
      window.open(result.external_url, '_blank', 'noopener')
    } else if (result.url_path) {
      router.push(result.url_path)
    }
  }

  const borderColor = result.entity_type === 'marker' || result.entity_type === 'calculated_marker'
    ? 'border-l-blue-500'
    : result.entity_type === 'food'
    ? 'border-l-emerald-500'
    : result.entity_type === 'zone'
    ? 'border-l-teal-500'
    : 'border-l-transparent'

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left bg-card border border-border rounded-xl p-4 border-l-4 ${borderColor} hover:bg-accent/50 transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${BADGE_COLORS[result.entity_type] || 'bg-zinc-500'}`}>
              {result.entity_type.replace('_', ' ')}
            </span>
            {result.user_context && (
              <>
                <StatusDot status={result.user_context.status} />
                {result.user_context.is_stale && (
                  <span className="text-[10px] text-amber-400">{t('staleData')}</span>
                )}
              </>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">{result.title}</h3>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{result.subtitle}</p>
          )}
          {result.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {result.snippet.length > 200 ? result.snippet.slice(0, 200) + '...' : result.snippet}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          {isExternal ? (
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('opensWebsite')}</span>
            </span>
          ) : (
            <span className="text-blue-400">{result.entity_type === 'marker' || result.entity_type === 'calculated_marker' ? t('viewMarker') : t('viewDetails')}</span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('search')
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('')
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string, typeFilter: string) => {
    if (!q.trim()) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.search.query({
        q: q.trim(),
        type_filter: typeFilter || undefined,
      })
      setData(res)
    } catch {
      setError('search_error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial search from URL params
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(value, activeTab)
      // Update URL without navigation
      const url = value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search'
      window.history.replaceState(null, '', url)
    }, 300)
  }

  const handleTabChange = (filter: string) => {
    setActiveTab(filter)
    if (query.trim()) {
      doSearch(query, filter)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    doSearch(query, activeTab)
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              placeholder={t('placeholder')}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              autoFocus
            />
          </div>
        </form>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-none -mx-4 px-4">
          {TABS.map(tab => {
            const count = data?.facets?.[tab.filter] ?? (tab.filter === '' ? data?.total : undefined)
            const isActive = activeTab === tab.filter
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.filter)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(tab.labelKey)}
                {count !== undefined && count > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Blind spots */}
            {data.blind_spots.map((spot, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{spot.message}</p>
                  <a
                    href={spot.action_url}
                    className="text-xs text-amber-400 hover:text-amber-300 mt-1 inline-block"
                  >
                    {t('viewDetails')} &rarr;
                  </a>
                </div>
              </div>
            ))}

            {/* Result count */}
            {data.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('results', { count: data.total })}
              </p>
            )}

            {/* Result cards */}
            {data.results.map(result => (
              <ResultCard key={`${result.entity_type}-${result.entity_id}`} result={result} t={t} />
            ))}

            {/* Empty state */}
            {data.results.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground mb-1">
                  {t('noResultsFor', { query })}
                </p>
                <p className="text-xs text-muted-foreground mb-4">{t('trySuggestion')}</p>
                <a
                  href="/doctor-chat"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('askDrAlex')}
                </a>
              </div>
            )}

            {/* Dr. Alex CTA */}
            {data.dr_alex_cta && (
              <div className="bg-card border border-border rounded-xl p-4 mt-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{data.dr_alex_cta.prompt}</p>
                    <a
                      href={data.dr_alex_cta.url}
                      className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-2"
                    >
                      {t('startConsultation')} &rarr;
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Login CTA */}
            {data.login_cta && (
              <div className="bg-card border border-border rounded-xl p-4 mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">{data.login_cta.message}</p>
                <a
                  href={data.login_cta.url}
                  className="inline-flex text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('loginCta')}
                </a>
              </div>
            )}
          </div>
        )}

        {/* No query yet */}
        {!loading && !error && !data && !query.trim() && (
          <div className="text-center py-12">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
          </div>
        )}
      </main>
    </>
  )
}
