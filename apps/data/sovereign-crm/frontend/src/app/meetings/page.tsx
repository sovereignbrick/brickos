'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface Meeting {
  id: string
  title: string
  status: string
  duration_secs: number | null
  attendee_count: number
  action_item_count: number
  recorded_at: string | null
  created_at: string
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/api/v1/meetings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setMeetings(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDuration = (secs: number | null) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60)
    return `${m} min`
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <Link href="/meetings/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
            New Meeting
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading...</div>
        ) : meetings.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No meetings yet</p>
            <p className="mt-1 text-sm">Record or upload a meeting to get AI-powered summaries and action items.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {meetings.map(m => (
              <Link key={m.id} href={`/meetings/${m.id}`}
                className="block rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {m.recorded_at && <span>{new Date(m.recorded_at).toLocaleDateString()}</span>}
                      {m.duration_secs && <span>{formatDuration(m.duration_secs)}</span>}
                      <span>{m.attendee_count} attendees</span>
                      <span>{m.action_item_count} action items</span>
                    </div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    m.status === 'transcribed' ? 'bg-green-600 text-white' :
                    m.status === 'draft' ? 'bg-zinc-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {m.status}
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
