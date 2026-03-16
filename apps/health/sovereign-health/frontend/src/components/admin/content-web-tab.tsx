'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { WebPage, WebSection } from '@/lib/types'

const LOCALES = ['en', 'de']

export function ContentWebTab() {
  const [pages, setPages] = useState<WebPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [loading, setLoading] = useState(true)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionKey, setNewSectionKey] = useState('')

  const fetchPages = useCallback(async () => {
    try {
      const res = await api.admin.listWebPages()
      setPages(res.data)
      if (!selectedPageId && res.data.length > 0) {
        setSelectedPageId(res.data[0].id)
      }
    } catch (err) {
      toast.error('Failed to load web pages')
    } finally {
      setLoading(false)
    }
  }, [selectedPageId])

  useEffect(() => { fetchPages() }, [fetchPages])

  const selectedPage = pages.find(p => p.id === selectedPageId)

  const handleAddSection = async () => {
    if (!selectedPageId || !newSectionKey.trim()) return
    try {
      await api.admin.addWebSection(selectedPageId, { key: newSectionKey.trim() })
      toast.success('Section added')
      setNewSectionKey('')
      setAddingSection(false)
      fetchPages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add section')
    }
  }

  const handleDeleteSection = async (sectionId: string, key: string) => {
    if (!confirm(`Delete section "${key}"? This removes all translations.`)) return
    try {
      await api.admin.deleteWebSection(sectionId)
      toast.success('Section deleted')
      fetchPages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete section')
    }
  }

  if (loading) {
    return <div className="text-white/40 text-sm">Loading web content...</div>
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-16rem)]">
      {/* Left: Page list */}
      <div className="w-48 shrink-0 border-r border-white/10 pr-4 space-y-1">
        <div className="text-xs text-white/30 uppercase tracking-wider mb-2 font-medium">Pages</div>
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setSelectedPageId(page.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedPageId === page.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/[0.05] hover:text-white/70'
            }`}
          >
            {page.title}
          </button>
        ))}
      </div>

      {/* Right: Section editor */}
      <div className="flex-1 overflow-y-auto">
        {selectedPage ? (
          <div className="space-y-4">
            {/* Page header + locale tabs */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">{selectedPage.title}</h3>
              <div className="flex items-center gap-1">
                {LOCALES.map(locale => (
                  <button
                    key={locale}
                    onClick={() => setSelectedLocale(locale)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      selectedLocale === locale
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {locale.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {selectedPage.sections.map(section => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  locale={selectedLocale}
                  onDelete={() => handleDeleteSection(section.id, section.key)}
                />
              ))}
            </div>

            {/* Add section */}
            {addingSection ? (
              <div className="flex items-center gap-2 p-3 border border-white/10 rounded-lg">
                <input
                  type="text"
                  value={newSectionKey}
                  onChange={e => setNewSectionKey(e.target.value)}
                  placeholder="section_key"
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                  autoFocus
                />
                <button onClick={handleAddSection} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors">
                  Add
                </button>
                <button onClick={() => { setAddingSection(false); setNewSectionKey('') }} className="text-xs text-white/40 hover:text-white/60">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                + Add Section
              </button>
            )}
          </div>
        ) : (
          <div className="text-white/30 text-sm">Select a page to edit</div>
        )}
      </div>
    </div>
  )
}

function SectionEditor({ section, locale, onDelete }: { section: WebSection; locale: string; onDelete: () => void }) {
  const t = useTranslations('admin')
  const currentValue = section.translations[locale] || ''
  const [value, setValue] = useState(currentValue)
  const [saving, setSaving] = useState(false)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  const isMissing = !section.translations[locale]

  // Reset value when locale or section changes
  useEffect(() => {
    setValue(section.translations[locale] || '')
  }, [locale, section.translations])

  const saveValue = useCallback(async (newValue: string) => {
    setSaving(true)
    try {
      await api.admin.updateWebTranslation(section.id, locale, newValue)
    } catch {
      toast.error(`Failed to save ${section.key}`)
    } finally {
      setSaving(false)
    }
  }, [section.id, section.key, locale])

  const handleChange = (newValue: string) => {
    setValue(newValue)
    // Debounce auto-save
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveValue(newValue), 800)
  }

  const isLong = value.length > 80 || currentValue.length > 80

  return (
    <div className={`p-3 border rounded-lg ${isMissing ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">{section.key}</span>
          <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{section.section_type}</span>
          {isMissing && <span className="text-[10px] text-amber-400">missing</span>}
          {saving && <span className="text-[10px] text-blue-400">saving...</span>}
        </div>
        <button
          onClick={onDelete}
          className="text-[10px] text-white/20 hover:text-red-400 transition-colors"
          title={t('deleteSection')}
        >
          delete
        </button>
      </div>
      {isLong ? (
        <textarea
          value={value}
          onChange={e => handleChange(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-y"
          placeholder={`Enter ${locale.toUpperCase()} text...`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
          placeholder={`Enter ${locale.toUpperCase()} text...`}
        />
      )}
    </div>
  )
}
