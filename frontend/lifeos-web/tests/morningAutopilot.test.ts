import assert from 'node:assert/strict'
import test from 'node:test'
import type { DailyBriefData } from '../src/models/dailyBrief.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'
import { MorningAutopilotService } from '../src/services/MorningAutopilotService.ts'
import { InMemoryScheduleService } from '../src/services/ScheduleService.ts'

const now = new Date('2026-09-14T11:00:00.000Z')
const brief: DailyBriefData = { generatedAt: now.toISOString(), greeting: 'Good morning', actions: [{ id: 'one', title: 'Review launch', reason: 'Due today', route: 'tasks', priority: 'high' }], signals: [], warnings: [] }
const setup = (providerFails = false) => {
  const schedules = new InMemoryScheduleService([{ id: 'schedule-morning-brief', automationId: 'morning-autopilot', name: 'Morning Autopilot', enabled: true, timezone: 'America/New_York', cadence: { type: 'daily', time: '07:00' }, nextRun: '2026-09-14T10:59:00.000Z', executionState: 'idle' }])
  const automationHistory = new InMemoryAutomationRunRepository()
  const notifications: unknown[] = []; const activity: unknown[] = []
  const service = new MorningAutopilotService({ schedules, dailyBrief: { getDailyBrief: () => brief }, integrationProviders: { listProviders: () => { if (providerFails) throw new Error('provider secret must not leak'); return [] } }, automationHistory, notifications: { publish: event => notifications.push(event) }, activity: { publish: event => activity.push(event) } })
  return { service, schedules, automationHistory, notifications, activity }
}

test('scheduler runs the morning workflow once and records history and Activity', () => {
  const subject = setup()
  const result = subject.service.runDue(now)
  assert.equal(result?.brief.actions[0].title, 'Review launch')
  assert.equal(subject.service.runDue(now), undefined)
  assert.equal(subject.automationHistory.list({ automationId: 'morning-autopilot' }).length, 1)
  assert.equal(subject.activity.length, 1)
  assert.equal(subject.schedules.getScheduleData().schedules[0].executionState, 'idle')
})

test('optional provider failure degrades safely while still producing the Daily Brief', () => {
  const subject = setup(true)
  const result = subject.service.runDue(now)!
  assert.equal(result.status, 'degraded')
  assert.equal(result.brief.greeting, 'Good morning')
  assert.equal(result.steps.find(step => step.id === 'integration-health')?.status, 'degraded')
  assert.equal(subject.notifications.length, 1)
  assert.doesNotMatch(JSON.stringify(result), /provider secret must not leak/)
})

test('healthy runs publish no low-value notification', () => {
  const subject = setup()
  subject.service.runDue(now)
  assert.equal(subject.notifications.length, 0)
})
