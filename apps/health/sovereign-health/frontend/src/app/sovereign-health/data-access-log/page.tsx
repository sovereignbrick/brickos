'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Breadcrumb } from '@/components/breadcrumb'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

/**
 * Sprint 048 #048-43: patient-facing data access audit log.
 *
 * Lists every practitioner action where the signed-in user is the
 * target (resource_id). Served by GET /user/data-access-log. No
 * pagination yet -- the backend caps at 500 recent rows. Read-only,
 * ordered newest-first.
 */

interface Row {
  id: string
  action: string
  actor_email: string | null
  actor_name: string | null
  org_name: string | null
  metadata: { session_id?: string; path?: string } | null
  created_at: string
}

function formatAction(action: string, t: ReturnType<typeof useTranslations>): string {
  if (action === 'impersonation.start') return t('action.start')
  if (action === 'impersonation.exit') return t('action.exit')
  if (action.startsWith('impersonation.read:')) {
    const path = action.substring('impersonation.read:'.length)
    return t('action.readPath', { path })
  }
  return action
}

export default function DataAccessLogPage() {
  const t = useTranslations('dataAccessLog')
  const tNav = useTranslations('nav')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?return=/sovereign-health/data-access-log')
      return
    }
    const token = Cookies.get('auth_token')
    fetch('/user/data-access-log', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setRows(j?.data ?? []))
      .catch(() => setRows([]))
  }, [user, authLoading, router])

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb items={[
          { label: tNav('overview'), href: '/sovereign-health/dashboard' },
          { label: t('title') },
        ]} />

        <h1 className="text-2xl font-bold mt-4">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          {t('intro')}
        </p>

        <div className="mt-6">
          {rows === null ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          ) : rows.length === 0 ? (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              {t('empty')}
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">{t('colTime')}</th>
                    <th className="px-4 py-2 font-medium">{t('colAction')}</th>
                    <th className="px-4 py-2 font-medium">{t('colActor')}</th>
                    <th className="px-4 py-2 font-medium">{t('colOrg')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{formatAction(row.action, t)}</td>
                      <td className="px-4 py-2">{row.actor_name || row.actor_email || t('unknown')}</td>
                      <td className="px-4 py-2">{row.org_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {t('footer')} <Link href="/settings?tab=organization-access" className="underline hover:text-foreground">{t('footerLink')}</Link>
        </p>
      </main>
    </>
  )
}
