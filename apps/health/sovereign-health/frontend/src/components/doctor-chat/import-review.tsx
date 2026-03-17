'use client'

import { useState } from 'react'
import { ImportSession } from '@/lib/types'
import { useTranslations } from 'next-intl'

interface ImportReviewProps {
  session: ImportSession
  onConfirm: (markers: Array<{ marker_slug: string; value: number }>, opts: {
    measured_at?: string; protocol_tag?: string;
    lab_name?: string; lab_address?: string; lab_postal_code?: string; lab_city?: string; lab_country?: string
  }) => void
  onCancel: () => void
  isLoading: boolean
}

export function ImportReview({ session, onConfirm, onCancel, isLoading }: ImportReviewProps) {
  const t = useTranslations('import')
  const tCommon = useTranslations('common')
  const matchedMarkers = (session.extracted || []).filter(m => m.matched_marker)
  const unmatchedMarkers = (session.extracted || []).filter(m => !m.matched_marker)

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    matchedMarkers.forEach(m => {
      if (m.matched_marker) init[m.matched_marker] = true
    })
    return init
  })

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    matchedMarkers.forEach(m => {
      if (m.matched_marker && m.value_converted != null) {
        init[m.matched_marker] = m.value_converted
      }
    })
    return init
  })

  const [measuredAt, setMeasuredAt] = useState(session.lab_date || '')
  const [protocolTag, setProtocolTag] = useState('standard')

  // Lab fields — pre-filled from AI extraction
  const [labName, setLabName] = useState(session.lab_provider || '')
  const [labAddress, setLabAddress] = useState(session.lab_address || '')
  const [labPostalCode, setLabPostalCode] = useState(session.lab_postal_code || '')
  const [labCity, setLabCity] = useState(session.lab_city || '')
  const [labCountry, setLabCountry] = useState(session.lab_country || '')

  const handleConfirm = () => {
    const markers = matchedMarkers
      .filter(m => m.matched_marker && selected[m.matched_marker])
      .map(m => ({
        marker_slug: m.matched_marker!,
        value: values[m.matched_marker!] ?? m.value_converted ?? m.value_original,
      }))
    onConfirm(markers, {
      measured_at: measuredAt ? new Date(measuredAt + 'T08:00:00Z').toISOString() : undefined,
      protocol_tag: protocolTag,
      lab_name: labName.trim() || undefined,
      lab_address: labAddress.trim() || undefined,
      lab_postal_code: labPostalCode.trim() || undefined,
      lab_city: labCity.trim() || undefined,
      lab_country: labCountry.trim() || undefined,
    })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  const inputCls = "bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
  const selectCls = "bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white [&>option]:bg-zinc-900 [&>option]:text-white"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('reviewTitle')}</h2>
            <p className="text-sm text-white/50 mt-1">
              {session.file_name}  - {session.total_count ?? matchedMarkers.length + unmatchedMarkers.length} {t('markersFound')}
            </p>
          </div>
          <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/60">
            {tCommon('cancel')}
          </button>
        </div>

        {/* Measurement info row */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-white/40 block mb-1">{t('measurementDate')}</label>
            <input
              type="date"
              value={measuredAt}
              onChange={e => setMeasuredAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">{t('protocol')}</label>
            <select
              value={protocolTag}
              onChange={e => setProtocolTag(e.target.value)}
              className={selectCls}
            >
              <option value="standard">Standard</option>
              <option value="fasting_16_8">Fasting 16:8</option>
              <option value="fasting_omad">OMAD</option>
              <option value="fasting_48h">48h Fast</option>
              <option value="fasting_extended">Extended Fast</option>
            </select>
          </div>
        </div>

        {/* Lab info — editable fields */}
        <div className="rounded-xl border border-zinc-700 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{t('labInfo')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('labName')}</label>
              <input
                type="text"
                value={labName}
                onChange={e => setLabName(e.target.value)}
                placeholder={t('labNamePlaceholder')}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('labAddress')}</label>
              <input
                type="text"
                value={labAddress}
                onChange={e => setLabAddress(e.target.value)}
                placeholder={t('labAddressPlaceholder')}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('labPostalCode')}</label>
              <input
                type="text"
                value={labPostalCode}
                onChange={e => setLabPostalCode(e.target.value)}
                placeholder="12345"
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('labCity')}</label>
              <input
                type="text"
                value={labCity}
                onChange={e => setLabCity(e.target.value)}
                placeholder={t('labCityPlaceholder')}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t('labCountry')}</label>
              <input
                type="text"
                value={labCountry}
                onChange={e => setLabCountry(e.target.value)}
                placeholder={t('labCountryPlaceholder')}
                className={`${inputCls} w-full`}
              />
            </div>
          </div>
        </div>

        {/* Matched markers table */}
        {matchedMarkers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white/60 mb-2">
              {t('matchedMarkers')} ({matchedMarkers.length})
            </h3>
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.03] text-white/40 text-xs">
                    <th className="py-2 px-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedCount === matchedMarkers.length}
                        onChange={e => {
                          const val = e.target.checked
                          const next: Record<string, boolean> = {}
                          matchedMarkers.forEach(m => { if (m.matched_marker) next[m.matched_marker] = val })
                          setSelected(next)
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="py-2 px-3 text-left">{t('labNameColumn')}</th>
                    <th className="py-2 px-3 text-left">{t('marker')}</th>
                    <th className="py-2 px-3 text-right">{t('value')}</th>
                    <th className="py-2 px-3 text-left">{t('unit')}</th>
                    <th className="py-2 px-3 text-center">{t('confidence')}</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedMarkers.map((m, i) => (
                    <tr key={i} className={`border-t border-white/5 ${!selected[m.matched_marker!] ? 'opacity-40' : ''}`}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selected[m.matched_marker!] ?? false}
                          onChange={e => setSelected(prev => ({ ...prev, [m.matched_marker!]: e.target.checked }))}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-white/50">{m.original_name}</td>
                      <td className="py-2 px-3 text-white font-medium">{m.matched_marker}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={values[m.matched_marker!] ?? m.value_converted ?? m.value_original}
                          onChange={e => setValues(prev => ({ ...prev, [m.matched_marker!]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 text-right bg-white/[0.05] border border-white/10 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-white/50">{m.unit_converted || m.unit_original}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          m.match_confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                          m.match_confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {m.match_confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unmatched markers */}
        {unmatchedMarkers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white/30 mb-2">
              {t('unmatched')} ({unmatchedMarkers.length}) - {t('unmatchedHint')}
            </h3>
            <div className="border border-white/5 rounded-xl overflow-hidden opacity-50">
              <table className="w-full text-sm">
                <tbody>
                  {unmatchedMarkers.map((m, i) => (
                    <tr key={i} className="border-t border-white/5 first:border-t-0">
                      <td className="py-2 px-3 text-white/30">{m.original_name}</td>
                      <td className="py-2 px-3 text-right text-white/30">{m.value_original}</td>
                      <td className="py-2 px-3 text-white/20">{m.unit_original}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-white/40">
            {t('selectedCount', { count: selectedCount })}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? t('importing') : t('importCount', { count: selectedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
