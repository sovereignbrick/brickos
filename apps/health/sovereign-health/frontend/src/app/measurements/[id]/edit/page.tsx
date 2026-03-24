'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Measurement } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumb } from '@/components/breadcrumb'
import { StatusBadge } from '@/components/status-badge'
import { computeStatus, DEFAULT_RANGES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { useOffline } from '@/lib/offline-context'
import { formatDate } from '@/lib/date-format'
import { DateTimePicker } from '@/components/date-time-picker'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'

function formatLocalDatetime(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

const STRESS_OPTIONS = [
  { key: 'notRecorded' as const, value: '' },
  { key: 'none' as const,        value: '1' },
  { key: 'low' as const,         value: '3' },
  { key: 'moderate' as const,    value: '5' },
  { key: 'high' as const,        value: '7' },
  { key: 'veryHigh' as const,    value: '9' },
]

export default function EditMeasurementPage() {
  const { user, loading } = useAuth()
  const { isOffline } = useOffline()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const t = useTranslations('newMeasurement')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const tProtocols = useTranslations('protocols')
  const tFasting = useTranslations('fastingProtocols')
  const tExercise = useTranslations('exercise')
  const tSleepQuality = useTranslations('sleepQuality')
  const tStressLevel = useTranslations('stressLevel')
  const { markers: contentMarkers } = useContent()

  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Form fields
  const [value, setValue] = useState('')
  const [measuredAt, setMeasuredAt] = useState('')
  const [protocol, setProtocol] = useState<'standard' | 'fasting'>('standard')
  const [dietProtocol, setDietProtocol] = useState('')
  const [fastingProtocol, setFastingProtocol] = useState('16_8')
  const [fastStart, setFastStart] = useState('')
  const [exercise, setExercise] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [stressLevel, setStressLevel] = useState('')
  const [note, setNote] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [devices, setDevices] = useState<import('@/lib/types').DeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (!loading && user) {
      api.measurements.get(id)
        .then(res => {
          const m = res.data
          setMeasurement(m)
          setValue(String(m.value))
          setMeasuredAt(formatLocalDatetime(new Date(m.timestamp)))
          setProtocol((m.protocol_tag === 'fasting' ? 'fasting' : 'standard') as 'standard' | 'fasting')
          setDietProtocol(m.diet_protocol ?? '')
          setFastingProtocol(m.fasting_protocol ?? '16_8')
          setFastStart(m.fasting_hours ? '' : '')
          setExercise(m.exercise_activity ?? '')
          setSleepHours(m.sleep_hours != null ? String(m.sleep_hours) : '')
          setSleepQuality(m.sleep_quality ?? '')
          setStressLevel(m.stress_level != null ? String(m.stress_level) : '')
          setNote(m.lifestyle_note ?? '')
          setDeviceId(m.device_id ?? '')
        })
        .catch(() => setMeasurement(null))
        .finally(() => setFetching(false))
      api.devices.list()
        .then(res => setDevices(res.data ?? []))
        .catch(() => {})
    }
  }, [user, loading, router, id])

  const markDirty = () => { if (!dirty) setDirty(true) }

  const handleSave = async () => {
    if (!measurement) return
    const numVal = parseFloat(value)
    if (isNaN(numVal)) { toast.error(t('invalidValue')); return }

    setSaving(true)
    try {
      await api.measurements.update(id, {
        value: numVal,
        measured_at: new Date(measuredAt).toISOString(),
        protocol_tag: protocol,
        device_id: deviceId || undefined,
        ...(protocol === 'fasting' ? {
          fasting_protocol: fastingProtocol,
          fast_start_datetime: fastStart ? new Date(fastStart).toISOString() : undefined,
        } : {
          diet_protocol: dietProtocol || undefined,
        }),
        exercise_activity: exercise || undefined,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        sleep_quality: sleepQuality || undefined,
        stress_level: stressLevel ? parseInt(stressLevel) : undefined,
        lifestyle_note: note || undefined,
      })
      toast.success(t('updated'))
      router.back()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (dirty && !confirm(t('discardChanges'))) return
    router.back()
  }

  // Helper: translate diet protocol value
  const translateDiet = (val: string) => {
    if (!val) return tCommon('notSet')
    if (val === 'only_fish') return tProtocols('onlyFish')
    if (val === 'standard') return tProtocols('standard')
    if (['carnivore', 'keto', 'vegan', 'mediterranean', 'paleo', 'vegetarian'].includes(val)) return tCommon(val)
    return tProtocols(val)
  }

  // Helper: translate exercise value
  const translateExercise = (val: string) => {
    if (!val) return tCommon('notSet')
    if (['cardio', 'cycling', 'hiit', 'none', 'pilates', 'rest', 'strength', 'swimming', 'walking', 'yoga'].includes(val)) return tCommon(val)
    return tExercise(val)
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tCommon('loading')}</div>
  )

  if (!measurement) return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('measurementNotFound')}</p>
        <Link href="/measurements" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          {t('backToHistory')}
        </Link>
      </main>
    </div>
  )

  const markerName = contentMarkers[measurement.marker_slug]?.name ?? measurement.marker_name
  const numVal = parseFloat(value)
  const range = DEFAULT_RANGES[measurement.marker_slug]
  const status = !isNaN(numVal) && range ? computeStatus(numVal, range) : null

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: tNav('history'), href: '/measurements' },
            { label: t('editMarkerTitle', { marker: markerName }) },
          ]} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold">{t('editTitle')}</h1>
          <button
            type="button"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* ── Row 1: Date/Time ─────────────────────────────────────── */}
        <div className="rounded-xl border p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-muted-foreground block mb-1">{t('dateTime')}</label>
              <DateTimePicker
                value={measuredAt}
                onChange={v => { setMeasuredAt(v); markDirty() }}
                countryCode={user?.country_code}
              />
            </div>
            {devices.length > 0 && (
              <div className="min-w-40">
                <label htmlFor="meas-edit-device" className="text-xs text-muted-foreground block mb-1">{t('device')}</label>
                <select
                  id="meas-edit-device"
                  value={deviceId}
                  onChange={e => { setDeviceId(e.target.value); markDirty() }}
                  className="bg-popover border border-border rounded-lg px-2.5 py-1.5 text-sm w-full text-foreground [&>option]:bg-popover [&>option]:text-foreground"
                >
                  <option value="">{t('manualEntry')}</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.device_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Recorded values (snapshot from measurement) ──── */}
        <div className="rounded-xl border p-4 mb-4 space-y-4">
          {/* Recorded snapshot (read-only) */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
              {t('lifestyle.profileDefaults')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-[10px] text-muted-foreground block">{tCommon('dietProtocol')}</span>
                <span className="text-sm">{translateDiet(measurement.diet_protocol ?? '')}</span>
              </div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-[10px] text-muted-foreground block">{tCommon('fastingProtocol')}</span>
                <span className="text-sm">
                  {measurement.fasting_protocol
                    ? (['none', '18_6', '20_4'].includes(measurement.fasting_protocol) ? tCommon(measurement.fasting_protocol) : tFasting(measurement.fasting_protocol))
                    : tCommon('none')}
                </span>
              </div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-[10px] text-muted-foreground block">{t('lifestyle.exercise')}</span>
                <span className="text-sm">{translateExercise(measurement.exercise_activity ?? '')}</span>
              </div>
            </div>
          </div>

          {/* Session overrides (editable) */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
              {t('lifestyle.sessionOverrides')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="meas-edit-sleep-hours" className="text-xs text-muted-foreground block mb-1">{t('lifestyle.sleepHours')}</label>
                <input
                  id="meas-edit-sleep-hours"
                  type="text"
                  inputMode="decimal"
                  value={sleepHours}
                  onInput={e => {
                    const el = e.currentTarget
                    el.value = el.value.replace(/[^0-9.,-]/g, '').replace(',', '.')
                  }}
                  onChange={e => { setSleepHours(e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.')); markDirty() }}
                  placeholder="-"
                  className="w-full bg-accent border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="meas-edit-sleep-quality" className="text-xs text-muted-foreground block mb-1">{t('lifestyle.sleepQuality')}</label>
                <select
                  id="meas-edit-sleep-quality"
                  value={sleepQuality}
                  onChange={e => { setSleepQuality(e.target.value); markDirty() }}
                  className="w-full bg-popover border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground [&>option]:bg-popover [&>option]:text-foreground"
                >
                  <option value="">-</option>
                  <option value="poor">{tSleepQuality('poor')}</option>
                  <option value="fair">{tCommon('fair')}</option>
                  <option value="good">{tCommon('good')}</option>
                  <option value="excellent">{tSleepQuality('excellent')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="meas-edit-stress-level" className="text-xs text-muted-foreground block mb-1">{t('lifestyle.stressLevel')}</label>
                <select
                  id="meas-edit-stress-level"
                  value={stressLevel}
                  onChange={e => { setStressLevel(e.target.value); markDirty() }}
                  className="w-full bg-popover border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground [&>option]:bg-popover [&>option]:text-foreground"
                >
                  {STRESS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{tStressLevel(o.key)}</option>
                  ))}
                </select>
              </div>
              {protocol === 'fasting' && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{t('lifestyle.fastStarted')}</label>
                  <DateTimePicker
                    value={fastStart}
                    onChange={v => { setFastStart(v); markDirty() }}
                    countryCode={user?.country_code}
                    className="w-full bg-accent border rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="meas-edit-note" className="text-xs text-muted-foreground block mb-1">{t('lifestyle.note')}</label>
            <textarea
              id="meas-edit-note"
              value={note}
              onChange={e => { setNote(e.target.value.slice(0, 300)); markDirty() }}
              rows={2}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder={t('lifestyle.notePlaceholder')}
            />
            <p className="text-xs text-muted-foreground text-right">{t('lifestyle.charCount', { chars: note.length })}</p>
          </div>
        </div>

        {/* ── Row 3: Marker value ──────────────────────────────────── */}
        <div className="rounded-xl border mb-4">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('recordedValues')}
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold flex-1 min-w-0 truncate">{markerName}</span>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onInput={e => {
                  const el = e.currentTarget
                  el.value = el.value.replace(/[^0-9.,-]/g, '').replace(',', '.')
                }}
                onChange={e => { setValue(e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.')); markDirty() }}
                className="w-24 bg-accent border rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">{measurement.unit}</span>
              <div className="w-6 shrink-0 flex justify-center">
                {status && <StatusBadge status={status} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Save button ──────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isOffline}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {saving ? tCommon('saving') : t('saveChanges')}
          </button>
        </div>

        {/* ── Delete ───────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              setDeleting(true)
              try {
                await api.measurements.delete(id)
                toast.success(t('deleted'))
                router.back()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : tCommon('deleteFailed'))
                setDeleting(false)
                setConfirmDelete(false)
              }
            }}
            disabled={deleting}
            className={`w-full rounded-xl py-2.5 text-sm font-medium transition-colors ${
              confirmDelete
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent text-red-400 hover:bg-red-500/10 border border-red-500/30'
            } disabled:opacity-50`}
          >
            {deleting ? t('deleting') : confirmDelete
              ? t('confirmDeleteMeasurement', { date: formatDate(measurement.timestamp, user?.country_code) })
              : t('deleteMeasurement')}
          </button>
          {confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {tCommon('cancel')}
            </button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
