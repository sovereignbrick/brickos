'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { SuggestResponse } from '@/lib/api'
import { Search, X, Clock, ArrowRight } from 'lucide-react'

const RECENT_KEY = 'sh_recent_searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  const trimmed = query.trim()
  if (!trimmed) return
  try {
    const existing = getRecentSearches()
    const filtered = existing.filter(s => s !== trimmed)
    filtered.unshift(trimmed)
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
  } catch {
    // localStorage may be unavailable
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    // noop
  }
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const t = useTranslations('search')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestResponse['suggestions']>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches when opened
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery('')
      setSuggestions([])
      // Focus input after animation
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  // Escape key closes
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const res = await api.search.suggest({ q: q.trim() })
      setSuggestions(res.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const navigateToSearch = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    addRecentSearch(trimmed)
    onClose()
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigateToSearch(query)
  }

  const handleSuggestionClick = (suggestion: { text: string; url: string }) => {
    addRecentSearch(suggestion.text)
    onClose()
    router.push(suggestion.url)
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative w-full max-w-2xl mx-auto mt-[10vh] sm:mt-[15vh] px-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              placeholder={t('placeholder')}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </form>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Suggestions */}
            {query.trim() && suggestions.length > 0 && (
              <div className="py-2">
                <p className="px-4 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  {t('suggestTitle')}
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{s.text}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {loading && query.trim() && suggestions.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
              </div>
            )}

            {/* Recent searches */}
            {!query.trim() && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 py-1">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    {t('recentSearches')}
                  </p>
                  <button
                    onClick={handleClearRecent}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('clearRecent')}
                  </button>
                </div>
                {recentSearches.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => navigateToSearch(q)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{q}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state when no query and no recent */}
            {!query.trim() && recentSearches.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
