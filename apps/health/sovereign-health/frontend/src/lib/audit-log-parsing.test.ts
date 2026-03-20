import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Audit Log Parsing Tests — Sprint 005 Phase 5
//
// Validates that the audit-logs-tab.tsx field mapping logic correctly
// transforms backend API responses into the display format. This catches
// the Sprint 004 issue where field name mismatches caused the tab to break.
// ---------------------------------------------------------------------------

// Replicate the exact mapping logic from audit-logs-tab.tsx
// These must stay in sync with the component.

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

function mapAccessLogEntry(e: Record<string, unknown>): AccessLogEntry {
  return {
    id: String(e.id ?? ''),
    timestamp: String(e.created_at ?? ''),
    user_email: String(e.user_email ?? ''),
    accessed_by: String(e.accessed_by_email ?? ''),
    action: String(e.action ?? ''),
    resource: String(e.resource ?? ''),
    metadata: e.metadata as Record<string, unknown> | undefined,
  }
}

function mapEventLogEntry(e: Record<string, unknown>): EventLogEntry {
  return {
    id: String(e.id ?? ''),
    timestamp: String(e.created_at ?? ''),
    user_email: String(e.user_email ?? ''),
    action: String(e.action ?? ''),
    resource_type: String(e.resource_type ?? ''),
    ip: String(e.ip_address ?? ''),
    metadata: e.metadata as Record<string, unknown> | undefined,
  }
}

// Sample API responses matching the actual backend output

const sampleAccessLogApiResponse = {
  data: {
    entries: [
      {
        id: 'aaaaaaaa-1111-2222-3333-444444444444',
        created_at: '2026-03-20T10:15:30.123Z',
        user_email: 'user@sovereignhealth.io',
        accessed_by_email: 'admin@sovereignhealth.io',
        action: 'view',
        resource: 'measurements',
        metadata: { marker_slug: 'glucose', count: 5 },
      },
      {
        id: 'bbbbbbbb-1111-2222-3333-444444444444',
        created_at: '2026-03-20T09:00:00.000Z',
        user_email: 'another@example.com',
        accessed_by_email: 'admin@sovereignhealth.io',
        action: 'export',
        resource: 'health-report',
        metadata: null,
      },
    ],
    total: 2,
  },
}

const sampleEventLogApiResponse = {
  data: {
    entries: [
      {
        id: 'cccccccc-1111-2222-3333-444444444444',
        created_at: '2026-03-20T11:00:00.000Z',
        user_email: 'user@sovereignhealth.io',
        action: 'login',
        resource_type: 'session',
        ip_address: '192.168.1.100',
        metadata: { method: 'password' },
      },
      {
        id: 'dddddddd-1111-2222-3333-444444444444',
        created_at: '2026-03-20T11:05:00.000Z',
        user_email: 'user@sovereignhealth.io',
        action: 'create',
        resource_type: 'measurement',
        ip_address: '2001:db8::1',
        metadata: { marker: 'weight', value: 68.7 },
      },
    ],
    total: 2,
  },
}

// Edge case: response with missing/null fields (should not crash)
const samplePartialEntry = {
  id: 'eeeeeeee-1111-2222-3333-444444444444',
  created_at: null,
  user_email: null,
  accessed_by_email: undefined,
  action: 'unknown',
  resource: undefined,
}

describe('Audit Access Log Parsing', () => {
  it('maps all fields correctly from API response', () => {
    const entries = sampleAccessLogApiResponse.data.entries.map(mapAccessLogEntry)
    expect(entries).toHaveLength(2)

    const first = entries[0]
    expect(first.id).toBe('aaaaaaaa-1111-2222-3333-444444444444')
    expect(first.timestamp).toBe('2026-03-20T10:15:30.123Z')
    expect(first.user_email).toBe('user@sovereignhealth.io')
    expect(first.accessed_by).toBe('admin@sovereignhealth.io')
    expect(first.action).toBe('view')
    expect(first.resource).toBe('measurements')
    expect(first.metadata).toEqual({ marker_slug: 'glucose', count: 5 })
  })

  it('handles null metadata', () => {
    const entries = sampleAccessLogApiResponse.data.entries.map(mapAccessLogEntry)
    const second = entries[1]
    expect(second.metadata).toBeNull()
  })

  it('handles missing/null fields without crashing', () => {
    const entry = mapAccessLogEntry(samplePartialEntry as Record<string, unknown>)
    expect(entry.id).toBe('eeeeeeee-1111-2222-3333-444444444444')
    expect(entry.timestamp).toBe('')
    expect(entry.user_email).toBe('')
    expect(entry.accessed_by).toBe('')
    expect(entry.action).toBe('unknown')
  })

  it('uses created_at not timestamp for the display timestamp', () => {
    // This was the Sprint 004 bug: using 'timestamp' field that didn't exist
    const rawEntry = sampleAccessLogApiResponse.data.entries[0]
    expect(rawEntry).toHaveProperty('created_at')
    expect(rawEntry).not.toHaveProperty('timestamp')

    const mapped = mapAccessLogEntry(rawEntry)
    expect(mapped.timestamp).toBe(rawEntry.created_at)
  })

  it('uses accessed_by_email not accessed_by for the accessor', () => {
    // Another Sprint 004 field name mismatch
    const rawEntry = sampleAccessLogApiResponse.data.entries[0]
    expect(rawEntry).toHaveProperty('accessed_by_email')
    expect(rawEntry).not.toHaveProperty('accessed_by')

    const mapped = mapAccessLogEntry(rawEntry)
    expect(mapped.accessed_by).toBe(rawEntry.accessed_by_email)
  })
})

describe('Audit Event Log Parsing', () => {
  it('maps all fields correctly from API response', () => {
    const entries = sampleEventLogApiResponse.data.entries.map(mapEventLogEntry)
    expect(entries).toHaveLength(2)

    const first = entries[0]
    expect(first.id).toBe('cccccccc-1111-2222-3333-444444444444')
    expect(first.timestamp).toBe('2026-03-20T11:00:00.000Z')
    expect(first.user_email).toBe('user@sovereignhealth.io')
    expect(first.action).toBe('login')
    expect(first.resource_type).toBe('session')
    expect(first.ip).toBe('192.168.1.100')
  })

  it('uses ip_address not ip for the IP field', () => {
    const rawEntry = sampleEventLogApiResponse.data.entries[0]
    expect(rawEntry).toHaveProperty('ip_address')
    expect(rawEntry).not.toHaveProperty('ip')

    const mapped = mapEventLogEntry(rawEntry)
    expect(mapped.ip).toBe(rawEntry.ip_address)
  })

  it('handles IPv6 addresses', () => {
    const entries = sampleEventLogApiResponse.data.entries.map(mapEventLogEntry)
    expect(entries[1].ip).toBe('2001:db8::1')
  })

  it('preserves metadata object', () => {
    const entries = sampleEventLogApiResponse.data.entries.map(mapEventLogEntry)
    expect(entries[0].metadata).toEqual({ method: 'password' })
    expect(entries[1].metadata).toEqual({ marker: 'weight', value: 68.7 })
  })
})

describe('Audit Stats Parsing', () => {
  it('maps stats fields correctly', () => {
    const d = {
      access_log_count: 42,
      event_log_count: 108,
      access_log_oldest: '2026-01-01T00:00:00Z',
      event_log_oldest: '2026-01-15T00:00:00Z',
    }

    // Replicate the stats mapping from audit-logs-tab.tsx
    const stats = {
      access_count: Number(d.access_log_count ?? 0),
      event_count: Number(d.event_log_count ?? 0),
      oldest_access: d.access_log_oldest ? String(d.access_log_oldest) : null,
      oldest_event: d.event_log_oldest ? String(d.event_log_oldest) : null,
    }

    expect(stats.access_count).toBe(42)
    expect(stats.event_count).toBe(108)
    expect(stats.oldest_access).toBe('2026-01-01T00:00:00Z')
    expect(stats.oldest_event).toBe('2026-01-15T00:00:00Z')
  })

  it('handles null oldest dates', () => {
    const d = {
      access_log_count: 0,
      event_log_count: 0,
      access_log_oldest: null,
      event_log_oldest: null,
    }

    const stats = {
      access_count: Number(d.access_log_count ?? 0),
      event_count: Number(d.event_log_count ?? 0),
      oldest_access: d.access_log_oldest ? String(d.access_log_oldest) : null,
      oldest_event: d.event_log_oldest ? String(d.event_log_oldest) : null,
    }

    expect(stats.access_count).toBe(0)
    expect(stats.oldest_access).toBeNull()
    expect(stats.oldest_event).toBeNull()
  })
})
