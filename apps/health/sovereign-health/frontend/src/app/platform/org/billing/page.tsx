'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'

interface BillingData {
  tier_name: string | null
  tier_slug: string | null
  members: number
}

export default function OrgBillingPage() {
  const [data, setData] = useState<BillingData | null>(null)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/billing', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setData(j.data))
      .catch(() => {})
  }, [])

  if (!data) {
    return <div className="animate-pulse h-32 bg-muted rounded" />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Billing</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Current Plan</p>
          <p className="text-xl font-bold mt-1">{data.tier_name || 'No plan'}</p>
          {data.tier_slug && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{data.tier_slug}</span>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Seats Used</p>
          <p className="text-xl font-bold mt-1">{data.members}</p>
          <p className="text-xs text-muted-foreground mt-1">Active members in your organization</p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          For billing changes, plan upgrades, or invoices, contact{' '}
          <a href="mailto:billing@brickos.io" className="text-blue-400 hover:underline">
            billing@brickos.io
          </a>
        </p>
      </div>
    </div>
  )
}
