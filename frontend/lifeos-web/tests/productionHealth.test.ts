import assert from 'node:assert/strict'
import test from 'node:test'
import type { ActivityEvent } from '../src/models/activity.ts'
import type { LifeNotification, NotificationEvent } from '../src/models/notification.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'
import { ProductionHealthService } from '../src/services/ProductionHealthService.ts'

test('production health isolates failures and preserves revision evidence', async () => {
  const events: ActivityEvent[] = []; const notices: LifeNotification[] = []; const history = new InMemoryAutomationRunRepository()
  const service = new ProductionHealthService([{ id: 'frontend', target: 'frontend', label: 'Frontend', run: async () => ({ state: 'healthy', revision: 'abc123', buildId: 'build-7', message: 'Loaded' }) }, { id: 'auth', target: 'auth', label: 'Auth route', run: async () => { throw new Error('route mismatch token=private') } }, { id: 'persistence', target: 'persistence', label: 'Persistence', run: async () => ({ state: 'degraded', message: 'Slow response' }) }], { getActivityData: () => ({ events }), publish: event => events.push(event) }, { getNotificationData: () => ({ notifications: notices }), publish: (event: NotificationEvent) => { const notice = { ...event, id: event.deduplicationKey, read: false }; notices.push(notice); return notice } }, history)
  const result = await service.check(new Date('2026-09-15T03:00:00Z'))
  assert.equal(result.state, 'unavailable'); assert.equal(result.checks.length, 3); assert.equal(result.checks[0]?.revision, 'abc123'); assert.match(result.checks[1]?.message ?? '', /\[redacted\]/); assert.equal(events[0]?.route, 'production-health'); assert.equal(notices[0]?.severity, 'critical'); assert.equal(history.list()[0]?.status, 'failed')
})

test('one successful bounded run records the last all-green time', async () => { const service = new ProductionHealthService([{ id: 'api', target: 'backend', label: 'API', run: async () => ({ state: 'healthy', message: 'OK' }) }]); const result = await service.check(new Date('2026-09-15T03:05:00Z')); assert.equal(result.state, 'healthy'); assert.equal(result.lastSuccessfulAt, result.checkedAt) })
