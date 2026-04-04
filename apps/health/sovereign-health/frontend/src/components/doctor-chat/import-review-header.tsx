'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { DateOnlyPicker } from '@/components/date-time-picker'

export interface ImportContext {
  measuredAt: string
  dietProtocol: string
  fastingProtocol: string
  mealTiming: string
  deviceId: string
  labId: string
  labName: string
  labAddress: string
  labPostalCode: string
  labCity: string
  labCountry: string
}

interface ImportReviewHeaderProps {
  fileName: string
  markerCount: number
  rowCount?: number
  initialDate?: string
  initialLabProvider?: string
  initialLabAddress?: string
  initialLabPostalCode?: string
  initialLabCity?: string
  initialLabCountry?: string
  suggestedLabId?: string | null
  existingLabs?: Array<{ id: string; name: string; address?: string | null; city?: string | null }>
  showLabSection?: boolean
  showDatePicker?: boolean
  showDeviceDropdown?: boolean
  onChange: (ctx: ImportContext) => void
  onCancel: () => void
}

export function ImportReviewHeader({
  fileName,
  markerCount,
  rowCount,
  initialDate,
  initialLabProvider,
  initialLabAddress,
  initialLabPostalCode,
  initialLabCity,
  initialLabCountry,
  suggestedLabId,
  existingLabs: existingLabsProp,
  showLabSection = true,
  showDatePicker = true,
  showDeviceDropdown = true,
  onChange,
  onCancel,
}: ImportReviewHeaderProps) {
  const t = useTranslations('import')
  const tCommon = useTranslations('common')
  const { user } = useAuth()

  const [measuredAt, setMeasuredAt] = useState(initialDate || '')
  const [dietProtocol, setDietProtocol] = useState('none')
  const [fastingProtocol, setFastingProtocol] = useState('none')
  const [mealTiming, setMealTiming] = useState('no_tag')
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)

  // Device selection
  const [devices, setDevices] = useState<Array<{ id: string; device_name: string }>>([])
  const [deviceId, setDeviceId] = useState('')

  // Load user default protocols from settings
  useEffect(() => {
    if (defaultsLoaded) return
    api.settings.get()
      .then(res => {
        const ld = res.data?.lifestyle_defaults
        if (ld?.default_diet_protocol) setDietProtocol(ld.default_diet_protocol)
        if (ld?.default_fasting_protocol) setFastingProtocol(ld.default_fasting_protocol)
        if (ld?.default_meal_timing) setMealTiming(ld.default_meal_timing)
        setDefaultsLoaded(true)
      })
      .catch(() => setDefaultsLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lab selection
  const existingLabs = existingLabsProp || []
  const [labId, setLabId] = useState(suggestedLabId || '_new')
  const [labName, setLabName] = useState(initialLabProvider || '')
  const [labAddress, setLabAddress] = useState(initialLabAddress || '')
  const [labPostalCode, setLabPostalCode] = useState(initialLabPostalCode || '')
  const [labCity, setLabCity] = useState(initialLabCity || '')
  const [labCountry, setLabCountry] = useState(initialLabCountry || '')

  const isNewLab = labId === '_new'

  // Fetch user's devices
  useEffect(() => {
    api.devices.list()
      .then(res => setDevices((res.data || []).filter((d: { status?: string }) => d.status !== 'archived')))
      .catch(() => {})
  }, [])

  // Push changes to parent on every state change
  useEffect(() => {
    onChange({
      measuredAt,
      dietProtocol,
      fastingProtocol,
      mealTiming,
      deviceId,
      labId: isNewLab ? '' : labId,
      labName: isNewLab ? labName : '',
      labAddress,
      labPostalCode,
      labCity,
      labCountry,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredAt, dietProtocol, fastingProtocol, mealTiming, deviceId, labId, labName, labAddress, labPostalCode, labCity, labCountry])

  // When selecting existing lab, fill address fields
  const handleLabSelect = (id: string) => {
    setLabId(id)
    if (id !== '_new') {
      const lab = existingLabs.find(l => l.id === id)
      if (lab) {
        setLabName(lab.name)
        if (lab.address) setLabAddress(lab.address)
        if (lab.city) setLabCity(lab.city)
      }
    } else {
      setLabName(initialLabProvider || '')
      setLabAddress(initialLabAddress || '')
      setLabPostalCode(initialLabPostalCode || '')
      setLabCity(initialLabCity || '')
      setLabCountry(initialLabCountry || '')
    }
  }

  const inputCls = "bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
  const selectCls = "bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground [&>option]:bg-card [&>option]:text-foreground"

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('reviewTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {fileName} - {markerCount} {t('markersFound')}{rowCount != null && rowCount > 0 ? `, ${rowCount} ${t('rowsFound') || 'rows'}` : ''}
          </p>
        </div>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          {tCommon('cancel')}
        </button>
      </div>

      {/* Import context row */}
      <div className="flex gap-3 flex-wrap">
        {showDatePicker && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('measurementDate')}</label>
            <DateOnlyPicker value={measuredAt} onChange={setMeasuredAt} className={inputCls} />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('mealTiming')}</label>
          <select value={mealTiming} onChange={e => setMealTiming(e.target.value)} className={selectCls}>
            <option value="no_tag">{t('mealTimingNoTag')}</option>
            <option value="fasting">{t('mealTimingFasting')}</option>
            <option value="before">{t('mealTimingBefore')}</option>
            <option value="30m_after">{t('mealTiming30mAfter')}</option>
            <option value="1h_after">{t('mealTiming1hAfter')}</option>
            <option value="2h_after">{t('mealTiming2hAfter')}</option>
            <option value="3h_after">{t('mealTiming3hAfter')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('dietProtocol')}</label>
          <select value={dietProtocol} onChange={e => setDietProtocol(e.target.value)} className={selectCls}>
            <option value="none">{t('dietNone')}</option>
            <option value="carnivore">{t('dietCarnivore')}</option>
            <option value="keto">{t('dietKeto')}</option>
            <option value="vegan">{t('dietVegan')}</option>
            <option value="vegetarian">{t('dietVegetarian')}</option>
            <option value="mediterranean">{t('dietMediterranean')}</option>
            <option value="mixed">{t('dietMixed')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('fastingProtocol')}</label>
          <select value={fastingProtocol} onChange={e => setFastingProtocol(e.target.value)} className={selectCls}>
            <option value="none">{t('fastingNone')}</option>
            <option value="16_8">{t('fasting16_8')}</option>
            <option value="omad">{t('fastingOMAD')}</option>
            <option value="36h">{t('fasting36h')}</option>
            <option value="48h">{t('fasting48h')}</option>
            <option value="72h">{t('fasting72h')}</option>
            <option value="extended">{t('fastingExtended')}</option>
          </select>
        </div>
        {showDeviceDropdown && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('deviceSelect')}</label>
            <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className={selectCls}>
              <option value="">{t('deviceNone')}</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.device_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lab section */}
      {showLabSection && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('labInfo')}</h3>

          {existingLabs.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('labSelectExisting')}</label>
              <select value={labId} onChange={e => handleLabSelect(e.target.value)} className={`${selectCls} w-full`}>
                {existingLabs.map(lab => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}{lab.city ? ` - ${lab.city}` : ''}
                  </option>
                ))}
                <option value="_new">{t('labCreateNew')}</option>
              </select>
            </div>
          )}

          {isNewLab && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('labName')}</label>
                <input type="text" value={labName} onChange={e => setLabName(e.target.value)} placeholder={t('labNamePlaceholder')} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('labAddress')}</label>
                <input type="text" value={labAddress} onChange={e => setLabAddress(e.target.value)} placeholder={t('labAddressPlaceholder')} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('labPostalCode')}</label>
                <input type="text" value={labPostalCode} onChange={e => setLabPostalCode(e.target.value)} placeholder="12345" className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('labCity')}</label>
                <input type="text" value={labCity} onChange={e => setLabCity(e.target.value)} placeholder={t('labCityPlaceholder')} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('labCountry')}</label>
                <input type="text" value={labCountry} onChange={e => setLabCountry(e.target.value)} placeholder={t('labCountryPlaceholder')} className={`${inputCls} w-full`} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
