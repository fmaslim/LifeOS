import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBackup, serializeBackup, type LifeOSBackup } from '../src/services/LocalDataTransfer.ts'

const backup: LifeOSBackup = { schema: 'lifeos-local-backup', version: 1, exportedAt: '2026-09-14T00:00:00.000Z', data: { tasks: [{ id: 't1' }], goals: [], notes: [{ id: 'n1' }], calendar: [], habits: [], projects: [], routines: [] }, preferences: { dashboardWidgets: [{ id: 'summary', visible: true }] } }

test('round-trips an allowlisted LifeOS backup and previews counts', () => {
  const preview = parseBackup(serializeBackup(backup))
  assert.deepEqual(preview.backup, backup)
  assert.equal(preview.counts.tasks, 1)
  assert.equal(preview.counts.notes, 1)
  assert.equal(preview.preferenceCount, 1)
})

test('rejects invalid JSON, versions, and malformed collections', () => {
  assert.throws(() => parseBackup('{oops'), /valid JSON/)
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 2 })), /version 1/)
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, data: { ...backup.data, tasks: 'unsafe' } })), /tasks collection/)
})

test('does not accept credential-shaped top-level data as a backup', () => {
  assert.throws(() => parseBackup(JSON.stringify({ token: 'private' })), /not a supported LifeOS backup/)
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, data: { ...backup.data, tasks: [{ id: 't1', apiKey: 'private' }] } })), /secret fields/)
})
