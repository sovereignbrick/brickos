'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useContent } from '@/lib/content-context'
import type { MarkerWithZone } from '@/lib/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// --- Country-to-unit defaults ---
export const COUNTRY_UNIT_DEFAULTS: Record<string, Record<string, string>> = {
  US: {
    glucose_unit: 'mg/dL', cholesterol_unit: 'mg/dL', uric_acid_unit: 'mg/dL',
    hemoglobin_unit: 'g/dL', weight_unit: 'lbs', height_unit: 'in', waist_unit: 'in',
    date_format: 'MM/DD/YYYY', time_format: '12h',
  },
  GB: {
    glucose_unit: 'mmol/L', cholesterol_unit: 'mmol/L', uric_acid_unit: '\u00b5mol/L',
    hemoglobin_unit: 'g/dL', weight_unit: 'lbs', height_unit: 'in', waist_unit: 'in',
    date_format: 'DD/MM/YYYY', time_format: '24h',
  },
}
export const EU_DEFAULT: Record<string, string> = {
  glucose_unit: 'mmol/L', cholesterol_unit: 'mmol/L', uric_acid_unit: '\u00b5mol/L',
  hemoglobin_unit: 'mmol/L', weight_unit: 'kg', height_unit: 'cm', waist_unit: 'cm',
  date_format: 'DD/MM/YYYY', time_format: '24h',
}

export function getCountryDefaults(cc: string | null): Record<string, string> {
  if (!cc) return EU_DEFAULT
  return COUNTRY_UNIT_DEFAULTS[cc] ?? EU_DEFAULT
}

// --- Per-marker unit options with conversion factors ---
export interface MarkerUnitDef {
  options: string[]
  group: string
  convert?: Record<string, Record<string, number>>
}

const MARKER_UNIT_MAP: Record<string, MarkerUnitDef> = {
  glucose: { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  fasting_glucose: { options: ['mmol/L', 'mg/dL'], group: 'glucose_unit', convert: { 'mmol/L': { 'mg/dL': 18.0182 }, 'mg/dL': { 'mmol/L': 1/18.0182 } } },
  total_cholesterol: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  ldl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  hdl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  vldl: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  non_hdl_c: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 38.67 }, 'mg/dL': { 'mmol/L': 1/38.67 } } },
  triglycerides: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 88.57 }, 'mg/dL': { 'mmol/L': 1/88.57 } } },
  apo_b: { options: ['g/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'g/L': { 'mg/dL': 100 }, 'mg/dL': { 'g/L': 0.01 } } },
  lp_a: { options: ['nmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'nmol/L': { 'mg/dL': 0.4167 }, 'mg/dL': { 'nmol/L': 2.4 } } },
  uric_acid: { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/59.48 }, 'mg/dL': { '\u00b5mol/L': 59.48 } } },
  hemoglobin: { options: ['mmol/L', 'g/dL'], group: 'hemoglobin_unit', convert: { 'mmol/L': { 'g/dL': 1.61 }, 'g/dL': { 'mmol/L': 1/1.61 } } },
  insulin: { options: ['mU/L', 'pmol/L'], group: 'glucose_unit', convert: { 'mU/L': { 'pmol/L': 6.945 }, 'pmol/L': { 'mU/L': 1/6.945 } } },
  hba1c: { options: ['%', 'mmol/mol'], group: 'glucose_unit', convert: { '%': { 'mmol/mol': 10.93 }, 'mmol/mol': { '%': 1/10.93 } } },
  creatinine: { options: ['\u00b5mol/L', 'mg/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { 'mg/dL': 1/88.4 }, 'mg/dL': { '\u00b5mol/L': 88.4 } } },
  vitamin_d: { options: ['nmol/L', 'ng/mL'], group: 'glucose_unit', convert: { 'nmol/L': { 'ng/mL': 1/2.496 }, 'ng/mL': { 'nmol/L': 2.496 } } },
  calcium: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 4.0 }, 'mg/dL': { 'mmol/L': 0.25 } } },
  magnesium: { options: ['mmol/L', 'mg/dL'], group: 'cholesterol_unit', convert: { 'mmol/L': { 'mg/dL': 2.43 }, 'mg/dL': { 'mmol/L': 1/2.43 } } },
  potassium: { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  sodium: { options: ['mmol/L', 'mEq/L'], group: 'glucose_unit' },
  iron: { options: ['\u00b5mol/L', '\u00b5g/dL'], group: 'uric_acid_unit', convert: { '\u00b5mol/L': { '\u00b5g/dL': 5.585 }, '\u00b5g/dL': { '\u00b5mol/L': 1/5.585 } } },
  weight: { options: ['kg', 'lbs'], group: 'weight_unit', convert: { 'kg': { 'lbs': 2.205 }, 'lbs': { 'kg': 1/2.205 } } },
  height: { options: ['cm', 'in'], group: 'height_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
  waist_circumference: { options: ['cm', 'in'], group: 'waist_unit', convert: { 'cm': { 'in': 1/2.54 }, 'in': { 'cm': 2.54 } } },
}

export function getMarkerUnitInfo(slug: string): MarkerUnitDef | null {
  return MARKER_UNIT_MAP[slug] ?? null
}

// --- Per-marker alternative units (display-only conversion, canonical values unchanged) ---
// factor = multiply canonical value by factor to get alternative unit value
const UNIT_ALTERNATIVES: Record<string, { unit: string; factor: number }[]> = {
  ketones: [{ unit: 'mg/dL', factor: 10.417 }],
  dheas: [{ unit: 'µg/dL', factor: 36.84 }],
  ft4: [{ unit: 'ng/dL', factor: 0.07769 }],
  ft3: [{ unit: 'pg/mL', factor: 0.6513 }],
  eosinophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  neutrophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  lymphocytes_abs: [{ unit: 'cells/µL', factor: 1000 }],
  monocytes_abs: [{ unit: 'cells/µL', factor: 1000 }],
  basophils_abs: [{ unit: 'cells/µL', factor: 1000 }],
  platelets: [{ unit: '10³/µL', factor: 1 }],
  wbc: [{ unit: '10³/µL', factor: 1 }],
  rbc: [{ unit: '10⁶/µL', factor: 1 }],
  vitamin_a: [{ unit: 'µg/dL', factor: 28.65 }],
  vitamin_e: [{ unit: 'mg/dL', factor: 0.04307 }],
  bilirubin_total: [{ unit: 'mg/dL', factor: 0.05847 }],
  bilirubin_direct: [{ unit: 'mg/dL', factor: 0.05847 }],
  ferritin: [{ unit: 'ng/mL', factor: 1 }],
  albumin: [{ unit: 'g/dL', factor: 0.1 }],
  total_protein: [{ unit: 'g/dL', factor: 0.1 }],
  testosterone: [{ unit: 'ng/dL', factor: 28.842 }],
  free_testosterone: [{ unit: 'pg/mL', factor: 0.2884 }],
  estradiol: [{ unit: 'pg/mL', factor: 0.2724 }],
  progesterone: [{ unit: 'ng/mL', factor: 0.3145 }],
  prolactin: [{ unit: 'ng/mL', factor: 0.04722 }],
  selenium: [{ unit: 'µmol/L', factor: 0.01266 }],
  zinc: [{ unit: 'µg/dL', factor: 6.538 }],
  phosphate: [{ unit: 'mg/dL', factor: 3.097 }],
  lpa: [{ unit: 'mg/dL', factor: 0.4167 }],
  tsh: [{ unit: 'µIU/mL', factor: 1 }],
  fsh: [{ unit: 'mIU/mL', factor: 1 }],
  lh: [{ unit: 'mIU/mL', factor: 1 }],
}

export function getAltUnits(slug: string): { unit: string; factor: number }[] | null {
  // Skip markers already handled by MARKER_UNIT_MAP (they have their own dropdown)
  if (MARKER_UNIT_MAP[slug]) return null
  return UNIT_ALTERNATIVES[slug] ?? null
}

// --- Normalize decimal input ---
export function normalizeDecimal(value: string): string {
  return value.replace(',', '.')
}

export function parseDecimal(value: string): number | null {
  const normalized = normalizeDecimal(value)
  if (normalized === '') return null
  const n = parseFloat(normalized)
  return isNaN(n) ? null : n
}

// --- Zone grouping utility ---
export function groupByZone(markers: MarkerWithZone[]) {
  const zones: { slug: string; name: string; icon: string; markers: MarkerWithZone[] }[] = []
  const zoneMap = new Map<string, MarkerWithZone[]>()
  const seen = new Set<string>()

  for (const m of markers) {
    if (seen.has(m.marker_slug)) continue
    seen.add(m.marker_slug)
    const zs = m.zone_slug ?? 'other'
    if (!zoneMap.has(zs)) zoneMap.set(zs, [])
    zoneMap.get(zs)!.push(m)
  }

  const zoneOrder = new Map<string, { name: string; icon: string; order: number }>()
  for (const m of markers) {
    if (m.zone_slug && !zoneOrder.has(m.zone_slug)) {
      zoneOrder.set(m.zone_slug, { name: m.zone_name ?? m.zone_slug, icon: m.zone_icon ?? '', order: m.zone_order })
    }
  }

  for (const slug of [...zoneMap.keys()].sort((a, b) => (zoneOrder.get(a)?.order ?? 999) - (zoneOrder.get(b)?.order ?? 999))) {
    const info = zoneOrder.get(slug)
    const zm = zoneMap.get(slug) ?? []
    zm.sort((a, b) => a.marker_name.localeCompare(b.marker_name))
    zones.push({ slug, name: info?.name ?? 'Other', icon: info?.icon ?? '', markers: zm })
  }
  return zones
}

// --- Info tooltip component ---
export function MarkerInfoButton({ marker }: { marker: MarkerWithZone }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const { markers: contentMarkers } = useContent()

  const cm = contentMarkers[marker.marker_slug]
  const displayName = cm?.name ?? marker.display_name ?? marker.marker_name
  const abbr = marker.abbreviation ?? marker.marker_name
  const tooltipText = cm?.description ?? cm?.tooltip ?? marker.what_is
  const hasTooltip = displayName || tooltipText

  const onEnter = () => {
    if (!hasTooltip) return
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setPos({ top: rect.top, left: rect.right + 8 })
      }
      setShow(true)
    }, 300)
  }
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }
  const onTap = (e: React.MouseEvent) => {
    if (!hasTooltip) return
    e.preventDefault()
    e.stopPropagation()
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 280) })
    }
    setShow(s => !s)
  }

  return (
    <div className="relative inline-flex" ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href={`/sovereign-health/markers/${marker.marker_slug}`}
        className="text-blue-500 dark:text-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </Link>
      <button
        className="absolute inset-0 sm:hidden"
        onClick={onTap}
        aria-label={displayName}
      />
      {show && pos && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-card border border-border rounded-lg shadow-xl p-3 text-xs"
          style={{ top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 320, whiteSpace: 'normal', wordWrap: 'break-word' }}
        >
          <p className="font-medium text-foreground">{displayName}</p>
          {abbr !== displayName && (
            <p className="text-muted-foreground">({abbr})</p>
          )}
          {tooltipText && (
            <p className="text-muted-foreground mt-1 leading-relaxed">{tooltipText}</p>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// --- Marker name + info button ---
export function MarkerNameLink({ marker }: { marker: MarkerWithZone }) {
  const { markers: contentMarkers } = useContent()
  const translatedName = contentMarkers[marker.marker_slug]?.name ?? marker.display_name ?? marker.marker_name
  const abbr = marker.abbreviation
  return (
    <span className="flex items-center gap-1 min-w-0">
      <span className="truncate">{translatedName}</span>
      {abbr && <span className="text-[10px] text-muted-foreground shrink-0">({abbr})</span>}
      <MarkerInfoButton marker={marker} />
    </span>
  )
}

/* ================================================================
   Shared layout primitives
   ================================================================ */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export function FieldWithInfo({ label, items, children }: { label: string; items: { name: string; desc: string }[]; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = () => {
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) })
      }
      setShow(true)
    }, 200)
  }
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave} className="inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-help transition-colors"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        {show && pos && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed bg-card border border-border rounded-lg shadow-xl p-3 text-xs"
            style={{ top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 320 }}
            onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
            onMouseLeave={onLeave}
          >
            <p className="font-medium text-foreground mb-2">{label}</p>
            <ul className="space-y-1">
              {items.map(it => (
                <li key={it.name} className="text-muted-foreground leading-snug">
                  <span className="text-foreground font-medium">{it.name}</span>: {it.desc}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
      </div>
      {children}
    </div>
  )
}
