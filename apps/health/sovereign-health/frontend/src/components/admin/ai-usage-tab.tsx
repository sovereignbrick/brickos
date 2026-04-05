'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import type { AiUsageResponse } from '@/lib/types'

type Period = 'day' | 'week' | 'month' | 'year'

function formatEur(n: number): string {
  return `\u20AC${n.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function navigateDate(date: string, period: Period, direction: -1 | 1): string {
  const d = new Date(date + 'T00:00:00')
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + direction)
      break
    case 'week':
      d.setDate(d.getDate() + direction * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + direction)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + direction)
      break
  }
  return d.toISOString().slice(0, 10)
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (start === end) return s.toLocaleDateString('en-US', opts)
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function AiUsageTab() {
  const t = useTranslations('admin')
  const [data, setData] = useState<AiUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sortBy, setSortBy] = useState<'cost_eur' | 'calls'>('cost_eur')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.aiUsage(period, date)
      setData(res.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI usage data')
    } finally {
      setLoading(false)
    }
  }, [period, date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periods: Period[] = ['day', 'week', 'month', 'year']

  const sortedUsers = data?.by_user
    ? [...data.by_user].sort((a, b) => b[sortBy] - a[sortBy])
    : []

  const avgCostPerUser = sortedUsers.length > 0
    ? sortedUsers.reduce((sum, u) => sum + u.cost_eur, 0) / sortedUsers.length
    : 0
  const highUsageThreshold = avgCostPerUser * 2

  return (
    <div className="space-y-6">
      {/* Period selector + navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDate(navigateDate(date, period, -1))}
            className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            title={t('previousPeriod')}
          >
            &larr;
          </button>
          <span className="text-sm text-foreground min-w-[200px] text-center">
            {data ? formatDateRange(data.date_range.start, data.date_range.end) : date}
          </span>
          <button
            onClick={() => setDate(navigateDate(date, period, 1))}
            className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            title={t('nextPeriod')}
          >
            &rarr;
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : error ? (
        <div className="px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
          Error: {error}
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-sm">No data available</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Cost"
              value={formatEur(data.total_cost_eur)}
            />
            <StatCard
              label="Total Calls"
              value={formatNumber(data.total_calls)}
            />
            <StatCard
              label="Avg Cost/User"
              value={formatEur(avgCostPerUser)}
              sub={`${sortedUsers.length} active users`}
            />
            <StatCard
              label="Total Tokens"
              value={formatTokens(data.total_input_tokens + data.total_output_tokens)}
              sub={`In: ${formatTokens(data.total_input_tokens)} / Out: ${formatTokens(data.total_output_tokens)}`}
            />
          </div>

          {/* By User table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium">By User</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy('cost_eur')}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    sortBy === 'cost_eur' ? 'bg-blue-600 text-white' : 'bg-accent text-muted-foreground'
                  }`}
                >
                  Sort: Cost
                </button>
                <button
                  onClick={() => setSortBy('calls')}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    sortBy === 'calls' ? 'bg-blue-600 text-white' : 'bg-accent text-muted-foreground'
                  }`}
                >
                  Sort: Calls
                </button>
              </div>
            </div>

            {sortedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                No usage in this period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground text-xs">
                      <th className="py-2 px-4">User</th>
                      <th className="py-2 px-4">Tier</th>
                      <th className="py-2 px-4 text-right">Calls</th>
                      <th className="py-2 px-4 text-right">Tokens (In/Out)</th>
                      <th className="py-2 px-4 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => {
                      const isHighUsage = highUsageThreshold > 0 && u.cost_eur > highUsageThreshold
                      return (
                      <tr key={u.user_id || i} className={`border-b border-border/50 hover:bg-accent ${isHighUsage ? 'bg-red-950/20' : ''}`}>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-xs font-mono">{u.email}</p>
                              {u.display_name && (
                                <p className="text-xs text-muted-foreground">{u.display_name}</p>
                              )}
                            </div>
                            {isHighUsage && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-800" title={`Cost > 2x average (${formatEur(avgCostPerUser)})`}>
                                HIGH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <span className="text-xs capitalize bg-accent px-1.5 py-0.5 rounded">
                            {u.tier}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right text-xs">
                          {formatNumber(u.calls)}
                        </td>
                        <td className="py-2 px-4 text-right text-xs text-muted-foreground">
                          {formatTokens(u.input_tokens)} / {formatTokens(u.output_tokens)}
                        </td>
                        <td className="py-2 px-4 text-right text-xs font-medium">
                          {formatEur(u.cost_eur)}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* By Model table */}
          {data.by_model.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-medium">By Model</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground text-xs">
                      <th className="py-2 px-4">Model</th>
                      <th className="py-2 px-4 text-right">Calls</th>
                      <th className="py-2 px-4 text-right">Tokens (In/Out)</th>
                      <th className="py-2 px-4 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_model.map(m => (
                      <tr key={m.model} className="border-b border-border/50">
                        <td className="py-2 px-4 text-xs font-mono">{m.model}</td>
                        <td className="py-2 px-4 text-right text-xs">{formatNumber(m.calls)}</td>
                        <td className="py-2 px-4 text-right text-xs text-muted-foreground">
                          {formatTokens(m.input_tokens)} / {formatTokens(m.output_tokens)}
                        </td>
                        <td className="py-2 px-4 text-right text-xs font-medium">{formatEur(m.cost_eur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Type table */}
          {data.by_type.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-medium">By Session Type</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground text-xs">
                      <th className="py-2 px-4">Type</th>
                      <th className="py-2 px-4 text-right">Calls</th>
                      <th className="py-2 px-4 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_type.map(t => (
                      <tr key={t.session_type} className="border-b border-border/50">
                        <td className="py-2 px-4 text-xs capitalize">{t.session_type.replace(/_/g, ' ')}</td>
                        <td className="py-2 px-4 text-right text-xs">{formatNumber(t.calls)}</td>
                        <td className="py-2 px-4 text-right text-xs font-medium">{formatEur(t.cost_eur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
