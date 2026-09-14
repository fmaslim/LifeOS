import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateNextRun, InMemoryScheduleService } from '../src/services/ScheduleService.ts'

test('daily and weekly schedules calculate the next run in their timezone', () => {
  assert.equal(calculateNextRun({ type: 'daily', time: '07:00' }, 'UTC', new Date('2026-09-14T06:30:00.000Z')), '2026-09-14T07:00:00.000Z')
  assert.equal(calculateNextRun({ type: 'weekly', weekday: 1, time: '09:00' }, 'UTC', new Date('2026-09-14T09:00:00.000Z')), '2026-09-21T09:00:00.000Z')
  assert.equal(calculateNextRun({ type: 'daily', time: '07:00' }, 'America/New_York', new Date('2026-03-07T13:00:00.000Z')), '2026-03-08T11:00:00.000Z')
})

test('one occurrence can only be claimed once', () => {
  const schedule = { id: 'daily', automationId: 'brief', name: 'Brief', enabled: true, timezone: 'UTC', cadence: { type: 'daily' as const, time: '07:00' }, nextRun: '2026-09-14T07:00:00.000Z', executionState: 'idle' as const }
  const scheduler = new InMemoryScheduleService([schedule])
  const now = new Date('2026-09-14T07:01:00.000Z')
  assert.equal(scheduler.claimDue(schedule.id, now), true)
  assert.equal(scheduler.claimDue(schedule.id, now), false)
  assert.equal(scheduler.getScheduleData().schedules[0]?.previousRun, schedule.nextRun)
})

test('disabled schedules cannot be claimed', () => {
  const schedule = { id: 'weekly', automationId: 'finance', name: 'Finance', enabled: false, timezone: 'UTC', cadence: { type: 'weekly' as const, weekday: 1, time: '09:00' }, nextRun: '2026-09-14T09:00:00.000Z', executionState: 'idle' as const }
  const scheduler = new InMemoryScheduleService([schedule])
  assert.equal(scheduler.claimDue(schedule.id, new Date('2026-09-14T09:01:00.000Z')), false)
})
