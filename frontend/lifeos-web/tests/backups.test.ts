import assert from 'node:assert/strict'
import test from 'node:test'
import type { ActivityEvent } from '../src/models/activity.ts'
import type { BackupSnapshot } from '../src/models/backup.ts'
import type { NotificationEvent } from '../src/models/notification.ts'
import type { LocalStore } from '../src/storage/LocalStore.ts'
import { storageKeys } from '../src/storage/storageKeys.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import { buildRestorePreview, computeBackupHealth, computeChecksum, pruneSnapshots, zeroCounts } from '../src/services/BackupLogic.ts'
import { backupCollections } from '../src/services/LocalDataTransfer.ts'
import { BackupService, defaultBackupRetention, defaultBackupSchedule } from '../src/services/BackupService.ts'

class MemoryStore implements LocalStore {
  private values = new Map<string, unknown>()
  read<T>(key: string, fallback: T): T { return (this.values.has(key) ? this.values.get(key) : fallback) as T }
  write<T>(key: string, value: T) { this.values.set(key, structuredClone(value)) }
  remove(key: string) { this.values.delete(key) }
}

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

// Mirrors PersistentActivityEventRepository/InMemoryNotificationEventPublisher's real dedup-by-id/key behavior.
class RecordingActivity { events: ActivityEvent[] = []; publish(event: ActivityEvent) { if (this.events.some(item => item.id === event.id)) return; this.events.push(event) }; getActivityData() { return { events: this.events } } }
class RecordingNotifications { events: NotificationEvent[] = []; publish(event: NotificationEvent) { if (this.events.some(item => item.deduplicationKey === event.deduplicationKey)) return this.events.find(item => item.deduplicationKey === event.deduplicationKey)!; this.events.push(event); return { ...event, id: `n-${event.deduplicationKey}`, read: false } }; getNotificationData() { return { notifications: [] } } }

const now = new Date('2026-09-15T12:00:00.000Z')

function snapshot(overrides: Partial<BackupSnapshot> = {}): BackupSnapshot {
  return { id: 'backup-1', createdAt: now.toISOString(), status: 'ok', counts: zeroCounts(), preferenceCount: 0, checksum: 'abc', sizeBytes: 100, integrity: 'verified', integrityCheckedAt: now.toISOString(), integrityIssues: [], ...overrides }
}

// --- Pure logic (BackupLogic.ts) ---

test('computeChecksum is deterministic and sensitive to any change', () => {
  const a = computeChecksum('{"a":1}')
  const b = computeChecksum('{"a":1}')
  const c = computeChecksum('{"a":2}')
  assert.equal(a, b)
  assert.notEqual(a, c)
})

test('pruneSnapshots always keeps the newest snapshot even if older than the age policy', () => {
  const stale = snapshot({ id: 'old', createdAt: new Date(now.getTime() - 90 * 86_400_000).toISOString() })
  const { kept, removed } = pruneSnapshots([stale], { maxSnapshots: 5, maxAgeDays: 30 }, now)
  assert.deepEqual(kept.map(item => item.id), ['old'])
  assert.deepEqual(removed, [])
})

test('pruneSnapshots drops snapshots beyond maxAgeDays and beyond maxSnapshots, keeping the rest', () => {
  const within = snapshot({ id: 'within', createdAt: new Date(now.getTime() - 5 * 86_400_000).toISOString() })
  const tooOld = snapshot({ id: 'too-old', createdAt: new Date(now.getTime() - 40 * 86_400_000).toISOString() })
  const newest = snapshot({ id: 'newest', createdAt: now.toISOString() })
  const beyondCount = snapshot({ id: 'beyond-count', createdAt: new Date(now.getTime() - 1 * 86_400_000).toISOString() })
  const { kept, removed } = pruneSnapshots([within, tooOld, newest, beyondCount], { maxSnapshots: 2, maxAgeDays: 30 }, now)
  // newest is always kept; of the remaining within-policy snapshots (within, beyond-count), only maxSnapshots-1 = 1 more is kept, the more recent one.
  assert.deepEqual(kept.map(item => item.id), ['newest', 'beyond-count'])
  assert.deepEqual(removed.map(item => item.id).sort(), ['too-old', 'within'])
})

test('computeBackupHealth distinguishes never-run, healthy, stale, and failed', () => {
  assert.equal(computeBackupHealth([], defaultBackupSchedule, now).health, 'never-run')
  const healthy = snapshot({ createdAt: new Date(now.getTime() - 1 * 3_600_000).toISOString() })
  assert.equal(computeBackupHealth([healthy], defaultBackupSchedule, now).health, 'healthy')
  const staleRun = snapshot({ createdAt: new Date(now.getTime() - (defaultBackupSchedule.staleAfterHours + 1) * 3_600_000).toISOString() })
  assert.equal(computeBackupHealth([staleRun], defaultBackupSchedule, now).health, 'stale')
  const failedRun = snapshot({ status: 'failed', createdAt: now.toISOString() })
  assert.equal(computeBackupHealth([failedRun], defaultBackupSchedule, now).health, 'failed')
  // A failed latest run after an earlier success still reports 'failed' and surfaces the prior success.
  const priorSuccess = snapshot({ id: 'prior', createdAt: new Date(now.getTime() - 2 * 3_600_000).toISOString() })
  const result = computeBackupHealth([priorSuccess, failedRun], defaultBackupSchedule, now)
  assert.equal(result.health, 'failed')
  assert.equal(result.lastSuccessAt, priorSuccess.createdAt)
})

test('buildRestorePreview flags collections that would shrink and reports backup age', () => {
  const backupCounts = { ...zeroCounts(), tasks: 2, notes: 1 }
  const currentCounts = { ...zeroCounts(), tasks: 5, notes: 1 }
  const target = snapshot({ createdAt: new Date(now.getTime() - 2 * 86_400_000).toISOString() })
  const preview = buildRestorePreview(target, backupCounts, currentCounts, now)
  assert.deepEqual(preview.changedCollections, ['tasks'])
  assert.ok(preview.warnings.some(warning => /remove 3 tasks/.test(warning)))
  assert.ok(preview.warnings.some(warning => /2 day\(s\) old/.test(warning)))
})

// --- BackupService integration ---

function fixture() {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())
  const activity = new RecordingActivity()
  const notifications = new RecordingNotifications()
  const service = new BackupService(approvals, activity, notifications, store, defaultBackupSchedule, defaultBackupRetention)
  return { store, approvals, activity, notifications, service }
}

test('runBackup produces a verified, restorable snapshot from current local data', () => {
  const { store, service } = fixture()
  store.write(storageKeys.tasks, [{ id: 't1', title: 'Task one' }])
  const snap = service.runBackup(now)
  assert.equal(snap.status, 'ok')
  assert.equal(snap.integrity, 'verified')
  assert.equal(snap.counts.tasks, 1)
  assert.ok(snap.checksum.length > 0)
  const data = service.getBackupData(now)
  assert.equal(data.snapshots.length, 1)
  assert.equal(data.health, 'healthy')
})

test('runBackup rejects credential-shaped data, records a failed snapshot with no restorable payload, and publishes a failure', () => {
  const { store, service, activity, notifications } = fixture()
  store.write(storageKeys.tasks, [{ id: 't1', title: 'Task one', apiKey: 'super-secret' }])
  const snap = service.runBackup(now)
  assert.equal(snap.status, 'failed')
  assert.match(snap.failureReason ?? '', /secret/i)
  assert.equal(service.previewRestore(snap.id, now), undefined) // no payload was ever stored
  assert.equal(service.requestRestore(snap.id), undefined) // cannot restore a failed backup
  assert.ok(activity.events.some(event => event.type === 'Backup failed'))
  assert.ok(notifications.events.some(event => event.severity === 'critical'))
})

test('verifyIntegrity is non-destructive and detects a tampered payload without touching production data', () => {
  const { store, service } = fixture()
  store.write(storageKeys.goals, [{ id: 'g1' }])
  const snap = service.runBackup(now)
  const ok = service.verifyIntegrity(snap.id, now)
  assert.equal(ok?.status, 'verified')
  assert.equal(store.read(storageKeys.goals, []).length, 1) // untouched by verification

  // Simulate corruption: rewrite the stored record's checksum so it no longer matches the payload.
  const raw = store.read<Array<{ snapshot: BackupSnapshot }>>(storageKeys.backupRecords, [])
  raw[0]!.snapshot.checksum = 'tampered'
  store.write(storageKeys.backupRecords, raw)
  const failed = service.verifyIntegrity(snap.id, now)
  assert.equal(failed?.status, 'failed')
  assert.ok(failed?.issues.some(issue => /checksum/i.test(issue)))
})

test('previewRestore is read-only and reports what a restore would change relative to current data', () => {
  const { store, service } = fixture()
  store.write(storageKeys.tasks, [{ id: 't1', title: 'Task one' }])
  const snap = service.runBackup(now)
  store.write(storageKeys.tasks, [{ id: 't1', title: 'Task one' }, { id: 't2', title: 'Task two' }])
  const preview = service.previewRestore(snap.id, now)
  assert.deepEqual(preview?.changedCollections, ['tasks'])
  assert.equal(store.read(storageKeys.tasks, []).length, 2) // preview never mutates live data
})

test('restore is approval gated: nothing is written until the request is approved and executed', async () => {
  const { store, approvals, service, activity } = fixture()
  store.write(storageKeys.tasks, [{ id: 't1', title: 'Task one' }])
  const snap = service.runBackup(now)
  store.write(storageKeys.tasks, []) // simulate data loss after the backup was taken

  const request = service.requestRestore(snap.id)!
  assert.equal(request.state, 'pending')
  assert.equal(request.risk, 'critical')
  assert.equal(store.read(storageKeys.tasks, []).length, 0) // still nothing restored

  approvals.decide(request.id, 'approved')
  await approvals.executeApproved(request.id)
  assert.equal(store.read(storageKeys.tasks, []).length, 1)
  assert.ok(activity.events.some(event => event.type === 'Backup restored'))
})

test('checkStaleness publishes a deduplicated warning when no backup has ever run, and nothing once one succeeds', () => {
  const { service, activity, notifications } = fixture()
  const first = service.checkStaleness(now)
  assert.equal(first.health, 'never-run')
  assert.equal(activity.events.length, 1)
  assert.equal(notifications.events.length, 1)
  service.checkStaleness(now) // same day: deduplicated, no new events
  assert.equal(activity.events.length, 1)
  assert.equal(notifications.events.length, 1)

  service.runBackup(now)
  const afterBackup = service.checkStaleness(now)
  assert.equal(afterBackup.health, 'healthy')
  assert.equal(activity.events.length, 1) // no new warning once healthy
})

test('backup snapshot history is not part of LocalDataTransfer\'s export allowlist', () => {
  assert.ok(!(backupCollections as readonly string[]).includes('backupRecords'))
  assert.ok(!(backupCollections as readonly string[]).includes(storageKeys.backupRecords))
})
