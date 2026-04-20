'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { getPlane } from '@/lib/plane'
import { Footer } from '@/components/layout/footer'
import type { UserSettings } from '@/lib/types'
import { Breadcrumb } from '@/components/breadcrumb'
import { MedicationsTab } from '@/components/settings/medications-tab'
import type { SaveStatus } from './components/shared'
import { ProfileTab } from './components/profile-tab'
import { DevicesTab } from './components/devices-tab'
import { ThresholdsTab } from './components/thresholds-tab'
import { DataPrivacyTab } from './components/privacy-tab'
import { LicenseTab } from './components/license-tab'
import { SecurityTab } from './components/security-tab'
import { AccountTab } from './components/account-tab'
import { NotificationsTab } from './components/notifications-tab'

// Sprint 042 #528 Phase D: settings tabs are split into two logical groups:
//
//   1. SHI app extension tabs (Health profile / Devices / Thresholds /
//      Medications) -- contributed by the SHI app, visible until
//      Sprint 04N+ wires entitlement-based hiding
//
//   2. brickos master tabs (Account / Security / Privacy) -- always
//      present, app-agnostic
//
// Sprint 042 user feedback: the render order matches the pre-Sprint-040
// production layout, which puts SHI tabs FIRST and the cross-cutting
// brickos tabs after.
//
// **brickos master template default layout:** the Account tab embeds
// Push Notifications and Billing/License as INLINE sections, NOT as
// standalone tabs. This is the production layout the user signed off on
// and is the canonical default for any future BrickOS app's settings
// page. Apps can override the embed if they want their own dedicated
// Notifications/Billing tabs, but the default is "fold them into Account".
//
// MASTER_TABS / SHI_EXTENSION_TABS are still defined separately so the
// architectural split is documented in the source.

const SHI_EXTENSION_TABS = [
  'Health profile',
  'Devices',
  'Thresholds',
  'Medications',
] as const

const MASTER_TABS = [
  'Account',
  'Security',
  'Data & Privacy',
] as const

// Render order = pre-Sprint-040 production layout. SHI tabs first, then
// brickos master tabs.
const ALL_TABS = [
  // SHI app extension tabs
  'Health profile',
  'Devices',
  'Thresholds',
  'Medications',
  // brickos master tabs
  'Account',
  'Security',
  'Data & Privacy',
] as const
type Tab = (typeof ALL_TABS)[number]

const TAB_SLUGS: Record<string, Tab> = {
  // Master tabs
  account: 'Account',
  // Sprint 042: Notifications and Billing are now inline sections inside
  // Account (matching production), so any old bookmark like ?tab=billing
  // or ?tab=notifications resolves back to the Account tab.
  billing: 'Account',
  license: 'Account',
  notifications: 'Account',
  security: 'Security',
  privacy: 'Data & Privacy',
  data: 'Data & Privacy',
  // SHI extension tabs
  profile: 'Health profile',
  'health-profile': 'Health profile',
  devices: 'Devices',
  thresholds: 'Thresholds',
  medications: 'Medications',
  'influence-factors': 'Medications',
}
const TAB_TO_SLUG: Record<Tab, string> = {
  // Master
  'Account': 'account',
  'Security': 'security',
  'Data & Privacy': 'privacy',
  // SHI
  'Health profile': 'health-profile',
  'Devices': 'devices',
  'Thresholds': 'thresholds',
  'Medications': 'medications',
}

function SettingsContent() {
  const { user, loading: authLoading, isDemo, isDemoOnly } = useAuth()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const tabParam = searchParams.get('tab')

  // Sprint 042 user feedback: keep the production default landing tab
  // ("Health profile") so existing bookmarks land where they always did.
  const defaultTab: Tab = 'Health profile'
  const resolvedTab: Tab = TAB_SLUGS[tabParam ?? ''] ?? defaultTab
  const tab: Tab = resolvedTab

  const setTab = useCallback((t: Tab) => {
    const slug = TAB_TO_SLUG[t]
    const params = new URLSearchParams(searchParams.toString())
    if (slug === 'profile') {
      params.delete('tab')
    } else {
      params.set('tab', slug)
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    if (authLoading) return
    // Sprint 046 hotfix 2026-04-20: check auth BEFORE demo.
    // Previously isDemo (= user===null || isDemoOnly) fired first, so an
    // unauthenticated visit to /settings pushed to /dashboard, which on the
    // admin plane cross-planes to sovereignhealth.io. Now unauthenticated
    // users go to /login with a return URL; only post-auth "demoOnly" mode
    // bounces to /dashboard.
    if (!user) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      router.push(`/login?return=${encodeURIComponent(returnUrl)}`)
      return
    }
    if (isDemoOnly) { router.push('/dashboard'); return }
    api.settings.get()
      .then(res => setSettings(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, authLoading, router, isDemoOnly])

  const showSaved = useCallback(() => {
    setSaveStatus('saved')
    const t = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(t)
  }, [])

  if (authLoading || loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-muted-foreground">{tCommon('loading')}</div>
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-red-400">Error: {error}</div>
  if (!settings) return null

  const dietProtocol = settings.lifestyle_defaults.default_diet_protocol

  // Sprint 046 hotfix: hide SHI extension tabs on the admin plane so a user
  // visiting {slug}.brickos.io/settings sees only BrickOS account/security/
  // privacy -- app-specific settings belong on sovereignhealth.io.
  const currentPlane = getPlane(typeof window !== 'undefined' ? window.location.hostname : '')
  const visibleTabs: readonly Tab[] = currentPlane === 'admin' ? MASTER_TABS : ALL_TABS

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Fixed header area — never scrolls */}
      <div className="flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ backgroundColor: 'var(--background, #09090b)' }}>
      <div className="max-w-4xl mx-auto w-full px-4 pt-6 pb-0">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: t('title') },
          ]} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <span className="text-xs text-muted-foreground">
            {saveStatus === 'saving' && t('savingStatus')}
            {saveStatus === 'saved' && <span className="text-green-400">{t('allChangesSaved')}</span>}
            {saveStatus === 'error' && <span className="text-red-400">{t('saveFailedStatus')}</span>}
          </span>
        </div>

        <div className="flex flex-wrap gap-0 mb-0 border-b border-border pb-0">
          {/* Sprint 042 #528 Phase D: SHI tabs first, then brickos master tabs.
              Sprint 046 hotfix 2026-04-20: on the admin plane (brickos.io)
              only the BrickOS master tabs render -- health-profile / devices
              / thresholds / medications are app-specific and belong on
              sovereignhealth.io. Plane detection is done at render time,
              so no TAB_SLUGS change needed. */}
          {visibleTabs.map(tb => {
            const tabLabelMap: Record<Tab, string> = {
              'Account': t('tabs.account'),
              'Security': t('tabs.security'),
              'Data & Privacy': t('tabs.privacy'),
              'Health profile': t('tabs.healthProfile'),
              'Devices': t('tabs.devices'),
              'Thresholds': t('tabs.thresholds'),
              'Medications': t('tabs.medications'),
            }
            const isMaster = (MASTER_TABS as readonly Tab[]).includes(tb)
            return (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`px-2.5 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === tb
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                title={isMaster ? 'BrickOS' : 'Sovereign Health'}
              >
                {tabLabelMap[tb]}
              </button>
            )
          })}
        </div>
      </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-12 w-full">
        {/* ── brickos master tabs ─────────────────────────────────────── */}
        {tab === 'Account' && (
          // Sprint 042 #528: brickos master Account tab embeds Notifications
          // and (on end-user plane) Billing/License as inline sections.
          //
          // Sprint 046 #581 hotfix 2026-04-20: LicenseTab shows the
          // Sovereign Health license tier, which is app-specific data that
          // doesn't belong on the brickos.io admin-plane Account tab.
          // Hidden when currentPlane === 'admin'; end-user plane still
          // renders it inline.
          <div className="space-y-8">
            <AccountTab
              profile={settings.profile}
              units={settings.units}
              onUpdate={p => setSettings({ ...settings, profile: { ...settings.profile, ...p } })}
              onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
              setSaveStatus={setSaveStatus}
              showSaved={showSaved}
            />
            <NotificationsTab />
            {currentPlane !== 'admin' && (
              <>
                <hr className="border-border" />
                <LicenseTab />
              </>
            )}
          </div>
        )}
        {tab === 'Security' && <SecurityTab />}
        {tab === 'Data & Privacy' && <DataPrivacyTab shareAnonymousData={settings.share_anonymous_data ?? false} onToggle={(v) => setSettings({ ...settings, share_anonymous_data: v })} />}

        {/* ── SHI extension tabs ──────────────────────────────────────── */}
        {tab === 'Health profile' && (
          <ProfileTab
            profile={settings.profile}
            units={settings.units}
            lifestyle={settings.lifestyle_defaults}
            countryCode={settings.profile.country_code}
            onUpdate={p => setSettings({ ...settings, profile: { ...settings.profile, ...p } })}
            onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
            onLifestyleUpdate={l => setSettings({ ...settings, lifestyle_defaults: { ...settings.lifestyle_defaults, ...l } })}
            setSaveStatus={setSaveStatus}
            showSaved={showSaved}
          />
        )}
        {tab === 'Devices' && <DevicesTab markers={settings.all_markers} />}
        {tab === 'Thresholds' && (
          <ThresholdsTab
            markers={settings.all_markers}
            calculatedMarkers={settings.calculated_markers ?? []}
            customRanges={settings.custom_reference_ranges}
            systemRanges={settings.system_reference_ranges}
            units={settings.units}
            dietProtocol={dietProtocol}
            onRefresh={() => api.settings.get().then(r => setSettings(r.data))}
            onSwitchToProfile={() => setTab('Health profile')}
            onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
            setSaveStatus={setSaveStatus}
            showSaved={showSaved}
          />
        )}
        {tab === 'Medications' && <MedicationsTab />}
        </div>
        <Footer />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
