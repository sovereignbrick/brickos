'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

type Section = 'app' | 'web' | 'admin'

interface ContentString {
  id: string
  section: string
  key: string
  value_en: string
  value_de: string | null
  description: string | null
  updated_at: string | null
  updated_by: string | null
}

const SECTIONS: Section[] = ['app', 'web', 'admin']
const PER_PAGE = 25

export function ContentStringsTab() {
  const tCommon = useTranslations('common')
  const t = useTranslations('admin')
  const [section, setSection] = useState<Section>('app')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ContentString[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editEn, setEditEn] = useState('')
  const [editDe, setEditDe] = useState('')
  const [saving, setSaving] = useState(false)

  // Add new string state
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newEn, setNewEn] = useState('')
  const [newDe, setNewDe] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchData = useCallback(() => {
    setLoading(true)
    api.admin
      .contentStrings({ section, search: debouncedSearch || undefined, page, per_page: PER_PAGE })
      .then((r) => {
        setItems(r.data)
        setTotal(r.meta.total)
      })
      .catch(() => toast.error(tCommon('failedToLoad')))
      .finally(() => setLoading(false))
  }, [section, debouncedSearch, page, tCommon])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when section or search changes
  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [section, debouncedSearch])

  const expandItem = (item: ContentString) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)
    setEditEn(item.value_en)
    setEditDe(item.value_de || '')
  }

  const saveItem = async (item: ContentString) => {
    setSaving(true)
    try {
      await api.admin.contentStringsUpdate(item.id, {
        value_en: editEn,
        value_de: editDe,
      })
      toast.success('Content string saved')
      setExpandedId(null)
      fetchData()
    } catch {
      toast.error(tCommon('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const createString = async () => {
    if (!newKey || !newEn) {
      toast.error('Key and EN value are required')
      return
    }
    setSaving(true)
    try {
      await api.admin.contentStringsCreate({
        section,
        key: newKey,
        value_en: newEn,
        value_de: newDe || undefined,
        description: newDesc || undefined,
      })
      toast.success('Content string created')
      setShowAdd(false)
      setNewKey('')
      setNewEn('')
      setNewDe('')
      setNewDesc('')
      fetchData()
    } catch {
      toast.error('Failed to create content string')
    } finally {
      setSaving(false)
    }
  }

  const exportJson = async () => {
    try {
      const res = await api.admin.contentStringsExport(section)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `content-strings-${section}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(tCommon('exportComplete'))
    } catch {
      toast.error(tCommon('exportFailed'))
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-4">
      {/* Section sub-tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSection(s)
              setSearch('')
            }}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors capitalize ${
              section === s
                ? 'border-blue-500 text-white'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${section} strings...`}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Add String
        </button>
        <button
          onClick={exportJson}
          className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Export JSON
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} string(s) in {section}
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </p>

      {/* Add new string form */}
      {showAdd && (
        <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h3 className="text-sm font-medium">Add New String</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. common.newString"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('optionalContextPlaceholder')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">EN Value</label>
              <textarea
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-[60px]"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">DE Value</label>
              <textarea
                value={newDe}
                onChange={(e) => setNewDe(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createString}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? tCommon('saving') : 'Create'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const isExpanded = expandedId === item.id
            const missingDe = !item.value_de || item.value_de.trim() === ''

            return (
              <div key={item.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => expandItem(item)}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors text-left gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-blue-400 truncate">{item.key}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.value_en.length > 80
                        ? item.value_en.slice(0, 80) + '...'
                        : item.value_en}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {missingDe && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-500"
                        title={t('missingDeTranslation')}
                      />
                    )}
                    <span className="text-muted-foreground text-xs">
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-900/50 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          EN
                        </label>
                        <textarea
                          value={editEn}
                          onChange={(e) => setEditEn(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          DE
                          {missingDe && (
                            <span className="ml-2 text-amber-400">
                              (missing)
                            </span>
                          )}
                        </label>
                        <textarea
                          value={editDe}
                          onChange={(e) => setEditDe(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          rows={3}
                        />
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => saveItem(item)}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? tCommon('saving') : tCommon('save')}
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {tCommon('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            {tCommon('previous')}
          </button>
          <span className="text-xs text-muted-foreground">
            {tCommon('page_x_of_y', { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            {tCommon('next')}
          </button>
        </div>
      )}
    </div>
  )
}
