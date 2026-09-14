import assert from 'node:assert/strict'
import test from 'node:test'
import type { AutomationRun } from '../src/models/automation.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'

const run = (id: string, status: AutomationRun['status'], startedAt: string, automationId = 'brief'): AutomationRun => ({ id, automationId, automationName: 'Morning Brief', trigger: 'Schedule', startedAt, endedAt: startedAt, durationMs: 10, status, outputSummary: 'Done', retryCount: status === 'retried' ? 1 : 0, relatedLinks: [] })

test('execution history filters by automation, status, and date boundaries', () => {
  const repository = new InMemoryAutomationRunRepository([run('one','completed','2026-09-13T07:00:00.000Z'), run('two','failed','2026-09-14T07:00:00.000Z','sync'), run('three','retried','2026-09-14T08:00:00.000Z')])
  assert.deepEqual(repository.list({ automationId: 'brief', from: '2026-09-14T00:00:00.000Z' }).map(item => item.id), ['three'])
  assert.deepEqual(repository.list({ status: 'failed' }).map(item => item.id), ['two'])
})

test('failure details are sanitized before durable storage', () => {
  const unsafe = { ...run('failed','failed','2026-09-14T07:00:00.000Z'), errorDetails: 'token=abc user@example.com https://private.example/path' }
  const repository = new InMemoryAutomationRunRepository([unsafe])
  const details = repository.get('failed')?.errorDetails ?? ''
  assert.doesNotMatch(details, /abc|user@example|private\.example/)
  assert.match(details, /redacted/)
})
