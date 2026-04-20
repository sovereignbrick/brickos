'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { toast } from '@/lib/toast'

export default function OrgBrandingPage() {
  const [branding, setBranding] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/branding', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setBranding(j.data || {}))
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ branding }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Branding saved')
    } catch {
      toast.error('Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: string, value: string) => setBranding(prev => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Branding</h2>

      <div className="space-y-4 max-w-lg">
        <div>
          <label className="text-sm font-medium block mb-1">Logo URL</label>
          <input
            type="url"
            value={branding.logo_url || ''}
            onChange={e => update('logo_url', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="https://example.com/logo.png"
          />
          {branding.logo_url && (
            <div className="mt-2 p-3 bg-muted/30 rounded-lg inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={branding.logo_url} alt="Preview" className="h-12 object-contain" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color || '#f97316'}
                onChange={e => update('primary_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={branding.primary_color || '#f97316'}
                onChange={e => update('primary_color', e.target.value)}
                className="flex-1 bg-white/5 border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accent_color || '#0ea5e9'}
                onChange={e => update('accent_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={branding.accent_color || '#0ea5e9'}
                onChange={e => update('accent_color', e.target.value)}
                className="flex-1 bg-white/5 border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Footer Text</label>
          <input
            type="text"
            value={branding.footer_text || ''}
            onChange={e => update('footer_text', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Shown in email footers"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  )
}
