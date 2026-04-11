'use client'

// Sprint 040 #479 -- License tab for the platform admin Org detail page.
//
// The heart of the brickos admin GUI: where staff issue, renew, and revoke
// custom org packages. Wraps the #466 generate/revoke endpoints + the new
// #479 history endpoint, with a multi-app feature picker grouped by
// brickos.feature_registry.app_slug.
//
// design 022 §7.2 Screen 2 (License tab) + §3.4.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

/**
 * Inline CSS-only tooltip. Renders the trigger inline; on hover the
 * `content` appears as an absolutely-positioned panel. No JS, no
 * portals -- the parent element gets `group` automatically.
 *
 * Sprint 041 round 2: replaces the HTML `title` attribute on feature
 * checkboxes which had a 1.5s browser-default delay and was easy to
 * miss. This tooltip shows immediately on hover.
 */
function InlineTooltip({
  children,
  content,
  testid,
}: {
  children: ReactNode
  content: ReactNode
  testid?: string
}) {
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span
        data-testid={testid}
        className="pointer-events-none absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-72 rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-[11px] text-zinc-200 shadow-xl"
      >
        {content}
      </span>
    </span>
  )
}

/**
 * Sprint 041 round 2: feature lifecycle status tags. Hard-coded
 * frontend map until the feature_registry table grows a `status`
 * column. Slugs not listed here default to 'live'.
 *
 * - `live`: in-tree, enforced, ready to sell
 * - `preview`: in-tree but not yet enforced everywhere; safe to grant
 *   but the customer may see gaps
 * - `coming-soon`: planned, not implemented; should NOT be sold yet
 */
const FEATURE_STATUS: Record<string, 'live' | 'preview' | 'coming-soon'> = {
  // SHI core (all live since Sprint 040)
  'shi.markers_active': 'live',
  'shi.history_days': 'live',
  'shi.calculated_markers': 'live',
  'shi.measurement_templates': 'live',
  'shi.medications': 'live',
  'shi.measurement_count': 'live',
  'shi.body_composition': 'live',
  'shi.custom_thresholds': 'live',
  'shi.lifestyle_presets': 'live',
  'shi.protocol_comparison': 'live',
  'shi.csv_export': 'live',
  'shi.json_export': 'live',
  'shi.mfa_totp': 'live',
  'shi.ai_chat_quota': 'live',
  // SHI partial / preview
  'shi.supplement_marker_impact': 'preview',
  'shi.pdf_reports': 'preview',
  'shi.ai_dashboard_insights': 'preview',
  'shi.smart_import': 'preview',
  'shi.cohort_comparison': 'coming-soon',
  'shi.api_access': 'coming-soon',
  // Branding (all live in dev, custom_domain partially -- depends on nginx)
  'branding.custom_logo': 'live',
  'branding.custom_colors': 'live',
  'branding.custom_domain': 'preview',
  'branding.role_labels': 'live',
  // Support tiers (operational, not feature-flagged)
  'support.community': 'live',
  'support.email': 'live',
  'support.priority': 'live',
  'support.sla_24x7': 'preview',
  // CRM (sovereign-crm app not yet wired into the cross-app feature gate)
  'crm.lead_capture': 'coming-soon',
  'crm.email_sequences': 'coming-soon',
  'crm.audio_recording': 'coming-soon',
  'crm.audio_transcription': 'coming-soon',
  'crm.advanced_search': 'coming-soon',
  'crm.api_access': 'coming-soon',
  'crm.csv_export': 'coming-soon',
  'crm.custom_pipelines': 'coming-soon',
  // Link (sovereign-link app is wired but not all features)
  'link.api_access': 'live',
  'link.custom_domains': 'preview',
  'link.affiliate_tracking': 'preview',
  'link.click_analytics': 'live',
  'link.bulk_create': 'preview',
}

const STATUS_BADGE: Record<'live' | 'preview' | 'coming-soon', { label: string; cls: string }> = {
  live: { label: 'live', cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
  preview: { label: 'preview', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  'coming-soon': {
    label: 'soon',
    cls: 'bg-zinc-700 text-zinc-400 border-zinc-600',
  },
}

function featureStatus(slug: string): 'live' | 'preview' | 'coming-soon' {
  return FEATURE_STATUS[slug] ?? 'live'
}
import { formatDate } from '@/lib/date-format'

interface LicenseHistoryRow {
  id: string
  tier_slug: string
  features: string[]
  max_owners: number
  max_practitioners: number
  max_members: number
  issued_at: string
  expires_at: string
  revoked_at: string | null
  jti: string
  notes: string | null
  stripe_invoice_id: string | null
  issued_by_email: string | null
}

interface FeatureRegistryRow {
  slug: string
  app_slug: string
  category: string
  name_en: string
  name_de: string
  description_en: string | null
  description_de: string | null
}

interface TierRow {
  slug: string
  name: string
  app_key: string | null
}

const TIER_FALLBACK: TierRow[] = [
  { slug: 'glimpse', name: 'Glimpse', app_key: null },
  { slug: 'focus', name: 'Focus', app_key: null },
  { slug: 'insight', name: 'Insight', app_key: null },
  { slug: 'clarity', name: 'Clarity', app_key: null },
  { slug: 'horizon', name: 'Horizon', app_key: null },
  { slug: 'custom', name: 'Custom', app_key: null },
]

const EXPIRES_PRESETS: Array<[string, number]> = [
  ['preset1', 30],
  ['preset6', 180],
  ['preset12', 365],
]

export interface LicenseTabProps {
  orgId: string
  orgName: string
  billingEmail: string | null
  locale: string
  onChanged: () => void
}

export function LicenseTab({ orgId, orgName, billingEmail, locale, onChanged }: LicenseTabProps) {
  const t = useTranslations('platform.orgDetail.licenseTab')
  const tCommon = useTranslations('platform.orgDetail')
  const [history, setHistory] = useState<LicenseHistoryRow[]>([])
  const [features, setFeatures] = useState<FeatureRegistryRow[]>([])
  const [tiers, setTiers] = useState<TierRow[]>(TIER_FALLBACK)
  const [showForm, setShowForm] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Form state
  const [tier, setTier] = useState('focus')
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())
  const [maxOwners, setMaxOwners] = useState(1)
  const [maxPractitioners, setMaxPractitioners] = useState(0)
  const [maxMembers, setMaxMembers] = useState(0)
  const [expiresDays, setExpiresDays] = useState(365)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generated, setGenerated] = useState<{ jwt: string; jti: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke state
  const [revokeReason, setRevokeReason] = useState('')

  // Sprint 041 #523 follow-up: filter the feature picker by app_slug so
  // the licensing operator does not have to scroll a 41-feature list.
  const [appFilter, setAppFilter] = useState<string>('')

  // Whitelabel SHI preset: pre-selects the canonical feature set for a
  // full white-label SHI deployment (all shi.* + all branding.* + the
  // tier's support level). Drops in for the most common operator action.
  const applyWhitelabelShiPreset = () => {
    const next = new Set<string>()
    for (const f of features) {
      if (f.app_slug === 'sovereign-health') next.add(f.slug)
      if (f.app_slug === '_platform' && f.category === 'branding') next.add(f.slug)
    }
    // Default support level: priority for paid tiers, community for glimpse/core.
    if (tier === 'glimpse' || tier === 'core') next.add('support.community')
    else if (tier === 'horizon' || tier === 'clarity') next.add('support.priority')
    else next.add('support.email')
    setSelectedFeatures(next)
  }

  const fetchHistory = async () => {
    try {
      const res = await api.admin.listOrgLicenseHistory(orgId)
      setHistory(res.data)
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    fetchHistory()
    api.admin
      .listFeatureRegistry()
      .then((res) => setFeatures(res.data))
      .catch(() => setFeatures([]))
    api.admin
      .listLicensingTiers()
      .then((res) => {
        if (res.data.length > 0) setTiers(res.data)
      })
      .catch(() => {
        // keep TIER_FALLBACK
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  // List of distinct app_slugs for the filter dropdown.
  const appSlugs = useMemo(
    () => Array.from(new Set(features.map((f) => f.app_slug))).sort(),
    [features],
  )

  // Group features by app_slug for the picker, honoring the app filter.
  const grouped = useMemo(() => {
    const map = new Map<string, FeatureRegistryRow[]>()
    for (const f of features) {
      if (appFilter && f.app_slug !== appFilter) continue
      const list = map.get(f.app_slug) ?? []
      list.push(f)
      map.set(f.app_slug, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [features, appFilter])

  const current = history[0] // newest first; null check below
  const isCurrentActive = current && !current.revoked_at && new Date(current.expires_at) > new Date()

  const toggleFeature = (slug: string) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const jwtPreview = useMemo(() => {
    return JSON.stringify(
      {
        org_id: orgId,
        org_name: orgName,
        tier,
        features: Array.from(selectedFeatures),
        max_owners: maxOwners,
        max_practitioners: maxPractitioners,
        max_members: maxMembers,
        expires_days: expiresDays,
        notes: notes || undefined,
      },
      null,
      2,
    )
  }, [orgId, orgName, tier, selectedFeatures, maxOwners, maxPractitioners, maxMembers, expiresDays, notes])

  const handleGenerate = async () => {
    setSubmitting(true)
    try {
      const res = await api.admin.generateOrgLicense(orgId, {
        tier,
        features: Array.from(selectedFeatures),
        max_owners: maxOwners,
        max_practitioners: maxPractitioners,
        max_members: maxMembers,
        expires_days: expiresDays,
        notes: notes || undefined,
      })
      setGenerated({
        jwt: res.data.license_key,
        jti: res.data.jti,
        expiresAt: res.data.expires_at,
      })
      toast.success(t('generated'))
      await fetchHistory()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRenew = async () => {
    if (!current) return
    setSubmitting(true)
    try {
      const res = await api.admin.generateOrgLicense(orgId, {
        tier: current.tier_slug,
        features: current.features,
        max_owners: current.max_owners,
        max_practitioners: current.max_practitioners,
        max_members: current.max_members,
        expires_days: 365,
      })
      setGenerated({
        jwt: res.data.license_key,
        jti: res.data.jti,
        expiresAt: res.data.expires_at,
      })
      toast.success(t('renewed'))
      await fetchHistory()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Renew failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm(t('revokeConfirm'))) return
    try {
      await api.admin.revokeOrgLicense(orgId, revokeReason || undefined)
      toast.success(t('revoked'))
      setRevokeReason('')
      await fetchHistory()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revoke failed')
    }
  }

  const handleCopy = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated.jwt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    if (!generated) return
    const blob = new Blob([generated.jwt], { type: 'application/jwt' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${generated.jti.slice(0, 8)}.jwt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleEmail = async () => {
    if (!generated || !billingEmail) {
      toast.error('No billing email on file')
      return
    }
    try {
      await api.admin.sendLifecycleTemplate({
        template_name: 'license_renewed',
        recipient_email: billingEmail,
        locale: 'en',
        vars: {
          display_name: orgName,
          org_name: orgName,
          renewal_amount: '—',
          access_until: generated.expiresAt.slice(0, 10),
        },
      })
      toast.success('Email sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Email failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Current license card */}
      <div className="rounded-2xl border border-zinc-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t('currentLicense')}
          </h2>
          {isCurrentActive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRenew}
                disabled={submitting}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {t('renew')}
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 px-3 py-1.5 rounded transition-colors"
              >
                {t('revoke')}
              </button>
            </div>
          )}
        </div>
        {current && isCurrentActive ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t('tier')}</dt>
              <dd className="font-semibold">{current.tier_slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t('issued')}</dt>
              <dd className="text-zinc-300">{formatDate(current.issued_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t('expires')}</dt>
              <dd className="text-zinc-300">{formatDate(current.expires_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t('issuedBy')}</dt>
              <dd className="text-zinc-300">{current.issued_by_email ?? '—'}</dd>
            </div>
            <div className="pt-2 border-t border-zinc-800/50">
              <dt className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{t('features')}</dt>
              <div className="flex flex-wrap gap-1">
                {current.features.length === 0 && (
                  <span className="text-xs text-zinc-600">none</span>
                )}
                {current.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-2 grid grid-cols-3 gap-2 text-xs text-zinc-400">
              <div>{tCommon('owners')}: <span className="text-zinc-200">{current.max_owners}</span></div>
              <div>{tCommon('practitioners')}: <span className="text-zinc-200">{current.max_practitioners}</span></div>
              <div>{tCommon('members')}: <span className="text-zinc-200">{current.max_members < 0 ? '∞' : current.max_members}</span></div>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">{t('noActive')}</p>
        )}
      </div>

      {/* Generate new button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          data-testid="license-generate-new-button"
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors"
        >
          {t('generateNew')}
        </button>
      )}

      {/* Generate form */}
      {showForm && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-orange-300">{t('form.title')}</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              {t('form.cancel')}
            </button>
          </div>

          {/* Tier */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.tier')}</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              {tiers.map((tt) => (
                <option key={tt.slug} value={tt.slug}>
                  {tt.name} ({tt.slug})
                </option>
              ))}
              <option value="custom">{t('form.tierCustom')}</option>
            </select>
          </div>

          {/* Whitelabel SHI explainer + app filter + preset */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200 space-y-1">
            <p className="font-semibold">Whitelabel SHI -- which features do I need?</p>
            <p className="text-blue-300/80">
              The features array on the JWT is the org&apos;s entitlement list. Each feature
              slug toggles ONE capability in the running app. For a full whitelabel SHI
              license:
            </p>
            <ul className="list-disc ml-5 text-blue-300/80 space-y-0.5">
              <li>
                <span className="font-mono">shi.*</span> -- enables SHI app capabilities (csv
                export, AI chat, PDF reports, etc.)
              </li>
              <li>
                <span className="font-mono">branding.custom_logo</span>,{' '}
                <span className="font-mono">branding.custom_colors</span>,{' '}
                <span className="font-mono">branding.custom_domain</span>,{' '}
                <span className="font-mono">branding.role_labels</span> -- without these the
                org cannot whitelabel
              </li>
              <li>
                <span className="font-mono">support.priority</span> or{' '}
                <span className="font-mono">support.sla_24x7</span> -- match what was sold
              </li>
            </ul>
            <p className="text-blue-300/60 italic mt-1">
              The license is org-scoped. The custom domain is configured separately on the
              Branding tab; <span className="font-mono">branding.custom_domain</span> is the
              feature that UNLOCKS the ability to set a domain.
            </p>
          </div>

          {/* Feature picker controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-zinc-500">{t('form.featurePicker')}</label>
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs"
              data-testid="license-feature-app-filter"
            >
              <option value="">All apps ({features.length})</option>
              {appSlugs.map((s) => (
                <option key={s} value={s}>
                  {s} ({features.filter((f) => f.app_slug === s).length})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyWhitelabelShiPreset}
              className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 px-2 py-1 rounded border border-blue-500/30"
              title="Pre-select all SHI features + all branding features + a support level matching the tier"
            >
              Preset: Whitelabel SHI
            </button>
            <button
              type="button"
              onClick={() => setSelectedFeatures(new Set())}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1"
            >
              Clear
            </button>
            <span className="text-[11px] text-zinc-500 ml-auto">
              {selectedFeatures.size} selected
            </span>
          </div>

          {/* Feature picker, grouped by app */}
          <div className="space-y-2">
            {grouped.length === 0 ? (
              <p className="text-xs text-zinc-600">{t('form.noFeatures')}</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto rounded-lg border border-zinc-800 p-3">
                {grouped.map(([app, items]) => (
                  <div key={app} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                      {app}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {items.map((f) => {
                        const description =
                          (locale === 'de' ? f.description_de : f.description_en) ?? f.slug
                        const status = featureStatus(f.slug)
                        const badge = STATUS_BADGE[status]
                        return (
                          <div
                            key={f.slug}
                            data-testid={`license-feature-${f.slug}`}
                            className="flex items-start gap-2 text-xs text-zinc-300 hover:text-zinc-100"
                          >
                            <input
                              type="checkbox"
                              id={`feat-${f.slug}`}
                              checked={selectedFeatures.has(f.slug)}
                              onChange={() => toggleFeature(f.slug)}
                              className="mt-0.5 cursor-pointer"
                              aria-label={f.slug}
                            />
                            <label
                              htmlFor={`feat-${f.slug}`}
                              className="cursor-pointer flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <InlineTooltip
                                  testid={`license-feature-tooltip-${f.slug}`}
                                  content={
                                    <>
                                      <div className="font-mono text-[10px] text-zinc-500 mb-1">
                                        {f.slug}
                                      </div>
                                      <div className="font-semibold text-zinc-100 mb-1">
                                        {locale === 'de' ? f.name_de : f.name_en}
                                      </div>
                                      <div className="text-zinc-300">{description}</div>
                                      <div className="mt-2 text-[10px] text-zinc-500 uppercase tracking-wider">
                                        Status: {badge.label}
                                      </div>
                                    </>
                                  }
                                >
                                  <span className="font-mono text-[10px] text-zinc-500 underline decoration-dotted decoration-zinc-700">
                                    {f.slug}
                                  </span>
                                </InlineTooltip>
                                <span
                                  className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${badge.cls}`}
                                  data-testid={`license-feature-status-${f.slug}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                              <div>{locale === 'de' ? f.name_de : f.name_en}</div>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seat caps */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{t('form.owners')}</label>
              <input
                type="number"
                min={0}
                value={maxOwners}
                onChange={(e) => setMaxOwners(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{t('form.practitioners')}</label>
              <input
                type="number"
                min={0}
                value={maxPractitioners}
                onChange={(e) => setMaxPractitioners(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{t('form.members')}</label>
              <input
                type="number"
                min={-1}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Expires */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.expiresDays')}</label>
            <div className="flex items-center gap-2">
              {EXPIRES_PRESETS.map(([key, days]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setExpiresDays(days)}
                  className={`text-xs px-3 py-1.5 rounded transition-colors ${
                    expiresDays === days
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {t(`form.${key}`)}
                </button>
              ))}
              <input
                type="number"
                min={1}
                value={expiresDays}
                onChange={(e) => setExpiresDays(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm tabular-nums w-24"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          {/* JWT preview */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{t('form.preview')}</label>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-400 overflow-x-auto">
              {jwtPreview}
            </pre>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={submitting}
            className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
          >
            {submitting ? '...' : t('form.submit')}
          </button>
        </div>
      )}

      {/* Generated result */}
      {generated && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-green-300">{t('result.title')}</h3>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-300 overflow-x-auto break-all whitespace-pre-wrap">
            {generated.jwt}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors"
            >
              {copied ? t('result.copied') : t('result.copy')}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors"
            >
              {t('result.download')}
            </button>
            {billingEmail && (
              <button
                type="button"
                onClick={handleEmail}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
              >
                {t('result.email')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Revoke reason input -- shown only if there's an active license */}
      {isCurrentActive && (
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">{t('revokeReason')}</label>
          <input
            type="text"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
          />
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setHistoryOpen((s) => !s)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          {historyOpen ? '▼' : '▶'} {t('history')} ({history.length})
        </button>
        {historyOpen && (
          <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 p-4">{t('noHistory')}</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-3 text-zinc-500 uppercase tracking-wider">
                      {t('tier')}
                    </th>
                    <th className="text-left py-2 px-3 text-zinc-500 uppercase tracking-wider">
                      {t('issued')}
                    </th>
                    <th className="text-left py-2 px-3 text-zinc-500 uppercase tracking-wider">
                      {t('expires')}
                    </th>
                    <th className="text-left py-2 px-3 text-zinc-500 uppercase tracking-wider">
                      {t('issuedBy')}
                    </th>
                    <th className="text-left py-2 px-3 text-zinc-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const isRevoked = !!row.revoked_at
                    const isExpired = new Date(row.expires_at) < new Date()
                    const status = isRevoked
                      ? 'revoked'
                      : isExpired
                        ? 'expired'
                        : 'active'
                    const statusColor =
                      status === 'active'
                        ? 'text-green-400'
                        : status === 'revoked'
                          ? 'text-zinc-500'
                          : 'text-amber-400'
                    return (
                      <tr key={row.id} className="border-b border-zinc-800/40">
                        <td className="py-2 px-3 font-medium">{row.tier_slug}</td>
                        <td className="py-2 px-3 text-zinc-400">{formatDate(row.issued_at)}</td>
                        <td className="py-2 px-3 text-zinc-400">{formatDate(row.expires_at)}</td>
                        <td className="py-2 px-3 text-zinc-400">{row.issued_by_email ?? '—'}</td>
                        <td className={`py-2 px-3 ${statusColor}`}>{status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
