'use client'

import { useState, useEffect, useRef } from 'react'

export interface MultiSelectOption {
  key: string
  label: string
  count?: number
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onToggle: (key: string) => void
  /** Label shown when nothing is selected */
  allLabel: string
  /** Label shown when multiple items are selected */
  countLabel: (count: number) => string
  /** Enable search filtering */
  searchable?: boolean
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Label for empty results */
  emptyLabel?: string
}

export function MultiSelect({
  options,
  selected,
  onToggle,
  allLabel,
  countLabel,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No results',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const label = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? options.find(o => o.key === selected[0])?.label || selected[0]
      : countLabel(selected.length)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground ml-1 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-accent border rounded px-2 py-1 text-sm focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-48">
            {filtered.map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => onToggle(o.key)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                  selected.includes(o.key) ? 'bg-blue-600 border-blue-600 text-white' : 'border-border'
                }`}>
                  {selected.includes(o.key) && '\u2713'}
                </span>
                <span className="truncate">{o.label}</span>
                {o.count !== undefined && <span className="text-muted-foreground text-xs ml-auto shrink-0">({o.count})</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
