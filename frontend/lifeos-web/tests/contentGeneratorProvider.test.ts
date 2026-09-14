import assert from 'node:assert/strict'
import test from 'node:test'
import { MockContentService, MockYouTubeGeneratorProvider } from '../src/services/MockContentService.ts'

test('configured provider returns complete short and long artifact packages', async () => {
  const service = new MockContentService(new MockYouTubeGeneratorProvider())
  for (const result of [await service.generateShortContent({ topic: 'calm systems' }), await service.generateLongContent({ topic: 'calm systems' })]) {
    assert.equal(result.workflowState, 'completed'); assert.ok(result.generatedAt); assert.ok(result.script?.length); assert.ok(result.description); assert.ok(result.tags?.length); assert.ok(result.pinnedComment); assert.ok(result.thumbnailPrompt); assert.ok(result.igCaption); assert.ok(result.threadsCaption); assert.ok(result.mediumContent); assert.ok(result.gumroadContent)
  }
})

test('missing provider state is exposed without attempting generation', () => {
  const provider = { getStatus: () => 'missing' as const, generateShort: async () => { throw new Error('should not run') }, generateLong: async () => { throw new Error('should not run') } }
  const service = new MockContentService(provider)
  assert.equal(service.getProviderStatus(), 'missing')
})
