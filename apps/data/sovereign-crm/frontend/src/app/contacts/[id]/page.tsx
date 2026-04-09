'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

const LEAD_STAGES = ['new', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  lead_stage: string
  notes: string | null
  first_seen: string | null
  last_seen: string | null
  interaction_count: number
  created_at: string
  updated_at: string
}

export default function ContactDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [leadStage, setLeadStage] = useState('new')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch(`${API_URL}/api/v1/contacts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const c = json.data
        setContact(c)
        if (c) {
          setName(c.name)
          setEmail(c.email || '')
          setPhone(c.phone || '')
          setRole(c.role || '')
          setLeadStage(c.lead_stage)
          setNotes(c.notes || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
      method: 'PUT',
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
      const json = await res.json()
      setContact(json.data)
      setEditing(false)
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to update')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    const token = Cookies.get('auth_token')
    await fetch(`${API_URL}/api/v1/contacts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    window.location.href = '/contacts'
  }

  const stageBadgeClass = (stage: string) => {
    switch (stage) {
      case 'won': return 'bg-green-600 text-white'
      case 'lost': return 'bg-red-600 text-white'
      case 'qualified': return 'bg-blue-600 text-white'
      case 'proposal': return 'bg-purple-600 text-white'
      case 'negotiation': return 'bg-yellow-600 text-white'
      default: return 'bg-zinc-600 text-white'
    }
  }

  if (loading) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Loading...</p></main></>
  if (!contact) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Contact not found</p></main></>

  const inputClass = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <a href="/contacts" className="text-sm text-muted-foreground hover:underline">&larr; Contacts</a>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                Edit
              </button>
            )}
            <button onClick={handleDelete}
              className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10">
              Delete
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {editing ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium">Lead Stage</label>
              <select value={leadStage} onChange={e => setLeadStage(e.target.value)} className={inputClass}>
                {LEAD_STAGES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} rows={4} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground hover:underline">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{contact.name}</h1>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${stageBadgeClass(contact.lead_stage)}`}>
                {contact.lead_stage}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{contact.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm">{contact.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm">{contact.role || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interactions</p>
                <p className="text-sm">{contact.interaction_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First Seen</p>
                <p className="text-sm">{contact.first_seen ? new Date(contact.first_seen).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Seen</p>
                <p className="text-sm">{contact.last_seen ? new Date(contact.last_seen).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            {contact.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
