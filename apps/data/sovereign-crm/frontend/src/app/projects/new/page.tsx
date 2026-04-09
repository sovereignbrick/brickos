'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const token = Cookies.get('auth_token')
    const res = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        color,
        notes: notes || null,
      }),
    })
    if (res.ok) {
      window.location.href = '/projects'
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error?.message || 'Failed to create project')
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-semibold">New Project</h1>

        {error && (
          <div className="mt-4 rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Name *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className={inputClass} placeholder="Project name" />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className={inputClass} rows={3} placeholder="What is this project about?" />
          </div>

          <div>
            <label className="block text-sm font-medium">Color</label>
            <div className="mt-1 flex items-center gap-3">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border bg-background" />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className={inputClass} rows={4} placeholder="Additional notes..." />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Project'}
            </button>
            <a href="/projects" className="text-sm text-muted-foreground hover:underline">Cancel</a>
          </div>
        </form>
      </main>
    </>
  )
}
