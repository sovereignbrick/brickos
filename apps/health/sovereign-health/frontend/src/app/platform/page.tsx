'use client'

import { useState, useEffect } from 'react'
import { useAdminContext } from './admin-context'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'

interface DashboardData {
  total_users: number
  verified_users: number
  active_7d: number
  active_30d: number
  signups_7d: number
  total_measurements: number
  early_access_count: number
  tier_distribution: Array<{ tier: string; count: number }>
}

type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'none'

interface Service {
  name: string
  prod: ServiceStatus
  staging: ServiceStatus
  version: string
  latency: string
}

export default function PlatformDashboardPage() {
  const ctx = useAdminContext()
  const t = useTranslations('platform')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.dashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Static service list -- will be dynamic when health aggregator is built (#0349)
  const services: Service[] = [
    { name: 'SHI API', prod: 'healthy', staging: 'healthy', version: 'v0.38.1', latency: '12ms' },
    { name: 'SHI Frontend', prod: 'healthy', staging: 'healthy', version: 'v0.28.0', latency: '8ms' },
    { name: 'SHI Website', prod: 'healthy', staging: 'healthy', version: 'v1.2.0', latency: '45ms' },
    { name: 'Sovereign Link', prod: 'healthy', staging: 'healthy', version: 'v0.3.0', latency: '3ms' },
    { name: 'Sovereign Voice', prod: 'healthy', staging: 'none', version: 'v1.0.0', latency: '--' },
    { name: 'PostgreSQL', prod: 'healthy', staging: 'healthy', version: 'PG 16', latency: 'ok' },
    { name: 'Redis', prod: 'healthy', staging: 'healthy', version: '7.4', latency: 'ok' },
    { name: 'Gatus', prod: 'healthy', staging: 'none', version: '--', latency: 'ok' },
    { name: 'ntfy', prod: 'healthy', staging: 'none', version: '--', latency: 'ok' },
  ]

  if (loading) return <div className="text-zinc-400 animate-pulse">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {ctx.orgName ? `${ctx.orgName} - ${t('dashboard')}` : t('dashboard')}
      </h1>

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={data.total_users} />
          <StatCard label="Verified" value={data.verified_users} />
          <StatCard label="Active (7d)" value={data.active_7d} />
          <StatCard label="Active (30d)" value={data.active_30d} />
          <StatCard label="Signups (7d)" value={data.signups_7d} />
          <StatCard label="Measurements" value={data.total_measurements} />
          <StatCard label="Early Access" value={data.early_access_count} />
          <StatCard label="Orgs" value={18} />
        </div>
      )}

      {/* Tier Distribution */}
      {data?.tier_distribution && data.tier_distribution.length > 0 && (() => {
        const total = data.tier_distribution.reduce((s, t) => s + t.count, 0) || 1
        return (
          <div className="rounded-2xl border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Tier Distribution</h2>
            <div className="space-y-2">
              {data.tier_distribution.map(td => {
                const pct = (td.count / total) * 100
                return (
                  <div key={td.tier} className="flex items-center gap-3">
                    <span className="text-sm w-20 capitalize">{td.tier}</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-400 w-24 text-right">{td.count} ({pct.toFixed(1)}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Service Health Matrix */}
      {ctx.isPlatform && (
        <div className="rounded-2xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Service Health</h2>
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
                {services.map(s => (
                  <tr key={s.name} className="border-t border-zinc-800">
                    <td className="py-2.5 px-3">{s.name}</td>
                    <td className="py-2.5 px-3 text-center"><StatusDot status={s.prod} /></td>
                    <td className="py-2.5 px-3 text-center">
                      {s.staging === 'none' ? <span className="text-zinc-600">--</span> : <StatusDot status={s.staging} />}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">{s.version}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">{s.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Translation status will be added when API returns it */}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    healthy: 'bg-green-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
    unknown: 'bg-zinc-500',
    none: 'bg-zinc-700',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`} />
}
