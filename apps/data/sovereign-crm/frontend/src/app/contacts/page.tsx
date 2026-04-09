'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  lead_stage: string
  interaction_count: number
  updated_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/api/v1/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setContacts(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <Link href="/contacts/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New Contact
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No contacts yet</p>
            <p className="mt-1 text-sm">Add your first contact to get started.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map(c => (
              <Link key={c.id} href={`/contacts/${c.id}`}
                className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.role && <p className="text-sm text-muted-foreground">{c.role}</p>}
                    {c.email && <p className="text-xs text-muted-foreground mt-1">{c.email}</p>}
                  </div>
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    {c.lead_stage}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
