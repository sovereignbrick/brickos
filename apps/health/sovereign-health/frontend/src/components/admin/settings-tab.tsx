'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

interface AppSetting {
  key: string
  value: unknown
  description: string | null
  category: string
  updated_at: string | null
  updated_by: string | null
}

const CATEGORY_ORDER = ['access', 'infobar_app', 'infobar_web', 'health_coach', 'dr_alex', 'integrations', 'content', 'affiliate', 'notifications', 'security', 'promo']

const CATEGORY_LABELS: Record<string, string> = {
  access: 'Access Control',
  infobar_app: 'Info Bar (App)',
  infobar_web: 'Info Bar (Homepage)',
  health_coach: 'Health Coach (Website)',
  dr_alex: 'Dr. Alex (App)',
  integrations: 'Integrations',
  content: 'Content & Uploads',
  affiliate: 'Affiliate',
  notifications: 'Notifications',
  security: 'Security',
  promo: 'Promo Codes',
}

const DANGEROUS_KEYS = new Set(['stripe_live_mode', 'maintenance_mode'])

function settingLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Dr Alex', 'Dr. Alex')
    .replace('Ip', 'IP')
    .replace('Api', 'API')
    .replace('Btc', 'BTC')
    .replace('Pct', '%')
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function SettingRow({ setting, onUpdate }: { setting: AppSetting; onUpdate: (key: string, value: unknown) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  const isDangerous = DANGEROUS_KEYS.has(setting.key)
  const val = setting.value

  const save = async (newValue: unknown) => {
    if (isDangerous && confirmKey !== setting.key) {
      setConfirmKey(setting.key)
      return
    }
    setSaving(true)
    setConfirmKey(null)
    try {
      await onUpdate(setting.key, newValue)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // Boolean toggle
  if (typeof val === 'boolean') {
    return (
      <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-sm font-medium">{settingLabel(setting.key)}</p>
          {setting.description && <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>}
          {setting.updated_at && <p className="text-xs text-muted-foreground mt-0.5">Updated {formatDate(setting.updated_at)}</p>}
        </div>
        <div className="flex items-center gap-2">
          {confirmKey === setting.key && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">Confirm?</span>
              <button
                onClick={() => save(!val)}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmKey(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                No
              </button>
            </div>
          )}
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          {saving && <span className="text-xs text-muted-foreground">...</span>}
          {confirmKey !== setting.key && (
            <button
              onClick={() => save(!val)}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                val ? 'bg-emerald-600' : 'bg-accent'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  val ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Number
  if (typeof val === 'number') {
    return (
      <NumberSetting setting={setting} onUpdate={onUpdate} />
    )
  }

  // String
  if (typeof val === 'string') {
    return (
      <StringSetting setting={setting} onUpdate={onUpdate} />
    )
  }

  // Array (e.g., IP whitelist, lab formats)
  if (Array.isArray(val)) {
    return (
      <ArraySetting setting={setting} onUpdate={onUpdate} />
    )
  }

  // Object (e.g., dr_alex_app_limits)
  if (typeof val === 'object' && val !== null) {
    return (
      <ObjectSetting setting={setting} onUpdate={onUpdate} />
    )
  }

  return null
}

function NumberSetting({ setting, onUpdate }: { setting: AppSetting; onUpdate: (key: string, value: unknown) => Promise<void> }) {
  const [localVal, setLocalVal] = useState(String(setting.value))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const changed = localVal !== String(setting.value)

  useEffect(() => { setLocalVal(String(setting.value)) }, [setting.value])

  const save = async () => {
    const num = Number(localVal)
    if (isNaN(num)) { toast.error('Invalid number'); return }
    setSaving(true)
    try {
      await onUpdate(setting.key, num)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium">{settingLabel(setting.key)}</p>
        {setting.description && <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>}
        {setting.updated_at && <p className="text-xs text-muted-foreground mt-0.5">Updated {formatDate(setting.updated_at)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        <input
          type="number"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && changed && save()}
          className="w-24 bg-card border border-border rounded px-2 py-1 text-sm text-right"
        />
        {changed && (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function StringSetting({ setting, onUpdate }: { setting: AppSetting; onUpdate: (key: string, value: unknown) => Promise<void> }) {
  const [localVal, setLocalVal] = useState(String(setting.value))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const changed = localVal !== String(setting.value)

  useEffect(() => { setLocalVal(String(setting.value)) }, [setting.value])

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(setting.key, localVal)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium">{settingLabel(setting.key)}</p>
        {setting.description && <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>}
        {setting.updated_at && <p className="text-xs text-muted-foreground mt-0.5">Updated {formatDate(setting.updated_at)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        <input
          type="text"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && changed && save()}
          className="w-56 bg-card border border-border rounded px-2 py-1 text-sm"
        />
        {changed && (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function ArraySetting({ setting, onUpdate }: { setting: AppSetting; onUpdate: (key: string, value: unknown) => Promise<void> }) {
  const arr = setting.value as string[]
  const [localVal, setLocalVal] = useState(arr.join(', '))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocalVal((setting.value as string[]).join(', ')) }, [setting.value])

  const changed = localVal !== arr.join(', ')

  const save = async () => {
    const items = localVal.split(',').map(s => s.trim()).filter(Boolean)
    setSaving(true)
    try {
      await onUpdate(setting.key, items)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium">{settingLabel(setting.key)}</p>
        {setting.description && <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>}
        {setting.updated_at && <p className="text-xs text-muted-foreground mt-0.5">Updated {formatDate(setting.updated_at)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        <input
          type="text"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && changed && save()}
          placeholder="comma-separated"
          className="w-64 bg-card border border-border rounded px-2 py-1 text-sm font-mono"
        />
        {changed && (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function ObjectSetting({ setting, onUpdate }: { setting: AppSetting; onUpdate: (key: string, value: unknown) => Promise<void> }) {
  const obj = setting.value as Record<string, unknown>
  const [localObj, setLocalObj] = useState(obj)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocalObj(setting.value as Record<string, unknown>) }, [setting.value])

  const changed = JSON.stringify(localObj) !== JSON.stringify(obj)

  const updateField = (k: string, v: string) => {
    const num = Number(v)
    setLocalObj({ ...localObj, [k]: isNaN(num) ? v : num })
  }

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(setting.key, localObj)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{settingLabel(setting.key)}</p>
          {setting.description && <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          {changed && (
            <button
              onClick={save}
              disabled={saving}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
            >
              {saving ? '...' : 'Save'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Object.entries(localObj).map(([k, v]) => (
          <div key={k}>
            <label className="text-xs text-muted-foreground capitalize">{k}</label>
            <input
              type="number"
              value={String(v)}
              onChange={e => updateField(k, e.target.value)}
              className="w-full bg-card border border-border rounded px-2 py-1 text-sm mt-0.5"
            />
          </div>
        ))}
      </div>
      {setting.updated_at && <p className="text-xs text-muted-foreground mt-1">Updated {formatDate(setting.updated_at)}</p>}
    </div>
  )
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, AppSetting[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('access')

  const load = useCallback(async () => {
    try {
      const res = await api.admin.settings()
      setSettings(res.data)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpdate = async (key: string, value: unknown) => {
    try {
      await api.admin.updateSetting(key, value)
      toast.success(`${settingLabel(key)} updated`)
      // Update local state
      setSettings(prev => {
        const updated = { ...prev }
        for (const cat of Object.keys(updated)) {
          updated[cat] = updated[cat].map(s =>
            s.key === key ? { ...s, value, updated_at: new Date().toISOString() } : s
          )
        }
        return updated
      })
    } catch {
      toast.error(`Failed to update ${settingLabel(key)}`)
      throw new Error('update failed')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  const categories = CATEGORY_ORDER.filter(c => settings[c]?.length)

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'border-blue-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Settings list */}
      <div className="border border-border rounded-lg overflow-hidden">
        {(settings[activeCategory] || []).map(s => (
          <SettingRow key={s.key} setting={s} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  )
}
