'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface Company {
  id: string
  name: string
  domain: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function CompanyDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    fetch(`${API_URL}/api/v1/companies/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setCompany(json.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this company? This cannot be undone.')) return
    const token = Cookies.get('auth_token')
    await fetch(`${API_URL}/api/v1/companies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    window.location.href = '/companies'
  }

  if (loading) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Loading...</p></main></>
  if (!company) return <><Navbar /><main className="mx-auto max-w-3xl px-4 py-8"><p className="text-muted-foreground">Company not found</p></main></>

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <a href="/companies" className="text-sm text-muted-foreground hover:underline">&larr; Companies</a>
          <button onClick={handleDelete}
            className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10">
            Delete
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <h1 className="text-2xl font-semibold">{company.name}</h1>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Domain</p>
              <p className="text-sm">{company.domain || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Website</p>
              {company.website ? (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline">{company.website}</a>
              ) : (
                <p className="text-sm">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(company.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-sm">{new Date(company.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {company.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{company.notes}</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
