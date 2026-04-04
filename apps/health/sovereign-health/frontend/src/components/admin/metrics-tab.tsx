'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface MetricsData {
  status: string
  version: string
  timestamp: string
  database: { status: string; latency_ms: number }
  users: { active_5m: number; active_24h: number }
  imports_24h: { total: number; confirmed: number; errors: number }
  ai_api_24h: { total_calls: number; total_tokens: number }
  errors_1h: number
  audit_log_total: number
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

export function MetricsTab() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.healthMetrics()
      setData(res)
      setLastFetched(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (loading && !data) {
    return <div className="text-muted-foreground text-sm p-8 text-center">Loading metrics...</div>
  }

  if (error && !data) {
    return (
      <div className="text-red-400 text-sm p-8 text-center">
        {error}
        <button onClick={fetchMetrics} className="ml-2 text-blue-400 hover:text-blue-300">Retry</button>
      </div>
    )
  }

  if (!data) return null

  const importSuccessRate = data.imports_24h.total > 0
    ? Math.round((data.imports_24h.confirmed / data.imports_24h.total) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot ok={data.status === 'ok'} />
          <span className="text-sm font-medium">
            System {data.status === 'ok' ? 'Healthy' : 'Degraded'}
          </span>
          <span className="text-xs text-muted-foreground">v{data.version}</span>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Infrastructure */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Infrastructure</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Database"
            value={data.database.status === 'ok' ? 'OK' : 'DOWN'}
            sub={`${data.database.latency_ms}ms latency`}
          />
          <MetricCard label="Errors (1h)" value={data.errors_1h} />
          <MetricCard label="Audit Log" value={data.audit_log_total.toLocaleString()} sub="total entries" />
          <MetricCard
            label="API Version"
            value={data.version}
            sub={new Date(data.timestamp).toLocaleTimeString()}
          />
        </div>
      </div>

      {/* Users */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Users</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Active Now (5m)" value={data.users.active_5m} />
          <MetricCard label="Active Today (24h)" value={data.users.active_24h} />
        </div>
      </div>

      {/* Imports */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Imports (24h)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total" value={data.imports_24h.total} />
          <MetricCard label="Confirmed" value={data.imports_24h.confirmed} />
          <MetricCard label="Errors" value={data.imports_24h.errors} />
          <MetricCard label="Success Rate" value={`${importSuccessRate}%`} />
        </div>
      </div>

      {/* AI API */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">AI API (24h)</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="API Calls" value={data.ai_api_24h.total_calls} />
          <MetricCard label="Tokens Used" value={data.ai_api_24h.total_tokens.toLocaleString()} />
        </div>
      </div>
    </div>
  )
}
