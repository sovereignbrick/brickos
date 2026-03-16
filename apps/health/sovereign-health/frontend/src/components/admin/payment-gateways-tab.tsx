'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

interface Gateway {
  id: string
  enabled: boolean
  is_active_fiat: boolean
  is_active_btc: boolean
  config_valid: boolean
  last_success: string | null
  last_failure: string | null
  failure_count: number
}

const GATEWAY_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  strike: 'Strike (Bitcoin)',
  boltz: 'Boltz',
  btcpay: 'BTCPay Server',
}

export function PaymentGatewaysTab() {
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  const fetchGateways = async () => {
    try {
      const res = await api.admin.paymentGateways()
      setGateways(res.data.gateways)
    } catch {
      toast.error('Failed to load gateways')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGateways() }, [])

  const handleActivate = async (id: string, role: 'fiat' | 'btc') => {
    try {
      const res = await api.admin.activateGateway(id, role)
      toast.success(res.data.message)
      fetchGateways()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      const res = await api.admin.toggleGateway(id)
      toast.success(`${id}: ${res.data.enabled ? 'Enabled' : 'Disabled'}`)
      fetchGateways()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle')
    }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      const res = await api.admin.testGateway(id)
      if (res.data.success) {
        toast.success(`${id}: Connected (${res.data.latency_ms}ms)`)
      } else {
        toast.error(`${id}: ${res.data.error || 'Connection failed'}`)
      }
      fetchGateways()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(null)
    }
  }

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Fiat Payments (EUR)</p>
          <p className="text-lg font-semibold mt-1">
            {gateways.find(g => g.is_active_fiat)?.id || 'None'}
          </p>
        </div>
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Bitcoin Payments</p>
          <p className="text-lg font-semibold mt-1">
            {gateways.find(g => g.is_active_btc)?.id || 'None'}
          </p>
        </div>
      </div>

      {/* Gateway cards */}
      {gateways.map(gw => (
        <div
          key={gw.id}
          className={`border rounded-lg p-5 space-y-3 ${
            gw.enabled ? 'border-white/10' : 'border-white/5 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-block w-2 h-2 rounded-full ${
                gw.config_valid && gw.enabled ? 'bg-green-400' : gw.enabled ? 'bg-yellow-400' : 'bg-zinc-600'
              }`} />
              <span className="font-semibold text-sm">
                {GATEWAY_LABELS[gw.id] || gw.id}
              </span>
              {gw.config_valid && gw.enabled && (
                <span className="text-xs text-green-400">Connected</span>
              )}
              {!gw.config_valid && gw.enabled && (
                <span className="text-xs text-yellow-400">Not verified</span>
              )}
              {!gw.enabled && (
                <span className="text-xs text-zinc-500">Disabled</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTest(gw.id)}
                disabled={testing === gw.id || !gw.enabled}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors"
              >
                {testing === gw.id ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => handleToggle(gw.id)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  gw.enabled
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-green-400 hover:text-green-300'
                }`}
              >
                {gw.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-white/40">Fiat: </span>
              {gw.is_active_fiat ? (
                <span className="text-green-400">Active</span>
              ) : gw.enabled ? (
                <button
                  onClick={() => handleActivate(gw.id, 'fiat')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Activate
                </button>
              ) : (
                <span className="text-zinc-600">-</span>
              )}
            </div>
            <div>
              <span className="text-white/40">BTC: </span>
              {gw.is_active_btc ? (
                <span className="text-green-400">Active</span>
              ) : gw.enabled ? (
                <button
                  onClick={() => handleActivate(gw.id, 'btc')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Activate
                </button>
              ) : (
                <span className="text-zinc-600">-</span>
              )}
            </div>
            <div>
              <span className="text-white/40">Failures: </span>
              <span className={gw.failure_count > 0 ? 'text-red-400' : 'text-white/60'}>
                {gw.failure_count}
              </span>
            </div>
          </div>

          {(gw.last_success || gw.last_failure) && (
            <div className="text-[11px] text-white/30">
              {gw.last_success && (
                <span>Last success: {new Date(gw.last_success).toLocaleString()}</span>
              )}
              {gw.last_success && gw.last_failure && <span> | </span>}
              {gw.last_failure && (
                <span>Last failure: {new Date(gw.last_failure).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      ))}

      {gateways.length === 0 && (
        <p className="text-white/40 text-sm">No payment gateways configured.</p>
      )}
    </div>
  )
}
