'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'

interface ServiceHealth {
  name: string
  environment: string
  status: string
  version: string | null
  latency_ms: number | null
  checked_at: string
}

interface HealthDashboard {
  services: ServiceHealth[]
  checked_at: string
}

export default function ServicesPage() {
  const t = useTranslations('platform')
  const [data, setData] = useState<HealthDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [env, setEnv] = useState<'all' | 'production' | 'staging'>('all')

  useEffect(() => {
    api.admin.services()
      .then(res => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      api.admin.services().then(res => setData(res)).catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-zinc-400 animate-pulse">Loading services...</div>

  const filtered = data?.services.filter(s =>
    env === 'all' || s.environment === env
  ) ?? []

  // Group by service name
  const grouped = new Map<string, { prod?: ServiceHealth; staging?: ServiceHealth }>()
  for (const s of (data?.services ?? [])) {
    const existing = grouped.get(s.name) || {}
    if (s.environment === 'production') existing.prod = s
    else if (s.environment === 'staging') existing.staging = s
    grouped.set(s.name, existing)
  }

  const statusColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-400'
    if (status === 'degraded') return 'bg-amber-400'
    if (status === 'down') return 'bg-red-400'
    return 'bg-zinc-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.services')}</h1>
        <div className="flex gap-1">
          {(['all', 'production', 'staging'] as const).map(e => (
            <button
              key={e}
              onClick={() => setEnv(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                env === e ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs text-zinc-500">
          Last checked: {new Date(data.checked_at).toLocaleTimeString()} (auto-refresh 60s)
        </p>
      )}

      {/* Uptime bars */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Service Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2 px-3">Service</th>
                <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-center py-2 px-3">Prod</th>
                <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-center py-2 px-3">Staging</th>
                <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2 px-3">Version</th>
                <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2 px-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {[...grouped.entries()].map(([name, { prod, staging }]) => (
                <tr key={name} className="border-t border-zinc-800">
                  <td className="py-2.5 px-3 font-medium">{name}</td>
                  <td className="py-2.5 px-3 text-center">
                    {prod ? <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor(prod.status)}`} /> : <span className="text-zinc-600">--</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {staging ? <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor(staging.status)}`} /> : <span className="text-zinc-600">--</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">{prod?.version || staging?.version || '--'}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">{prod?.latency_ms != null ? `${prod.latency_ms}ms` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual service cards */}
      {env !== 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <div key={`${s.name}-${s.environment}`} className="rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{s.name}</span>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor(s.status)}`} />
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>Status: <span className={s.status === 'healthy' ? 'text-green-400' : s.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}>{s.status}</span></p>
                {s.version && <p>Version: {s.version}</p>}
                {s.latency_ms != null && <p>Latency: {s.latency_ms}ms</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
