'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { APP_CONFIG } from '@/lib/config'
import { useTranslations } from 'next-intl'

interface ChatInputProps {
  onSend: (question: string) => void
  onFileUpload?: (files: File[], importType: 'lab_import' | 'med_import' | 'measurement_import') => void
  disabled: boolean
  quotaExhausted: boolean
  tier?: string
}

const MAX_CHARS = 500
const WARN_CHARS = 400

const UNLIMITED_TIERS = ['clarity', 'horizon', 'core']

export function ChatInput({ onSend, onFileUpload, disabled, quotaExhausted: rawQuotaExhausted, tier }: ChatInputProps) {
  const t = useTranslations('doctorChat')
  // Never show exhausted state for unlimited tiers
  const isUnlimited = tier && UNLIMITED_TIERS.includes(tier)
  const quotaExhausted = isUnlimited ? false : rawQuotaExhausted
  const [value, setValue] = useState('')
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const labInputRef = useRef<HTMLInputElement>(null)
  const medInputRef = useRef<HTMLInputElement>(null)
  const tableInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!uploadMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setUploadMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [uploadMenuOpen])

  const canSend = value.trim().length > 0 && !disabled && !quotaExhausted && value.length <= MAX_CHARS

  const handleSend = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-grow
    const ta = e.target
    ta.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 4 + 16
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px'
  }

  if (quotaExhausted) {
    return (
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('quotaExhausted')}
        </p>
        <a
          href={`${APP_CONFIG.websiteUrl}/pricing`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {t('upgradeToContinue')}
        </a>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex gap-2 items-end">
        {onFileUpload && (
          <div className="relative shrink-0" ref={uploadMenuRef}>
            <button
              type="button"
              onClick={() => setUploadMenuOpen(prev => !prev)}
              className="p-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={t('uploadTitle')}
              aria-label={t('uploadTitle')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            {uploadMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  type="button"
                  onClick={() => { setUploadMenuOpen(false); labInputRef.current?.click() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <span>📄</span> {t('uploadMenuLab')}
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMenuOpen(false); medInputRef.current?.click() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2 border-t border-border"
                >
                  <span>💊</span> {t('uploadMenuMed')}
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMenuOpen(false); tableInputRef.current?.click() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2 border-t border-border"
                >
                  <span>📊</span> {t('uploadMenuTable')}
                </button>
              </div>
            )}
            <input ref={labInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload([f], 'lab_import'); if (e.target) e.target.value = '' }} />
            <input ref={medInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload([f], 'med_import'); if (e.target) e.target.value = '' }} />
            <input ref={tableInputRef} type="file" accept=".ods,.xlsx,.xls,.csv,image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload([f], 'measurement_import'); if (e.target) e.target.value = '' }} />
          </div>
        )}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-accent/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:bg-accent transition-all disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '112px' }}
          />
          {value.length > WARN_CHARS && (
            <span
              className={`absolute bottom-2 right-3 text-xs ${value.length > MAX_CHARS ? 'text-red-400' : 'text-orange-400'}`}
            >
              {value.length}/{MAX_CHARS}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {t('send')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {t('newlineHint')}
      </p>
    </div>
  )
}
