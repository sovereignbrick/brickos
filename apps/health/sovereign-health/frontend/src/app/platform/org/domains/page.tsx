'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'

interface DomainData {
  subdomain: string
  custom_domains: {
    id: string
    domain: string
    ssl_status: string
    verified_at: string | null
    created_at: string
  }[]
}

export default function OrgDomainsPage() {
  const [data, setData] = useState<DomainData | null>(null)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/domains', {
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
      <h2 className="text-lg font-semibold">Domains</h2>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Subdomain</h3>
        <p className="text-sm font-mono bg-muted/30 px-3 py-2 rounded inline-block">
          {data.subdomain}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Your default subdomain. Always available and secured by Cloudflare SSL.
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Custom Domains</h3>
        {data.custom_domains.length > 0 ? (
          <div className="space-y-2">
            {data.custom_domains.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-muted/20 rounded px-3 py-2">
                <span className="text-sm font-mono">{d.domain}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  d.ssl_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  SSL: {d.ssl_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No custom domains configured. Contact support to add a custom domain.
          </p>
        )}
      </div>
    </div>
  )
}
