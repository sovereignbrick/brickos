'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChatMessage } from '@/lib/types'
import { ChatBubble } from './chat-bubble'
import { TypingIndicator } from './typing-indicator'

interface ChatMessagesProps {
  messages: ChatMessage[]
  conversationId: string
  isLoading: boolean
  onRate: (messageId: string, rating: 'helpful' | 'not_helpful') => Promise<void>
  error?: string | null
  onRetry?: () => void
  onSendPrompt?: (text: string) => void
  onFileUpload?: (files: File[], importType: 'lab_import' | 'med_import' | 'measurement_import') => void
  tier?: string
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-accent" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-accent" />
    </div>
  )
}

const PROMPT_SECTIONS = [
  {
    sectionKey: 'sectionHealth',
    prompts: [
      { key: 'starterOverview', icon: '\u{1FA7A}', minTier: 'glimpse', color: '#3498DB' },
      { key: 'starterRedFlags', icon: '\u26A0\uFE0F', minTier: 'glimpse', color: '#E74C3C' },
      { key: 'starterNextSteps', icon: '\u{1F3AF}', minTier: 'focus', color: '#3B82F6' },
    ]
  },
  {
    sectionKey: 'sectionTrends',
    prompts: [
      { key: 'starterGlucoseTrend', icon: '\u{1F4C8}', minTier: 'focus', color: '#3498DB' },
      { key: 'starterLipidChanges', icon: '\u{1F4CA}', minTier: 'focus', color: '#E74C3C' },
      { key: 'starterWeightProgress', icon: '\u2696\uFE0F', minTier: 'focus', color: '#F39C12' },
    ]
  },
  {
    sectionKey: 'sectionLabs',
    prompts: [
      { key: 'starterExplainLabs', icon: '\u{1F52C}', minTier: 'focus', color: '#27AE60' },
      { key: 'starterOutOfRange', icon: '\u{1F6A6}', minTier: 'focus', color: '#E74C3C' },
      { key: 'starterLabsImprove', icon: '\u{1F4A1}', minTier: 'insight', color: '#27AE60' },
    ]
  },
  {
    sectionKey: 'sectionNutrition',
    prompts: [
      { key: 'starterFoodsForMarkers', icon: '\u{1F34E}', minTier: 'insight', color: '#F39C12' },
      { key: 'starterSupplementReview', icon: '\u{1F48A}', minTier: 'insight', color: '#9B59B6' },
      { key: 'starterProtocolCompare', icon: '\u{1F504}', minTier: 'clarity', color: '#3B82F6' },
    ]
  },
]

const TIER_ORDER = ['glimpse', 'focus', 'insight', 'clarity', 'horizon', 'core']
function isTierAtLeast(userTier: string, minTier: string): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(minTier)
}

export function ChatMessages({ messages, conversationId, isLoading, onRate, error, onRetry, onSendPrompt, onFileUpload, tier }: ChatMessagesProps) {
  const t = useTranslations('doctorChat')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const getDateLabel = (dateStr: string): string => {
    const d = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (msgDate.getTime() === today.getTime()) return t('today')
    if (msgDate.getTime() === yesterday.getTime()) return t('yesterday')
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const userTier = tier ?? 'glimpse'

  const handleLabUpload = () => {
    if (!onFileUpload) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      if (files.length > 0) onFileUpload(files, 'lab_import')
    }
    input.click()
  }

  const handleMedUpload = () => {
    if (!onFileUpload) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      if (files.length > 0) onFileUpload(files, 'med_import')
    }
    input.click()
  }

  const handleTableUpload = () => {
    if (!onFileUpload) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ods,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp'
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      if (files.length > 0) onFileUpload(files, 'measurement_import')
    }
    input.click()
  }

  // Empty state with starter prompts
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="overflow-y-auto flex-1 py-4">
        <div className="flex flex-col items-center px-4 py-4 md:pt-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">{t('welcomeTitle')}</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{t('welcomeDesc')}</p>
          </div>

          {onSendPrompt && (
            <div className="w-full max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROMPT_SECTIONS.map((section, sIdx) => (
                  <div key={section.sectionKey}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                      {t(section.sectionKey)}
                    </p>
                    <div className="space-y-1.5">
                      {section.prompts.map((prompt, pIdx) => {
                        const unlocked = isTierAtLeast(userTier, prompt.minTier)
                        return (
                          <button
                            key={prompt.key}
                            onClick={() => unlocked && onSendPrompt(t(prompt.key))}
                            disabled={!unlocked}
                            className={`w-full flex items-center gap-2.5 text-left text-xs rounded-lg border px-3 py-2.5 transition-all ${
                              unlocked
                                ? 'bg-accent/50 hover:bg-accent text-foreground/80 hover:text-foreground border-border hover:border-border cursor-pointer'
                                : 'bg-accent/30 text-muted-foreground border-border cursor-not-allowed'
                            }`}
                            style={{
                              borderLeftWidth: '3px',
                              borderLeftColor: unlocked ? prompt.color : 'rgba(255,255,255,0.05)',
                              animationDelay: `${(sIdx * 3 + pIdx) * 50}ms`,
                            }}
                            title={!unlocked ? t('lockedTooltip', { tier: prompt.minTier }) : `${t(prompt.key)}\n${t(prompt.key + 'Desc')}`}
                          >
                            <span className="text-sm shrink-0">{prompt.icon}</span>
                            <span className="flex-1 truncate">{t(prompt.key)}</span>
                            {!unlocked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Smart import actions */}
              {onFileUpload && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    {t('smartImport')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { handler: handleLabUpload, icon: '📄', label: 'uploadMenuLab', tooltip: 'importUploadDesc' },
                      { handler: handleMedUpload, icon: '💊', label: 'uploadMenuMed', tooltip: 'importTrackDesc' },
                      { handler: handleTableUpload, icon: '📊', label: 'uploadMenuTable', tooltip: 'importTableDesc' },
                    ].map((btn) => {
                      const importUnlocked = isTierAtLeast(userTier, 'insight')
                      return (
                        <button
                          key={btn.label}
                          onClick={() => importUnlocked && btn.handler()}
                          disabled={!importUnlocked}
                          className={`flex items-center justify-center gap-2 text-xs px-3 py-2.5 rounded-lg border transition-colors ${
                            importUnlocked
                              ? 'bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground border-border hover:border-border'
                              : 'bg-accent/20 text-muted-foreground/40 border-border/30 cursor-not-allowed'
                          }`}
                          title={importUnlocked ? t(btn.tooltip) : t('lockedTooltip', { tier: 'insight' })}
                        >
                          <span className={importUnlocked ? '' : 'opacity-40'}>{btn.icon}</span>
                          {t(btn.label)}
                          {!importUnlocked && <svg className="w-3 h-3 opacity-40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
    )
  }

  // Build messages with date separators
  let lastDateLabel = ''

  return (
    <div className="overflow-y-auto flex-1 py-4">
      {messages.map((message) => {
        const dateLabel = getDateLabel(message.created_at)
        const showSeparator = dateLabel !== lastDateLabel
        lastDateLabel = dateLabel

        return (
          <div key={message.id}>
            {showSeparator && <DateSeparator label={dateLabel} />}
            <ChatBubble
              message={message}
              conversationId={conversationId}
              onRate={onRate}
            />
          </div>
        )
      })}
      {isLoading && <TypingIndicator />}
      {error && !isLoading && (
        <div className="flex justify-start px-4 py-2">
          <div className="flex gap-2 max-w-[85%]">
            <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center text-sm mt-1">
              &#9888;&#65039;
            </div>
            <div className="rounded-2xl rounded-tl-sm text-sm border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-red-300/80">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs bg-accent hover:bg-accent text-muted-foreground px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t('tryAgain')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
