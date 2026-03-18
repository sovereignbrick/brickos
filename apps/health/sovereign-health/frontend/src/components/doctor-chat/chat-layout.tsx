'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { ChatMessage, Conversation, QuotaResponse, ImportSession, MedImportSession } from '@/lib/types'
import { ConversationList } from './conversation-list'
import { QuotaBadge } from './quota-badge'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ImportReview } from './import-review'
import { InfluenceFactorImportReview } from './influence-factor-import-review'
import { useTranslations } from 'next-intl'

export function ChatLayout() {
  const tChat = useTranslations('doctorChat')
  const tMed = useTranslations('medications')

  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeAgentType, setActiveAgentType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [importSession, setImportSession] = useState<ImportSession | null>(null)
  const [medImportSession, setMedImportSession] = useState<MedImportSession | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)

  const fetchQuota = useCallback(async () => {
    try {
      const res = await api.doctorChat.getQuota()
      setQuota(res.data)
    } catch {
      // quota fetch failure is non-fatal
    }
  }, [])

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.doctorChat.getConversations()
      setConversations(res.data)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchQuota()
    fetchConversations()
  }, [fetchQuota, fetchConversations])

  const handleSend = async (question: string, agentType?: string) => {
    if (isLoading) return

    const agent = agentType ?? activeAgentType ?? undefined
    setChatError(null)
    setLastQuestion(question)

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: activeConversationId ?? '',
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setIsLoading(true)

    try {
      const res = await api.doctorChat.sendQuestion(question, activeConversationId ?? undefined, agent)
      const data = res.data

      const assistantMsg: ChatMessage = {
        id: data.message_id,
        conversation_id: data.conversation_id,
        role: 'assistant',
        content: data.answer,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === tempUserMsg.id
            ? { ...m, conversation_id: data.conversation_id }
            : m
        )
        return [...updated, assistantMsg]
      })

      setActiveConversationId(data.conversation_id)
      if (agent) setActiveAgentType(agent)

      if (quota) {
        setQuota({
          ...quota,
          remaining: data.remaining_quota,
          requests_used: data.monthly_limit - data.remaining_quota,
        })
      }

      await fetchConversations()
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      const rawMsg = err instanceof Error ? err.message : ''
      // Map known backend errors to i18n keys
      let errorMsg: string
      if (rawMsg.includes('overloaded') || rawMsg.includes('temporarily')) {
        errorMsg = tChat('errorOverloaded')
      } else if (rawMsg.includes('rate') || rawMsg.includes('Too many')) {
        errorMsg = tChat('errorRateLimited')
      } else if (rawMsg.includes('Upstream') || rawMsg.includes('upstream')) {
        errorMsg = tChat('errorUpstream')
      } else {
        errorMsg = rawMsg || tChat('errorServer')
      }
      setChatError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectConversation = async (id: string) => {
    try {
      const res = await api.doctorChat.getConversation(id)
      setMessages(res.data.messages)
      setActiveConversationId(id)
      setSidebarOpen(false)
      // Find agent_type from conversations list
      const conv = conversations.find(c => c.id === id)
      setActiveAgentType(conv?.agent_type ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tChat('failedLoadConversation'))
    }
  }

  const handleRate = async (messageId: string, rating: 'helpful' | 'not_helpful') => {
    if (!activeConversationId) return
    try {
      await api.doctorChat.rateMessage(activeConversationId, messageId, rating)
    } catch {
      // non-fatal
    }
  }

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await api.doctorChat.renameConversation(id, title)
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, title } : c)
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tChat('failedRename'))
    }
  }

  const handleFileUpload = async (files: File[], importType: 'lab_import' | 'med_import') => {
    setImportLoading(true)
    try {
      if (importType === 'lab_import') {
        const res = await api.import.uploadLab(files)
        setImportSession(res.data)
      } else {
        const res = await api.import.uploadMedication(files)
        setMedImportSession(res.data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tChat('importFailed'))
    } finally {
      setImportLoading(false)
    }
  }

  const handleImportConfirm = async (markers: Array<{ marker_slug: string; value: number }>, opts: { measured_at?: string; protocol_tag?: string; lab_name?: string; lab_address?: string; lab_postal_code?: string; lab_city?: string; lab_country?: string }) => {
    if (!importSession) return
    setImportLoading(true)
    try {
      const res = await api.import.confirm(importSession.session_id, markers, opts)
      toast.success(res.data.message)
      setImportSession(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tChat('importFailed'))
    } finally {
      setImportLoading(false)
    }
  }

  const handleMedImportConfirm = async (medications: Array<{ name: string; factor_type?: string; dosage?: string; frequency?: string; form?: string; prescriber?: string; ingredients?: Array<{ name: string; amount?: string; unit?: string; role?: string; notes?: string }> }>) => {
    if (!medImportSession) return
    setImportLoading(true)
    try {
      const res = await api.import.confirmMedications(medImportSession.session_id, medications)
      toast.success(tMed('importReview.imported', { count: res.data.influence_factors_created }), {
        action: {
          label: tMed('importReview.viewAll'),
          onClick: () => window.location.href = '/settings?tab=influence-factors',
        },
      })
      setMedImportSession(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tChat('importFailed'))
    } finally {
      setImportLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setActiveConversationId(null)
    setActiveAgentType(null)
    setImportSession(null)
    setMedImportSession(null)
    setSidebarOpen(false)
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-[280px] h-full bg-popover border-r border-border" onClick={e => e.stopPropagation()}>
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              onRename={handleRenameConversation}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="w-[280px] hidden md:flex flex-col border-r border-border bg-accent">
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onRename={handleRenameConversation}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground p-1"
              aria-label={tChat('openConversations')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="text-sm font-medium text-muted-foreground">
              {messages.length === 0 ? tChat('headerHome') : tChat('headerChat')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeConversationId && (
              <button
                onClick={handleNewChat}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                title={tChat('clearConversation')}
                aria-label={tChat('clearConversation')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
            <QuotaBadge
              remaining={quota?.remaining ?? 5}
              limit={quota?.requests_limit ?? 5}
              resetsAt={quota?.resets_at}
              tier={user?.tier}
            />
          </div>
        </div>

        {/* Home screen, import review, or chat */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {importLoading && !importSession && !medImportSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-3xl animate-pulse">🔬</div>
                <p className="text-sm text-muted-foreground">{tChat('analyzingDocument')}</p>
              </div>
            </div>
          ) : medImportSession ? (
            <InfluenceFactorImportReview
              sessionId={medImportSession.session_id}
              medications={medImportSession.medications}
              onConfirm={handleMedImportConfirm}
              onCancel={() => { setMedImportSession(null) }}
              isLoading={importLoading}
            />
          ) : importSession ? (
            <ImportReview
              session={importSession}
              onConfirm={handleImportConfirm}
              onCancel={() => { setImportSession(null) }}
              isLoading={importLoading}
            />
          ) : (
            <ChatMessages
              messages={messages}
              conversationId={activeConversationId ?? ''}
              isLoading={isLoading}
              onRate={handleRate}
              error={chatError}
              onRetry={lastQuestion ? () => handleSend(lastQuestion) : undefined}
              onSendPrompt={(text) => handleSend(text)}
              onFileUpload={handleFileUpload}
              tier={user?.tier}
            />
          )}
        </div>

        {/* Input (hidden during import) */}
        {!importSession && !medImportSession && !importLoading && (
          <ChatInput
            onSend={(q) => handleSend(q)}
            onFileUpload={handleFileUpload}
            disabled={isLoading}
            quotaExhausted={quota?.remaining === 0}
            tier={user?.tier}
          />
        )}
      </div>
    </div>
  )
}
