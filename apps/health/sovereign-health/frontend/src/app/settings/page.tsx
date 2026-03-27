'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
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

const TABS = ['Profile', 'Devices', 'Thresholds', 'Medications', 'Account', 'Security', 'Data & Privacy'] as const
type Tab = (typeof TABS)[number]

const TAB_SLUGS: Record<string, Tab> = {
  profile: 'Profile',
  account: 'Account',
  license: 'Account',
  devices: 'Devices',
  thresholds: 'Thresholds',
  medications: 'Medications',
  'influence-factors': 'Medications',
  privacy: 'Data & Privacy',
  data: 'Data & Privacy',
  security: 'Security',
}
const TAB_TO_SLUG: Record<Tab, string> = {
  'Profile': 'profile',
  'Account': 'account',
  'Devices': 'devices',
  'Thresholds': 'thresholds',
  'Medications': 'influence-factors',
  'Data & Privacy': 'privacy',
  'Security': 'security',
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

  // Derive active tab from URL param
  const tab: Tab = TAB_SLUGS[tabParam ?? ''] ?? 'Profile'

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
    if (isDemo || isDemoOnly) { router.push('/dashboard'); return }
    if (!user) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      router.push(`/login?return=${encodeURIComponent(returnUrl)}`)
      return
    }
    api.settings.get()
      .then(res => setSettings(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, authLoading, router, isDemo, isDemoOnly])

  const showSaved = useCallback(() => {
    setSaveStatus('saved')
    const t = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(t)
  }, [])

  if (authLoading || loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-muted-foreground">{tCommon('loading')}</div>
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-red-400">Error: {error}</div>
  if (!settings) return null

  const dietProtocol = settings.lifestyle_defaults.default_diet_protocol

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

        <div className="flex overflow-x-auto gap-0 mb-0 border-b border-border pb-0 scrollbar-none">
          {TABS.map(tb => {
            const tabLabelMap: Record<Tab, string> = {
              'Profile': t('tabs.profileShort'),
              'Devices': t('tabs.devicesShort'),
              'Thresholds': t('tabs.thresholdsShort'),
              'Medications': t('tabs.medicationsShort'),
              'Account': t('tabs.accountShort'),
              'Security': t('tabs.security'),
              'Data & Privacy': t('tabs.privacyShort'),
            }
            return (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`px-2.5 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === tb
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
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
        {tab === 'Profile' && (
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
        {tab === 'Thresholds' && (
          <ThresholdsTab
            markers={settings.all_markers}
            calculatedMarkers={settings.calculated_markers ?? []}
            customRanges={settings.custom_reference_ranges}
            systemRanges={settings.system_reference_ranges}
            units={settings.units}
            dietProtocol={dietProtocol}
            onRefresh={() => api.settings.get().then(r => setSettings(r.data))}
            onSwitchToProfile={() => setTab('Profile')}
            onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
            setSaveStatus={setSaveStatus}
            showSaved={showSaved}
          />
        )}
        {tab === 'Devices' && <DevicesTab markers={settings.all_markers} />}
        {tab === 'Account' && (
          <div className="space-y-8">
            <AccountTab
              profile={settings.profile}
              units={settings.units}
              onUpdate={p => setSettings({ ...settings, profile: { ...settings.profile, ...p } })}
              onUnitsUpdate={u => setSettings({ ...settings, units: { ...settings.units, ...u } })}
              setSaveStatus={setSaveStatus}
              showSaved={showSaved}
            />
            <hr className="border-border" />
            <LicenseTab />
          </div>
        )}
        {tab === 'Medications' && <MedicationsTab />}
        {tab === 'Data & Privacy' && <DataPrivacyTab shareAnonymousData={settings.share_anonymous_data ?? false} onToggle={(v) => setSettings({ ...settings, share_anonymous_data: v })} />}
        {tab === 'Security' && <SecurityTab />}
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
