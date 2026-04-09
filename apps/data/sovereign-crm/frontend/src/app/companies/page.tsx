'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import Cookies from 'js-cookie'
import { API_URL } from '@/lib/api-config'

interface Company {
  id: string
  name: string
  domain: string | null
  website: string | null
  updated_at: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) return
    fetch(`${API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setCompanies(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Companies</h1>
          <Link href="/companies/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New Company
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No companies yet</p>
            <p className="mt-1 text-sm">Companies are created from contact domains or manually.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map(c => (
              <Link key={c.id} href={`/companies/${c.id}`}
                className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
                <p className="font-medium">{c.name}</p>
                {c.domain && <p className="text-sm text-muted-foreground">{c.domain}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
