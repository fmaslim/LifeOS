import type { CollectionSyncState, SyncBatchResponse, SyncSnapshotRequest, SyncState } from '../models/sync'
import { localStore } from '../storage/LocalStore'
import { storageKeys } from '../storage/storageKeys'

const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')

export const supportedSyncKeys = [
  storageKeys.tasks,
  storageKeys.goals,
  storageKeys.kpis,
  storageKeys.notes,
  storageKeys.calendar,
  storageKeys.habits,
  storageKeys.projects,
  storageKeys.notifications,
  storageKeys.schedules,
  storageKeys.dashboardWidgets,
] as const

const emptyState = (): SyncState => ({
  status: 'idle',
  migrationId: crypto.randomUUID(),
  pendingChanges: 0,
  conflicts: [],
  collections: {},
})

export function stableFingerprint(value: unknown): string {
  const input = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function endpoint(path: string) {
  return `${apiBase}${path}`
}

export class CloudSyncService {
  getState(): SyncState {
    const saved = localStore.read<SyncState | null>(storageKeys.syncState, null)
    return saved?.migrationId ? saved : emptyState()
  }

  async sync(): Promise<SyncState> {
    const previous = this.getState()
    const now = new Date().toISOString()
    const collections: Record<string, CollectionSyncState> = { ...previous.collections }
    const requests: SyncSnapshotRequest[] = []

    for (const key of supportedSyncKeys) {
      const value = localStore.read<unknown>(key, null)
      const fingerprint = stableFingerprint(value)
      const existing = collections[key]
      const modifiedAt = existing && existing.fingerprint === fingerprint ? existing.modifiedAt : now
      collections[key] = { fingerprint, modifiedAt }
      requests.push({ key, modifiedAt, value, migrationId: previous.migrationId })
    }

    const syncing: SyncState = { ...previous, status: 'syncing', pendingChanges: requests.filter(request => previous.collections[request.key]?.fingerprint !== collections[request.key].fingerprint).length, collections }
    localStore.write(storageKeys.syncState, syncing)

    try {
      const response = await fetch(endpoint('/api/sync/snapshots'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(requests),
      })
      if (!response.ok) {
        const failed = { ...syncing, status: response.status === 401 ? 'error' : 'offline' } as SyncState
        localStore.write(storageKeys.syncState, failed)
        return failed
      }

      const result = (await response.json()) as SyncBatchResponse
      const conflicts = [...previous.conflicts]
      for (const snapshot of result.snapshots) {
        if (snapshot.resolution === 'server-won') {
          localStore.write(snapshot.key, snapshot.value)
          collections[snapshot.key] = { fingerprint: stableFingerprint(snapshot.value), modifiedAt: snapshot.modifiedAt }
          conflicts.push({ key: snapshot.key, resolution: 'server-won', resolvedAt: result.syncedAt })
        } else if (snapshot.resolution === 'client-won') {
          conflicts.push({ key: snapshot.key, resolution: 'client-won', resolvedAt: result.syncedAt })
        }
      }

      const synced: SyncState = {
        status: 'synced',
        migrationId: previous.migrationId,
        lastSuccessfulSync: result.syncedAt,
        pendingChanges: 0,
        conflicts: conflicts.slice(-25),
        collections,
      }
      localStore.write(storageKeys.syncState, synced)
      return synced
    } catch {
      const offline: SyncState = { ...syncing, status: 'offline' }
      localStore.write(storageKeys.syncState, offline)
      return offline
    }
  }
}

export const cloudSyncService = new CloudSyncService()
