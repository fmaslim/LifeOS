import { backupCollections, type BackupCollection } from './LocalDataTransfer.ts'
import type { BackupJobHealth, BackupRetentionPolicy, BackupSchedule, BackupSnapshot, RestorePreview } from '../models/backup.ts'

/** Pure backup-job derivation: retention pruning, staleness/health, checksums, and restore previews. No storage, no approvals, no network - everything here is deterministic and unit-testable in isolation, mirroring PlanningLogic.ts. */

const dayMs = 86_400_000
const hourMs = 3_600_000

/** Deterministic FNV-1a-style hash of a serialized backup payload. Not a cryptographic digest - just enough to detect any change to the payload between when a snapshot was created and when it is later verified, without a crypto dependency. */
export function computeChecksum(serialized: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function zeroCounts(): Record<BackupCollection, number> {
  return Object.fromEntries(backupCollections.map(key => [key, 0])) as Record<BackupCollection, number>
}

/** Retention: always keeps the single most recent snapshot, regardless of age, so a stalled or failing job stays visible rather than pruning itself into invisibility. Beyond that, keeps up to `maxSnapshots - 1` further snapshots that are within `maxAgeDays`. Everything else is pruned. */
export function pruneSnapshots(snapshots: BackupSnapshot[], retention: BackupRetentionPolicy, now: Date): { kept: BackupSnapshot[]; removed: BackupSnapshot[] } {
  const sorted = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (sorted.length === 0) return { kept: [], removed: [] }
  const [newest, ...rest] = sorted
  const withinAge = rest.filter(snapshot => now.getTime() - Date.parse(snapshot.createdAt) <= retention.maxAgeDays * dayMs)
  const kept = [newest!, ...withinAge.slice(0, Math.max(0, retention.maxSnapshots - 1))]
  const keptIds = new Set(kept.map(item => item.id))
  return { kept, removed: sorted.filter(item => !keptIds.has(item.id)) }
}

/** Staleness/health: 'never-run' with no snapshots at all; 'failed' when the most recent run failed; 'stale' when the most recent run succeeded but is older than the schedule's stale threshold; otherwise 'healthy'. */
export function computeBackupHealth(snapshots: BackupSnapshot[], schedule: BackupSchedule, now: Date): { health: BackupJobHealth; lastSuccessAt?: string; nextDueAt?: string } {
  const sorted = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = sorted[0]
  const lastSuccess = sorted.find(item => item.status === 'ok')
  const nextDueAt = lastSuccess ? new Date(Date.parse(lastSuccess.createdAt) + schedule.intervalHours * hourMs).toISOString() : undefined
  if (!latest) return { health: 'never-run' }
  if (latest.status === 'failed') return { health: 'failed', lastSuccessAt: lastSuccess?.createdAt, nextDueAt }
  const ageHours = (now.getTime() - Date.parse(latest.createdAt)) / hourMs
  if (ageHours > schedule.staleAfterHours) return { health: 'stale', lastSuccessAt: lastSuccess?.createdAt, nextDueAt }
  return { health: 'healthy', lastSuccessAt: lastSuccess?.createdAt, nextDueAt }
}

/** Non-destructive restore preview: compares a backup's recorded counts against current live counts. Pure - takes both count sets as input and never reads storage itself. */
export function buildRestorePreview(snapshot: BackupSnapshot, backupCounts: Record<BackupCollection, number>, currentCounts: Record<BackupCollection, number>, now: Date): RestorePreview {
  const changedCollections = backupCollections.filter(key => backupCounts[key] !== currentCounts[key])
  const warnings: string[] = []
  for (const key of backupCollections) {
    if (backupCounts[key] < currentCounts[key]) warnings.push(`Restoring would remove ${currentCounts[key] - backupCounts[key]} ${key} record(s) added since this backup.`)
  }
  const ageDays = Math.floor((now.getTime() - Date.parse(snapshot.createdAt)) / dayMs)
  if (ageDays > 0) warnings.push(`This backup is ${ageDays} day(s) old.`)
  return { snapshotId: snapshot.id, generatedAt: now.toISOString(), backupCounts, currentCounts, preferenceCount: snapshot.preferenceCount, changedCollections, warnings }
}
