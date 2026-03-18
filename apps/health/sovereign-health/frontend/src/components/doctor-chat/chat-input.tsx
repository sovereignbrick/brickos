'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { APP_CONFIG } from '@/lib/config'
import { useTranslations } from 'next-intl'

interface ChatInputProps {
  onSend: (question: string) => void
  onFileUpload?: (files: File[], importType: 'lab_import' | 'med_import') => void
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
          <label className="shrink-0 p-3 text-muted-foreground hover:text-muted-foreground cursor-pointer transition-colors" title={t('uploadTitle')} aria-label={t('uploadTitle')}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file && onFileUpload) {
                  onFileUpload([file], 'lab_import')
                }
                if (e.target) e.target.value = ''
              }}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </label>
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
