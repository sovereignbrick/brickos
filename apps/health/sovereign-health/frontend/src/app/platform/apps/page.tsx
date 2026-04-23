'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

interface AppInfo {
  name: string
  slug: string
  pillar: string
  description: string
  status: 'live' | 'planned' | 'development'
  version?: string
  links?: { label: string; href: string }[]
  metrics?: { label: string; value: string }[]
}

const APPS: AppInfo[] = [
  {
    name: 'Sovereign Health Intelligence',
    slug: 'shi',
    pillar: 'Health',
    description: 'Privacy-first biomarker tracking, lab import, AI health analysis',
    status: 'live',
    links: [
      { label: 'Production', href: 'https://app.sovereignhealth.io' },
      { label: 'Staging', href: 'https://demo.sovereignhealth.io' },
      { label: 'Website', href: 'https://sovereignhealth.io' },
    ],
  },
  {
    name: 'Sovereign Link',
    slug: 'sovereign-link',
    pillar: 'Technology',
    description: 'URL shortener, QR codes, click analytics, affiliate tracking',
    status: 'live',
    // Sprint 051 #0594 follow-up: "Redirects" used to point at a hard-
    // coded brickos.io/r/shDEMO2026 short-link demo. For org owners on
    // staging this bounced through prod and landed on the SHI login
    // wall. Replace with the in-app Sovereign Link landing.
    links: [
      { label: 'Manage links', href: '/sovereign-link' },
      { label: 'Analytics', href: '/sovereign-link/analytics' },
    ],
  },
  {
    name: 'Sovereign Voice',
    slug: 'sovereign-voice',
    pillar: 'Attention',
    description: 'NOSTR content scheduler, URL shortening, social media automation',
    status: 'live',
    links: [
      { label: 'Schedule', href: '/platform/services' },
    ],
  },
  {
    name: 'Sovereign Identity',
    slug: 'sovereign-identity',
    pillar: 'Technology',
    description: 'NOSTR-based identity, WebAuthn/FIDO2, self-sovereign credentials',
    status: 'planned',
  },
  {
    name: 'NOSTR Relay',
    slug: 'nostr-relay',
    pillar: 'Technology',
    description: 'Platform relay for all BrickOS apps, NIP-89 discovery',
    status: 'planned',
  },
  {
    name: 'Sovereign Exchange',
    slug: 'sovereign-exchange',
    pillar: 'Finance',
    description: 'P2P Bitcoin marketplace, Lightning payments',
    status: 'planned',
  },
  {
    name: 'BTC Tracker',
    slug: 'btc-tracker',
    pillar: 'Finance',
    description: 'Bitcoin portfolio tracking, on-chain analytics',
    status: 'planned',
  },
  {
    name: 'Sovereign Almanac',
    slug: 'sovereign-almanac',
    pillar: 'Energy',
    description: 'Knowledge management, self-sufficiency resources',
    status: 'planned',
  },
  {
    name: 'Sovereign Signal',
    slug: 'sovereign-signal',
    pillar: 'Attention',
    description: 'Decentralized messaging, encrypted communications',
    status: 'planned',
  },
]

const PILLAR_ORDER = ['Health', 'Technology', 'Attention', 'Finance', 'Energy', 'Data', 'Governance']
const PILLAR_ICONS: Record<string, string> = {
  Health: '+', Technology: '#', Attention: '@', Finance: '$', Energy: '~', Data: '=', Governance: '*',
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  live: { bg: 'bg-green-400/10', text: 'text-green-400', label: 'Live' },
  development: { bg: 'bg-amber-400/10', text: 'text-amber-400', label: 'In Dev' },
  planned: { bg: 'bg-zinc-700', text: 'text-zinc-400', label: 'Planned' },
}

export default function AppsPage() {
  const [apiVersion, setApiVersion] = useState<string>('')

  useEffect(() => {
    fetch('/api/v1/health').catch(() => null) // try local
    api.admin.dashboard()
      .then(res => {
        // Use dashboard data to enrich app metrics
        const data = res.data
        APPS[0].metrics = [
          { label: 'Users', value: String(data.total_users) },
          { label: 'Measurements', value: String(data.total_measurements) },
        ]
      })
      .catch(() => {})

    fetch('https://api.brickos.io/health')
      .then(r => r.json())
      .then(d => setApiVersion(d.version || ''))
      .catch(() => {})
  }, [])

  // Group by pillar
  const grouped = new Map<string, AppInfo[]>()
  for (const pillar of PILLAR_ORDER) {
    const apps = APPS.filter(a => a.pillar === pillar)
    if (apps.length > 0) grouped.set(pillar, apps)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apps</h1>
        {apiVersion && <span className="text-xs text-zinc-500">API v{apiVersion}</span>}
      </div>

      {[...grouped.entries()].map(([pillar, apps]) => (
        <div key={pillar}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            {PILLAR_ICONS[pillar] || ''} {pillar} Pillar
          </h2>
          <div className="space-y-2">
            {apps.map(app => {
              const badge = STATUS_BADGE[app.status]
              return (
                <div key={app.slug} className="rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{app.name}</h3>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">{app.description}</p>
                      {app.metrics && (
                        <div className="flex gap-4 mt-2">
                          {app.metrics.map(m => (
                            <span key={m.label} className="text-xs text-zinc-500">
                              {m.label}: <span className="text-zinc-300 font-medium">{m.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {app.links && (
                      <div className="flex gap-2 shrink-0">
                        {app.links.map(l => (
                          <a
                            key={l.label}
                            href={l.href}
                            target={l.href.startsWith('http') ? '_blank' : undefined}
                            rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {l.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
