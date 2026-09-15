import type { ApprovalRequest } from '../models/approval.ts'
import type { BackupData, BackupIntegrityResult, BackupIntegrityStatus, BackupRetentionPolicy, BackupSchedule, BackupSnapshot, RestorePreview } from '../models/backup.ts'
import type { ActivityService } from './ActivityService.ts'
import type { ApprovalService } from './ApprovalService.ts'
import type { NotificationService } from './NotificationService.ts'
import { backupCollections, createBackup, importBackup, parseBackup, serializeBackup, type BackupCollection, type LifeOSBackup } from './LocalDataTransfer.ts'
import { buildRestorePreview, computeBackupHealth, computeChecksum, pruneSnapshots, zeroCounts } from './BackupLogic.ts'
import type { LocalStore } from '../storage/LocalStore.ts'
import { localStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'

/** A snapshot's metadata plus, only when the run succeeded and validated cleanly, the actual exported payload it describes. Persisted separately from `BackupSnapshot` (the public/display shape) so a failed or not-yet-verified run never carries a payload around. */
interface BackupRecord { snapshot: BackupSnapshot; payload?: LifeOSBackup }

const safeMessage = (value: unknown) => value instanceof Error ? value.message.replace(/(token|secret|password|key)=\S+/gi, '$1=[redacted]') : 'Backup could not be completed.'

export const defaultBackupSchedule: BackupSchedule = { intervalHours: 24, staleAfterHours: 48 }
export const defaultBackupRetention: BackupRetentionPolicy = { maxSnapshots: 7, maxAgeDays: 30 }

/**
 * Provider-neutral backup/disaster-recovery abstraction over LifeOS's durable data. LifeOS has
 * no real server-side persistence yet (see docs/architecture.md), so this operates on the same
 * local-storage-backed domain collections LocalDataTransfer.ts already exports/imports - that
 * local storage stands in for "durable server-side data" is a deliberate, documented stand-in,
 * not a claim that a server is involved.
 *
 * Every snapshot's payload is produced with LocalDataTransfer.createBackup and must round-trip
 * through LocalDataTransfer.parseBackup - the same schema and secret-shape validation used for
 * manual export/import - before it is ever persisted or offered for restore. This reuses that
 * already-vetted logic instead of duplicating it, and means a payload that is malformed or
 * contains anything credential-shaped is recorded as a *failed* snapshot with no stored
 * payload, never as a restorable one.
 *
 * Restore always requires explicit approval through ApprovalService before anything is
 * written, the same convention ReleaseService uses for rollback and PlanningService uses for
 * accepting a link suggestion. Verifying integrity and previewing a restore are both read-only:
 * they inspect the stored backup and current live counts but never write production data.
 *
 * Backup run/snapshot history is itself persisted (storageKeys.backupRecords) but is
 * deliberately NOT added to LocalDataTransfer's backup allowlist - including the backup log
 * inside the backup it describes would be recursive and provides no disaster-recovery value.
 */
export class BackupService {
  private readonly approvals: ApprovalService
  private readonly activity?: ActivityService
  private readonly notifications?: NotificationService
  private readonly store: LocalStore
  private readonly schedule: BackupSchedule
  private readonly retention: BackupRetentionPolicy

  constructor(approvals: ApprovalService, activity?: ActivityService, notifications?: NotificationService, store: LocalStore = localStore, schedule: BackupSchedule = defaultBackupSchedule, retention: BackupRetentionPolicy = defaultBackupRetention) {
    this.approvals = approvals
    this.activity = activity
    this.notifications = notifications
    this.store = store
    this.schedule = schedule
    this.retention = retention
  }

  private readRecords(): BackupRecord[] { return this.store.read<BackupRecord[]>(storageKeys.backupRecords, []) }
  private saveRecords(records: BackupRecord[]) { this.store.write(storageKeys.backupRecords, records) }
  private findRecord(snapshotId: string) { return this.readRecords().find(record => record.snapshot.id === snapshotId) }

  /** Read-only snapshot list, schedule, retention policy, and derived health. Never writes anything. */
  getBackupData(now = new Date()): BackupData {
    const snapshots = this.readRecords().map(record => record.snapshot).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const { health, lastSuccessAt, nextDueAt } = computeBackupHealth(snapshots, this.schedule, now)
    return { schedule: this.schedule, retention: this.retention, snapshots, health, lastSuccessAt, nextDueAt }
  }

  /**
   * Evaluates current backup health and, when it is stale, failed, or has never run, publishes
   * a warning to Activity and Notifications (deduplicated per health state per day so repeated
   * calls, e.g. on every page view, don't spam the inbox). Read-only otherwise: it never runs a
   * backup or touches production/backup data.
   */
  checkStaleness(now = new Date()): BackupData {
    const data = this.getBackupData(now)
    if (data.health === 'healthy') return data
    const day = now.toISOString().slice(0, 10)
    const description = data.health === 'never-run' ? 'No backup has ever completed for this workspace.'
      : data.health === 'failed' ? 'The most recent backup run failed.'
      : `No successful backup since ${data.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleString() : 'the workspace was created'}.`
    const id = `backup-${data.health}-${day}`
    this.activity?.publish({ id, timestamp: now.toISOString(), source: 'Backups', type: data.health === 'failed' ? 'Backup failed' : 'Backup stale', description, status: 'attention', route: 'backups', important: true })
    this.notifications?.publish({ title: data.health === 'failed' ? 'Backup failed' : 'Backup is stale', message: description, source: 'Backups', severity: data.health === 'failed' ? 'critical' : 'important', timestamp: now.toISOString(), route: 'backups', deduplicationKey: id })
    return data
  }

  /**
   * Creates a new backup snapshot from the current allowlisted local data. The payload is
   * validated through LocalDataTransfer.parseBackup (schema + secret-shape checks) before it is
   * persisted; a validation failure records a failed snapshot with no stored payload and is
   * published to Activity/Notifications immediately. Retention pruning runs after every backup.
   */
  runBackup(now = new Date()): BackupSnapshot {
    const serialized = serializeBackup(createBackup(this.store, now))
    const id = `backup-${now.toISOString()}`
    let snapshot: BackupSnapshot
    let payload: LifeOSBackup | undefined
    try {
      const preview = parseBackup(serialized)
      snapshot = { id, createdAt: now.toISOString(), status: 'ok', counts: preview.counts, preferenceCount: preview.preferenceCount, checksum: computeChecksum(serialized), sizeBytes: serialized.length, integrity: 'verified', integrityCheckedAt: now.toISOString(), integrityIssues: [] }
      payload = preview.backup
    } catch (error) {
      snapshot = { id, createdAt: now.toISOString(), status: 'failed', failureReason: safeMessage(error), counts: zeroCounts(), preferenceCount: 0, checksum: '', sizeBytes: 0, integrity: 'failed', integrityCheckedAt: now.toISOString(), integrityIssues: [safeMessage(error)] }
    }
    const existing = this.readRecords()
    const { kept } = pruneSnapshots([...existing.map(record => record.snapshot), snapshot], this.retention, now)
    const keptIds = new Set(kept.map(item => item.id))
    const records: BackupRecord[] = existing.filter(record => keptIds.has(record.snapshot.id))
    if (keptIds.has(id)) records.push({ snapshot, payload })
    this.saveRecords(records)
    if (snapshot.status === 'failed') {
      this.activity?.publish({ id: `backup-run-failed-${id}`, timestamp: now.toISOString(), source: 'Backups', type: 'Backup failed', description: snapshot.failureReason ?? 'Backup run failed.', status: 'attention', route: 'backups', important: true })
      this.notifications?.publish({ title: 'Backup failed', message: snapshot.failureReason ?? 'Backup run failed.', source: 'Backups', severity: 'critical', timestamp: now.toISOString(), route: 'backups', deduplicationKey: `backup-run-failed-${id}` })
    }
    return snapshot
  }

  /**
   * Non-destructive recovery verification: recomputes the checksum of a stored backup's
   * payload and re-validates it through parseBackup, without reading or writing any
   * production data. Proves the backup is still intact and restorable. Updates only the
   * snapshot's own integrity fields in the backup log.
   */
  verifyIntegrity(snapshotId: string, now = new Date()): BackupIntegrityResult | undefined {
    const record = this.findRecord(snapshotId)
    if (!record) return undefined
    const issues: string[] = []
    let status: BackupIntegrityStatus = 'verified'
    if (record.snapshot.status === 'failed' || !record.payload) {
      status = 'failed'
      issues.push('This backup run failed and has no stored payload to verify.')
    } else {
      const serialized = serializeBackup(record.payload)
      if (computeChecksum(serialized) !== record.snapshot.checksum) { status = 'failed'; issues.push('Stored checksum does not match the backup payload.') }
      try { parseBackup(serialized) } catch (error) { status = 'failed'; issues.push(safeMessage(error)) }
    }
    const result: BackupIntegrityResult = { snapshotId, checkedAt: now.toISOString(), status, issues }
    this.saveRecords(this.readRecords().map(item => item.snapshot.id === snapshotId ? { ...item, snapshot: { ...item.snapshot, integrity: status, integrityCheckedAt: result.checkedAt, integrityIssues: issues } } : item))
    if (status === 'failed') {
      this.activity?.publish({ id: `backup-integrity-${snapshotId}-${result.checkedAt}`, timestamp: result.checkedAt, source: 'Backups', type: 'Backup integrity check failed', description: issues.join(' · '), status: 'attention', route: 'backups', important: true })
      this.notifications?.publish({ title: 'Backup integrity check failed', message: issues.join(' · '), source: 'Backups', severity: 'critical', timestamp: result.checkedAt, route: 'backups', deduplicationKey: `backup-integrity-failed-${snapshotId}` })
    }
    return result
  }

  /** Non-destructive: compares a stored backup's counts against current live counts. Reads current local data but never writes anything, production or otherwise. */
  previewRestore(snapshotId: string, now = new Date()): RestorePreview | undefined {
    const record = this.findRecord(snapshotId)
    if (!record || !record.payload) return undefined
    const currentBackup = createBackup(this.store, now)
    const currentCounts = Object.fromEntries(backupCollections.map(key => [key, currentBackup.data[key].length])) as Record<BackupCollection, number>
    return buildRestorePreview(record.snapshot, record.snapshot.counts, currentCounts, now)
  }

  /** Restore is never immediate: it always requests approval, and only the approved resume handler (run through ApprovalService.executeApproved) actually overwrites local data via LocalDataTransfer.importBackup. Refuses snapshots with no verified, restorable payload. */
  requestRestore(snapshotId: string): ApprovalRequest | undefined {
    const record = this.findRecord(snapshotId)
    if (!record || !record.payload || record.snapshot.status !== 'ok') return undefined
    const preview = this.previewRestore(snapshotId)
    const createdLabel = new Date(record.snapshot.createdAt).toLocaleString()
    return this.approvals.request(
      { source: 'Backups', action: 'backup.restore', summary: `Restore LifeOS data from the ${createdLabel} backup`, risk: 'critical', correlationId: `backup-restore:${snapshotId}`, payloadPreview: { snapshotId, counts: record.snapshot.counts, changedCollections: preview?.changedCollections ?? [] } },
      () => {
        importBackup(this.store, record.payload!)
        const timestamp = new Date().toISOString()
        this.activity?.publish({ id: `backup-restored-${snapshotId}-${timestamp}`, timestamp, source: 'Backups', type: 'Backup restored', description: `Restored LifeOS data from the ${createdLabel} backup.`, status: 'success', route: 'backups', important: true })
      },
    )
  }
}
