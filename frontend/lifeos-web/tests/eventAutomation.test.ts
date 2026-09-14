import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { EventAutomationService, validateAutomationEvent } from '../src/services/EventAutomationService.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'
import { PersistentActivityEventRepository, RepositoryActivityService } from '../src/services/ActivityService.ts'
import type { AutomationEvent } from '../src/models/automation.ts'

const event = (overrides: Partial<AutomationEvent> = {}): AutomationEvent => ({ id: 'evt-1', type: 'lead.qualified', source: 'Jarvis', timestamp: new Date().toISOString(), correlationId: 'corr-117', metadata: { tenant: 'primary' }, payload: { score: 92, region: 'US', tags: ['hot', 'demo'] }, ...overrides })

function service() {
  const history = new InMemoryAutomationRunRepository()
  const activity = new RepositoryActivityService(new PersistentActivityEventRepository())
  return { engine: new EventAutomationService(history, activity), history, activity }
}

test('valid internal or external events trigger matching automations with filters', async () => {
  const { engine, history } = service()
  let success = 0
  engine.register({ id: 'qualified-hot', automationId: 'lead-follow-up', name: 'Lead follow-up', enabled: true, eventType: 'lead.qualified', source: 'Jarvis', conditions: [{ path: 'payload.score', operator: 'equals', value: 92 }, { path: 'payload.tags', operator: 'contains', value: 'hot' }] }, () => { success++ })
  engine.register({ id: 'wrong-region', automationId: 'ignore', name: 'Ignore', enabled: true, eventType: 'lead.qualified', conditions: [{ path: 'payload.region', operator: 'equals', value: 'EU' }] }, () => { throw new Error('should not run') })
  const result = await engine.ingest(event())
  assert.equal(success, 1)
  assert.equal(result.length, 1)
  assert.equal(result[0]?.status, 'completed')
  const run = history.get(result[0]!.runId)!
  assert.equal(run.triggerSource, 'Jarvis')
  assert.equal(run.correlationId, 'corr-117')
  assert.match(run.trigger, /Jarvis.*lead\.qualified/)
})

test('duplicate events are idempotent and failing handlers are isolated', async () => {
  const { engine, history } = service()
  let healthyRuns = 0
  engine.register({ id: 'broken', automationId: 'broken-workflow', name: 'Broken workflow', enabled: true, eventType: 'system.alert' }, () => { throw new Error('provider offline token=secret') })
  engine.register({ id: 'healthy', automationId: 'healthy-workflow', name: 'Healthy workflow', enabled: true, eventType: 'system.alert' }, () => { healthyRuns++ })
  const incoming = event({ id: 'evt-alert', type: 'system.alert', source: 'Home' })
  const first = await engine.ingest(incoming)
  const replay = await engine.ingest(incoming)
  assert.equal(first.length, 2)
  assert.equal(healthyRuns, 1)
  assert.deepEqual(replay, [])
  assert.equal(history.list().filter(run => run.correlationId === 'corr-117').length, 2)
  assert.equal(first.some(item => item.status === 'failed'), true)
  assert.equal(first.some(item => item.status === 'completed'), true)
})

test('invalid events are rejected before handlers run', async () => {
  const { engine } = service()
  let runs = 0
  engine.register({ id: 'all', automationId: 'all', name: 'All', enabled: true, eventType: 'x' }, () => { runs++ })
  const invalid = event({ id: '', type: 'x', source: 'Test' })
  assert.equal(validateAutomationEvent(invalid), false)
  assert.deepEqual(await engine.ingest(invalid), [])
  assert.equal(runs, 0)
})

test('webhook ingestion validates credentials, timestamps, deduplicates, and protects inbox reads', () => {
  const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Integrations/EventWebhookEndpoints.cs'), 'utf8')
  const program = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Program.cs'), 'utf8')
  const registry = readFileSync(join(process.cwd(), 'src/services/serviceRegistry.ts'), 'utf8')
  assert.match(backend, /MapPost\("\/api\/events\/webhook\/\{source\}"/)
  assert.match(backend, /X-LifeOS-Webhook-Token/)
  assert.match(backend, /WithSecretAsync\("Integrations:Webhook:Credential"/)
  assert.match(backend, /FixedTimeEquals/)
  assert.match(backend, /TryAdd/)
  assert.match(backend, /AddDays\(-1\)/)
  assert.match(backend, /MapGet\("\/api\/events\/inbox".*RequireAuthorization/s)
  assert.match(program, /MapLifeOSEvents/)
  assert.match(registry, /EventAutomationService/)
  assert.match(registry, /WebhookEventProviderService/)
})
