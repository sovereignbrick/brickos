'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface ActionItem {
  id: string
  description: string
  assignee: string | null
  done: boolean
}

interface Attendee {
  id: string
  name: string
  email: string | null
}

interface Meeting {
  id: string
  title: string
  status: string
  summary: string | null
  transcript: string | null
  duration_secs: number | null
  recorded_at: string | null
  action_items: ActionItem[]
  attendees: Attendee[]
  created_at: string
  updated_at: string
}

export default function MeetingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTranscribeForm, setShowTranscribeForm] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [error, setError] = useState('')

  const fetchMeeting = () => {
    const token = Cookies.get('auth_token')
    fetch(`${API_URL}/api/v1/meetings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setMeeting(json.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMeeting() }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this meeting? This cannot be undone.')) return
    const token = Cookies.get('auth_token')
    await fetch(`${API_URL}/api/v1/meetings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    window.location.href = '/meetings'
  }

  const handleTranscribe = async () => {
    if (!transcript.trim()) return
    setTranscribing(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/meetings/${id}/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
    if (res.ok) {
      setShowTranscribeForm(false)
      setTranscript('')
      fetchMeeting()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to transcribe')
    }
    setTranscribing(false)
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/meetings/${id}/summarize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      fetchMeeting()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to summarize')
    }
    setSummarizing(false)
  }

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'transcribed': return 'bg-green-600 text-white'
      case 'summarized': return 'bg-blue-600 text-white'
      default: return 'bg-zinc-600 text-white'
    }
  }

  if (loading) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Loading...</p></main></>
  if (!meeting) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Meeting not found</p></main></>

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <a href="/meetings" className="text-sm text-muted-foreground hover:underline">&larr; Meetings</a>
          <button onClick={handleDelete}
            className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10">
            Delete
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{meeting.title}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${statusBadgeClass(meeting.status)}`}>
              {meeting.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {meeting.recorded_at && (
              <div>
                <p className="text-xs text-muted-foreground">Recorded</p>
                <p className="text-sm">{new Date(meeting.recorded_at).toLocaleString()}</p>
              </div>
            )}
            {meeting.duration_secs && (
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm">{Math.floor(meeting.duration_secs / 60)} min</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {meeting.summary && (
            <div>
              <p className="text-xs text-muted-foreground">Summary</p>
              <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg border bg-muted/30 p-4">{meeting.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {meeting.action_items && meeting.action_items.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Action Items</p>
              <ul className="mt-2 space-y-2">
                {meeting.action_items.map(item => (
                  <li key={item.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded border ${item.done ? 'bg-green-600 border-green-600' : 'border-zinc-500'}`} />
                    <div>
                      <p>{item.description}</p>
                      {item.assignee && <p className="mt-0.5 text-xs text-muted-foreground">Assigned to: {item.assignee}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attendees */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Attendees</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {meeting.attendees.map(a => (
                  <span key={a.id} className="rounded-full bg-muted/50 px-3 py-1 text-sm">
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <button onClick={() => setShowTranscribeForm(!showTranscribeForm)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
              Transcribe
            </button>
            <button onClick={handleSummarize} disabled={summarizing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {summarizing ? 'Summarizing...' : 'Summarize'}
            </button>
          </div>

          {/* Transcribe Form */}
          {showTranscribeForm && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Paste transcript</p>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={8}
                placeholder="Paste the meeting transcript here..."
              />
              <div className="flex items-center gap-3">
                <button onClick={handleTranscribe} disabled={transcribing || !transcript.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                  {transcribing ? 'Submitting...' : 'Submit Transcript'}
                </button>
                <button onClick={() => setShowTranscribeForm(false)}
                  className="text-sm text-muted-foreground hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
