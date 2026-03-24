'use client'

import { useState, useMemo } from 'react'
import { useContent } from '@/lib/content-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { InfoTooltip } from '@/components/info-tooltip'
import { useInstall } from '@/lib/install-context'
import { Download, Check } from 'lucide-react'
import type { UserProfile, UnitPreferences, LifestyleDefaults } from '@/lib/types'
import { COUNTRIES } from '../countries'
import { getCountryDefaults, Field, FieldWithInfo } from './shared'
import type { SaveStatus } from './shared'

export function ProfileTab({
  profile, units, lifestyle, countryCode, onUpdate, onUnitsUpdate, onLifestyleUpdate, setSaveStatus, showSaved,
}: {
  profile: UserProfile
  units: UnitPreferences
  lifestyle: LifestyleDefaults
  countryCode: string | null
  onUpdate: (p: Partial<UserProfile>) => void
  onUnitsUpdate: (u: Partial<UnitPreferences>) => void
  onLifestyleUpdate: (l: Partial<LifestyleDefaults>) => void
  setSaveStatus: (s: SaveStatus) => void
  showSaved: () => void
}) {
  const t = useTranslations('settings.profile')
  const tInstall = useTranslations('install')
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tFasting = useTranslations('fastingProtocols')
  const tSleep = useTranslations('sleepQuality')
  const tStress = useTranslations('stressLevel')
  const { canInstall, isInstalled, promptInstall } = useInstall()
  const [form, setForm] = useState(profile)
  const [lForm, setLForm] = useState(lifestyle)
  const [uForm, setUForm] = useState(units)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft-in'>('cm')
  const [waistUnit, setWaistUnit] = useState<'cm' | 'inches'>('cm')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [locale, setLocale] = useState(contentLocale)

  // Locale-aware decimal: accept both "." and "," as decimal separator
  const parseDecimal = (v: string): number | null => {
    const s = v.replace(',', '.').trim()
    if (!s) return null
    const n = Number(s)
    return isFinite(n) ? n : null
  }
  // Only allow digits, one decimal separator (. or ,), and leading minus
  const filterDecimal = (v: string): string => v.replace(/[^0-9.,-]/g, '').replace(/([\.,])(?=.*[\.,])/g, '')
  const fmtDec = (v: number | null): string => {
    if (v == null) return ''
    return locale === 'de' ? String(v).replace('.', ',') : String(v)
  }
  // Track raw text for decimal inputs to allow intermediate states like "7,"
  const [weightText, setWeightText] = useState(fmtDec(weightUnit === 'lbs' && form.default_weight_kg ? Math.round(form.default_weight_kg * 2.205 * 10) / 10 : form.default_weight_kg))
  const [sleepText, setSleepText] = useState(fmtDec(lForm.default_sleep_hours))

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
    setContentLocale(newLocale)
    // Save locale to backend profile
    try {
      await api.settings.updateProfile({ locale: newLocale })
    } catch {
      // Non-critical  - locale is also in cookie via setContentLocale
    }
  }

  const save = async () => {
    setSaving(true)

    setSaveStatus('saving')
    try {
      const heightCm = heightUnit === 'ft-in' && form.height_cm
        ? form.height_cm * 2.54 : form.height_cm
      const waistCm = waistUnit === 'inches' && form.default_waist_cm
        ? form.default_waist_cm * 2.54 : form.default_waist_cm
      const weightKg = weightUnit === 'lbs' && form.default_weight_kg
        ? form.default_weight_kg / 2.205 : form.default_weight_kg

      await api.settings.updateProfile({
        display_name: form.display_name,
        gender: form.gender,
        age: form.age,
        height_cm: heightCm ? Math.round(heightCm * 10) / 10 : null,
        default_waist_cm: waistCm ? Math.round(waistCm * 10) / 10 : null,
        default_weight_kg: weightKg ? Math.round(weightKg * 10) / 10 : null,
        country_code: form.country_code,
      })
      onUpdate(form)
      await api.settings.updateUnits({
        date_format: uForm.date_format,
        time_format: uForm.time_format,
      })
      onUnitsUpdate({ date_format: uForm.date_format, time_format: uForm.time_format })
      await api.settings.updateLifestyle(lForm)
      onLifestyleUpdate(lForm)
      setMsg(tToast('profileSaved'))
      showSaved()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : tToast('profileSaveFailed'))
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const displayHeight = heightUnit === 'ft-in' && form.height_cm
    ? Math.round(form.height_cm / 2.54 * 10) / 10 : form.height_cm
  const displayWaist = waistUnit === 'inches' && form.default_waist_cm
    ? Math.round(form.default_waist_cm / 2.54 * 10) / 10 : form.default_waist_cm
  const displayWeight = weightUnit === 'lbs' && form.default_weight_kg
    ? Math.round(form.default_weight_kg * 2.205 * 10) / 10 : form.default_weight_kg

  const tierLabel = (t: string) => {
    const map: Record<string, string> = {
      glimpse: 'Glimpse (Free)', core: 'Core (Self-Hosted)', focus: 'Focus', insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
    }
    return map[t] ?? 'Early Access'
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
      toast.success(tToast('unitsReset'))
    } catch {
      setSaveStatus('error')
    }
  }

  const inp = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-card [&>option]:text-foreground"
  const ro = "w-full rounded-lg border border-border bg-muted px-2.5 py-1.5 text-sm text-muted-foreground cursor-not-allowed"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label={tCommon('email')}>
          <input type="email" value={profile.email} readOnly className={ro} />
        </Field>
        <Field label={t('displayName')}>
          <input type="text" value={form.display_name ?? ''} onChange={e => setForm({ ...form, display_name: e.target.value || null })} className={inp} placeholder={t('displayNamePlaceholder')} />
        </Field>
        <Field label={t('gender')}>
          <select value={form.gender ?? ''} onChange={e => setForm({ ...form, gender: e.target.value || null })} className={inp}>
            <option value="">{tCommon('notSet')}</option>
            <option value="male">{t('genderOptions.male')}</option>
            <option value="female">{t('genderOptions.female')}</option>
            <option value="other">{t('genderOptions.other')}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('country')}>
          <select value={form.country_code ?? ''} onChange={e => setForm({ ...form, country_code: e.target.value || null })} className={inp}>
            <option value="">{tCommon('notSet')}</option>
            {localizedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={tCommon('license')}>
          <input type="text" value={tierLabel(profile.tier)} readOnly className={ro} />
        </Field>
        <Field label={t('language')}>
          <select value={locale} onChange={handleLocaleChange} className={inp}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>
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

      {/* Body Measurements */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">{t('bodyMeasurements')}</h3>
        <p className="text-xs text-muted-foreground">{t('bodyMeasurementsDesc')}</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="settings-age" className="text-sm text-muted-foreground">{t('age')}</label>
              <InfoTooltip>{t('ageTooltip')}</InfoTooltip>
            </div>
            <input id="settings-age" type="text" inputMode="numeric" pattern="[0-9]*" value={form.age ?? ''} onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              setForm({ ...form, age: v ? Number(v) : null })
            }} className={"w-16 " + inp} />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="settings-height" className="text-sm text-muted-foreground">{t('height')}</label>
              <InfoTooltip>{t('heightTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input id="settings-height" type="text" inputMode="decimal" value={displayHeight ?? ''} onChange={e => {
                const filtered = filterDecimal(e.target.value)
                const v = parseDecimal(filtered)
                setForm({ ...form, height_cm: heightUnit === 'ft-in' && v ? Math.round(v * 2.54 * 10) / 10 : v })
              }} className={"w-16 " + inp} />
              <select value={heightUnit} onChange={e => setHeightUnit(e.target.value as 'cm' | 'ft-in')} className="w-14 rounded-lg border border-border bg-card px-1 py-1.5 text-xs text-foreground">
                <option value="cm">cm</option><option value="ft-in">in</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="settings-waist" className="text-sm text-muted-foreground">{t('waist')}</label>
              <InfoTooltip>{t('waistTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input id="settings-waist" type="text" inputMode="decimal" value={displayWaist ?? ''} onChange={e => {
                const filtered = filterDecimal(e.target.value)
                const v = parseDecimal(filtered)
                setForm({ ...form, default_waist_cm: waistUnit === 'inches' && v ? Math.round(v * 2.54 * 10) / 10 : v })
              }} className={"w-20 " + inp} />
              <select value={waistUnit} onChange={e => setWaistUnit(e.target.value as 'cm' | 'inches')} className="w-14 rounded-lg border border-border bg-card px-1 py-1.5 text-xs text-foreground">
                <option value="cm">cm</option><option value="inches">in</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="settings-weight" className="text-sm text-muted-foreground">{t('weight')}</label>
              <InfoTooltip>{t('weightTooltip')}</InfoTooltip>
            </div>
            <div className="flex gap-1">
              <input id="settings-weight" type="text" inputMode="decimal" value={weightText} onChange={e => {
                const filtered = filterDecimal(e.target.value)
                setWeightText(filtered)
                const v = parseDecimal(filtered)
                setForm({ ...form, default_weight_kg: weightUnit === 'lbs' && v ? Math.round(v / 2.205 * 10) / 10 : v })
              }} className={"w-16 " + inp} />
              <select value={weightUnit} onChange={e => setWeightUnit(e.target.value as 'kg' | 'lbs')} className="w-14 rounded-lg border border-border bg-card px-1 py-1.5 text-xs text-foreground">
                <option value="kg">kg</option><option value="lbs">lbs</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lifestyle Defaults */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('lifestyleDefaults')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('lifestyleDefaultsDesc')}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
              <FieldWithInfo label={tCommon('dietProtocol')} items={['carnivore','keto','omnivore','vegetarian','vegan','paleo','mediterranean','other'].map(k => ({ name: tCommon(k as 'carnivore'), desc: t(`dietDescs.${k}` as 'dietDescs.carnivore') }))}>
                <select value={lForm.default_diet_protocol ?? ''} onChange={e => setLForm({ ...lForm, default_diet_protocol: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('notSet')}</option>
                  <option value="carnivore">{tCommon('carnivore')}</option>
                  <option value="keto">{tCommon('keto')}</option>
                  <option value="omnivore">{t('diets.omnivore')}</option>
                  <option value="vegetarian">{tCommon('vegetarian')}</option>
                  <option value="vegan">{tCommon('vegan')}</option>
                  <option value="paleo">{tCommon('paleo')}</option>
                  <option value="mediterranean">{tCommon('mediterranean')}</option>
                  <option value="other">{tCommon('other')}</option>
                </select>
                {lForm.default_diet_protocol && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`dietDescs.${lForm.default_diet_protocol}`)}</p>
                )}
              </FieldWithInfo>
              <FieldWithInfo label={tCommon('fastingProtocol')} items={['16_8','18_6','20_4','omad','36h','48h','extended'].map(k => ({ name: k === '16_8' || k === 'omad' || k === '36h' || k === '48h' || k === 'extended' ? tFasting(k as '16_8') : tCommon(k as '18_6'), desc: t(`fastingDescs.${k}` as 'fastingDescs.16_8') }))}>
                <select value={lForm.default_fasting_protocol ?? ''} onChange={e => setLForm({ ...lForm, default_fasting_protocol: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('none')}</option>
                  <option value="16_8">{tFasting('16_8')}</option>
                  <option value="18_6">{tCommon('18_6')}</option>
                  <option value="20_4">{tCommon('20_4')}</option>
                  <option value="omad">{tFasting('omad')}</option>
                  <option value="36h">{tFasting('36h')}</option>
                  <option value="48h">{tFasting('48h')}</option>
                  <option value="extended">{tFasting('extended')}</option>
                </select>
                {lForm.default_fasting_protocol && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`fastingDescs.${lForm.default_fasting_protocol}`)}</p>
                )}
              </FieldWithInfo>
              <FieldWithInfo label={t('exerciseLevel')} items={['strength','cardio','walking','hiit','yoga','swimming','cycling','pilates','rest'].map(k => ({ name: tCommon(k as 'strength'), desc: t(`exerciseDescs.${k}` as 'exerciseDescs.strength') }))}>
                <select value={lForm.default_exercise ?? ''} onChange={e => setLForm({ ...lForm, default_exercise: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('none')}</option>
                  <option value="strength">{tCommon('strength')}</option>
                  <option value="cardio">{tCommon('cardio')}</option>
                  <option value="walking">{tCommon('walking')}</option>
                  <option value="hiit">{tCommon('hiit')}</option>
                  <option value="yoga">{tCommon('yoga')}</option>
                  <option value="swimming">{tCommon('swimming')}</option>
                  <option value="cycling">{tCommon('cycling')}</option>
                  <option value="pilates">{tCommon('pilates')}</option>
                  <option value="rest">{tCommon('rest')}</option>
                </select>
                {lForm.default_exercise && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`exerciseDescs.${lForm.default_exercise}`)}</p>
                )}
              </FieldWithInfo>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label htmlFor="settings-sleep-hours" className="text-sm text-muted-foreground">{t('sleepHoursLabel')}</label>
                  <InfoTooltip>{t('sleepHoursInfo')}</InfoTooltip>
                </div>
                <input id="settings-sleep-hours" type="text" inputMode="decimal" value={sleepText} onChange={e => {
                  const filtered = filterDecimal(e.target.value)
                  setSleepText(filtered)
                  setLForm({ ...lForm, default_sleep_hours: parseDecimal(filtered) })
                }} className={inp} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label htmlFor="settings-sleep-quality" className="text-sm text-muted-foreground">{t('sleepQualityTitle')}</label>
                  <InfoTooltip>{t('sleepQualityInfo')}</InfoTooltip>
                </div>
                <select id="settings-sleep-quality" value={lForm.default_sleep_quality ?? ''} onChange={e => setLForm({ ...lForm, default_sleep_quality: e.target.value || null })} className={inp}>
                  <option value="">{tCommon('notSet')}</option>
                  <option value="excellent">{tSleep('excellent')}</option>
                  <option value="good">{tCommon('good')}</option>
                  <option value="fair">{tCommon('fair')}</option>
                  <option value="poor">{tSleep('poor')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label htmlFor="settings-stress-level" className="text-sm text-muted-foreground">{t('stressLevelLabel')}</label>
                  <InfoTooltip>{t('stressLevelInfo')}</InfoTooltip>
                </div>
                <select
                  id="settings-stress-level"
                  value={lForm.default_stress_level ?? ''}
                  onChange={e => setLForm({ ...lForm, default_stress_level: e.target.value ? Number(e.target.value) : null })}
                  className={inp}
                >
                  <option value="">{tCommon('notSet')}</option>
                  <option value="1">{tStress('none')}</option>
                  <option value="3">{tStress('low')}</option>
                  <option value="5">{tStress('moderate')}</option>
                  <option value="7">{tStress('high')}</option>
                  <option value="9">{tStress('veryHigh')}</option>
                </select>
              </div>
            </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {saving ? tCommon('saving') : t('saveProfile')}
        </button>
        {msg && <span className={msg === tToast('profileSaved') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{msg}</span>}
      </div>

      {/* Install App */}
      {(canInstall || isInstalled) && (
        <div className="border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{tInstall('title')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{tInstall('description')}</p>
          </div>
          {canInstall ? (
            <button
              onClick={promptInstall}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              {tInstall('button')}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
              <Check className="h-4 w-4" />
              {tInstall('installed')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
