'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  notes: string | null
  contact_count?: number
  created_at: string
  updated_at: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch(`${API_URL}/api/v1/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setProject(json.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    const token = Cookies.get('auth_token')
    await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    window.location.href = '/projects'
  }

  if (loading) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Loading...</p></main></>
  if (!project) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Project not found</p></main></>

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <a href="/projects" className="text-sm text-muted-foreground hover:underline">&larr; Projects</a>
          <button onClick={handleDelete}
            className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10">
            Delete
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl font-semibold">{project.name}</h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Assigned Contacts</p>
              <p className="text-sm">{project.contact_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Color</p>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="text-sm">{project.color}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-sm">{new Date(project.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {project.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {project.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
