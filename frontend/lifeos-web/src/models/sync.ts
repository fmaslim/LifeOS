export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type SyncConflict = {
  key: string
  resolution: 'server-won' | 'client-won'
  resolvedAt: string
}

export type CollectionSyncState = {
  fingerprint: string
  modifiedAt: string
}

export type SyncState = {
  status: SyncStatus
  migrationId: string
  lastSuccessfulSync?: string
  pendingChanges: number
  conflicts: SyncConflict[]
  collections: Record<string, CollectionSyncState>
}

export type SyncSnapshotRequest = {
  key: string
  modifiedAt: string
  value: unknown
  migrationId: string
}

export type SyncSnapshotResponse = {
  key: string
  modifiedAt: string
  value: unknown
  resolution: 'migrated' | 'client-won' | 'server-won'
}

export type SyncBatchResponse = {
  syncedAt: string
  snapshots: SyncSnapshotResponse[]
}
