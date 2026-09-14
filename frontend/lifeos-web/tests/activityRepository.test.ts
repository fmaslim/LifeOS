import assert from 'node:assert/strict'
import test from 'node:test'
import { PersistentActivityEventRepository } from '../src/services/ActivityService.ts'
class MemoryStorage { value: string | null = null; getItem() { return this.value } setItem(_key: string, value: string) { this.value = value } }
const event = { id: 'github-1', timestamp: '2026-09-14T08:00:00.000Z', source: 'GitHub' as const, type: 'PR merged', description: 'Merged safely', status: 'success' as const, correlationId: 'issue-76', route: 'github' as const, important: true }
test('providers publish typed events without page coupling or duplicates', () => { const repository = new PersistentActivityEventRepository(); repository.publish(event); repository.publish(event); assert.equal(repository.list().length,1); assert.equal(repository.list()[0]?.correlationId,'issue-76') })
test('important events survive reload when persistence is configured', () => { const storage = new MemoryStorage(); const first = new PersistentActivityEventRepository([],storage); first.publish(event); first.publish({ ...event, id:'temporary', important:false }); const restored = new PersistentActivityEventRepository([],storage); assert.deepEqual(restored.list().map(item=>item.id),['github-1']) })
test('corrupt persistent activity safely falls back to seed data', () => { const storage = new MemoryStorage(); storage.value = '{bad'; const restored = new PersistentActivityEventRepository([event],storage); assert.equal(restored.list()[0]?.id,'github-1') })
