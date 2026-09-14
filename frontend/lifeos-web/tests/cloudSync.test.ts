import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const frontend = readFileSync(join(process.cwd(), 'src/services/CloudSyncService.ts'), 'utf8')
const authGate = readFileSync(join(process.cwd(), 'src/components/AuthGate.tsx'), 'utf8')
const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Persistence/SyncEndpoints.cs'), 'utf8')

test('sync is orchestrated once from the authenticated shell rather than workspace pages', () => {
  assert.match(authGate, /state\.status !== 'signed-in'/)
  assert.match(authGate, /cloudSyncService\.sync\(\)/)
  assert.doesNotMatch(frontend, /components\//)
})

test('repeated migrations and retries use deterministic server record ids', () => {
  assert.match(backend, /\$"sync-\{request\.Key\}"/)
  assert.match(backend, /\$"sync:\{request\.Key\}"/)
  assert.match(frontend, /migrationId: previous\.migrationId/)
})

test('conflicts resolve deterministically and failed sync preserves local values', () => {
  assert.match(backend, /request\.ModifiedAt >= server\.UpdatedAt/)
  assert.match(backend, /"client-won"/)
  assert.match(backend, /"server-won"/)
  assert.match(frontend, /snapshot\.resolution === 'server-won'/)
  assert.match(frontend, /catch \{[\s\S]*status: 'offline'/)
})

test('only allowlisted local collections are synchronized', () => {
  assert.doesNotMatch(frontend, /todayTasks|todaySnoozed|dashboardOperations/)
  assert.match(backend, /SupportedKeys/)
})
