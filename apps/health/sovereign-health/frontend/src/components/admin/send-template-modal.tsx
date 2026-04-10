'use client'

// Sprint 040 #476 -- admin manual-send modal for lifecycle email templates.
//
// Lets an admin pick one of the 9 templates from #473/#474, edit the
// substitution variables, preview the values, and dispatch via
// POST /admin/templates/send. Every send is logged to admin_audit_log
// (action = "email.template.sent") server-side.

import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

const TEMPLATE_LABELS: Record<string, string> = {
  payment_failure_day_7: 'Payment failure -- day 7 reminder',
  payment_failure_day_13: 'Payment failure -- day 13 final reminder',
  downgraded_to_glimpse: 'Downgraded to Glimpse',
  org_terminated_for_member: 'Org terminated -- member notice',
  org_terminated_for_staff: 'Org terminated -- staff notice',
  license_renewed: 'License renewed -- receipt',
  license_expiring_soon: 'License expiring soon',
  inactivity_warning: 'Inactivity warning (12 months)',
}

// Per-template variable schema. Each entry is a list of [field, label, default].
const TEMPLATE_FIELDS: Record<string, Array<[string, string, string]>> = {
  payment_failure_day_7: [
    ['display_name', 'Display name', 'there'],
    ['tier_name', 'Tier name', 'Focus'],
    ['grace_days_remaining', 'Grace days remaining', '7'],
  ],
  payment_failure_day_13: [
    ['display_name', 'Display name', 'there'],
    ['tier_name', 'Tier name', 'Focus'],
    ['grace_days_remaining', 'Grace days remaining', '1'],
  ],
  downgraded_to_glimpse: [
    ['display_name', 'Display name', 'there'],
    ['tier_name', 'Tier name (was)', 'Focus'],
  ],
  org_terminated_for_member: [
    ['display_name', 'Display name', 'there'],
    ['org_name', 'Org name', 'Acme Health'],
  ],
  org_terminated_for_staff: [
    ['display_name', 'Display name', 'there'],
    ['org_name', 'Org name', 'Acme Health'],
  ],
  license_renewed: [
    ['display_name', 'Display name', 'there'],
    ['org_name', 'Org name', 'Acme Health'],
    ['renewal_amount', 'Renewal amount', 'EUR 990.00'],
    ['access_until', 'Access until (YYYY-MM-DD)', ''],
  ],
  license_expiring_soon: [
    ['display_name', 'Display name', 'there'],
    ['org_name', 'Org name', 'Acme Health'],
    ['expires_at', 'Expires at (YYYY-MM-DD)', ''],
  ],
  inactivity_warning: [['display_name', 'Display name', 'there']],
}

export interface SendTemplateModalProps {
  defaultRecipient?: string
  defaultDisplayName?: string
  onClose: () => void
}

export function SendTemplateModal({
  defaultRecipient = '',
  defaultDisplayName = '',
  onClose,
}: SendTemplateModalProps) {
  const [templates, setTemplates] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('payment_failure_day_7')
  const [recipient, setRecipient] = useState<string>(defaultRecipient)
  const [locale, setLocale] = useState<'en' | 'de'>('en')
  const [vars, setVars] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.admin
      .listLifecycleTemplates()
      .then((res) => {
        setTemplates(res.data.templates)
        if (res.data.templates.length > 0) setSelected(res.data.templates[0])
      })
      .catch(() => {
        // fallback: use the static label list so the modal still works
        setTemplates(Object.keys(TEMPLATE_LABELS))
      })
  }, [])

  // Reset variable defaults whenever the template changes.
  useEffect(() => {
    const fields = TEMPLATE_FIELDS[selected] ?? []
    const next: Record<string, string> = {}
    for (const [key, , def] of fields) {
      if (key === 'display_name' && defaultDisplayName) {
        next[key] = defaultDisplayName
      } else {
        next[key] = def
      }
    }
    setVars(next)
  }, [selected, defaultDisplayName])

  const handleSend = async () => {
    if (!recipient || !recipient.includes('@')) {
      toast.error('Recipient email is required')
      return
    }
    setSending(true)
    try {
      await api.admin.sendLifecycleTemplate({
        template_name: selected,
        recipient_email: recipient,
        locale,
        vars,
      })
      toast.success(`Sent ${selected} to ${recipient}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const fields = TEMPLATE_FIELDS[selected] ?? []

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-template-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="send-template-modal-title" className="text-sm font-semibold text-foreground">
            Send lifecycle template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Close
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground" htmlFor="template-select">
            Template
          </label>
          <select
            id="template-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border"
          >
            {templates.map((name) => (
              <option key={name} value={name}>
                {TEMPLATE_LABELS[name] ?? name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground" htmlFor="recipient-input">
              Recipient
            </label>
            <input
              id="recipient-input"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground" htmlFor="locale-select">
              Locale
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'de')}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Template variables</div>
            <div className="space-y-2">
              {fields.map(([key, label]) => (
                <div key={key} className="grid grid-cols-3 gap-2 items-center">
                  <label className="text-xs text-muted-foreground col-span-1" htmlFor={`var-${key}`}>
                    {label}
                  </label>
                  <input
                    id={`var-${key}`}
                    type="text"
                    value={vars[key] ?? ''}
                    onChange={(e) => setVars((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="col-span-2 bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-border"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !recipient}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  )
}
