'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { toast } from '@/lib/toast'

interface EmailConfig {
  email_welcome_subject: string | null
  email_welcome_body: string | null
  email_verification_subject: string | null
  email_reset_subject: string | null
  email_footer_text: string | null
}

export default function ShiEmailPage() {
  const [config, setConfig] = useState<EmailConfig>({
    email_welcome_subject: null,
    email_welcome_body: null,
    email_verification_subject: null,
    email_reset_subject: null,
    email_footer_text: null,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/apps/shi/email', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => setConfig(j.data || config))
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/apps/shi/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Email settings saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof EmailConfig, value: string) =>
    setConfig(prev => ({ ...prev, [key]: value || null }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">SHI -- Email Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the email messages sent to your organization's members.
          Leave empty to use the default text.
        </p>
      </div>

      <div className="space-y-4 max-w-lg">
        <div>
          <label className="text-sm font-medium block mb-1">Welcome Email Subject</label>
          <input
            type="text"
            value={config.email_welcome_subject || ''}
            onChange={e => update('email_welcome_subject', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Welcome to {{org_name}}"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Welcome Email Body</label>
          <textarea
            value={config.email_welcome_body || ''}
            onChange={e => update('email_welcome_body', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm min-h-[100px]"
            placeholder="Thank you for joining our health platform..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{{org_name}}'}, {'{{user_name}}'}, {'{{org_website}}'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Verification Email Subject</label>
          <input
            type="text"
            value={config.email_verification_subject || ''}
            onChange={e => update('email_verification_subject', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Verify your email address"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Password Reset Subject</label>
          <input
            type="text"
            value={config.email_reset_subject || ''}
            onChange={e => update('email_reset_subject', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Reset your password"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Email Footer Text</label>
          <input
            type="text"
            value={config.email_footer_text || ''}
            onChange={e => update('email_footer_text', e.target.value)}
            className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
            placeholder="Your Clinic Name -- your-clinic.com"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </div>
    </div>
  )
}
