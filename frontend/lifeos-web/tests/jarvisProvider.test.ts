import assert from 'node:assert/strict'
import test from 'node:test'
import { jarvisMockData } from '../src/data/jarvisMockData.ts'
import { ProviderBackedJarvisService } from '../src/services/JarvisService.ts'

test('provider data reaches Jarvis through a typed replaceable boundary', () => {
  const service = new ProviderBackedJarvisService({ getSnapshot: () => ({ ...jarvisMockData, fetchedAt: '2026-09-14T08:00:00.000Z' }) }, 60_000, () => Date.parse('2026-09-14T08:00:30.000Z'))
  const data = service.getJarvisData()
  assert.equal(data.connection, 'connected'); assert.ok(data.metrics.some(metric => metric.label === 'Emails sent')); assert.ok(data.metrics.some(metric => metric.label === 'Signups'))
})

test('stale and unavailable provider states do not break LifeOS', () => {
  const stale = new ProviderBackedJarvisService({ getSnapshot: () => ({ ...jarvisMockData, fetchedAt: '2026-09-14T07:00:00.000Z' }) }, 60_000, () => Date.parse('2026-09-14T08:00:00.000Z')).getJarvisData()
  assert.equal(stale.connection, 'stale')
  const unavailable = new ProviderBackedJarvisService({ getSnapshot: () => { throw new Error('offline') } }).getJarvisData()
  assert.equal(unavailable.connection, 'unavailable'); assert.deepEqual(unavailable.metrics, [])
})
