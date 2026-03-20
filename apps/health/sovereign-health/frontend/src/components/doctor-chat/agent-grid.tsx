'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'
import { Conversation } from '@/lib/types'

interface AgentGridProps {
  onSelectAgent: (agentType: string) => void
  onFileUpload: (files: File[], importType: 'lab_import' | 'med_import' | 'measurement_import') => void
  recentConversations: Conversation[]
  onSelectConversation: (id: string) => void
  tier?: string
}

const AGENTS = [
  { type: 'general', titleKey: 'agentGeneral', descKey: 'agentGeneralDesc', icon: '🩺', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30', minTier: 'glimpse' },
  { type: 'trends', titleKey: 'agentTrends', descKey: 'agentTrendsDesc', icon: '📈', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30', minTier: 'focus' },
  { type: 'labs', titleKey: 'agentLabs', descKey: 'agentLabsDesc', icon: '🔬', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30', minTier: 'focus' },
  { type: 'diet', titleKey: 'agentDiet', descKey: 'agentDietDesc', icon: '🥗', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30', minTier: 'focus' },
  { type: 'supplements', titleKey: 'agentSupplements', descKey: 'agentSupplementsDesc', icon: '💊', color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30', minTier: 'insight' },
  { type: 'protocols', titleKey: 'agentProtocols', descKey: 'agentProtocolsDesc', icon: '⚖️', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30', minTier: 'insight' },
]

const TIER_ORDER = ['glimpse', 'focus', 'insight', 'clarity', 'horizon', 'core']

function isTierAtLeast(userTier: string, minTier: string): boolean {
  const userIdx = TIER_ORDER.indexOf(userTier)
  const minIdx = TIER_ORDER.indexOf(minTier)
  if (userIdx === -1) return false
  return userIdx >= minIdx
}

function getMinTierLabel(minTier: string): string {
  const labels: Record<string, string> = { glimpse: 'Glimpse', focus: 'Focus', insight: 'Insight', clarity: 'Clarity' }
  return labels[minTier] || minTier
}

const IMPORT_ACTIONS = [
  { id: 'scan_lab', titleKey: 'importScan', descKey: 'importScanDesc', icon: '📷', accept: 'image/jpeg,image/png,image/webp', importType: 'lab_import' as const, color: 'from-teal-500/20 to-teal-600/10 border-teal-500/30' },
  { id: 'upload_pdf', titleKey: 'importUpload', descKey: 'importUploadDesc', icon: '📄', accept: 'application/pdf', importType: 'lab_import' as const, color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30' },
  { id: 'track_meds', titleKey: 'importTrack', descKey: 'importTrackDesc', icon: '💊', accept: 'image/jpeg,image/png,image/webp', importType: 'med_import' as const, color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30' },
  { id: 'import_table', titleKey: 'importTable', descKey: 'importTableDesc', icon: '📊', accept: '.ods,.xlsx,.xls,.csv,image/jpeg,image/png,image/webp', importType: 'measurement_import' as const, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
]

const AGENT_LABEL_KEYS: Record<string, string> = {
  general: 'labelGeneral',
  trends: 'labelTrends',
  labs: 'labelLabs',
  diet: 'labelDiet',
  supplements: 'labelSupplements',
  protocols: 'labelProtocols',
}

export function AgentGrid({ onSelectAgent, onFileUpload, recentConversations, onSelectConversation, tier = 'glimpse' }: AgentGridProps) {
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Header - compact */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🩺</span>
            <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t('welcomeShort')}
          </p>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto mt-2">
            {t('guidance')}
          </p>
        </div>

        {/* Active agents - compact tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
          {AGENTS.map((agent) => {
            const allowed = isTierAtLeast(tier, agent.minTier)
            return (
              <button
                key={agent.type}
                onClick={allowed ? () => onSelectAgent(agent.type) : undefined}
                className={`text-left px-3 py-2.5 rounded-lg border bg-gradient-to-br ${agent.color} transition-all ${
                  allowed ? 'hover:brightness-125 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{agent.icon}</span>
                  <span className="text-xs font-medium text-foreground truncate">{t(agent.titleKey)}</span>
                  {!allowed && <span className="text-[9px] bg-accent text-muted-foreground px-1 py-0.5 rounded ml-auto shrink-0">🔒</span>}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {allowed ? t(agent.descKey) : t('unlockWith', { tier: getMinTierLabel(agent.minTier) })}
                </div>
              </button>
            )
          })}
        </div>

        {/* Smart Import - compact */}
        <div>
          <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('smartImport')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {IMPORT_ACTIONS.map((action) => (
              <MultiFileUploadCard
                key={action.id}
                action={action}
                onUpload={(files) => onFileUpload(files, action.importType)}
              />
            ))}
          </div>
        </div>

        {/* Recent conversations */}
        {recentConversations.length > 0 && (
          <div>
            <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('recentConversations')}</h3>
            <div className="space-y-0.5">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {conv.agent_type && conv.agent_type !== 'general' && (
                      <span className="text-[10px] font-medium bg-accent text-muted-foreground px-1.5 py-0.5 rounded">
                        {t(AGENT_LABEL_KEYS[conv.agent_type] ?? 'labelGeneral')}
                      </span>
                    )}
                    <span className="text-xs font-medium truncate flex-1">
                      {conv.title ?? t('newConversation')}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(conv.updated_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MultiFileUploadCard({ action, onUpload }: { action: typeof IMPORT_ACTIONS[number]; onUpload: (files: File[]) => void }) {
  const t = useTranslations('doctorChat')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_FILES = 3
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const remaining = MAX_FILES - selectedFiles.length
    if (remaining <= 0) {
      toast.error(t('maxFilesPerUpload'))
      return
    }

    const toAdd: File[] = []
    for (const file of fileArray.slice(0, remaining)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('fileTooLarge', { name: file.name }))
        continue
      }
      toAdd.push(file)
    }

    if (toAdd.length + selectedFiles.length > MAX_FILES) {
      toast.error(t('maxFilesPerUpload'))
      return
    }

    setSelectedFiles(prev => [...prev, ...toAdd])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (selectedFiles.length === 0) return
    onUpload(selectedFiles)
    setSelectedFiles([])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  if (selectedFiles.length === 0) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={action.accept}
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full text-left px-3 py-2.5 rounded-lg border bg-gradient-to-br ${action.color} hover:brightness-125 transition-all ${dragOver ? 'ring-2 ring-blue-400' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{action.icon}</span>
            <span className="text-xs font-medium text-foreground truncate">{t(action.titleKey)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground line-clamp-1">{t(action.descKey)}</div>
        </button>
      </div>
    )
  }

  return (
    <div className={`col-span-2 sm:col-span-4 p-4 rounded-xl border bg-gradient-to-br ${action.color}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{action.icon}</span>
          <span className="text-sm font-medium text-foreground">{t(action.titleKey)}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t('filesCount', { count: String(selectedFiles.length), max: String(MAX_FILES) })}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {selectedFiles.map((file, i) => (
          <FilePreview key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
        ))}
        {selectedFiles.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-muted-foreground hover:border-border transition-colors"
          >
            <span className="text-lg">+</span>
            <span className="text-[10px]">{t('addFile')}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={action.accept}
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {t('uploadAnalyze')}
        </button>
        <button
          onClick={() => setSelectedFiles([])}
          className="text-sm text-muted-foreground hover:text-muted-foreground px-3 py-2 transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">{t('fileFormats')}</p>
    </div>
  )
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  const sizeStr = file.size > 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
    : `${Math.round(file.size / 1024)}KB`

  return (
    <div className="relative w-20 h-20 rounded-lg border border-border bg-accent/50 overflow-hidden group">
      {preview ? (
        <img src={preview} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <span className="text-lg">📄</span>
          <span className="text-[8px] text-muted-foreground truncate max-w-[72px] px-1">{file.name}</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-foreground/80 hover:bg-red-600 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-muted-foreground text-center py-0.5">
        {sizeStr}
      </div>
    </div>
  )
}
