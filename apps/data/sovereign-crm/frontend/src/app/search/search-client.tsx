'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'

interface SearchResult {
  id: string
  entity_type: string
  title: string
  subtitle: string | null
  snippet: string | null
  url_path: string
}

interface GroupedResults {
  [entity_type: string]: SearchResult[]
}

const BADGE_COLORS: Record<string, string> = {
  contact: 'bg-blue-600',
  company: 'bg-emerald-600',
  project: 'bg-purple-600',
  meeting: 'bg-amber-600',
  capture: 'bg-rose-600',
  pipeline: 'bg-cyan-600',
}

export default function SearchClient() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams?.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    const token = Cookies.get('auth_token')
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setResults(Array.isArray(json.data) ? json.data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQuery) fetchResults(initialQuery)
  }, [initialQuery, fetchResults])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchResults(query)
    // Update URL without full navigation
    window.history.replaceState(null, '', `/search?q=${encodeURIComponent(query)}`)
  }

  // Group results by entity_type
  const grouped: GroupedResults = results.reduce((acc, r) => {
    if (!acc[r.entity_type]) acc[r.entity_type] = []
    acc[r.entity_type].push(r)
    return acc
  }, {} as GroupedResults)

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contacts, companies, projects..."
            autoFocus
            className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Searching...</div>
        ) : results.length === 0 && query.trim() ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No results found</p>
            <p className="mt-1 text-sm">Try a different search term.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {Object.entries(grouped).map(([entityType, items]) => (
              <section key={entityType}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {entityType}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(result => (
                    <Link
                      key={result.id}
                      href={result.url_path}
                      className="block rounded-lg border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground mt-0.5">{result.subtitle}</p>
                          )}
                          {result.snippet && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${BADGE_COLORS[entityType] || 'bg-zinc-600'}`}>
                          {entityType}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
