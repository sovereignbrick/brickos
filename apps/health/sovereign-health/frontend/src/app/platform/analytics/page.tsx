'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

const ClickChart = dynamic(() => import('./click-chart').then(m => ({ default: m.ClickChart })), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center text-zinc-400 text-sm animate-pulse">Loading chart...</div>,
})

interface LinkWithStats {
  id: string
  code: string
  target_url: string
  title: string | null
  total_clicks: number
  clicks_7d: number
  clicks_30d: number
}

interface AnalyticsData {
  stats: { total_clicks: number; clicks_7d: number; clicks_30d: number; unique_visitors_7d: number }
  clicks_by_day: Array<{ date: string; clicks: number }>
  top_referrers: Array<{ domain: string; clicks: number }>
}

export default function AnalyticsPage() {
  const t = useTranslations('platform')
  const [links, setLinks] = useState<LinkWithStats[]>([])
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await api.links.list()
      const data = Array.isArray(res) ? res : []
      setLinks(data.sort((a, b) => b.total_clicks - a.total_clicks))
      if (data.length > 0 && !selectedLink) setSelectedLink(data[0].id)
    } catch { setLinks([]) }
    finally { setLoading(false) }
  }, [selectedLink])

  const fetchAnalytics = useCallback(async () => {
    if (!selectedLink) { setAnalytics(null); return }
    try {
      const res = await api.links.analytics(selectedLink, days)
      setAnalytics(res)
    } catch { setAnalytics(null) }
  }, [selectedLink, days])

  useEffect(() => { fetchLinks() }, [fetchLinks])
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) return <div className="text-zinc-400">Loading...</div>

  const totalClicks = links.reduce((s, l) => s + l.total_clicks, 0)
  const total7d = links.reduce((s, l) => s + l.clicks_7d, 0)
  const total30d = links.reduce((s, l) => s + l.clicks_30d, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.analytics')}</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Clicks', value: totalClicks },
          { label: 'Last 7 Days', value: total7d },
          { label: 'Last 30 Days', value: total30d },
          { label: 'Links', value: links.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Link selector + period */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedLink || ''}
          onChange={e => setSelectedLink(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {links.map(l => (
            <option key={l.id} value={l.id}>{l.code} ({l.total_clicks} clicks)</option>
          ))}
        </select>
        <div className="flex gap-1">
          {[7, 30, 90, 365].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {d === 365 ? '1Y' : `${d}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {analytics && analytics.clicks_by_day.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Clicks Over Time</h2>
          <ClickChart data={analytics.clicks_by_day} />
        </div>
      )}

      {/* Top links + referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Links</h2>
          <div className="space-y-2">
            {links.slice(0, 10).map((l, i) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 truncate">{i + 1}. {l.code}</span>
                <span className="font-bold tabular-nums">{l.total_clicks}</span>
              </div>
            ))}
            {links.length === 0 && <p className="text-zinc-500 text-sm">No links yet</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Referrers</h2>
          <div className="space-y-2">
            {analytics?.top_referrers.map((r, i) => (
              <div key={r.domain} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 truncate">{i + 1}. {r.domain}</span>
                <span className="font-bold tabular-nums">{r.clicks}</span>
              </div>
            )) || <p className="text-zinc-500 text-sm">Select a link</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
