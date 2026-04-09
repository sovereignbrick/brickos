'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'

interface Suggestion {
  id: string
  entity_type: string
  title: string
  subtitle: string | null
  url_path: string
}

const BADGE_COLORS: Record<string, string> = {
  contact: 'bg-blue-600',
  company: 'bg-emerald-600',
  project: 'bg-purple-600',
  meeting: 'bg-amber-600',
  capture: 'bg-rose-600',
  pipeline: 'bg-cyan-600',
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSuggestions([])
      setSelectedIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return }
    const token = Cookies.get('auth_token')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/v1/search/suggest?q=${encodeURIComponent(q)}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setSuggestions(Array.isArray(json.data) ? json.data : [])
    } catch {
      setSuggestions([])
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => fetchSuggestions(query), 200)
    return () => clearTimeout(timer)
  }, [query, open, fetchSuggestions])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        window.location.href = suggestions[selectedIndex].url_path
        onClose()
      } else if (query.trim()) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`
        onClose()
      }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
      onClick={handleBackdropClick}
    >
      <div ref={overlayRef} className="w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(-1) }}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { window.location.href = s.url_path; onClose() }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-accent' : 'hover:bg-muted/50'
                }`}
              >
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${BADGE_COLORS[s.entity_type] || 'bg-zinc-600'}`}>
                  {s.entity_type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                  {s.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && suggestions.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results found
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>Navigate with arrow keys</span>
          <span>Enter to select</span>
        </div>
      </div>
    </div>
  )
}
