'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/lib/date-format'
import { useAuth } from '@/lib/auth-context'

interface ShortLink {
  id: string
  code: string
  target_url: string
  link_type: string
  title: string | null
  is_active: boolean
  expires_at: string | null
  total_clicks: number
  clicks_7d: number
  clicks_30d: number
  created_at: string
}

interface EditState {
  target_url: string
  title: string
  is_active: boolean
  expires_at: string
}

export function LinksSection() {
  const t = useTranslations('affiliate')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const [links, setLinks] = useState<ShortLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ target_url: '', title: '', is_active: true, expires_at: '' })
  const [saving, setSaving] = useState(false)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await api.links.list()
      setLinks(Array.isArray(res) ? res : [])
    } catch {
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const startEdit = (link: ShortLink) => {
    setEditingId(link.id)
    setEditState({
      target_url: link.target_url,
      title: link.title || '',
      is_active: link.is_active,
      expires_at: link.expires_at ? link.expires_at.slice(0, 10) : '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await api.links.update(editingId, {
        target_url: editState.target_url || undefined,
        title: editState.title || undefined,
        is_active: editState.is_active,
        expires_at: editState.expires_at || null,
      })
      toast.success(t('linkUpdated') ?? 'Link updated')
      setEditingId(null)
      fetchLinks()
    } catch {
      toast.error(t('linkUpdateFailed') ?? 'Failed to update link')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (link: ShortLink) => {
    try {
      await api.links.update(link.id, { is_active: !link.is_active })
      fetchLinks()
    } catch {
      toast.error(t('linkUpdateFailed') ?? 'Failed to update link')
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground py-4">{tCommon('loading')}</div>
  if (links.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t('yourLinks') ?? 'Your Short Links'}
      </h2>

      <div className="divide-y divide-border rounded-2xl border overflow-hidden">
        {links.map(link => (
          <div key={link.id} className="p-3 hover:bg-white/[0.02] transition-colors">
            {editingId === link.id ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={editState.target_url}
                  onChange={e => setEditState(s => ({ ...s, target_url: e.target.value }))}
                  placeholder="Target URL"
                  className="w-full bg-card border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editState.title}
                    onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                    placeholder={t('linkTitle') ?? 'Title (optional)'}
                    className="flex-1 bg-card border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={editState.expires_at}
                    onChange={e => setEditState(s => ({ ...s, expires_at: e.target.value }))}
                    className="bg-card border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editState.is_active}
                      onChange={e => setEditState(s => ({ ...s, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    {t('linkActive') ?? 'Active'}
                  </label>
                  <div className="flex-1" />
                  <button onClick={cancelEdit} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {tCommon('cancel') ?? 'Cancel'}
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {saving ? '...' : tCommon('save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium truncate">
                      brickos.io/r/{link.code}
                    </span>
                    {!link.is_active && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400">
                        {t('linkInactive') ?? 'Inactive'}
                      </span>
                    )}
                    {link.expires_at && new Date(link.expires_at) < new Date() && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400">
                        {t('linkExpired') ?? 'Expired'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {link.title ? `${link.title} - ` : ''}{link.target_url}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums">{link.total_clicks}</p>
                  <p className="text-[10px] text-muted-foreground">{t('clicks') ?? 'clicks'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(link)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                    title={tCommon('edit') ?? 'Edit'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleActive(link)}
                    className={`p-1.5 rounded-lg transition-colors ${link.is_active ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-400' : 'hover:bg-green-500/10 text-muted-foreground hover:text-green-400'}`}
                    title={link.is_active ? (t('deactivate') ?? 'Deactivate') : (t('activate') ?? 'Activate')}
                  >
                    {link.is_active ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
