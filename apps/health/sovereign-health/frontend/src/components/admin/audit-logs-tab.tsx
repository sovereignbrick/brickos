'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccessLogEntry {
  id: string
  timestamp: string
  user_email: string
  accessed_by: string
  action: string
  resource: string
  metadata?: Record<string, unknown>
}

interface EventLogEntry {
  id: string
  timestamp: string
  user_email: string
  action: string
  resource_type: string
  ip: string
  metadata?: Record<string, unknown>
}

interface AuditStats {
  access_count: number
  event_count: number
  oldest_access: string | null
  oldest_event: string | null
}

interface PurgeResult {
  deleted_access: number
  deleted_events: number
}

type SubTab = 'access' | 'events' | 'pgaudit'
type SortDir = 'asc' | 'desc'
type DateRange = 'today' | '7d' | '30d' | '90d' | 'all'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL || ''
const PER_PAGE = 25
const RETENTION_DAYS = 90

const getToken = () => {
  try {
    return localStorage.getItem('sh_token')
  } catch {
    return null
  }
}

async function fetchAudit<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = getToken()
  const qs = new URLSearchParams(params).toString()
  const url = qs ? `${API}${path}?${qs}` : `${API}${path}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

function dateRangeToParam(range: DateRange): string | undefined {
  if (range === 'all') return undefined
  const now = new Date()
  const d = new Date(now)
  switch (range) {
    case 'today':
      break
    case '7d':
      d.setDate(d.getDate() - 7)
      break
    case '30d':
      d.setDate(d.getDate() - 30)
      break
    case '90d':
      d.setDate(d.getDate() - 90)
      break
  }
  return d.toISOString().slice(0, 10)
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  all: 'All',
}

const COMMON_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'export',
  'login',
  'logout',
  'invite',
  'revoke',
]

function formatTs(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string
  field: string
  current: string
  dir: SortDir
  onSort: (field: string) => void
}) {
  const active = current === field
  return (
    <th
      className="text-left px-4 py-2 text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {active && (
        <span className="ml-1 text-xs">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1 && total <= perPage) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-muted-foreground">
        Showing {start}&ndash;{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        >
          &lt;
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 py-1 text-muted-foreground">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`px-2.5 py-1 rounded text-sm transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-accent text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 rounded bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditLogsTab() {
  const [subTab, setSubTab] = useState<SubTab>('access')

  // Shared filter state
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [actionFilter, setActionFilter] = useState('')

  // Access logs state
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([])
  const [accessTotal, setAccessTotal] = useState(0)
  const [accessPage, setAccessPage] = useState(1)
  const [accessSort, setAccessSort] = useState('timestamp')
  const [accessDir, setAccessDir] = useState<SortDir>('desc')
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessExpanded, setAccessExpanded] = useState<string | null>(null)

  // Event logs state
  const [eventLogs, setEventLogs] = useState<EventLogEntry[]>([])
  const [eventTotal, setEventTotal] = useState(0)
  const [eventPage, setEventPage] = useState(1)
  const [eventSort, setEventSort] = useState('timestamp')
  const [eventDir, setEventDir] = useState<SortDir>('desc')
  const [eventLoading, setEventLoading] = useState(false)
  const [eventExpanded, setEventExpanded] = useState<string | null>(null)

  // Stats / purge state
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [purgeConfirm, setPurgeConfirm] = useState(false)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null)

  // -------------------------------------------------------------------------
  // Fetch access logs
  // -------------------------------------------------------------------------
  const fetchAccessLogs = useCallback(async () => {
    setAccessLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(accessPage),
        per_page: String(PER_PAGE),
        sort: accessSort,
        order: accessDir,
      }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      const since = dateRangeToParam(dateRange)
      if (since) params.from = since

      const res = await fetchAudit<{ data: { entries: Record<string, unknown>[]; total: number } }>(
        '/admin/audit/access-logs',
        params,
      )
      const entries: AccessLogEntry[] = (res.data.entries || []).map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ''),
        timestamp: String(e.created_at ?? ''),
        user_email: String(e.user_email ?? ''),
        accessed_by: String(e.accessed_by_email ?? ''),
        action: String(e.action ?? ''),
        resource: String(e.resource ?? ''),
        metadata: e.metadata as Record<string, unknown> | undefined,
      }))
      setAccessLogs(entries)
      setAccessTotal(res.data.total ?? 0)
    } catch {
      setAccessLogs([])
      setAccessTotal(0)
    } finally {
      setAccessLoading(false)
    }
  }, [accessPage, accessSort, accessDir, search, actionFilter, dateRange])

  // -------------------------------------------------------------------------
  // Fetch event logs
  // -------------------------------------------------------------------------
  const fetchEventLogs = useCallback(async () => {
    setEventLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(eventPage),
        per_page: String(PER_PAGE),
        sort: eventSort,
        order: eventDir,
      }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      const since = dateRangeToParam(dateRange)
      if (since) params.from = since

      const res = await fetchAudit<{ data: { entries: Record<string, unknown>[]; total: number } }>(
        '/admin/audit/events',
        params,
      )
      const entries: EventLogEntry[] = (res.data.entries || []).map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ''),
        timestamp: String(e.created_at ?? ''),
        user_email: String(e.user_email ?? ''),
        action: String(e.action ?? ''),
        resource_type: String(e.resource_type ?? ''),
        ip: String(e.ip_address ?? ''),
        metadata: e.metadata as Record<string, unknown> | undefined,
      }))
      setEventLogs(entries)
      setEventTotal(res.data.total ?? 0)
    } catch {
      setEventLogs([])
      setEventTotal(0)
    } finally {
      setEventLoading(false)
    }
  }, [eventPage, eventSort, eventDir, search, actionFilter, dateRange])

  // -------------------------------------------------------------------------
  // Fetch stats
  // -------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchAudit<{ data: Record<string, unknown> }>('/admin/audit/stats')
      const d = res.data
      setStats({
        access_count: Number(d.access_log_count ?? 0),
        event_count: Number(d.event_log_count ?? 0),
        oldest_access: d.access_log_oldest ? String(d.access_log_oldest) : null,
        oldest_event: d.event_log_oldest ? String(d.event_log_oldest) : null,
      })
    } catch {
      setStats(null)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Purge
  // -------------------------------------------------------------------------
  const handlePurge = async () => {
    setPurging(true)
    try {
      const token = getToken()
      const qs = new URLSearchParams({ older_than_days: String(RETENTION_DAYS) }).toString()
      const rawRes = await fetch(`${API}/admin/audit/purge?${qs}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!rawRes.ok) throw new Error('Purge failed')
      const json = await rawRes.json()
      const d = json.data || {}
      const res: PurgeResult = {
        deleted_access: Number(d.access_logs_deleted ?? 0),
        deleted_events: Number(d.event_logs_deleted ?? 0),
      }
      setPurgeResult(res)
      setPurgeConfirm(false)
      // Refresh data
      fetchStats()
      if (subTab === 'access') fetchAccessLogs()
      if (subTab === 'events') fetchEventLogs()
    } catch {
      setPurgeResult(null)
    } finally {
      setPurging(false)
    }
  }

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (subTab === 'access') fetchAccessLogs()
  }, [subTab, fetchAccessLogs])

  useEffect(() => {
    if (subTab === 'events') fetchEventLogs()
  }, [subTab, fetchEventLogs])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset page on filter change
  useEffect(() => {
    setAccessPage(1)
    setEventPage(1)
  }, [search, dateRange, actionFilter])

  // -------------------------------------------------------------------------
  // Sort handlers
  // -------------------------------------------------------------------------
  const handleAccessSort = (field: string) => {
    if (accessSort === field) {
      setAccessDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setAccessSort(field)
      setAccessDir('desc')
    }
  }

  const handleEventSort = (field: string) => {
    if (eventSort === field) {
      setEventDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setEventSort(field)
      setEventDir('desc')
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'access', label: 'Data Access' },
    { key: 'events', label: 'App Events' },
    { key: 'pgaudit', label: 'DB Audit (pgaudit)' },
  ]

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-0 border-b border-border">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.key
                ? 'border-blue-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters (shared for access + events) */}
      {subTab !== 'pgaudit' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search across all columns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
          />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500"
          >
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(k => (
              <option key={k} value={k}>
                {DATE_RANGE_LABELS[k]}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500"
          >
            <option value="">All actions</option>
            {COMMON_ACTIONS.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab 1: Data Access */}
      {subTab === 'access' && (
        <div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent">
                  <SortHeader label="Timestamp" field="timestamp" current={accessSort} dir={accessDir} onSort={handleAccessSort} />
                  <SortHeader label="User" field="user_email" current={accessSort} dir={accessDir} onSort={handleAccessSort} />
                  <SortHeader label="Accessed By" field="accessed_by" current={accessSort} dir={accessDir} onSort={handleAccessSort} />
                  <SortHeader label="Action" field="action" current={accessSort} dir={accessDir} onSort={handleAccessSort} />
                  <SortHeader label="Resource" field="resource" current={accessSort} dir={accessDir} onSort={handleAccessSort} />
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {accessLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No access log entries found.
                    </td>
                  </tr>
                ) : (
                  accessLogs.map((entry, i) => (
                    <Fragment key={entry.id}>
                      <tr
                        className={`border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                          i % 2 === 1 ? 'bg-muted/30' : ''
                        }`}
                        onClick={() =>
                          setAccessExpanded(accessExpanded === entry.id ? null : entry.id)
                        }
                      >
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {formatTs(entry.timestamp)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{entry.user_email}</td>
                        <td className="px-4 py-2.5 text-foreground">{entry.accessed_by}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{entry.resource}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {accessExpanded === entry.id ? '\u25BC' : '\u25B6'}
                        </td>
                      </tr>
                      {accessExpanded === entry.id && entry.metadata && (
                        <tr className="border-b border-border">
                          <td colSpan={6} className="px-4 py-3 bg-muted/50">
                            <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={accessPage}
            totalPages={Math.max(1, Math.ceil(accessTotal / PER_PAGE))}
            total={accessTotal}
            perPage={PER_PAGE}
            onPage={setAccessPage}
          />
        </div>
      )}

      {/* Tab 2: App Events */}
      {subTab === 'events' && (
        <div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent">
                  <SortHeader label="Timestamp" field="timestamp" current={eventSort} dir={eventDir} onSort={handleEventSort} />
                  <SortHeader label="User" field="user_email" current={eventSort} dir={eventDir} onSort={handleEventSort} />
                  <SortHeader label="Action" field="action" current={eventSort} dir={eventDir} onSort={handleEventSort} />
                  <SortHeader label="Resource Type" field="resource_type" current={eventSort} dir={eventDir} onSort={handleEventSort} />
                  <SortHeader label="IP" field="ip" current={eventSort} dir={eventDir} onSort={handleEventSort} />
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {eventLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : eventLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No event log entries found.
                    </td>
                  </tr>
                ) : (
                  eventLogs.map((entry, i) => (
                    <Fragment key={entry.id}>
                      <tr
                        className={`border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                          i % 2 === 1 ? 'bg-muted/30' : ''
                        }`}
                        onClick={() =>
                          setEventExpanded(eventExpanded === entry.id ? null : entry.id)
                        }
                      >
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {formatTs(entry.timestamp)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{entry.user_email}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{entry.resource_type}</td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                          {entry.ip}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {eventExpanded === entry.id ? '\u25BC' : '\u25B6'}
                        </td>
                      </tr>
                      {eventExpanded === entry.id && entry.metadata && (
                        <tr className="border-b border-border">
                          <td colSpan={6} className="px-4 py-3 bg-muted/50">
                            <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={eventPage}
            totalPages={Math.max(1, Math.ceil(eventTotal / PER_PAGE))}
            total={eventTotal}
            perPage={PER_PAGE}
            onPage={setEventPage}
          />
        </div>
      )}

      {/* Tab 3: pgaudit placeholder */}
      {subTab === 'pgaudit' && (
        <div className="border border-border rounded-lg p-6 bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Database-level audit logging via pgaudit. Logs are stored in PostgreSQL log files and
            can be viewed via{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
              docker logs sh-staging-db
            </code>{' '}
            or VPS log files at{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
              /var/lib/docker/containers/
            </code>
            . A future update will add log forwarding to make these queryable here.
          </p>
        </div>
      )}

      {/* Retention section */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Retention &amp; Purge</h3>

        {stats && (
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{stats.access_count.toLocaleString()}</strong>{' '}
              access log entries
            </span>
            <span>
              <strong className="text-foreground">{stats.event_count.toLocaleString()}</strong>{' '}
              event entries
            </span>
            {(stats.oldest_access || stats.oldest_event) && (
              <span>
                Oldest from{' '}
                <strong className="text-foreground">
                  {formatTs(stats.oldest_access || stats.oldest_event || '')}
                </strong>
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Current retention: <strong className="text-foreground">{RETENTION_DAYS} days</strong>
        </p>

        <div className="flex items-center gap-3">
          {!purgeConfirm ? (
            <button
              onClick={() => {
                setPurgeResult(null)
                setPurgeConfirm(true)
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Purge entries older than {RETENTION_DAYS} days
            </button>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                Are you sure? This cannot be undone.
              </span>
              <button
                onClick={handlePurge}
                disabled={purging}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {purging ? 'Purging...' : 'Confirm purge'}
              </button>
              <button
                onClick={() => setPurgeConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {purgeResult && (
          <p className="text-sm text-foreground">
            Deleted{' '}
            <strong>{purgeResult.deleted_access.toLocaleString()}</strong> access logs,{' '}
            <strong>{purgeResult.deleted_events.toLocaleString()}</strong> event logs.
          </p>
        )}
      </div>
    </div>
  )
}
