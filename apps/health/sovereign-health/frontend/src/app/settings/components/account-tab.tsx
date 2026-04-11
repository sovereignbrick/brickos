'use client'

import { useState, useMemo } from 'react'
import { useContent } from '@/lib/content-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { UserProfile, UnitPreferences } from '@/lib/types'
import { COUNTRIES } from '../countries'
import { getCountryDefaults, Field } from './shared'
import type { SaveStatus } from './shared'

// Sprint 042 #528 Phase D: PWA install + push notifications moved to
// the new brickos master Notifications tab (notifications-tab.tsx).
// Account tab is now strictly identity + locale + display preferences,
// matching the brickos master template intent.

export function AccountTab({
  profile, units, onUpdate, onUnitsUpdate, setSaveStatus, showSaved,
}: {
  profile: UserProfile
  units: UnitPreferences
  onUpdate: (p: Partial<UserProfile>) => void
  onUnitsUpdate: (u: Partial<UnitPreferences>) => void
  setSaveStatus: (s: SaveStatus) => void
  showSaved: () => void
}) {
  const t = useTranslations('settings.profile')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [locale, setLocale] = useState(contentLocale)
  const [form, setForm] = useState(profile)
  const [uForm, setUForm] = useState(units)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const localizedCountries = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'region' })
      return COUNTRIES.map(c => ({ code: c.code, name: dn.of(c.code) ?? c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, locale))
    } catch {
      return COUNTRIES
    }
  }, [locale])

  const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    setLocale(newLocale)
    setContentLocale(newLocale as 'en' | 'de')
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 3600}`
    setSaveStatus('saving')
    try {
      await api.settings.updateProfile({ locale: newLocale })
      showSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  const resetToCountryDefaults = async () => {
    const defaults = getCountryDefaults(form.country_code)
    const updates = defaults as Partial<UnitPreferences>
    setUForm(f => ({ ...f, ...updates }))
    onUnitsUpdate(updates)
    setSaveStatus('saving')
    try {
      await api.settings.updateUnits(updates)
      showSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  const save = async () => {
    setSaving(true)
    setSaveStatus('saving')
    setMsg(null)
    try {
      await api.settings.updateProfile({
        display_name: form.display_name,
        country_code: form.country_code,
      })
      onUpdate({ display_name: form.display_name, country_code: form.country_code })
      await api.settings.updateUnits({
        date_format: uForm.date_format,
        time_format: uForm.time_format,
      })
      onUnitsUpdate({ date_format: uForm.date_format, time_format: uForm.time_format })
      setMsg(tToast('profileSaved'))
      showSaved()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : tToast('profileSaveFailed'))
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const inp = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-card [&>option]:text-foreground"
  const ro = "w-full rounded-lg border border-border bg-muted px-2.5 py-1.5 text-sm text-muted-foreground cursor-not-allowed"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={tCommon('email')}>
          <input type="email" value={profile.email} readOnly className={ro} />
        </Field>
        <Field label={t('displayName')}>
          <input type="text" value={form.display_name ?? ''} onChange={e => setForm({ ...form, display_name: e.target.value || null })} className={inp} placeholder={t('displayNamePlaceholder')} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('language')}>
          <select value={locale} onChange={handleLocaleChange} className={inp}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>
        <Field label={t('country')}>
          <select value={form.country_code ?? ''} onChange={e => setForm({ ...form, country_code: e.target.value || null })} className={inp}>
            <option value="">{tCommon('notSet')}</option>
            {localizedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <div />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('dateFormat')}>
          <select value={uForm.date_format} onChange={e => setUForm({ ...uForm, date_format: e.target.value })} className={inp}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </Field>
        <Field label={t('timeFormat')}>
          <select value={uForm.time_format} onChange={e => setUForm({ ...uForm, time_format: e.target.value })} className={inp}>
            <option value="24h">{t('timeFormats.24h')}</option>
            <option value="12h">{t('timeFormats.12h')}</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button onClick={resetToCountryDefaults} className="text-xs text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg transition-colors">
            {t('resetDefaults')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {saving ? tCommon('saving') : tCommon('save')}
        </button>
        {msg && <span className={msg === tToast('profileSaved') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{msg}</span>}
      </div>
    </div>
  )
}
