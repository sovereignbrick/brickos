'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { toast } from '@/lib/toast'

interface OrgGeneral {
  name: string
  slug: string
  org_type: string
  billing_email: string | null
  app_name: string
}

export default function OrgGeneralPage() {
  const [data, setData] = useState<OrgGeneral | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/general', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setData(j.data))
      .catch(() => {})
  }, [])

  async function save() {
    if (!data) return
    setSaving(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.name,
          billing_email: data.billing_email,
          app_name: data.app_name,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-32 bg-muted rounded" /></div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">General</h2>

      <div className="space-y-4 max-w-lg">
        <div>
          <label className="text-sm font-medium block mb-1">Organization Name</label>
          <input
            type="text"
            value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">App Display Name</label>
          <input
            type="text"
            value={data.app_name}
            onChange={e => setData({ ...data, app_name: e.target.value })}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Shown to users instead of default app name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Displayed in the navbar and login page for your organization
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Billing Email</label>
          <input
            type="email"
            value={data.billing_email || ''}
            onChange={e => setData({ ...data, billing_email: e.target.value })}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Subdomain</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{data.slug}.brickos.io</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Contact support to change your subdomain</p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
