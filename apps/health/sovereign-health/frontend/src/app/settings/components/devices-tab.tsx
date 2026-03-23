'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { MarkerWithZone, DeviceInfo } from '@/lib/types'
import { InfoTooltip, MarkerInfoTooltip } from '@/components/info-tooltip'
import { formatDate as fmtDate } from '@/lib/date-format'

/* ================================================================
   Constants
   ================================================================ */

const DEVICE_TYPE_VALUES = ['home', 'lab', 'wearable', 'scale', 'other'] as const

const MANUFACTURER_SUGGESTIONS = [
  'ForaCare', 'Qardio', 'Abbott', 'Roche', 'Omron', 'Withings', 'Garmin', 'Apple', 'Oura', 'Dexcom',
]

// Device type labels come from i18n (devices.deviceTypes.*)

/* ================================================================
   DeviceCard
   ================================================================ */

function DeviceCard({ device, markers, onEdit, onDelete, onSetDefault }: {
  device: DeviceInfo
  markers: MarkerWithZone[]
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const tDev = useTranslations('devices')
  const tCommon = useTranslations('common')
  const { markers: contentMarkers } = useContent()
  const markerNames = device.markers_measured
    .map(slug => {
      const cm = contentMarkers[slug]
      if (cm?.name) return cm.name
      const m = markers.find(mk => mk.marker_slug === slug)
      return m?.display_name ?? m?.marker_name ?? slug
    })
    .join(', ')

  return (
    <div className={`border rounded-xl p-4 ${device.device_type === 'lab' ? 'border-purple-300 dark:border-purple-800' : 'border-blue-300 dark:border-blue-800'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{device.device_name}</span>
          {device.is_default && device.device_type !== 'lab' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 font-medium">
              {tDev('default')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!device.is_default && device.device_type !== 'lab' && (
            <button onClick={onSetDefault} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
              {tDev('setDefault')}
            </button>
          )}
          <button onClick={onEdit} className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1">
            {tCommon('edit')}
          </button>
          <button onClick={onDelete} className="text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-1">
            {tDev('archive')}
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          {device.manufacturer && <span>{device.manufacturer}</span>}
          {device.manufacturer && ' | '}
          {device.device_type === 'other' ? tCommon('other') : (tDev(`deviceTypes.${device.device_type}` as 'deviceTypes.home') || device.device_type)}
        </p>
        {device.device_type !== 'lab' && device.markers_measured.length > 0 && (
          <p>{tDev('measures', { markers: markerNames })}</p>
        )}
        <p>
          {tDev('measurementCount', { count: device.measurement_count })}
          {device.last_used && ` | ${tDev('lastUsed', { date: fmtDate(device.last_used) })}`}
        </p>
        {device.notes && <p>{tDev('notes', { notes: device.notes })}</p>}
        {device.validation_status && device.validation_date && (
          <p className="text-emerald-400/80">
            {tDev('validatedOn', { date: fmtDate(device.validation_date) })}
            {device.validation_notes && `: ${device.validation_notes}`}
          </p>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   DeviceModal
   ================================================================ */

function DeviceModal({ device, markers, initialType, onClose, onSaved }: {
  device: DeviceInfo | null
  markers: MarkerWithZone[]
  initialType?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tDev = useTranslations('devices')
  const { markers: contentMarkers, zones: contentZones } = useContent()
  const isEdit = !!device
  const [name, setName] = useState(device?.device_name ?? '')
  const [manufacturer, setManufacturer] = useState(device?.manufacturer ?? '')
  const [model, setModel] = useState(device?.model ?? '')
  const [deviceType, setDeviceType] = useState(device?.device_type ?? initialType ?? 'home')
  const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(
    new Set(device?.markers_measured ?? [])
  )
  const [isDefault, setIsDefault] = useState(device?.is_default ?? false)
  const [notes, setNotes] = useState(device?.notes ?? '')
  const [markerSearch, setMarkerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [validationNotes, setValidationNotes] = useState(device?.validation_notes ?? '')
  const [validationStatus, setValidationStatus] = useState(device?.validation_status ?? '')
  const [labAddress, setLabAddress] = useState(device?.lab_address ?? '')
  const [labPostalCode, setLabPostalCode] = useState(device?.lab_postal_code ?? '')
  const [labCity, setLabCity] = useState(device?.lab_city ?? '')
  const [labCountry, setLabCountry] = useState(device?.lab_country ?? '')

  // Group markers by zone (deduplicate by marker_slug)
  const zoneGroups = useMemo(() => {
    const seen = new Set<string>()
    const groups: Record<string, { name: string; icon: string; color: string; markers: MarkerWithZone[] }> = {}
    for (const m of markers) {
      if (seen.has(m.marker_slug)) continue
      seen.add(m.marker_slug)
      const zs = m.zone_slug ?? 'other'
      if (!groups[zs]) {
        const translatedZoneName = contentZones[zs]?.name ?? m.zone_name ?? 'Other'
        groups[zs] = {
          name: translatedZoneName,
          icon: m.zone_icon ?? '',
          color: m.zone_color ?? '#71717a',
          markers: [],
        }
      }
      groups[zs].markers.push(m)
    }
    return Object.entries(groups)
  }, [markers, contentZones])

  const filteredZoneGroups = useMemo(() => {
    if (!markerSearch.trim()) return zoneGroups
    const q = markerSearch.toLowerCase()
    return zoneGroups
      .map(([slug, group]) => {
        const filtered = group.markers.filter(m => {
          const cm = contentMarkers[m.marker_slug]
          return (cm?.name ?? m.display_name ?? m.marker_name).toLowerCase().includes(q) ||
            m.marker_slug.toLowerCase().includes(q) ||
            (m.abbreviation ?? '').toLowerCase().includes(q) ||
            (cm?.description ?? '').toLowerCase().includes(q) ||
            (m.what_is ?? '').toLowerCase().includes(q)
        })
        return [slug, { ...group, markers: filtered }] as const
      })
      .filter(([, g]) => g.markers.length > 0)
  }, [zoneGroups, markerSearch, contentMarkers])

  const toggleMarker = (slug: string) => {
    setSelectedMarkers(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(tToast('deviceNameRequired'))
      return
    }
    setSaving(true)
    try {
      if (isEdit && device) {
        await api.devices.update(device.id, {
          name: name.trim(),
          manufacturer: deviceType !== 'lab' ? (manufacturer || null) : null,
          model: deviceType !== 'lab' ? (model || null) : null,
          device_type: deviceType,
          markers: [...selectedMarkers],
          is_default: isDefault,
          notes: notes || null,
          validation_notes: validationNotes || null,
          validation_status: validationStatus || null,
          validation_date: validationStatus ? new Date().toISOString() : null,
          lab_address: deviceType === 'lab' ? (labAddress || null) : null,
          lab_postal_code: deviceType === 'lab' ? (labPostalCode || null) : null,
          lab_city: deviceType === 'lab' ? (labCity || null) : null,
          lab_country: deviceType === 'lab' ? (labCountry || null) : null,
        })
        toast.success(tToast('deviceUpdated'))
      } else {
        await api.devices.create({
          name: name.trim(),
          manufacturer: deviceType !== 'lab' ? (manufacturer || null) : undefined,
          model: deviceType !== 'lab' ? (model || null) : undefined,
          device_type: deviceType,
          markers: [...selectedMarkers],
          is_default: isDefault,
          notes: notes || null,
          lab_address: deviceType === 'lab' ? (labAddress || undefined) : undefined,
          lab_postal_code: deviceType === 'lab' ? (labPostalCode || undefined) : undefined,
          lab_city: deviceType === 'lab' ? (labCity || undefined) : undefined,
          lab_country: deviceType === 'lab' ? (labCountry || undefined) : undefined,
        })
        toast.success(tToast('deviceAdded'))
      }
      onSaved()
    } catch {
      toast.error(isEdit ? tToast('deviceUpdateFailed') : tToast('deviceAddFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">{isEdit ? (deviceType === 'lab' ? tDev('editLab') : tDev('editDevice')) : (deviceType === 'lab' ? tDev('addLabTitle') : tDev('addDeviceTitle'))}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="settings-device-name" className="text-xs text-muted-foreground block mb-1">{tCommon('nameLabel')} *</label>
            <input
              id="settings-device-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={deviceType === 'lab' ? tDev('placeholders.labName') : tDev('placeholders.deviceName')}
              className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Type — before manufacturer/model so conditional fields appear after */}
          <div>
            <label htmlFor="settings-device-type" className="text-xs text-muted-foreground block mb-1">{tDev('typeLabel')} *</label>
            <select
              id="settings-device-type"
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
              disabled={deviceType === 'lab'}
              className={`w-full bg-card text-foreground border border-border rounded-lg px-3 py-2 text-sm [&>option]:bg-card [&>option]:text-foreground ${deviceType === 'lab' ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {DEVICE_TYPE_VALUES.map(v => <option key={v} value={v}>{v === 'other' ? tCommon('other') : tDev(`deviceTypes.${v}` as 'deviceTypes.home')}</option>)}
            </select>
          </div>

          {deviceType === 'lab' ? (
            <>
              {/* Lab-specific fields */}
              <div>
                <label htmlFor="settings-lab-address" className="text-xs text-muted-foreground block mb-1">{tDev('labAddress')}</label>
                <input
                  id="settings-lab-address"
                  type="text"
                  value={labAddress}
                  onChange={e => setLabAddress(e.target.value)}
                  placeholder={tDev('placeholders.labAddress')}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="settings-lab-postal-code" className="text-xs text-muted-foreground block mb-1">{tDev('labPostalCode')}</label>
                  <input
                    id="settings-lab-postal-code"
                    type="text"
                    value={labPostalCode}
                    onChange={e => setLabPostalCode(e.target.value)}
                    placeholder="12345"
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="settings-lab-city" className="text-xs text-muted-foreground block mb-1">{tDev('labCity')}</label>
                  <input
                    id="settings-lab-city"
                    type="text"
                    value={labCity}
                    onChange={e => setLabCity(e.target.value)}
                    placeholder={tDev('placeholders.labCity')}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="settings-lab-country" className="text-xs text-muted-foreground block mb-1">{tDev('labCountry')}</label>
                <input
                  id="settings-lab-country"
                  type="text"
                  value={labCountry}
                  onChange={e => setLabCountry(e.target.value)}
                  placeholder={tDev('placeholders.labCountry')}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              {/* Manufacturer */}
              <div>
                <label htmlFor="settings-device-manufacturer" className="text-xs text-muted-foreground block mb-1">{tDev('manufacturerLabel')}</label>
                <input
                  id="settings-device-manufacturer"
                  type="text"
                  value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)}
                  placeholder={tDev('placeholders.manufacturer')}
                  list="mfr-suggestions"
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                />
                <datalist id="mfr-suggestions">
                  {MANUFACTURER_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              {/* Model */}
              <div>
                <label htmlFor="settings-device-model" className="text-xs text-muted-foreground block mb-1">{tDev('modelLabel')}</label>
                <input
                  id="settings-device-model"
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder={tDev('placeholders.model')}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {/* Markers */}
          <div>
            <label htmlFor="settings-device-marker-search" className="text-xs text-muted-foreground block mb-1">
              {tDev('markersSelected', { count: selectedMarkers.size })}
            </label>
            <input
              id="settings-device-marker-search"
              type="text"
              value={markerSearch}
              onChange={e => setMarkerSearch(e.target.value)}
              placeholder={tCommon('searchMarkers')}
              className="w-full bg-accent border rounded-lg px-3 py-2 text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              {filteredZoneGroups.map(([slug, group]) => (
                <div key={slug}>
                  <div
                    className="px-3 py-1.5 text-xs font-medium sticky top-0 bg-card border-b border-border flex items-center gap-1"
                    style={{ color: group.color }}
                  >
                    <span>{group.icon}</span> {group.name}
                  </div>
                  {group.markers.map((m, idx) => (
                    <label
                      key={`${m.marker_slug}-${idx}`}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarkers.has(m.marker_slug)}
                        onChange={() => toggleMarker(m.marker_slug)}
                        className="rounded"
                      />
                      <span className="flex-1 min-w-0 flex items-center gap-1">
                        <span className="truncate">
                          {contentMarkers[m.marker_slug]?.name ?? m.display_name ?? m.marker_name}
                        </span>
                        {m.abbreviation && (
                          <span className="text-muted-foreground shrink-0">({m.abbreviation})</span>
                        )}
                        <MarkerInfoTooltip slug={m.marker_slug} markers={contentMarkers} allMarkers={markers} />
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{m.unit_canonical}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Default — hide for lab devices */}
          {deviceType !== 'lab' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">{tDev('setAsDefault')}</span>
              <InfoTooltip>{tDev('setAsDefaultTooltip')}</InfoTooltip>
            </label>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="settings-device-notes" className="text-xs text-muted-foreground block mb-1">{tCommon('notesLabel')}</label>
            <textarea
              id="settings-device-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={deviceType === 'lab' ? tDev('placeholders.labNotes') : tDev('placeholders.notes')}
              rows={2}
              className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Validation (edit only, not for labs) */}
          {isEdit && deviceType !== 'lab' && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tDev('validation')}</p>
              <div>
                <label htmlFor="settings-device-status" className="text-xs text-muted-foreground block mb-1">{tDev('statusLabel')}</label>
                <select
                  id="settings-device-status"
                  value={validationStatus}
                  onChange={e => setValidationStatus(e.target.value)}
                  className="w-full bg-card text-foreground border border-border rounded-lg px-3 py-2 text-sm [&>option]:bg-card [&>option]:text-foreground"
                >
                  <option value="">{tDev('notValidated')}</option>
                  <option value="validated">{tDev('validated')}</option>
                  <option value="pending">{tDev('pendingStatus')}</option>
                  <option value="deviation_noted">{tDev('deviationNoted')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="settings-device-validation-notes" className="text-xs text-muted-foreground block mb-1">{tDev('validationNotes')}</label>
                <input
                  id="settings-device-validation-notes"
                  type="text"
                  value={validationNotes}
                  onChange={e => setValidationNotes(e.target.value)}
                  placeholder={tDev('placeholders.validationNotes')}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors">
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? tCommon('saving') : isEdit ? tDev('saveChanges') : (deviceType === 'lab' ? tDev('addLabTitle') : tDev('addDeviceTitle'))}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   DevicesTab (public export)
   ================================================================ */

export function DevicesTab({ markers }: { markers: MarkerWithZone[] }) {
  const tToast = useTranslations('settings.toast')
  const tCommon = useTranslations('common')
  const tDev = useTranslations('devices')
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDevice, setEditDevice] = useState<DeviceInfo | null>(null)
  const [initialDeviceType, setInitialDeviceType] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(() => {
    api.devices.list()
      .then(r => setDevices(r.data ?? []))
      .catch(() => toast.error(tToast('loadDevicesFailed')))
      .finally(() => setLoading(false))
  }, [tToast])

  useEffect(() => { load() }, [load])

  const handleArchive = async (id: string) => {
    try {
      await api.devices.delete(id)
      setDevices(prev => prev.filter(d => d.id !== id))
      setDeleteConfirm(null)
      toast.success(tToast('deviceArchived'))
    } catch {
      toast.error(tToast('deviceArchiveFailed'))
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.devices.setDefault(id)
      setDevices(prev => prev.map(d => ({ ...d, is_default: d.id === id })))
      toast.success(tToast('defaultDeviceUpdated'))
    } catch {
      toast.error(tToast('defaultDeviceFailed'))
    }
  }

  const personalDevices = devices.filter(d => d.device_type !== 'lab')
  const labDevices = devices.filter(d => d.device_type === 'lab')

  if (loading) return <p className="text-muted-foreground">{tCommon('loading')}</p>

  return (
    <div className="space-y-6">
      {/* Two-column layout: Devices | Labs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Devices column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{tDev('title')}</h2>
              <InfoTooltip>{tDev('deviceTooltip')}</InfoTooltip>
            </div>
            <button
              onClick={() => { setEditDevice(null); setInitialDeviceType(null); setShowModal(true) }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              {tDev('addDevice')}
            </button>
          </div>
          {personalDevices.length === 0 ? (
            <div className="border border-dashed border-blue-200 dark:border-blue-900 rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm">{tDev('noDevicesTitle')}</p>
              <p className="text-muted-foreground text-xs mt-1">{tDev('noDevicesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {personalDevices.map(d => (
                <DeviceCard
                  key={d.id}
                  device={d}
                  markers={markers}
                  onEdit={() => { setEditDevice(d); setInitialDeviceType(null); setShowModal(true) }}
                  onDelete={() => setDeleteConfirm(d.id)}
                  onSetDefault={() => handleSetDefault(d.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Labs column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-semibold text-purple-600 dark:text-purple-400">{tDev('yourLabs')}</h2>
              <InfoTooltip>{tDev('labTooltip')}</InfoTooltip>
            </div>
            <button
              onClick={() => { setEditDevice(null); setInitialDeviceType('lab'); setShowModal(true) }}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              {tDev('addLab')}
            </button>
          </div>
          {labDevices.length === 0 ? (
            <div className="border border-dashed border-purple-200 dark:border-purple-900 rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm">{tDev('noDevicesTitle')}</p>
              <p className="text-muted-foreground text-xs mt-1">{tDev('labTooltip')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {labDevices.map(d => (
                <DeviceCard
                  key={d.id}
                  device={d}
                  markers={markers}
                  onEdit={() => { setEditDevice(d); setShowModal(true) }}
                  onDelete={() => setDeleteConfirm(d.id)}
                  onSetDefault={() => handleSetDefault(d.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">{tDev('archiveTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {tDev('archiveWarning', { name: devices.find(d => d.id === deleteConfirm)?.device_name ?? '' })}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors">
                {tCommon('cancel')}
              </button>
              <button onClick={() => handleArchive(deleteConfirm)} className="text-sm px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors">
                {tDev('archive')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <DeviceModal
          device={editDevice}
          markers={markers}
          initialType={initialDeviceType}
          onClose={() => { setShowModal(false); setEditDevice(null) }}
          onSaved={() => { setShowModal(false); setEditDevice(null); load() }}
        />
      )}
    </div>
  )
}
