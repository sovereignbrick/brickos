'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { usePlatformFilter } from '@/app/platform/platform-context'

interface Org { id: string; name: string; slug: string; org_type: string; member_count: number }
interface Member { id: string; user_id: string; email: string; display_name: string | null; role: string; joined_at: string; last_active_at: string | null }

const ROLES = ['owner', 'tech_admin', 'commercial_admin', 'editor', 'consumer']

export default function MembersPage() {
  const { orgFilter, orgs: ctxOrgs } = usePlatformFilter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'consumer' })
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    api.admin.organizations(1, 100).then(res => {
      setOrgs(res.data)
      // Use org from platform filter context if set, otherwise pick first non-personal
      if (orgFilter && orgFilter !== 'all') {
        setSelectedOrg(orgFilter)
      } else {
        const nonPersonal = res.data.find((o: Org) => o.org_type !== 'personal')
        if (nonPersonal) setSelectedOrg(nonPersonal.id)
        else if (res.data.length > 0) setSelectedOrg(res.data[0].id)
      }
    }).catch(() => {})
  }, [orgFilter])

  // Sync with platform filter changes
  useEffect(() => {
    if (orgFilter && orgFilter !== 'all' && orgFilter !== selectedOrg) {
      setSelectedOrg(orgFilter)
    }
  }, [orgFilter, selectedOrg])

  const fetchMembers = useCallback(async () => {
    if (!selectedOrg) return
    setLoading(true)
    try { const res = await api.admin.orgMembers(selectedOrg); setMembers(res.data) }
    catch { setMembers([]) }
    finally { setLoading(false) }
  }, [selectedOrg])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleInvite = async () => {
    if (!inviteForm.email || !selectedOrg) return
    setInviting(true)
    try {
      await api.admin.addOrgMember(selectedOrg, inviteForm)
      toast.success(`Added ${inviteForm.email}`)
      setShowInvite(false)
      setInviteForm({ email: '', role: 'consumer' })
      fetchMembers()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setInviting(false) }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try { await api.admin.updateMemberRole(selectedOrg, memberId, newRole); toast.success('Role updated'); fetchMembers() }
    catch { toast.error('Failed') }
  }

  const handleRemove = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email}?`)) return
    try { await api.admin.removeOrgMember(selectedOrg, memberId); toast.success('Removed'); fetchMembers() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <button onClick={() => setShowInvite(true)} disabled={!selectedOrg} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Add Member</button>
      </div>

      <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-full max-w-md">
        {orgs.filter(o => o.org_type !== 'personal').map(o => (
          <option key={o.id} value={o.id}>{o.name} ({o.member_count} members)</option>
        ))}
      </select>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">Member</th>
            <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">Role</th>
            <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">Actions</th>
          </tr></thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-b border-zinc-800">
                <td className="py-2.5 px-4"><p className="font-medium">{m.display_name || m.email}</p>{m.display_name && <p className="text-xs text-zinc-500">{m.email}</p>}</td>
                <td className="py-2.5 px-4">
                  <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button onClick={() => handleRemove(m.id, m.email)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </td>
              </tr>
            ))}
            {members.length === 0 && !loading && <tr><td colSpan={3} className="py-8 text-center text-zinc-500">No members</td></tr>}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Add Member</h2>
            <input placeholder="Email address" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowInvite(false)} className="text-sm text-zinc-400">Cancel</button>
              <button onClick={handleInvite} disabled={inviting || !inviteForm.email} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">{inviting ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
