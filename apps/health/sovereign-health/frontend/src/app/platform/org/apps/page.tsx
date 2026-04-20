'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import Link from 'next/link'

interface AppInfo {
  key: string
  name: string
  enabled: boolean
  has_data: boolean
  settings_path: string
}

export default function OrgAppsPage() {
  const [apps, setApps] = useState<AppInfo[]>([])

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/apps', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setApps(j.data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Apps</h2>
      <p className="text-sm text-muted-foreground">
        Configure each BrickOS app enabled for your organization.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map(app => (
          <div key={app.key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{app.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                app.enabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
              }`}>
                {app.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            {app.enabled ? (
              <div className="space-y-2 mt-3">
                {app.key === 'shi' && (
                  <>
                    <Link href="/platform/org/apps/shi/email" className="block text-sm text-blue-400 hover:underline">
                      Email Templates
                    </Link>
                    <Link href="/platform/org/apps/shi/ai" className="block text-sm text-blue-400 hover:underline">
                      AI Configuration
                    </Link>
                  </>
                )}
                {app.key === 'link' && (
                  <p className="text-xs text-muted-foreground">Settings coming soon</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Contact support to enable this app for your organization.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
