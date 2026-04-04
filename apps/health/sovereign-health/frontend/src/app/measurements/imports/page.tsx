'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { ImportHistoryEntry } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumb } from '@/components/breadcrumb'
import { formatShortDate } from '@/lib/date-format'
import { useTranslations } from 'next-intl'

export default function ImportHistoryPage() {
  const { user, loading } = useAuth()
  const tImport = useTranslations('import')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')

  const [entries, setEntries] = useState<ImportHistoryEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    api.import.history()
      .then(res => setEntries(res.data))
      .catch(() => setEntries([]))
      .finally(() => setFetching(false))
  }, [user, loading])

  const handleRollback = async (entry: ImportHistoryEntry) => {
    if (!entry.session_id) return
    if (!confirm(tImport('historyRollbackConfirm'))) return
    setRollingBack(entry.id)
    try {
      const res = await api.import.rollbackImport(entry.session_id)
      const count = res.data?.measurements_deleted ?? 0
      // Navigate to measurements page with full reload to show fresh data
      // The ?rollback param triggers a toast on the measurements page
      window.location.href = `/measurements?rollback=${count}`
    } catch {
      setRollingBack(null)
      // keep entry in list on failure
    }
  }

  const importTypeLabel = (type: string) => {
    switch (type) {
      case 'lab_import': return tImport('historyLabImport')
      case 'med_import': return tImport('historyMedImport')
      case 'measurement_import': return tImport('historyMeasurementImport')
      default: return type
    }
  }

  if (loading || fetching) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        <div className="mb-6">
          <Breadcrumb items={[
            { label: tNav('overview'), href: '/dashboard' },
            { label: tNav('history'), href: '/measurements' },
            { label: tImport('historyTitle') },
          ]} />
        </div>

        <h1 className="text-xl font-bold mb-6">{tImport('historyTitle')}</h1>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">{tImport('historyEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries
              .filter(entry => entry.markers_imported > 0)
              .map(entry => {
                const importDate = new Date(entry.created_at)
                const dateStr = importDate.toLocaleDateString(user?.country_code === 'US' ? 'en-US' : 'de-DE', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })
                const timeStr = importDate.toLocaleTimeString(user?.country_code === 'US' ? 'en-US' : 'de-DE', {
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border p-4 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">
                          {importTypeLabel(entry.import_type)}
                        </span>
                        {entry.lab_provider && (
                          <span className="text-xs text-muted-foreground">
                            {entry.lab_provider}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{tImport('historyMarkersImported', { count: entry.markers_imported })}</span>
                        {entry.file_name && (
                          <span className="truncate max-w-[200px]">{entry.file_name}</span>
                        )}
                        <span>{dateStr} {timeStr}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRollback(entry)}
                      disabled={rollingBack === entry.id || !entry.session_id}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {rollingBack === entry.id ? '...' : tImport('historyRollback')}
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
