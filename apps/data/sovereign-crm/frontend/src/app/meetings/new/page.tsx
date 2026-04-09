'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface ProjectOption {
  id: string
  name: string
}

export default function NewMeetingPage() {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) return
    fetch(`${API_URL}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []
        setProjects(list)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/meetings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        project_id: projectId || null,
        recorded_at: recordedAt || null,
      }),
    })
    if (res.ok) {
      window.location.href = '/meetings'
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to create meeting')
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-semibold">New Meeting</h1>

        {error && (
          <div className="mt-4 rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              className={inputClass} placeholder="Meeting title" />
          </div>

          <div>
            <label className="block text-sm font-medium">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className={inputClass}>
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Recorded At</label>
            <input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)}
              className={inputClass} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Meeting'}
            </button>
            <a href="/meetings" className="text-sm text-muted-foreground hover:underline">Cancel</a>
          </div>
        </form>
      </main>
    </>
  )
}
