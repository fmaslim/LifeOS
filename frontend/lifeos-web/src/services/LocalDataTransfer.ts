import type { LocalStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'

export const backupCollections = ['tasks', 'goals', 'notes', 'calendar', 'habits', 'projects', 'routines', 'goalProjectLinks', 'projectDependencies'] as const
export type BackupCollection = typeof backupCollections[number]

export interface LifeOSBackup {
  schema: 'lifeos-local-backup'
  version: 1
  exportedAt: string
  data: Record<BackupCollection, unknown[]>
  preferences: { dashboardWidgets: unknown[] }
}

export interface BackupPreview { backup: LifeOSBackup; counts: Record<BackupCollection, number>; preferenceCount: number }

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isSafeCollection = (value: unknown) => Array.isArray(value) && value.every(item => isRecord(item))
const sensitiveKey = /(password|passphrase|secret|token|api.?key|credential|private.?key)/i
function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey)
  if (!isRecord(value)) return false
  return Object.entries(value).some(([key, child]) => sensitiveKey.test(key) || containsSensitiveKey(child))
}

export function serializeBackup(backup: LifeOSBackup) { return JSON.stringify(backup, null, 2) }

export function parseBackup(raw: string): BackupPreview {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('The selected file is not valid JSON.') }
  if (!isRecord(parsed) || parsed.schema !== 'lifeos-local-backup' || parsed.version !== 1 || !isRecord(parsed.data) || !isRecord(parsed.preferences)) throw new Error('This is not a supported LifeOS backup (version 1).')
  const data = parsed.data
  for (const key of backupCollections) if (!isSafeCollection(data[key])) throw new Error(`The ${key} collection is missing or malformed.`)
  if (!Array.isArray(parsed.preferences.dashboardWidgets)) throw new Error('Dashboard preferences are malformed.')
  if (containsSensitiveKey(parsed.data) || containsSensitiveKey(parsed.preferences)) throw new Error('Backups cannot contain credentials or secret fields.')
  const backup = parsed as unknown as LifeOSBackup
  return { backup, counts: Object.fromEntries(backupCollections.map(key => [key, backup.data[key].length])) as Record<BackupCollection, number>, preferenceCount: backup.preferences.dashboardWidgets.length }
}

export function createBackup(store: LocalStore, now = new Date()): LifeOSBackup {
  return {
    schema: 'lifeos-local-backup', version: 1, exportedAt: now.toISOString(),
    data: {
      tasks: store.read(storageKeys.tasks, []), goals: store.read(storageKeys.goals, []), notes: store.read(storageKeys.notes, []),
      calendar: store.read(storageKeys.calendar, []), habits: store.read(storageKeys.habits, []), projects: store.read(storageKeys.projects, []),
      routines: store.read(storageKeys.routines, []),
      goalProjectLinks: store.read(storageKeys.goalProjectLinks, []), projectDependencies: store.read(storageKeys.projectDependencies, []),
    },
    preferences: { dashboardWidgets: store.read(storageKeys.dashboardWidgets, []) },
  }
}

export function importBackup(store: LocalStore, backup: LifeOSBackup) {
  for (const key of backupCollections) store.write(storageKeys[key], backup.data[key])
  store.write(storageKeys.dashboardWidgets, backup.preferences.dashboardWidgets)
}
