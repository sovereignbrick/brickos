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

interface EmailConfigResponse {
  locales?: Record<string, EmailConfig>
  supported_locales?: string[]
  // Legacy flat fields (EN) for backward compat
  email_welcome_subject?: string | null
  email_welcome_body?: string | null
  email_verification_subject?: string | null
  email_reset_subject?: string | null
  email_footer_text?: string | null
}

const EMPTY: EmailConfig = {
  email_welcome_subject: null,
  email_welcome_body: null,
  email_verification_subject: null,
  email_reset_subject: null,
  email_footer_text: null,
}

const LOCALE_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch' }

export default function ShiEmailPage() {
  // Sprint 047 #583: per-locale draft state. Keeping all locales hydrated
  // in memory means switching tabs is instant and unsaved edits persist
  // across tab changes until the user hits Save.
  const [configs, setConfigs] = useState<Record<string, EmailConfig>>({ en: EMPTY })
  const [supportedLocales, setSupportedLocales] = useState<string[]>(['en', 'de'])
  const [activeLocale, setActiveLocale] = useState<string>('en')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch('/org-settings/apps/shi/email', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((j: { data?: EmailConfigResponse }) => {
        const data = j.data
        if (!data) return
        if (data.supported_locales && data.supported_locales.length) {
          setSupportedLocales(data.supported_locales)
        }
        if (data.locales) {
          setConfigs(prev => ({ ...prev, ...data.locales }))
        } else {
          // Legacy response shape -- use flat fields as EN.
          setConfigs({
            en: {
              email_welcome_subject: data.email_welcome_subject ?? null,
              email_welcome_body: data.email_welcome_body ?? null,
              email_verification_subject: data.email_verification_subject ?? null,
              email_reset_subject: data.email_reset_subject ?? null,
              email_footer_text: data.email_footer_text ?? null,
            },
          })
        }
      })
      .catch(() => {})
  }, [])

  const config = configs[activeLocale] ?? EMPTY

  const update = (key: keyof EmailConfig, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [activeLocale]: {
        ...(prev[activeLocale] ?? EMPTY),
        [key]: value || null,
      },
    }))
  }

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
        body: JSON.stringify({ ...config, locale: activeLocale }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(`Email settings saved (${LOCALE_LABELS[activeLocale] ?? activeLocale})`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">SHI -- Email Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the email messages sent to your organization's members.
          Leave empty to use the default text. Each locale is saved
          independently; emails sent to a user fall back to English when
          their locale has no custom copy.
        </p>
      </div>

      {/* Sprint 047 #583: locale tabs. En is the primary; de is optional.
          Tab content is retained in memory so an admin can draft both
          locales before saving. */}
      <div role="tablist" aria-label="Email template locale" className="flex gap-1 border-b border-white/10">
        {supportedLocales.map(loc => {
          const isActive = loc === activeLocale
          return (
            <button
              key={loc}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveLocale(loc)}
              className={[
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                isActive
                  ? 'bg-white/10 text-white border-b-2 border-white -mb-px'
                  : 'text-muted-foreground hover:text-white',
              ].join(' ')}
            >
              {LOCALE_LABELS[loc] ?? loc.toUpperCase()}
            </button>
          )
        })}
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
          {saving ? 'Saving...' : `Save ${LOCALE_LABELS[activeLocale] ?? activeLocale} Templates`}
        </button>
      </div>
    </div>
  )
}
