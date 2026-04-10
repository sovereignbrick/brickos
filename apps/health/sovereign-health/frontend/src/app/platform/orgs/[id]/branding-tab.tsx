'use client'

// Sprint 040 #480 -- Branding tab for the platform admin Org detail page.
//
// Edits the org's `branding` JSONB column (logo, primary/accent colors,
// footer text, role label overrides) and manages custom domain mappings.
// Per design 022 §3.2 the role labels override the canonical role names
// shown across the org -- the org-detail page itself reads them via the
// getRoleLabel() helper, so a save here is reflected immediately on the
// Members tab.

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface DomainRow {
  id: string
  domain: string
  ssl_status: 'pending' | 'active' | 'failed'
  verified_at: string | null
  created_at: string
}

interface BrandingShape {
  logo_base64?: string
  logo_url?: string
  primary_color?: string
  accent_color?: string
  footer_text?: string
  role_labels?: { org_owner?: string; practitioner?: string; member?: string }
}

const MAX_LOGO_BYTES = 200 * 1024

export interface BrandingTabProps {
  orgId: string
  orgName: string
  initialBranding: Record<string, unknown>
  onChanged: () => void
}

const SSL_COLORS: Record<string, string> = {
  pending: 'text-amber-400',
  active: 'text-green-400',
  failed: 'text-red-400',
}

export function BrandingTab({ orgId, orgName, initialBranding, onChanged }: BrandingTabProps) {
  const t = useTranslations('platform.orgDetail.brandingTab')
  const initial = initialBranding as BrandingShape
  const [logoBase64, setLogoBase64] = useState(initial.logo_base64 ?? '')
  const [primary, setPrimary] = useState(initial.primary_color ?? '#f97316')
  const [accent, setAccent] = useState(initial.accent_color ?? '#3b82f6')
  const [footer, setFooter] = useState(initial.footer_text ?? '')
  const [ownerLabel, setOwnerLabel] = useState(initial.role_labels?.org_owner ?? '')
  const [practitionerLabel, setPractitionerLabel] = useState(initial.role_labels?.practitioner ?? '')
  const [memberLabel, setMemberLabel] = useState(initial.role_labels?.member ?? '')
  const [saving, setSaving] = useState(false)

  // Custom domains state
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)

  const fetchDomains = async () => {
    try {
      const res = await api.admin.listOrgDomains(orgId)
      setDomains(res.data)
    } catch {
      setDomains([])
    }
  }

  useEffect(() => {
    fetchDomains()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleLogoUpload = (file: File) => {
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t('logoTooBig'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setLogoBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const handleClearLogo = () => {
    setLogoBase64('')
    toast.success(t('logoCleared'))
  }

  const handleSave = async () => {
    setSaving(true)
    const branding: BrandingShape = {
      ...(logoBase64 && { logo_base64: logoBase64 }),
      primary_color: primary,
      accent_color: accent,
      ...(footer && { footer_text: footer }),
      role_labels: {
        ...(ownerLabel && { org_owner: ownerLabel }),
        ...(practitionerLabel && { practitioner: practitionerLabel }),
        ...(memberLabel && { member: memberLabel }),
      },
    }
    // Drop empty role_labels object if all keys are empty
    if (!ownerLabel && !practitionerLabel && !memberLabel) {
      delete branding.role_labels
    }
    try {
      await api.admin.updateOrgBranding(orgId, branding as unknown as Record<string, unknown>)
      toast.success(t('saved'))
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    setAddingDomain(true)
    try {
      await api.admin.addOrgDomain(orgId, newDomain.trim())
      toast.success(t('domainAdded'))
      setNewDomain('')
      await fetchDomains()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setAddingDomain(false)
    }
  }

  const handleRemoveDomain = async (id: string) => {
    if (!confirm(t('removeConfirm'))) return
    try {
      await api.admin.deleteOrgDomain(orgId, id)
      toast.success(t('domainRemoved'))
      await fetchDomains()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remove failed')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Logo + Colors card */}
      <div className="rounded-2xl border border-zinc-800 p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t('logo')}
        </h2>
        <div className="space-y-2">
          {logoBase64 && (
            <div className="rounded-lg bg-white p-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoBase64} alt="Logo preview" className="h-12 max-w-[180px] object-contain" />
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleLogoUpload(f)
            }}
            className="text-xs text-zinc-400"
          />
          <p className="text-[10px] text-zinc-500">{t('logoUpload')}</p>
          {logoBase64 && (
            <button
              type="button"
              onClick={handleClearLogo}
              className="text-xs text-red-400 hover:text-red-300"
            >
              ×
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('primaryColor')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-9 w-14 rounded-lg border border-zinc-800 bg-zinc-900"
              />
              <input
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('accentColor')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-14 rounded-lg border border-zinc-800 bg-zinc-900"
              />
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500">{t('footerText')}</label>
          <input
            type="text"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Role labels card */}
      <div className="rounded-2xl border border-zinc-800 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t('roleLabels')}
        </h2>
        <p className="text-xs text-zinc-500">{t('roleLabelsHint')}</p>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('ownerLabel')}</label>
            <input
              type="text"
              value={ownerLabel}
              onChange={(e) => setOwnerLabel(e.target.value)}
              placeholder="org_owner"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('practitionerLabel')}</label>
            <input
              type="text"
              value={practitionerLabel}
              onChange={(e) => setPractitionerLabel(e.target.value)}
              placeholder="practitioner / Doctor / Coach"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('memberLabel')}</label>
            <input
              type="text"
              value={memberLabel}
              onChange={(e) => setMemberLabel(e.target.value)}
              placeholder="member / Patient / Client"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Preview pane */}
      <div className="rounded-2xl border border-zinc-800 p-5 space-y-3 lg:col-span-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t('preview')}
        </h2>
        <div className="rounded-lg p-4 border border-zinc-700" style={{ background: '#0b0b0e' }}>
          <div className="flex items-center gap-3 mb-3">
            {logoBase64 && (
              <div className="rounded bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoBase64} alt="" className="h-7 max-w-[120px] object-contain" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold" style={{ color: primary }}>
                {t('previewWelcome', { orgName })}
              </h3>
              <p className="text-[10px] text-zinc-400">{t('previewSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium px-3 py-1.5 rounded text-white"
            style={{ background: primary }}
          >
            Primary action
          </button>
          <button
            type="button"
            className="ml-2 text-[11px] font-medium px-3 py-1.5 rounded text-white"
            style={{ background: accent }}
          >
            Accent action
          </button>
          {footer && (
            <p className="mt-3 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">{footer}</p>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="lg:col-span-2 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {saving ? '...' : t('save')}
        </button>
      </div>

      {/* Custom domains */}
      <div className="rounded-2xl border border-zinc-800 p-5 space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t('domains')}
          </h2>
        </div>
        <p className="text-xs text-zinc-500">{t('domainsHint')}</p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder={t('addDomainPlaceholder')}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={handleAddDomain}
            disabled={addingDomain || !newDomain.trim()}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 rounded transition-colors disabled:opacity-50"
          >
            {addingDomain ? '...' : t('addDomain')}
          </button>
        </div>

        {domains.length === 0 ? (
          <p className="text-xs text-zinc-600">{t('noDomains')}</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} className="border-b border-zinc-800/40">
                  <td className="py-2 font-mono">{d.domain}</td>
                  <td className={`py-2 ${SSL_COLORS[d.ssl_status]}`}>{d.ssl_status}</td>
                  <td className="py-2 text-zinc-400">{formatDate(d.created_at)}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(d.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t('removeDomain')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
