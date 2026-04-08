'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface Org {
  id: string; name: string; slug: string; org_type: string
  billing_email: string | null; is_active: boolean; member_count: number; created_at: string
}

interface OrgMember {
  id: string; user_id: string; email: string; display_name: string | null
  role: string; joined_at: string; last_active_at: string | null
}

const ORG_TYPES = ['platform', 'clinic', 'enterprise', 'personal', 'demo']
const TYPE_COLORS: Record<string, string> = {
  platform: 'bg-orange-400/10 text-orange-400', clinic: 'bg-blue-400/10 text-blue-400',
  enterprise: 'bg-purple-400/10 text-purple-400', personal: 'bg-zinc-700 text-zinc-400',
  demo: 'bg-amber-400/10 text-amber-400',
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', org_type: 'clinic', billing_email: '', admin_email: '' })
  const [creating, setCreating] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.organizations(page, 25, search || undefined, typeFilter || undefined)
      setOrgs(res.data)
      setTotal(res.meta.total)
    } catch { setOrgs([]) }
    finally { setLoading(false) }
  }, [page, search, typeFilter])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const fetchMembers = async (orgId: string) => {
    try {
      const res = await api.admin.orgMembers(orgId)
      setMembers(res.data)
      setSelectedOrg(orgId)
    } catch { setMembers([]) }
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.slug) return
    setCreating(true)
    try {
      await api.admin.createOrganization(createForm)
      toast.success('Organization created')
      setShowCreate(false)
      setCreateForm({ name: '', slug: '', org_type: 'clinic', billing_email: '', admin_email: '' })
      fetchOrgs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create')
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <button onClick={() => setShowCreate(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Organization
        </button>
      </div>

      <div className="flex gap-3">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name or slug..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">Name</th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">Type</th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">Members</th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-center py-2.5 px-4">Status</th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.id} onClick={() => fetchMembers(org.id)} className={`border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors ${selectedOrg === org.id ? 'bg-zinc-800/30' : ''}`}>
                <td className="py-2.5 px-4"><p className="font-medium">{org.name}</p><p className="text-xs text-zinc-500">{org.slug}</p></td>
                <td className="py-2.5 px-4"><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[org.org_type] || 'bg-zinc-700 text-zinc-400'}`}>{org.org_type}</span></td>
                <td className="py-2.5 px-4 text-right tabular-nums">{org.member_count}</td>
                <td className="py-2.5 px-4 text-center"><span className={`inline-block w-2 h-2 rounded-full ${org.is_active ? 'bg-green-400' : 'bg-red-400'}`} /></td>
                <td className="py-2.5 px-4 text-right text-zinc-400 text-xs">{formatDate(org.created_at)}</td>
              </tr>
            ))}
            {orgs.length === 0 && !loading && <tr><td colSpan={5} className="py-8 text-center text-zinc-500">No organizations found</td></tr>}
          </tbody>
        </table>
      </div>

      {total > 25 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-zinc-800 text-sm disabled:opacity-30">Prev</button>
          <span className="text-sm text-zinc-400 py-1">Page {page} of {Math.ceil(total / 25)}</span>
          <button disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-zinc-800 text-sm disabled:opacity-30">Next</button>
        </div>
      )}

      {selectedOrg && (
        <div className="rounded-2xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Members -- {orgs.find(o => o.id === selectedOrg)?.name}</h2>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm py-1.5">
                <div>
                  <span className="font-medium">{m.display_name || m.email}</span>
                  {m.display_name && <span className="text-zinc-500 ml-2 text-xs">{m.email}</span>}
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-orange-400/10 text-orange-400' : 'bg-zinc-700 text-zinc-400'}`}>{m.role}</span>
              </div>
            ))}
            {members.length === 0 && <p className="text-zinc-500 text-sm">No members</p>}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Create Organization</h2>
            <input placeholder="Name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Slug (URL-safe)" value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
            <select value={createForm.org_type} onChange={e => setCreateForm(f => ({ ...f, org_type: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
              {ORG_TYPES.filter(t => t !== 'personal').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Billing email (optional)" value={createForm.billing_email} onChange={e => setCreateForm(f => ({ ...f, billing_email: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Admin email (assigns owner role)" value={createForm.admin_email} onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.name || !createForm.slug} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
