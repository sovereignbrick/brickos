'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'

interface Analytics {
  members: number
  active_7d: number
  measurements_total: number
  measurements_7d: number
  ai_chats_30d: number
}

export default function OrgAnalyticsPage() {
  const [stats, setStats] = useState<Analytics | null>(null)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/analytics', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setStats(j.data))
      .catch(() => {})
  }, [])

  if (!stats) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-32" /><div className="h-48 bg-muted rounded" /></div>
  }

  const cards = [
    { label: 'Total Members', value: stats.members },
    { label: 'Active Members (7d)', value: stats.active_7d },
    { label: 'Total Measurements', value: stats.measurements_total },
    { label: 'New Measurements (7d)', value: stats.measurements_7d },
    { label: 'AI Conversations (30d)', value: stats.ai_chats_30d },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Analytics</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => (
          <div key={c.label} className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Detailed analytics with charts and export coming soon.
        </p>
      </div>
    </div>
  )
}
