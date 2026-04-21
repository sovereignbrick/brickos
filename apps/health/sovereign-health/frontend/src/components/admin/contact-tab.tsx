'use client'

import { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'

// Sprint 048 RC fix: runtime host detection avoids double `/api` prefix on brickos.io.
const API = (() => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || ''
  const host = window.location.hostname
  if (host.endsWith('.brickos.io')) return ''
  if (host.endsWith('.sovereignhealth.io')) return ''
  if (host.endsWith('.onion')) return ''
  return process.env.NEXT_PUBLIC_API_URL || ''
})()

interface ContactEntry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-400',
  read: 'bg-yellow-600/20 text-yellow-400',
  replied: 'bg-green-600/20 text-green-400',
  archived: 'bg-zinc-600/20 text-zinc-400',
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export function ContactTab() {
  const [entries, setEntries] = useState<ContactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch(`${API}/admin/contact-submissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.data || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const updateStatus = async (id: string, status: string) => {
    const token = Cookies.get('auth_token')
    await fetch(`${API}/admin/contact-submissions/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    })
    fetchEntries()
  }

  if (loading) return <div className="text-muted-foreground text-sm p-8 text-center">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} submissions</p>
        <button onClick={fetchEntries} className="text-xs text-blue-400 hover:text-blue-300">Refresh</button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent">
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Name</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Email</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Subject</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No contact submissions yet.</td></tr>
            ) : entries.map((e, i) => (
              <tr
                key={e.id}
                className={`border-b border-border hover:bg-accent cursor-pointer transition-colors ${i % 2 === 1 ? 'bg-muted/30' : ''}`}
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{formatTs(e.created_at)}</td>
                <td className="px-4 py-2.5">{e.name}</td>
                <td className="px-4 py-2.5">
                  <a href={`mailto:${e.email}`} className="text-blue-400 hover:text-blue-300" onClick={ev => ev.stopPropagation()}>{e.email}</a>
                </td>
                <td className="px-4 py-2.5 capitalize">{e.subject}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status] || 'bg-accent text-foreground'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-2.5" onClick={ev => ev.stopPropagation()}>
                  <select
                    value={e.status}
                    onChange={ev => updateStatus(e.id, ev.target.value)}
                    className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground"
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
              </tr>
            ))}
            {expanded && (() => {
              const e = entries.find(x => x.id === expanded)
              if (!e) return null
              return (
                <tr className="border-b border-border">
                  <td colSpan={6} className="px-4 py-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{e.message}</p>
                  </td>
                </tr>
              )
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}
