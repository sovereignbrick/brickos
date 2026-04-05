'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

export function DataPrivacyTab({ shareAnonymousData, onToggle }: { shareAnonymousData: boolean; onToggle: (v: boolean) => void }) {
  const t = useTranslations('settings.dataPrivacy')
  const tCommon = useTranslations('common')
  const { logout } = useAuth()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resetCounts, setResetCounts] = useState<Record<string, number> | null>(null)
  const [resetInput, setResetInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [toggling, setToggling] = useState(false)
  // Consent state
  const [consentNewsletter, setConsentNewsletter] = useState(false)
  const [consentPartner, setConsentPartner] = useState(false)
  const [consentLoading, setConsentLoading] = useState(false)
  // Access log state
  const [accessLog, setAccessLog] = useState<Array<{ accessed_by: string; action: string; resource: string; created_at: string }>>([])
  const [accessLogLoaded, setAccessLogLoaded] = useState(false)

  useEffect(() => {
    api.settings.getConsent().then(r => {
      setConsentNewsletter(r.data.consent_newsletter)
      setConsentPartner(r.data.consent_partner_offers)
    }).catch(() => {})
    api.settings.getAccessLog().then(r => {
      setAccessLog(r.data || [])
      setAccessLogLoaded(true)
    }).catch(() => setAccessLogLoaded(true))
  }, [])

  const handleConsentToggle = async (field: 'consent_newsletter' | 'consent_partner_offers', value: boolean) => {
    setConsentLoading(true)
    try {
      await api.settings.updateConsent({ [field]: value })
      if (field === 'consent_newsletter') setConsentNewsletter(value)
      else setConsentPartner(value)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('updateFailed'))
    } finally {
      setConsentLoading(false)
    }
  }

  // Reports state
  const [reportPeriod, setReportPeriod] = useState('3m')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingJson, setExportingJson] = useState(false)
  const [quota, setQuota] = useState<{ used: number; limit: number | null; period: string } | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; report_type: string; period: string; file_size_bytes: number | null; created_at: string }>>([])

  useEffect(() => {
    api.reports.quota().then(r => setQuota(r.data)).catch(() => {})
    api.reports.history().then(r => setHistory(r.data || [])).catch(() => {})
  }, [])

  const handleToggleAnonymous = async () => {
    setToggling(true)
    try {
      await api.settings.updateAnonymousData(!shareAnonymousData)
      onToggle(!shareAnonymousData)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('updateFailed'))
    } finally {
      setToggling(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)

    try {
      const res = await api.reports.healthPdf(reportPeriod)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || 'PDF generation failed')
      }
      const blob = await res.blob()
      downloadBlob(blob, `health-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success(t('pdfDownloaded'))
      api.reports.quota().then(r => setQuota(r.data)).catch(() => {})
      api.reports.history().then(r => setHistory(r.data || [])).catch(() => {})
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('pdfFailed'))
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleExportCsv = async () => {
    setExportingCsv(true)

    try {
      const res = await api.reports.exportCsv({ period: reportPeriod })
      if (!res.ok) throw new Error('CSV export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(t('csvExported'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('csvFailed'))
    } finally {
      setExportingCsv(false)
    }
  }

  const handleExportJson = async () => {
    setExportingJson(true)

    try {
      const res = await api.reports.exportJson({ period: reportPeriod })
      if (!res.ok) throw new Error('JSON export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-export-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success(t('jsonExported'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('jsonFailed'))
    } finally {
      setExportingJson(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const res = await api.settings.exportAll()
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      downloadBlob(blob, `sovereign-health-full-export-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success(t('exportDownloaded'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tCommon('exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const handleResetData = async () => {
    try {
      const res = await api.settings.resetData()
      setResetCounts(res.data.deleted)
      setResetInput('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('updateFailed'))
    }
  }

  const handleConfirmReset = async () => {
    setResetting(true)
    try {
      const res = await api.settings.resetData('RESET')
      if (res.data.confirmed) {
        toast.success(t('resetDataSuccess'))
        setResetCounts(null)
        setResetInput('')
        window.location.reload()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('updateFailed'))
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await api.settings.deleteAccount()
      logout()
      router.push('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('deleteFailed'))
      setDeleting(false)
    }
  }, [logout, router, t])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column: data visibility & consent */}
      <div className="space-y-6">
      <div className="border border-border rounded-lg p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t('anonymousDataTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('anonymousDataDesc')}</p>
          </div>
          <button
            onClick={handleToggleAnonymous}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
              shareAnonymousData ? 'bg-blue-600' : 'bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              shareAnonymousData ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Consent Toggles */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-medium">{t('consentTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('consentDesc')}</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('consentNewsletter')}</p>
              <p className="text-xs text-muted-foreground">{t('consentNewsletterDesc')}</p>
            </div>
            <button
              onClick={() => handleConsentToggle('consent_newsletter', !consentNewsletter)}
              disabled={consentLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                consentNewsletter ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                consentNewsletter ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('consentPartnerOffers')}</p>
              <p className="text-xs text-muted-foreground">{t('consentPartnerOffersDesc')}</p>
            </div>
            <button
              onClick={() => handleConsentToggle('consent_partner_offers', !consentPartner)}
              disabled={consentLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                consentPartner ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                consentPartner ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Access Log */}
      <div className="border border-border rounded-lg p-6 space-y-3">
        <div>
          <h3 className="font-medium">{t('accessLogTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('accessLogDesc')}</p>
        </div>
        {accessLogLoaded && accessLog.length === 0 && (
          <p className="text-sm text-muted-foreground italic">{t('accessLogEmpty')}</p>
        )}
        {accessLog.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5">{t('accessLogAction')}</th>
                  <th className="text-left py-1.5">{t('accessLogResource')}</th>
                  <th className="text-left py-1.5">{t('accessLogDate')}</th>
                </tr>
              </thead>
              <tbody>
                {accessLog.map((entry, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 text-foreground">{t.has(`action_${entry.action}`) ? t(`action_${entry.action}`) : entry.action}</td>
                    <td className="py-1.5 text-muted-foreground">{t.has(`resource_${entry.resource}`) ? t(`resource_${entry.resource}`) : entry.resource}</td>
                    <td className="py-1.5 text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' '}
                      {new Date(entry.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">

      {/* Health Reports */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="font-medium">{t('healthReports')}</h3>
        <p className="text-sm text-muted-foreground">{t('healthReportsDesc')}</p>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="settings-report-period" className="text-sm text-muted-foreground">{t('period')}</label>
          <select
            id="settings-report-period"
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="7d">{t('last7d')}</option>
            <option value="30d">{t('last30d')}</option>
            <option value="3m">{t('last3m')}</option>
            <option value="6m">{t('last6m')}</option>
            <option value="1y">{t('last1y')}</option>
            <option value="all">{t('allTime')}</option>
          </select>

        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {generatingPdf ? t('generating') : t('generatePdf')}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="border border-border hover:bg-accent text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {exportingCsv ? t('exporting') : tCommon('exportCsv')}
          </button>
          <button
            onClick={handleExportJson}
            disabled={exportingJson}
            className="border border-border hover:bg-accent text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {exportingJson ? t('exporting') : t('exportJson')}
          </button>
        </div>

        {quota && (
          <p className="text-xs text-muted-foreground">
            {t('quotaUsed', { used: quota.used, limit: quota.limit !== null ? t('quotaLimit', { max: quota.limit, period: quota.period }) : t('quotaUnlimited') })}
          </p>
        )}

        {history.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('recentReports')}</p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {[...history]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map(h => {
                  const typeLabel = h.report_type === 'health_pdf' ? t('pdfReport')
                    : h.report_type === 'json_export' ? t('jsonExport')
                    : h.report_type === 'csv_export' ? t('csvExport')
                    : h.report_type;
                  const d = new Date(h.created_at);
                  const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={h.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{typeLabel} ({h.period})</span>
                      <span>{dateStr} {timeStr}{h.file_size_bytes ? ` - ${(h.file_size_bytes / 1024).toFixed(0)} KB` : ''}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-6 space-y-3">
        <h3 className="font-medium">{t('exportAllTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('exportAllDesc')}</p>
        <button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {exporting ? t('preparingExport') : t('downloadExport')}
        </button>
      </div>

      {/* Reset All Data */}
      <div className="border border-red-900/50 rounded-lg p-6 space-y-3">
        <h3 className="font-medium text-red-400">{t('resetDataTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('resetDataDesc')}</p>
        {!resetCounts ? (
          <button onClick={handleResetData} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600/30 transition-colors">{t('resetDataButton')}</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300 font-medium">{t('resetDataConfirmTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('resetDataConfirmDesc')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {resetCounts.measurements > 0 && <li>{t('resetDataMeasurements', { count: resetCounts.measurements })}</li>}
              {resetCounts.calculated > 0 && <li>{t('resetDataCalculated', { count: resetCounts.calculated })}</li>}
              {resetCounts.devices > 0 && <li>{t('resetDataDevices', { count: resetCounts.devices })}</li>}
              {resetCounts.labs > 0 && <li>{t('resetDataLabs', { count: resetCounts.labs })}</li>}
              {resetCounts.medications > 0 && <li>{t('resetDataMedications', { count: resetCounts.medications })}</li>}
              {resetCounts.chats > 0 && <li>{t('resetDataChats', { count: resetCounts.chats })}</li>}
              {resetCounts.templates > 0 && <li>{t('resetDataTemplates', { count: resetCounts.templates })}</li>}
              {resetCounts.custom_ranges > 0 && <li>{t('resetDataRanges', { count: resetCounts.custom_ranges })}</li>}
              {resetCounts.imports > 0 && <li>{t('resetDataImports', { count: resetCounts.imports })}</li>}
            </ul>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('resetDataTypeConfirm')}</label>
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm w-full max-w-[200px]"
                placeholder="RESET"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmReset}
                disabled={resetting || resetInput !== 'RESET'}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {resetting ? t('resettingData') : t('resetDataConfirmButton')}
              </button>
              <button onClick={() => { setResetCounts(null); setResetInput('') }} className="border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-sm font-medium px-4 py-2 rounded-lg transition-colors">{tCommon('cancel')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div className="border border-red-900/50 rounded-lg p-6 space-y-3">
        <h3 className="font-medium text-red-400">{t('deleteAccountTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('deleteAccountDesc')}</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600/30 transition-colors">{t('deleteButton')}</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300 font-medium">{t('confirmDeletePrompt')}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500 transition-colors">{deleting ? t('deleting') : t('confirmDeleteButton')}</button>
              <button onClick={() => setConfirmDelete(false)} className="border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
      </div>

    </div>
  )
}
