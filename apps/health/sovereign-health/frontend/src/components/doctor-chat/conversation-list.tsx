'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Conversation } from '@/lib/types'
import { Pencil, Check, X } from 'lucide-react'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onRename?: (id: string, title: string) => Promise<void>
}

export function ConversationList({ conversations, activeId, onSelect, onNewChat, onRename }: ConversationListProps) {
  const t = useTranslations('doctorChat')

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (msgDate.getTime() === today.getTime()) return t('today')
    if (msgDate.getTime() === yesterday.getTime()) return t('yesterday')
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = searchQuery.trim()
    ? conversations.filter(c => (c.title ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : conversations

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditTitle(conv.title ?? '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const confirmEditing = async () => {
    if (!editingId || !editTitle.trim() || !onRename) return
    await onRename(editingId, editTitle.trim())
    setEditingId(null)
    setEditTitle('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/10 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full text-sm font-medium px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          + {t('newConversation')}
        </button>
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchChats')}
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-white/20 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4 px-2">
            {t('noHistory')}
          </p>
        )}
        {filtered.map((conv) => (
          <div
            key={conv.id}
            onClick={() => { if (editingId !== conv.id) onSelect(conv.id) }}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
              activeId === conv.id
                ? 'bg-white/10 text-white/90'
                : 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'
            }`}
          >
            {editingId === conv.id ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEditing()
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  maxLength={200}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); confirmEditing() }}
                  className="text-green-400 hover:text-green-300 p-0.5"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelEditing() }}
                  className="text-white/40 hover:text-white/60 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-medium truncate flex-1">
                    {conv.title ?? t('newConversation')}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {onRename && (
                      <button
                        onClick={(e) => startEditing(conv, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-opacity p-0.5"
                      >
                        <Pencil size={10} />
                      </button>
                    )}
                    <span className="text-xs text-white/30">
                      {conv.message_count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white/30 mt-0.5 block">
                  {formatDate(conv.updated_at)}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
