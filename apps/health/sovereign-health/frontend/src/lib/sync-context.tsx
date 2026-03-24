'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import { useOffline } from './offline-context'
import { api } from './api'
import {
  addToQueue,
  getQueueEntries,
  getQueueLength,
  removeFromQueue,
  updateQueueEntry,
  getSyncState,
  updateSyncState,
  cacheMeasurements,
  type SyncTable,
  type SyncAction,
} from './db'

const SYNC_INTERVAL_MS = 60_000
const MAX_RETRIES = 3

interface SyncContextValue {
  queueLength: number
  isSyncing: boolean
  lastSyncedAt: Date | null
  queueWrite: (table: SyncTable, action: SyncAction, payload: unknown) => Promise<string>
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue>({
  queueLength: 0,
  isSyncing: false,
  lastSyncedAt: null,
  queueWrite: async () => '',
  syncNow: async () => {},
})

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { isOffline } = useOffline()
  const [queueLen, setQueueLen] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const syncingRef = useRef(false)

  const refreshQueueLength = useCallback(async () => {
    try {
      const len = await getQueueLength()
      setQueueLen(len)
    } catch {
      // IndexedDB not available (SSR or incognito)
    }
  }, [])

  const queueWrite = useCallback(async (table: SyncTable, action: SyncAction, payload: unknown): Promise<string> => {
    const state = await getSyncState()
    const id = await addToQueue({
      table,
      action,
      payload,
      idempotencyKey: crypto.randomUUID(),
    })
    // Attach client_id to payload if it's a create action
    if (action === 'create' && typeof payload === 'object' && payload !== null) {
      await updateQueueEntry(id, {
        payload: { ...payload as Record<string, unknown>, client_id: state.clientId },
      })
    }
    await refreshQueueLength()
    return id
  }, [refreshQueueLength])

  const pushChanges = useCallback(async (): Promise<boolean> => {
    const entries = await getQueueEntries()
    if (entries.length === 0) return true

    const state = await getSyncState()

    for (const entry of entries) {
      if (entry.retries >= MAX_RETRIES) continue

      try {
        const payload = entry.payload as Record<string, unknown>
        const payloadWithSync = {
          ...payload,
          client_id: state.clientId,
          idempotency_key: entry.idempotencyKey,
        }

        if (entry.table === 'measurements') {
          if (entry.action === 'create') {
            await api.measurements.create(payloadWithSync)
          } else if (entry.action === 'update' && payload.id) {
            await api.measurements.update(payload.id as string, payloadWithSync)
          } else if (entry.action === 'delete' && payload.id) {
            await api.measurements.delete(payload.id as string)
          }
        }

        await removeFromQueue(entry.id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        // Network errors — stop processing, retry later
        if (message.includes('fetch') || message.includes('network') || message.includes('Failed')) {
          return false
        }
        // Client errors (4xx) — increment retries
        await updateQueueEntry(entry.id, {
          retries: entry.retries + 1,
          lastError: message,
        })
      }
    }

    await refreshQueueLength()
    return true
  }, [refreshQueueLength])

  const pullChanges = useCallback(async () => {
    try {
      const state = await getSyncState()
      const response = await api.sync.changes(state.lastSyncVersion)
      const data = response.data

      if (data.measurements && data.measurements.length > 0) {
        await cacheMeasurements(data.measurements)
      }

      await updateSyncState({ lastSyncVersion: data.current_version })
      setLastSyncedAt(new Date())
    } catch {
      // Network error — skip pull, try later
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current || isOffline || !user) return
    syncingRef.current = true
    setIsSyncing(true)

    try {
      const pushOk = await pushChanges()
      if (pushOk) {
        await pullChanges()
      }
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
    }
  }, [isOffline, user, pushChanges, pullChanges])

  // Sync when coming back online
  useEffect(() => {
    if (!isOffline && user) {
      syncNow()
    }
  }, [isOffline, user, syncNow])

  // Periodic sync
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      if (!isOffline) syncNow()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, isOffline, syncNow])

  // Initial queue length
  useEffect(() => {
    refreshQueueLength()
  }, [refreshQueueLength])

  return (
    <SyncContext value={{
      queueLength: queueLen,
      isSyncing,
      lastSyncedAt,
      queueWrite,
      syncNow,
    }}>
      {children}
    </SyncContext>
  )
}

export const useSync = () => useContext(SyncContext)
