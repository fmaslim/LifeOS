import assert from 'node:assert/strict'
import test from 'node:test'
import { InMemoryContentPipelineService, normalizeStage } from '../src/services/ContentPipelineService.ts'

test('legacy local stages remain compatible with provider workflow stages', () => { assert.equal(normalizeStage('Script'), 'Generated'); assert.equal(normalizeStage('Video'), 'Pictory'); assert.equal(normalizeStage('Scheduled'), 'Ready') })

test('provider events create and advance auditable pipeline items once', () => {
  const service = new InMemoryContentPipelineService(); const generated = { eventId: 'event-1', jobId: 'job-1', title: 'Calm systems', format: 'Short' as const, state: 'generated' as const, timestamp: '2026-09-14T08:00:00.000Z', artifactRoute: '#/content' }
  service.applyProviderEvent(generated); service.applyProviderEvent(generated); service.applyProviderEvent({ ...generated, eventId: 'event-2', state: 'ready' })
  const item = service.getContentPipelineData().items[0]
  assert.equal(service.getContentPipelineData().items.length, 1); assert.equal(item?.stage, 'Ready'); assert.equal(item?.audit?.length, 2); assert.equal(item?.artifactRoute, '#/content')
})

test('manual corrections are preserved in the audit log and errors are sanitized', () => {
  const service = new InMemoryContentPipelineService(); service.applyProviderEvent({ eventId: 'failed', jobId: 'job', title: 'Job', format: 'Long', state: 'failed', timestamp: '2026-09-14T08:00:00.000Z', errorDetails: 'token=private https://private.example' }); service.correctStage('job','Generated','Reviewed source data')
  const item = service.getContentPipelineData().items[0]
  assert.equal(item?.stage, 'Generated'); assert.equal(item?.audit?.at(-1)?.actor, 'user'); assert.doesNotMatch(item?.errorDetails ?? '', /private/)
})
