'use client'

/**
 * Sprint 044 #553: Practitioner dashboard.
 * Shows org members list with health summary for each.
 * Only visible to practitioners and org owners.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { useTranslations } from 'next-intl'

interface OrgMember {
  user_id: string
  email: string
  display_name: string | null
  role: string
  joined_at: string
  last_active_at: string | null
}

interface MemberSummary {
  user_id: string
  profile: {
    email: string
    display_name: string | null
    created_at: string
  } | null
  measurement_count: number
  latest_measurement: string | null
  recent_markers: {
    marker_name: string
    value: number
    unit: string | null
    measured_at: string
  }[]
}

export default function PractitionerPage() {
  const { user, loading: authLoading } = useAuth()
  const org = useOrg()
  const router = useRouter()
  const t = useTranslations('common')
  const [members, setMembers] = useState<OrgMember[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?return=/practitioner')
      return
    }
    if (!org.isOrg) {
      setError('This page is only available in an organization context.')
      setLoading(false)
      return
    }
    fetchMembers()
  }, [user, authLoading, org.isOrg, router])

  async function fetchMembers() {
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/practitioner/members', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setMembers(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function viewMember(userId: string) {
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch(`/practitioner/members/${userId}/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setSelectedMember(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member data')
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-96" />
            <div className="space-y-2 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {org.orgName} -- {t('members') || 'Members'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          {/* Member list */}
          <div className="space-y-2">
            {members.map(member => (
              <button
                key={member.user_id}
                onClick={() => viewMember(member.user_id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                  selectedMember?.user_id === member.user_id ? 'border-[var(--brand-primary)] bg-muted/30' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {member.display_name || member.email}
                    </p>
                    {member.display_name && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{member.role}</span>
                </div>
                {member.last_active_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last active: {new Date(member.last_active_at).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Member detail */}
          <div>
            {selectedMember ? (
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedMember.profile?.display_name || selectedMember.profile?.email || 'Member'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.measurement_count} measurements
                    {selectedMember.latest_measurement && (
                      <> -- latest: {new Date(selectedMember.latest_measurement).toLocaleDateString()}</>
                    )}
                  </p>
                </div>

                {selectedMember.recent_markers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recent markers</h3>
                    <div className="space-y-1">
                      {selectedMember.recent_markers.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                          <span>{m.marker_name}</span>
                          <span className="font-mono">
                            {m.value} {m.unit || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <p>Select a member to view their health summary</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
