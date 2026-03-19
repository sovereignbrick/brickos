'use client'

import { useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function InfoTooltip({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ x: r.right + 8, y: r.top + r.height / 2 })
    }
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="text-blue-500 dark:text-muted-foreground/50 hover:text-blue-600 dark:hover:text-muted-foreground cursor-help shrink-0 text-xs"
      >
        ⓘ
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateY(-50%)', zIndex: 9999 }}
          className="max-w-xs bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-xl pointer-events-none"
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}

export function MarkerInfoTooltip({ slug, markers, allMarkers }: {
  slug: string
  markers: Record<string, { name: string; description: string | null; tooltip: string | null }>
  allMarkers?: { marker_slug: string; abbreviation: string | null; what_is: string | null }[]
}) {
  const cm = markers[slug]
  const markerData = allMarkers?.find(m => m.marker_slug === slug)
  const desc = cm?.description ?? markerData?.what_is
  if (!desc) return null

  return (
    <InfoTooltip>
      <div className="space-y-1">
        <div className="font-medium">{cm?.name ?? slug}</div>
        {markerData?.abbreviation && (
          <div className="text-muted-foreground">{markerData.abbreviation}</div>
        )}
        <div>{desc}</div>
      </div>
    </InfoTooltip>
  )
}
