'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ImportSession } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { ImportReviewHeader, ImportContext } from './import-review-header'

interface ImportReviewProps {
  session: ImportSession
  onConfirm: (markers: Array<{ marker_slug: string; value: number }>, opts: {
    measured_at?: string; protocol_tag?: string; meal_timing_tag?: string;
    diet_protocol?: string; fasting_protocol?: string; device_id?: string;
    lab_id?: string; lab_name?: string; lab_address?: string; lab_postal_code?: string; lab_city?: string; lab_country?: string
  }) => void
  onCancel: () => void
  isLoading: boolean
}

function MarkerTooltip({ slug }: { slug: string }) {
  const { markers } = useContent()
  const desc = markers[slug]?.description
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)
  if (!desc) return null
  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ x: r.right + 8, y: r.top + r.height / 2 }) } setShow(true) }}
        onMouseLeave={() => setShow(false)}
        className="text-blue-500 dark:text-muted-foreground/50 hover:text-blue-600 dark:hover:text-muted-foreground cursor-help shrink-0 text-xs ml-1"
      >
        ⓘ
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateY(-50%)', zIndex: 9999 }} className="max-w-xs bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-xl pointer-events-none">
          <div className="font-medium mb-1">{markers[slug]?.name ?? slug}</div>
          <div>{desc}</div>
        </div>,
        document.body
      )}
    </>
  )
}

export function ImportReview({ session, onConfirm, onCancel, isLoading }: ImportReviewProps) {
  const t = useTranslations('import')
  const tCommon = useTranslations('common')
  const { markers: contentMarkers } = useContent()
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

  // Unmatched marker manual assignments (index → marker_slug)
  const [unmatchedAssignments, setUnmatchedAssignments] = useState<Record<number, string>>({})

  // Import context from shared header
  const [importCtx, setImportCtx] = useState<ImportContext>({
    measuredAt: session.lab_date || '',
    dietProtocol: 'none', fastingProtocol: 'none', mealTiming: 'no_tag',
    deviceId: '', labId: '', labName: '', labAddress: '', labPostalCode: '', labCity: '', labCountry: '',
  })

  const handleConfirm = () => {
    const markers = [
      ...matchedMarkers
        .filter(m => m.matched_marker && selected[m.matched_marker])
        .map(m => ({
          marker_slug: m.matched_marker!,
          value: values[m.matched_marker!] ?? m.value_converted ?? m.value_original,
        })),
      ...Object.entries(unmatchedAssignments)
        .filter(([, slug]) => slug && selected[slug])
        .map(([idx, slug]) => ({
          marker_slug: slug,
          value: values[slug] ?? unmatchedMarkers[parseInt(idx)]?.value_original ?? 0,
        })),
    ]
    onConfirm(markers, {
      measured_at: importCtx.measuredAt ? new Date(importCtx.measuredAt + 'T08:00:00Z').toISOString() : undefined,
      protocol_tag: importCtx.fastingProtocol !== 'none' ? 'fasting' : 'standard',
      meal_timing_tag: importCtx.mealTiming !== 'no_tag' ? importCtx.mealTiming : undefined,
      diet_protocol: importCtx.dietProtocol !== 'none' ? importCtx.dietProtocol : undefined,
      fasting_protocol: importCtx.fastingProtocol !== 'none' ? importCtx.fastingProtocol : undefined,
      device_id: importCtx.deviceId || undefined,
      lab_id: importCtx.labId || undefined,
      lab_name: importCtx.labName || undefined,
      lab_address: importCtx.labAddress || undefined,
      lab_postal_code: importCtx.labPostalCode || undefined,
      lab_city: importCtx.labCity || undefined,
      lab_country: importCtx.labCountry || undefined,
    })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  const selectCls = "bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground [&>option]:bg-card [&>option]:text-foreground"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Shared header with all dropdowns */}
        <ImportReviewHeader
          fileName={session.file_name}
          markerCount={matchedMarkers.length + unmatchedMarkers.length}
          initialDate={session.lab_date || undefined}
          initialLabProvider={session.lab_provider || undefined}
          initialLabAddress={session.lab_address || undefined}
          initialLabPostalCode={session.lab_postal_code || undefined}
          initialLabCity={session.lab_city || undefined}
          initialLabCountry={session.lab_country || undefined}
          suggestedLabId={session.suggested_lab_id}
          existingLabs={session.existing_labs}
          showDeviceDropdown={false}
          onChange={setImportCtx}
          onCancel={onCancel}
        />

        {/* Matched markers table */}
        {matchedMarkers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('matchedMarkers')} ({matchedMarkers.length})
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent text-muted-foreground text-xs">
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
                    <th className="py-2 px-3 text-left">{t('marker')}</th>
                    <th className="py-2 px-3 text-right">{t('value')}</th>
                    <th className="py-2 px-3 text-left">{t('unit')}</th>
                    <th className="py-2 px-3 text-center">{t('confidence')}</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedMarkers.map((m, i) => (
                    <tr key={i} className={`border-t border-border ${!selected[m.matched_marker!] ? 'opacity-40' : ''}`}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selected[m.matched_marker!] ?? false}
                          onChange={e => setSelected(prev => ({ ...prev, [m.matched_marker!]: e.target.checked }))}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-foreground font-medium">
                        <span className="inline-flex items-center">
                          {contentMarkers[m.matched_marker!]?.name ?? m.matched_marker}
                          <MarkerTooltip slug={m.matched_marker!} />
                        </span>
                        <span className="block text-[10px] text-muted-foreground">{m.original_name}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={values[m.matched_marker!] ?? m.value_converted ?? m.value_original}
                          onChange={e => setValues(prev => ({ ...prev, [m.matched_marker!]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 text-right bg-accent border border-border rounded px-2 py-1 text-foreground text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{m.unit_converted || m.unit_original}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          m.match_confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                          m.match_confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          m.match_confidence === 'fuzzy' ? 'bg-purple-500/20 text-purple-400' :
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

        {/* Unmatched markers — user can manually assign */}
        {unmatchedMarkers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('unmatched')} ({unmatchedMarkers.length}) — {t('unmatchedAssignHint')}
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {unmatchedMarkers.map((m, i) => (
                    <tr key={i} className="border-t border-border first:border-t-0">
                      <td className="py-2 px-3 text-muted-foreground">{m.original_name}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{m.value_original}</td>
                      <td className="py-2 px-3 text-muted-foreground">{m.unit_original}</td>
                      <td className="py-2 px-3">
                        <select
                          value={unmatchedAssignments[i] || ''}
                          onChange={e => {
                            const slug = e.target.value
                            setUnmatchedAssignments(prev => ({ ...prev, [i]: slug }))
                            if (slug) {
                              setSelected(prev => ({ ...prev, [slug]: true }))
                              setValues(prev => ({ ...prev, [slug]: m.value_original }))
                            }
                          }}
                          className={`${selectCls} text-xs`}
                        >
                          <option value="">{t('unmatchedSkip')}</option>
                          {Object.entries(contentMarkers)
                            .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''))
                            .map(([slug, info]) => (
                              <option key={slug} value={slug}>{info.name || slug}</option>
                            ))
                          }
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {t('selectedCount', { count: selectedCount })}
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
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
