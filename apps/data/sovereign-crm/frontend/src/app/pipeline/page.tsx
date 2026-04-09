'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

const STAGES = ['new', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const STAGE_COLORS: Record<string, string> = {
  new: 'border-zinc-600',
  lead: 'border-blue-600',
  qualified: 'border-cyan-600',
  proposal: 'border-amber-600',
  negotiation: 'border-purple-600',
  won: 'border-green-600',
  lost: 'border-red-600',
}

interface PipelineContact {
  id: string
  name: string
  email: string | null
  role: string | null
  last_seen: string
  interaction_count: number
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Record<string, PipelineContact[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/api/v1/pipeline`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const data = json.data?.stages ?? json.stages ?? {}
        setStages(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const moveContact = async (contactId: string, newStage: string) => {
    const token = Cookies.get('auth_token')
    if (!token) return
    await fetch(`${API_URL}/api/v1/pipeline/move`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, lead_stage: newStage }),
    })
    // Refresh
    const res = await fetch(`${API_URL}/api/v1/pipeline`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    setStages(json.data?.stages ?? json.stages ?? {})
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-full px-4 py-8">
        <h1 className="text-2xl font-semibold">Lead Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drag contacts between stages to update their status.</p>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const contacts = stages[stage] || []
              return (
                <div key={stage} className={`min-w-[220px] flex-shrink-0 rounded-lg border-t-2 ${STAGE_COLORS[stage]} bg-muted/20 p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold capitalize">{stage}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{contacts.length}</span>
                  </div>
                  <div className="space-y-2">
                    {contacts.map(c => (
                      <div key={c.id} className="rounded-md border bg-background p-3 shadow-sm">
                        <Link href={`/contacts/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
                        {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                        <div className="mt-2 flex gap-1">
                          {STAGES.filter(s => s !== stage).slice(0, 3).map(s => (
                            <button key={s} onClick={() => moveContact(c.id, s)}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-accent capitalize">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {contacts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
