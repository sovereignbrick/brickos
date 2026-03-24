import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'sovereign-health'
const DB_VERSION = 1

export type SyncTable = 'measurements' | 'measurement_templates' | 'user_medications'
export type SyncAction = 'create' | 'update' | 'delete'

export interface SyncQueueEntry {
  id: string
  table: SyncTable
  action: SyncAction
  payload: unknown
  idempotencyKey: string
  createdAt: number
  retries: number
  lastError?: string
}

export interface SyncState {
  key: 'default'
  lastSyncVersion: number
  clientId: string
}

function generateClientId(): string {
  return crypto.randomUUID()
}

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('sync_state')) {
          db.createObjectStore('sync_state', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('measurements_cache')) {
          const store = db.createObjectStore('measurements_cache', { keyPath: 'id' })
          store.createIndex('by_sync_version', 'sync_version')
        }
      },
    })
  }
  return dbPromise
}

// --- Sync Queue ---

export async function addToQueue(entry: Omit<SyncQueueEntry, 'id' | 'createdAt' | 'retries'>): Promise<string> {
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.put('sync_queue', {
    ...entry,
    id,
    createdAt: Date.now(),
    retries: 0,
  })
  return id
}

export async function getQueueEntries(): Promise<SyncQueueEntry[]> {
  const db = await getDb()
  return db.getAll('sync_queue')
}

export async function getQueueLength(): Promise<number> {
  const db = await getDb()
  return db.count('sync_queue')
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('sync_queue', id)
}

export async function updateQueueEntry(id: string, updates: Partial<SyncQueueEntry>): Promise<void> {
  const db = await getDb()
  const entry = await db.get('sync_queue', id)
  if (entry) {
    await db.put('sync_queue', { ...entry, ...updates })
  }
}

// --- Sync State ---

export async function getSyncState(): Promise<SyncState> {
  const db = await getDb()
  const state = await db.get('sync_state', 'default')
  if (state) return state
  const newState: SyncState = {
    key: 'default',
    lastSyncVersion: 0,
    clientId: generateClientId(),
  }
  await db.put('sync_state', newState)
  return newState
}

export async function updateSyncState(updates: Partial<Omit<SyncState, 'key'>>): Promise<void> {
  const db = await getDb()
  const state = await getSyncState()
  await db.put('sync_state', { ...state, ...updates })
}

// --- Measurements Cache ---

export async function cacheMeasurements(measurements: Array<{ id: string; [key: string]: unknown }>): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('measurements_cache', 'readwrite')
  for (const m of measurements) {
    await tx.store.put(m)
  }
  await tx.done
}

export async function getCachedMeasurements(): Promise<unknown[]> {
  const db = await getDb()
  return db.getAll('measurements_cache')
}

export async function clearMeasurementsCache(): Promise<void> {
  const db = await getDb()
  await db.clear('measurements_cache')
}
