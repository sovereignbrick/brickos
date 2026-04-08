'use client'

import { useState } from 'react'

interface AiProfile {
  id: string; name: string; provider: string; model: string
  base_url: string | null; temperature: number; max_tokens: number
  is_default: boolean; is_failover: boolean; is_active: boolean
}

const PROVIDERS = ['anthropic', 'openai', 'ollama', 'custom']
const MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4', 'claude-opus-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  ollama: ['llama3.1-70b', 'llama3.1-8b', 'mistral-7b', 'phi-3'],
  custom: ['custom'],
}

// Static data for now -- will be API-driven when backend endpoint exists
const INITIAL_PROFILES: AiProfile[] = [
  {
    id: 'default', name: 'Default', provider: 'anthropic', model: 'claude-sonnet-4',
    base_url: null, temperature: 0.7, max_tokens: 4096,
    is_default: true, is_failover: false, is_active: true,
  },
  {
    id: 'failover', name: 'Failover', provider: 'openai', model: 'gpt-4o',
    base_url: null, temperature: 0.7, max_tokens: 4096,
    is_default: false, is_failover: true, is_active: false,
  },
  {
    id: 'self-hosted', name: 'Self-Hosted', provider: 'ollama', model: 'llama3.1-70b',
    base_url: 'http://localhost:11434', temperature: 0.7, max_tokens: 4096,
    is_default: false, is_failover: false, is_active: false,
  },
]

export default function AiConfigPage() {
  const [profiles, setProfiles] = useState<AiProfile[]>(INITIAL_PROFILES)
  const [activeProfile, setActiveProfile] = useState('default')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Configuration</h1>

      {/* Status bar */}
      <div className="rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm">Active Profile: <span className="font-bold text-green-400">{profiles.find(p => p.id === activeProfile)?.name}</span></p>
          <p className="text-xs text-zinc-400">
            {profiles.find(p => p.id === activeProfile)?.provider} / {profiles.find(p => p.id === activeProfile)?.model}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${activeProfile === 'default' ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-zinc-400">{activeProfile === 'default' ? 'Normal' : 'Failover Active'}</span>
        </div>
      </div>

      {/* Profiles */}
      <div className="space-y-4">
        {profiles.map(profile => (
          <div key={profile.id} className={`rounded-2xl border p-5 ${profile.id === activeProfile ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{profile.name}</h3>
                {profile.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-400/10 text-blue-400">Default</span>}
                {profile.is_failover && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Failover</span>}
                {profile.id === activeProfile && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400">Active</span>}
              </div>
              <button
                onClick={() => setActiveProfile(profile.id)}
                disabled={profile.id === activeProfile}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-zinc-600 disabled:cursor-default"
              >
                {profile.id === activeProfile ? 'Currently Active' : 'Set as Active'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Provider</label>
                <select value={profile.provider} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm mt-1">
                  {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Model</label>
                <select value={profile.model} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm mt-1">
                  {(MODELS[profile.provider] || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Temperature</label>
                <input type="number" step="0.1" min="0" max="2" value={profile.temperature} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Max Tokens</label>
                <input type="number" value={profile.max_tokens} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm mt-1" />
              </div>
            </div>

            {profile.base_url !== null && (
              <div className="mt-3">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Base URL</label>
                <input type="url" value={profile.base_url || ''} placeholder="http://localhost:11434" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm mt-1" />
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <button className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg">
                Test Connection
              </button>
              <span className="text-[10px] text-zinc-500">EU AI Act: Limited Risk (Art. 50)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Failover Rules */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Failover Rules</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-300">Switch after N failures in 5 minutes</span>
            <input type="number" value={3} min={1} max={10} className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-center" />
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-300">Auto-recover check interval</span>
            <span className="text-zinc-400 text-xs">Every 5 minutes</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-300">Notifications</span>
            <span className="text-zinc-400 text-xs">ntfy + telegram on every switch</span>
          </div>
        </div>
      </div>
    </div>
  )
}
