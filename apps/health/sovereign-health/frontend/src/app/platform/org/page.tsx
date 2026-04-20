'use client'

import { useEffect, useState } from 'react'
import { useOrg } from '@/lib/org-context'
import Link from 'next/link'
import Cookies from 'js-cookie'

interface OrgAnalytics {
  members: number
  active_7d: number
  measurements_total: number
  measurements_7d: number
  ai_chats_30d: number
}

export default function OrgOverview() {
  const org = useOrg()
  const [stats, setStats] = useState<OrgAnalytics | null>(null)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/analytics', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setStats(j.data))
      .catch(() => {})
  }, [])

  if (!org.isOrg) {
    return (
      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Organization settings are only available when accessing via an org subdomain.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Members', value: stats?.members ?? '--', href: '/platform/members' },
          { label: 'Active (7d)', value: stats?.active_7d ?? '--', href: '/platform/org/analytics' },
          { label: 'Measurements', value: stats?.measurements_total ?? '--', href: '/platform/org/analytics' },
          { label: 'New (7d)', value: stats?.measurements_7d ?? '--', href: '/platform/org/analytics' },
          { label: 'AI Chats (30d)', value: stats?.ai_chats_30d ?? '--', href: '/platform/org/apps/shi/ai' },
        ].map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/platform/org/branding" className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
          <h3 className="font-medium">Branding</h3>
          <p className="text-sm text-muted-foreground mt-1">Logo, colors, app name</p>
        </Link>
        <Link href="/platform/org/apps" className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
          <h3 className="font-medium">Apps</h3>
          <p className="text-sm text-muted-foreground mt-1">Configure Sovereign Health, Sovereign Link, and more</p>
        </Link>
      </div>
    </div>
  )
}
