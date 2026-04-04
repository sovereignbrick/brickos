'use client'

import { useState } from 'react'
import { MeasurementImportSession } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { ImportReviewHeader, ImportContext } from './import-review-header'

interface MeasurementImportReviewProps {
  session: MeasurementImportSession
  onConfirm: (
    columnMapping: Array<{ marker_slug: string; device_id?: string | null; unit?: string }>,
    selectedRows: number[],
    skipDuplicates: boolean,
    protocolOverrides?: Record<string, string>,
    context?: { measured_at_override?: string; diet_protocol?: string; fasting_protocol?: string; meal_timing_tag?: string }
  ) => void
  onCancel: () => void
  isLoading: boolean
}

export function MeasurementImportReview({ session, onConfirm, onCancel, isLoading }: MeasurementImportReviewProps) {
  const t = useTranslations('measurementImport')
  const tCommon = useTranslations('common')
  const { markers: contentMarkers } = useContent()

  const matchedColumns = (session.columns || []).filter(c => c.marker_slug && c.match_confidence !== 'calculated_skip')
  const calculatedColumns = (session.columns || []).filter(c => c.match_confidence === 'calculated_skip')
  const unmatchedColumns = (session.columns || []).filter(c => !c.marker_slug && c.match_confidence !== 'calculated_skip')

  // Import context from shared header
  const [importCtx, setImportCtx] = useState<ImportContext>({
    measuredAt: '', dietProtocol: 'none', fastingProtocol: 'none', mealTiming: 'no_tag',
    deviceId: '', labId: '', labName: '', labAddress: '', labPostalCode: '', labCity: '', labCountry: '',
  })

  // Row selection
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    session.rows.forEach((row, i) => {
      if (row.values && Object.keys(row.values).length > 0) init[i] = true
    })
    return init
  })

  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Detect duplicate rows
  const duplicateRows = new Set<number>()
  const rowFingerprints = new Map<string, number[]>()
  session.rows.forEach((row, i) => {
    if (!row.values || Object.keys(row.values).length === 0) return
    const fp = `${row.date}|${row.time}|${JSON.stringify(row.values, Object.keys(row.values).sort())}`
    const existing = rowFingerprints.get(fp)
    if (existing) {
      existing.push(i)
      existing.forEach(idx => duplicateRows.add(idx))
    } else {
      rowFingerprints.set(fp, [i])
    }
  })

  const selectedCount = Object.values(selectedRows).filter(Boolean).length
  const selectableRows = session.rows.filter(r => r.values && Object.keys(r.values).length > 0)

  const handleConfirm = () => {
    const mapping = matchedColumns
      .filter(c => c.marker_slug)
      .map(c => ({
        marker_slug: c.marker_slug!,
        device_id: importCtx.deviceId || c.device_id || null,
        unit: c.unit,
      }))

    const rows = Object.entries(selectedRows)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k))

    const ctx = {
      measured_at_override: importCtx.measuredAt ? new Date(importCtx.measuredAt + 'T08:00:00Z').toISOString() : undefined,
      diet_protocol: importCtx.dietProtocol !== 'none' ? importCtx.dietProtocol : undefined,
      fasting_protocol: importCtx.fastingProtocol !== 'none' ? importCtx.fastingProtocol : undefined,
      meal_timing_tag: importCtx.mealTiming !== 'no_tag' ? importCtx.mealTiming : undefined,
    }
    onConfirm(mapping, rows, skipDuplicates, undefined, ctx)
  }

  const allSelected = selectedCount === selectableRows.length && selectableRows.length > 0
  const toggleAll = () => {
    const next: Record<number, boolean> = {}
    const val = !allSelected
    session.rows.forEach((row, i) => {
      if (row.values && Object.keys(row.values).length > 0) next[i] = val
    })
    setSelectedRows(next)
  }

  const selectCls = "bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground [&>option]:bg-card [&>option]:text-foreground"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Shared header with all dropdowns */}
        <ImportReviewHeader
          fileName={session.file_name}
          markerCount={session.total_markers}
          rowCount={session.total_rows}
          showLabSection={false}
          showDatePicker={true}
          onChange={setImportCtx}
          onCancel={onCancel}
        />

        {/* Column Mapping */}
        {matchedColumns.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('columnMapping')}
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent text-muted-foreground text-xs">
                    <th className="py-2 px-3 text-left">{t('sourceColumn')}</th>
                    <th className="py-2 px-3 text-left">{t('matchedMarker')}</th>
                    <th className="py-2 px-3 text-left">{t('unit')}</th>
                    <th className="py-2 px-3 text-center">{t('confidence')}</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedColumns.map((col, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 px-3 text-muted-foreground text-xs">{col.source_name}</td>
                      <td className="py-2 px-3 text-foreground font-medium">
                        {contentMarkers[col.marker_slug!]?.name ?? col.marker_slug}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{col.unit}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          col.match_confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                          col.match_confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          col.match_confidence === 'fuzzy' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {col.match_confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unmatched Columns */}
        {unmatchedColumns.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('unmatchedColumns')} ({unmatchedColumns.length})
            </h3>
            <div className="border border-border rounded-xl overflow-hidden opacity-50">
              <table className="w-full text-sm">
                <tbody>
                  {unmatchedColumns.map((col, i) => (
                    <tr key={i} className="border-t border-border first:border-t-0">
                      <td className="py-2 px-3 text-muted-foreground">{col.source_name}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{t('skipped')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calculated Columns (skipped) */}
        {calculatedColumns.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('calculatedSkip')} ({calculatedColumns.length})
            </h3>
            <div className="border border-border rounded-xl overflow-hidden opacity-50">
              <table className="w-full text-sm">
                <tbody>
                  {calculatedColumns.map((col, i) => (
                    <tr key={i} className="border-t border-border first:border-t-0">
                      <td className="py-2 px-3 text-muted-foreground">{col.source_name}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{t('calculatedSkip')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Row Preview */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('rowPreview')} ({session.rows.length})
          </h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent text-muted-foreground text-xs">
                    <th className="py-2 px-3 text-left w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="py-2 px-2 text-left">{t('date')}</th>
                    <th className="py-2 px-2 text-left">{t('time')}</th>
                    {matchedColumns.map((col, i) => (
                      <th key={i} className="py-2 px-2 text-right whitespace-nowrap">
                        {col.abbreviation || contentMarkers[col.marker_slug!]?.name || col.marker_slug}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {session.rows.map((row, ri) => {
                    const hasValues = row.values && Object.keys(row.values).length > 0
                    if (!hasValues) return null
                    return (
                      <tr key={ri} className={`border-t border-border ${!selectedRows[ri] ? 'opacity-40' : ''} ${duplicateRows.has(ri) ? 'bg-amber-500/10' : ''}`}>
                        <td className="py-1.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedRows[ri] ?? false}
                            onChange={e => setSelectedRows(prev => ({ ...prev, [ri]: e.target.checked }))}
                            className="rounded"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-foreground text-xs whitespace-nowrap">
                          {row.date}
                          {duplicateRows.has(ri) && (
                            <span className="ml-1 text-amber-500 text-[10px]" title={t('duplicateRow')}>dup</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground text-xs">{row.time}</td>
                        {matchedColumns.map((col, ci) => {
                          const val = col.marker_slug ? row.values[col.marker_slug] : undefined
                          return (
                            <td key={ci} className="py-1.5 px-2 text-right text-xs text-foreground tabular-nums">
                              {val != null ? val : <span className="text-muted-foreground">-</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Duplicate toggle */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} className="rounded" />
          {t('skipDuplicates')}
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {t('selectedCount', { count: selectedCount })} / {selectableRows.length}
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading || matchedColumns.length === 0}
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
