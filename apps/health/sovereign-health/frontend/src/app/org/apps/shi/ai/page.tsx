'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { toast } from '@/lib/toast'

interface AiConfig {
  ai_model_override: string | null
  system_default: string
}

export default function ShiAiPage() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [override, setOverride] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/apps/shi/ai', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => {
        setConfig(j.data)
        setOverride(j.data?.ai_model_override || '')
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/apps/shi/ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ai_model_override: override || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('AI configuration saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!config) {
    return <div className="animate-pulse h-32 bg-muted rounded" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">SHI -- AI Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Override the AI model used by Dr. Alex for your organization.
        </p>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="border rounded-lg p-4 bg-muted/20">
          <p className="text-sm">
            <span className="text-muted-foreground">System default:</span>{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {config.system_default}
            </code>
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Model Override</label>
          <input
            type="text"
            value={override}
            onChange={e => setOverride(e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Leave empty to use system default"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Anthropic model ID (e.g. claude-sonnet-4-20250514, claude-opus-4-20250514).
            Leave empty to use the platform default.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save AI Config'}
        </button>
      </div>
    </div>
  )
}
