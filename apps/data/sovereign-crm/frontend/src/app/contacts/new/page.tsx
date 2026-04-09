'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

const LEAD_STAGES = ['new', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export default function NewContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [leadStage, setLeadStage] = useState('new')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: email || null,
        phone: phone || null,
        role: role || null,
        lead_stage: leadStage,
        notes: notes || null,
      }),
    })
    if (res.ok) {
      window.location.href = '/contacts'
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to create contact')
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-semibold">New Contact</h1>

        {error && (
          <div className="mt-4 rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Name *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className={inputClass} placeholder="Full name" />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass} placeholder="email@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className={inputClass} placeholder="+49 ..." />
          </div>

          <div>
            <label className="block text-sm font-medium">Role</label>
            <input type="text" value={role} onChange={e => setRole(e.target.value)}
              className={inputClass} placeholder="e.g. CEO, Developer" />
          </div>

          <div>
            <label className="block text-sm font-medium">Lead Stage</label>
            <select value={leadStage} onChange={e => setLeadStage(e.target.value)}
              className={inputClass}>
              {LEAD_STAGES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className={inputClass} rows={4} placeholder="Additional notes..." />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Contact'}
            </button>
            <a href="/contacts" className="text-sm text-muted-foreground hover:underline">Cancel</a>
          </div>
        </form>
      </main>
    </>
  )
}
