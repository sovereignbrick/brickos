'use client'

import { useState } from 'react'
import { ImportSession } from '@/lib/types'

interface ImportReviewProps {
  session: ImportSession
  onConfirm: (markers: Array<{ marker_slug: string; value: number }>, opts: { measured_at?: string; protocol_tag?: string }) => void
  onCancel: () => void
  isLoading: boolean
}

export function ImportReview({ session, onConfirm, onCancel, isLoading }: ImportReviewProps) {
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
    })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Review Extracted Results</h2>
            <p className="text-sm text-white/50 mt-1">
              {session.file_name}  - {session.total_count ?? matchedMarkers.length + unmatchedMarkers.length} markers found
            </p>
          </div>
          <button onClick={onCancel} className="text-sm text-white/40 hover:text-white/60">
            Cancel
          </button>
        </div>

        {/* Lab info */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-white/40 block mb-1">Measurement Date</label>
            <input
              type="date"
              value={measuredAt}
              onChange={e => setMeasuredAt(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </div>
          {session.lab_provider && (
            <div>
              <label className="text-xs text-white/40 block mb-1">Lab Provider</label>
              <span className="text-sm text-white/70">{session.lab_provider}</span>
            </div>
          )}
          <div>
            <label className="text-xs text-white/40 block mb-1">Protocol</label>
            <select
              value={protocolTag}
              onChange={e => setProtocolTag(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="standard">Standard</option>
              <option value="fasting_16_8">Fasting 16:8</option>
              <option value="fasting_omad">OMAD</option>
              <option value="fasting_48h">48h Fast</option>
              <option value="fasting_extended">Extended Fast</option>
            </select>
          </div>
        </div>

        {/* Matched markers table */}
        {matchedMarkers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white/60 mb-2">
              Matched Markers ({matchedMarkers.length})
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
                    <th className="py-2 px-3 text-left">Lab Name</th>
                    <th className="py-2 px-3 text-left">Marker</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3 text-left">Unit</th>
                    <th className="py-2 px-3 text-center">Confidence</th>
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
              Unmatched ({unmatchedMarkers.length})  - these markers could not be mapped
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
            {selectedCount} marker{selectedCount !== 1 ? 's' : ''} selected for import
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : `Import ${selectedCount} Marker${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
