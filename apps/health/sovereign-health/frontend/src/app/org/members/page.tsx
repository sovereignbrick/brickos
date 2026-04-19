'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { toast } from '@/lib/toast'

interface Member {
  id: string
  user_id: string
  email: string
  display_name: string | null
  role: string
  joined_at: string
  last_active_at: string | null
}

export default function OrgMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('org_member')
  const [inviting, setInviting] = useState(false)

  const token = Cookies.get('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    const res = await fetch('/org-settings/members', { headers })
    const json = await res.json()
    setMembers(json.data || [])
  }

  async function invite() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/org-settings/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || 'Failed to invite')
      }
      toast.success('Member invited')
      setInviteEmail('')
      fetchMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  async function changeRole(userId: string, role: string) {
    const res = await fetch(`/org-settings/members/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      toast.success('Role updated')
      fetchMembers()
    } else {
      toast.error('Failed to update role')
    }
  }

  async function removeMember(userId: string, email: string) {
    if (!confirm(`Remove ${email} from the organization?`)) return
    const res = await fetch(`/org-settings/members/${userId}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) {
      toast.success('Member removed')
      fetchMembers()
    } else {
      const json = await res.json()
      toast.error(json.error?.message || 'Failed to remove')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Members</h2>

      {/* Invite */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">Invite Member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 bg-white/5 border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="bg-white/5 border rounded-lg px-3 py-2 text-sm"
          >
            <option value="org_member">Member</option>
            <option value="practitioner">Practitioner</option>
            <option value="org_owner">Owner</option>
          </select>
          <button
            onClick={invite}
            disabled={inviting || !inviteEmail}
            className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {inviting ? '...' : 'Invite'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          User must have an existing account. They will be added to your organization.
        </p>
      </div>

      {/* Member list */}
      <div className="border rounded-lg divide-y">
        {members.map(m => (
          <div key={m.user_id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium">{m.display_name || m.email}</p>
              {m.display_name && <p className="text-xs text-muted-foreground">{m.email}</p>}
              {m.last_active_at && (
                <p className="text-xs text-muted-foreground">
                  Active: {new Date(m.last_active_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={e => changeRole(m.user_id, e.target.value)}
                className="bg-white/5 border rounded px-2 py-1 text-xs"
              >
                <option value="org_member">Member</option>
                <option value="practitioner">Practitioner</option>
                <option value="org_owner">Owner</option>
              </select>
              <button
                onClick={() => removeMember(m.user_id, m.email)}
                className="text-xs text-destructive hover:text-destructive/80"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground text-center">No members yet</p>
        )}
      </div>
    </div>
  )
}
