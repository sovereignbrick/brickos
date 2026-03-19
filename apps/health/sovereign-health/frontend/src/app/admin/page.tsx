'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

import { Footer } from '@/components/layout/footer'
import { Breadcrumb } from '@/components/breadcrumb'
import { UsersTab } from '@/components/admin/users-tab'
import { ContentWebTab } from '@/components/admin/content-web-tab'
import { AiUsageTab } from '@/components/admin/ai-usage-tab'
import { AuditLogsTab } from '@/components/admin/audit-logs-tab'
import { PromotionsTab } from '@/components/admin/promotions-tab'
import { AffiliatesTab } from '@/components/admin/affiliates-tab'
import { SettingsTab } from '@/components/admin/settings-tab'
import { ContentStringsTab } from '@/components/admin/content-strings-tab'
import { PaymentGatewaysTab } from '@/components/admin/payment-gateways-tab'
import { NewsletterTab } from '@/components/admin/newsletter-tab'
import { useTranslations } from 'next-intl'

const SIDEBAR_KEYS = [
  'dashboard', 'users', 'settings', 'payments', 'promotions', 'affiliates',
  'content-app', 'content-web', 'content-strings', 'newsletter', 'ai-usage',
  'audit-logs', 'website',
] as const

type TabKey = (typeof SIDEBAR_KEYS)[number]

const TAB_ICONS: Record<TabKey, string> = {
  dashboard: '\u{1F4CA}',
  users: '\u{1F465}',
  settings: '\u2699\uFE0F',
  payments: '\u{1F4B3}',
  promotions: '\u{1F3AB}',
  affiliates: '\u{1F91D}',
  'content-app': '\u{1F4DD}',
  'content-web': '\u{1F310}',
  'content-strings': '\u{1F524}',
  newsletter: '\u{1F4E7}',
  'ai-usage': '\u{1F916}',
  'audit-logs': '\u{1F50D}',
  website: '\u{1F30D}',
}

const TAB_I18N_KEYS: Record<TabKey, string> = {
  dashboard: 'dashboard',
  users: 'users',
  settings: 'settings',
  payments: 'payments',
  promotions: 'promotions',
  affiliates: 'affiliates',
  'content-app': 'contentApp',
  'content-web': 'contentWeb',
  'content-strings': 'contentStrings',
  newsletter: 'newsletter',
  'ai-usage': 'aiUsage',
  'audit-logs': 'auditLogs',
  website: 'website',
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const tNav = useTranslations('nav')
  const tTabs = useTranslations('admin.tabs')
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <div className="flex-1 flex">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 lg:top-auto left-0 z-40 h-full lg:h-auto
          w-56 border-r border-border bg-card lg:bg-transparent shrink-0
          transition-transform lg:transition-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3 pt-4 lg:pt-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {tNav('adminPanel')}
            </p>
            <nav className="space-y-0.5">
              {SIDEBAR_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    tab === key
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <span className="text-base w-5 text-center">{TAB_ICONS[key]}</span>
                  {tTabs(TAB_I18N_KEYS[key])}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6">
          <Breadcrumb items={[{ label: tNav('overview'), href: '/dashboard' }, { label: tNav('admin') }]} />

          <h1 className="text-2xl font-bold mb-6">
            {tTabs(TAB_I18N_KEYS[tab])}
          </h1>

          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'newsletter' && <NewsletterTab />}
          {tab === 'content-app' && <ContentTab />}
          {tab === 'content-web' && <ContentWebTab />}
          {tab === 'content-strings' && <ContentStringsTab />}
          {tab === 'promotions' && <PromotionsTab />}
          {tab === 'affiliates' && <AffiliatesTab />}
          {tab === 'payments' && <PaymentGatewaysTab />}
          {tab === 'ai-usage' && <AiUsageTab />}
          {tab === 'audit-logs' && <AuditLogsTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'website' && <WebsiteTab />}
        </main>
      </div>
      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Tab
// ---------------------------------------------------------------------------

function DashboardTab() {
  const tCommon = useTranslations('common')
  const [stats, setStats] = useState<{
    total_users: number; verified_users: number; total_measurements: number;
    active_7d: number; active_30d: number; signups_7d: number;
    early_access_count: number; tier_distribution: Array<{ tier: string; count: number }>;
  } | null>(null)

  const [translationStatus, setTranslationStatus] = useState<Array<{
    locale: string; total: number; translated: number; percentage: number;
    missing_by_table: Array<{ table_name: string; missing_count: number }>;
  }>>([])

  useEffect(() => {
    api.admin.dashboard().then(r => setStats(r.data)).catch(() => toast.error(tCommon('failedToLoad')))
    api.admin.translationStatus().then(r => setTranslationStatus(r.data.locales)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats) return <p className="text-muted-foreground">{tCommon('loading')}</p>

  const cards = [
    { label: 'Total Users', value: stats.total_users },
    { label: 'Verified', value: stats.verified_users },
    { label: 'Active (7d)', value: stats.active_7d },
    { label: 'Active (30d)', value: stats.active_30d },
    { label: 'Signups (7d)', value: stats.signups_7d },
    { label: 'Total Measurements', value: stats.total_measurements },
    { label: 'Early Access', value: stats.early_access_count },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {stats.tier_distribution.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Tier Distribution</h3>
          <div className="space-y-2">
            {stats.tier_distribution.map(t => {
              const pct = stats.total_users > 0 ? (t.count / stats.total_users * 100).toFixed(1) : '0'
              return (
                <div key={t.tier} className="flex items-center gap-3">
                  <span className="text-sm w-20 capitalize">{t.tier}</span>
                  <div className="flex-1 bg-muted rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {t.count} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Translation Status Widget */}
      {translationStatus.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Translation Status</h3>
          <div className="space-y-3">
            {translationStatus.map(ts => (
              <div key={ts.locale}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium uppercase">{ts.locale}</span>
                  <span className="text-xs text-muted-foreground">
                    {ts.translated} / {ts.total} ({ts.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${ts.percentage === 100 ? 'bg-emerald-500' : ts.percentage >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${ts.percentage}%` }}
                  />
                </div>
                {ts.missing_by_table.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing: {ts.missing_by_table.map(m => `${m.missing_count} ${m.table_name}`).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Users Tab is imported from @/components/admin/users-tab

// ---------------------------------------------------------------------------
// Content Manager Tab
// ---------------------------------------------------------------------------

const CONTENT_TABLES = ['zones', 'markers', 'tiers', 'ui-strings'] as const
type ContentTable = (typeof CONTENT_TABLES)[number]

const TABLE_LABELS: Record<ContentTable, string> = {
  zones: 'Zones',
  markers: 'Markers',
  tiers: 'Tiers',
  'ui-strings': 'UI Strings',
}

const TRANSLATION_FIELDS: Record<ContentTable, string[]> = {
  zones: ['name', 'description', 'short_description'],
  markers: ['name', 'description', 'tooltip', 'why_it_matters', 'when_to_worry'],
  tiers: ['name', 'tagline', 'description', 'features_summary'],
  'ui-strings': ['value'],
}

function ContentTab() {
  const tCommon = useTranslations('common')
  const [subTab, setSubTab] = useState<ContentTable>('zones')
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editLocale, setEditLocale] = useState('en')
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setExpandedId(null)
    api.admin.contentList(subTab)
      .then(r => setItems(r.data))
      .catch(() => toast.error(tCommon('failedToLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [subTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = search
    ? items.filter(item => {
        const name = (item.name as string || item.key as string || '').toLowerCase()
        const slug = (item.slug as string || '').toLowerCase()
        return name.includes(search.toLowerCase()) || slug.includes(search.toLowerCase())
      })
    : items

  const expandItem = (item: Record<string, unknown>) => {
    const id = item.id as string
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    setEditLocale('en')
    const translations = (item.translations || {}) as Record<string, Record<string, string>>
    const enFields = translations['en'] || {}
    const fields: Record<string, string> = {}
    for (const field of TRANSLATION_FIELDS[subTab]) {
      fields[field] = enFields[field] || ''
    }
    setEditFields(fields)
  }

  const switchLocale = (locale: string, item: Record<string, unknown>) => {
    setEditLocale(locale)
    const translations = (item.translations || {}) as Record<string, Record<string, string>>
    const localeFields = translations[locale] || {}
    const fields: Record<string, string> = {}
    for (const field of TRANSLATION_FIELDS[subTab]) {
      fields[field] = localeFields[field] || ''
    }
    setEditFields(fields)
  }

  const saveTranslation = async (item: Record<string, unknown>) => {
    setSaving(true)
    try {
      await api.admin.contentUpdateTranslation(subTab, item.id as string, editLocale, editFields)
      toast.success(`${editLocale.toUpperCase()} translation saved`)
      load()
    } catch {
      toast.error(tCommon('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const getItemLabel = (item: Record<string, unknown>): string => {
    return (item.name as string) || (item.key as string) || (item.slug as string) || '-'
  }

  const getItemMeta = (item: Record<string, unknown>): string => {
    const parts: string[] = []
    if (item.slug) parts.push(item.slug as string)
    if (item.zone) parts.push(`Zone: ${item.zone}`)
    if (item.unit) parts.push(item.unit as string)
    if (item.context) parts.push(`ctx: ${item.context}`)
    return parts.join(' | ')
  }

  const getTranslationStatus = (item: Record<string, unknown>, locale: string): 'complete' | 'partial' | 'missing' => {
    const translations = (item.translations || {}) as Record<string, Record<string, string>>
    const t = translations[locale]
    if (!t) return 'missing'
    const fields = TRANSLATION_FIELDS[subTab]
    const filled = fields.filter(f => t[f] && t[f].trim() !== '').length
    if (filled === 0) return 'missing'
    if (filled < fields.length) return 'partial'
    return 'complete'
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        {CONTENT_TABLES.map(t => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setSearch('') }}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              subTab === t
                ? 'border-blue-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {TABLE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${TABLE_LABELS[subTab].toLowerCase()}...`}
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"
      />

      <p className="text-xs text-muted-foreground">
        {filteredItems.length} of {items.length} item(s)
      </p>

      {loading ? (
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const id = item.id as string
            const isExpanded = expandedId === id
            const enStatus = getTranslationStatus(item, 'en')
            const deStatus = getTranslationStatus(item, 'de')

            return (
              <div key={id} className="border border-border rounded-lg overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => expandItem(item)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold">{getItemLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">{getItemMeta(item)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${enStatus === 'complete' ? 'bg-emerald-500' : enStatus === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`} title={`EN: ${enStatus}`} />
                    <span className={`w-2 h-2 rounded-full ${deStatus === 'complete' ? 'bg-emerald-500' : deStatus === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`} title={`DE: ${deStatus}`} />
                    <span className="text-muted-foreground text-xs ml-2">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </button>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 bg-muted/50">
                    {/* Locale tabs */}
                    <div className="flex gap-2 mb-4">
                      {['en', 'de'].map(loc => {
                        const status = getTranslationStatus(item, loc)
                        return (
                          <button
                            key={loc}
                            onClick={() => switchLocale(loc, item)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              editLocale === loc
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {loc.toUpperCase()}
                            {status === 'missing' && (
                              <span className="ml-1 text-amber-400">!</span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Translation needed badge */}
                    {getTranslationStatus(item, editLocale) === 'missing' && (
                      <div className="rounded bg-amber-900/30 border border-amber-800 px-3 py-2 text-xs text-amber-400 mb-3">
                        Translation needed for {editLocale.toUpperCase()}
                      </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-3">
                      {TRANSLATION_FIELDS[subTab].map(field => (
                        <div key={field}>
                          <label className="block text-xs text-muted-foreground mb-1 capitalize">
                            {field.replace(/_/g, ' ')}
                          </label>
                          {field === 'description' || field === 'long_description' || field === 'why_it_matters' || field === 'when_to_worry' || field === 'features_summary' ? (
                            <textarea
                              value={editFields[field] || ''}
                              onChange={e => setEditFields({ ...editFields, [field]: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                              rows={3}
                            />
                          ) : (
                            <input
                              type="text"
                              value={editFields[field] || ''}
                              onChange={e => setEditFields({ ...editFields, [field]: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => saveTranslation(item)}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Website Tab (Publish)
// ---------------------------------------------------------------------------

function WebsiteTab() {
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean; message: string; duration_ms: number; timestamp: string
  } | null>(null)

  const handlePublish = async () => {
    if (!confirm('This will rebuild and deploy the public website. Continue?')) return
    setPublishing(true)
    setResult(null)
    try {
      const res = await api.admin.publishWebsite()
      setResult(res.data)
      if (res.data.success) {
        toast.success('Website published successfully')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Website publish failed'
      toast.error(msg)
      setResult({ success: false, message: msg, duration_ms: 0, timestamp: new Date().toISOString() })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-1">Publish Website</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-lg">
          Rebuild and deploy the public website (sovereignhealth.io). This applies any content, pricing, or i18n changes. Takes about 30-60 seconds.
        </p>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {publishing ? 'Building & deploying...' : 'Publish Website'}
        </button>
        {result && (
          <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${
            result.success ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30' : 'bg-red-900/20 text-red-400 border border-red-800/30'
          }`}>
            <p className="font-medium">{result.success ? '\u2713' : '\u2717'} {result.message}</p>
            <p className="text-xs mt-1 opacity-70">
              Completed in {(result.duration_ms / 1000).toFixed(1)}s
              {' \u00b7 '}
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-1">Cloudflare Cache</h3>
        <p className="text-xs text-muted-foreground mb-3">
          After publishing, you may need to purge the Cloudflare cache for changes to appear immediately.
        </p>
        <a
          href="https://dash.cloudflare.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Open Cloudflare Dashboard &rarr;
        </a>
      </div>
    </div>
  )
}
