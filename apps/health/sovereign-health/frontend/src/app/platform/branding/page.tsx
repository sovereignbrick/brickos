'use client'

import { useState } from 'react'

const PRESETS = [
  { id: 'brickos-dark', name: 'BrickOS Dark', primary: '#f97316', bg: '#09090b', text: '#fafafa' },
  { id: 'brickos-light', name: 'BrickOS Light', primary: '#f97316', bg: '#fafafa', text: '#09090b' },
  { id: 'clinical', name: 'Clinical', primary: '#2563eb', bg: '#09090b', text: '#fafafa' },
  { id: 'minimal', name: 'Minimal', primary: '#71717a', bg: '#09090b', text: '#fafafa' },
]

export default function BrandingPage() {
  const [selectedPreset, setSelectedPreset] = useState('brickos-dark')
  const [colors, setColors] = useState({ primary: '#f97316', accent: '#f97316', background: '#09090b' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Branding</h1>
      <p className="text-sm text-zinc-400">Customize the look and feel of your organization&apos;s portal.</p>

      {/* Preset selector */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Theme Presets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedPreset(p.id); setColors({ primary: p.primary, accent: p.primary, background: p.bg }) }}
              className={`rounded-xl border p-3 text-left transition-colors ${selectedPreset === p.id ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-700'}`}
            >
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.bg, border: '1px solid #333' }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primary }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.text, border: '1px solid #333' }} />
              </div>
              <p className="text-xs font-medium">{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Color overrides */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Color Overrides</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Primary</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={colors.primary} onChange={e => setColors(c => ({ ...c, primary: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <input type="text" value={colors.primary} onChange={e => setColors(c => ({ ...c, primary: e.target.value }))} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Accent</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={colors.accent} onChange={e => setColors(c => ({ ...c, accent: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <input type="text" value={colors.accent} onChange={e => setColors(c => ({ ...c, accent: e.target.value }))} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Background</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={colors.background} onChange={e => setColors(c => ({ ...c, background: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
              <input type="text" value={colors.background} onChange={e => setColors(c => ({ ...c, background: e.target.value }))} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Logo upload */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Logo</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
            No logo
          </div>
          <div>
            <button className="text-xs text-blue-400 hover:text-blue-300 border border-zinc-700 px-3 py-1.5 rounded-lg">Upload Logo</button>
            <p className="text-[10px] text-zinc-500 mt-1">SVG or PNG, max 100KB</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Preview</h2>
        <div className="rounded-xl overflow-hidden border border-zinc-700" style={{ backgroundColor: colors.background }}>
          <div className="h-10 flex items-center px-4 border-b border-zinc-700">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: colors.primary }} />
            <span className="text-xs font-medium ml-2" style={{ color: colors.primary === '#f97316' ? '#fafafa' : colors.primary }}>Organization Name</span>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-3 rounded-full w-1/3" style={{ backgroundColor: colors.primary, opacity: 0.3 }} />
            <div className="h-2 rounded-full w-2/3 bg-zinc-700" />
            <div className="h-2 rounded-full w-1/2 bg-zinc-700" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Save Branding</button>
        <button className="text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 px-4 py-2 rounded-lg">Download JSON Template</button>
      </div>
    </div>
  )
}
