import assert from 'node:assert/strict'
import test from 'node:test'
import { InMemoryNotificationEventPublisher } from '../src/services/NotificationEventService.ts'

test('new sources publish typed notifications through one inbox', () => {
  const publisher = new InMemoryNotificationEventPublisher()
  const event = { title: 'Checks passed', message: 'Ready to merge', source: 'GitHub' as const, severity: 'normal' as const, timestamp: '2026-09-14T08:00:00.000Z', route: 'activity' as const, deduplicationKey: 'github-pr-42-passed' }
  const notification = publisher.publish(event)
  assert.equal(notification.source, 'GitHub')
  assert.equal(notification.route, 'activity')
  assert.equal(notification.read, false)
})

test('duplicate integration events are safely suppressed', () => {
  const publisher = new InMemoryNotificationEventPublisher()
  const event = { title: 'Provider unavailable', message: 'Calendar is offline', source: 'Integrations' as const, severity: 'important' as const, timestamp: '2026-09-14T08:00:00.000Z', route: 'settings' as const, deduplicationKey: 'calendar-offline' }
  const first = publisher.publish(event)
  const duplicate = publisher.publish({ ...event, timestamp: '2026-09-14T08:01:00.000Z' })
  assert.equal(first.id, duplicate.id)
  assert.equal(publisher.list().length, 1)
})
