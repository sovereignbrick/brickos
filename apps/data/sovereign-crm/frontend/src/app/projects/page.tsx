'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  updated_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setProjects(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <Link href="/projects/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New Project
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No projects yet</p>
            <p className="mt-1 text-sm">Create a project to organize your contacts and interactions.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <p className="font-medium">{p.name}</p>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
