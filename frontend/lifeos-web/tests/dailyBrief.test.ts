import assert from 'node:assert/strict'
import test from 'node:test'
import { composeDailyBrief, type DailyBriefSources } from '../src/services/DailyBriefService.ts'
import { automationsMockData } from '../src/data/automationsMockData.ts'
import { calendarMockData } from '../src/data/calendarMockData.ts'
import { dashboardMockData } from '../src/data/dashboardMockData.ts'
import { goalMockData } from '../src/data/goalMockData.ts'
import { notificationMockData } from '../src/data/notificationMockData.ts'
import { taskMockData } from '../src/data/taskMockData.ts'

function sources(): DailyBriefSources {
  return { automations: automationsMockData, calendar: calendarMockData, dashboard: dashboardMockData, goals: goalMockData, notifications: notificationMockData, providers: [], tasks: taskMockData }
}

test('daily brief ranks critical notices before open tasks deterministically', () => {
  const now = new Date('2026-09-14T08:30:00.000Z')
  const brief = composeDailyBrief(sources(), now)
  assert.equal(brief.generatedAt, now.toISOString())
  assert.equal(brief.greeting, 'Good morning')
  assert.equal(brief.actions[0]?.priority, 'critical')
  assert.equal(brief.actions[0]?.route, 'dociq')
  assert.equal(brief.signals.length, 4)
})

test('an unavailable provider degrades gracefully without hiding local signals', () => {
  const data = sources()
  data.providers.push({ metadata: { id: 'calendar', name: 'Calendar', description: 'Calendar provider', category: 'productivity' }, capabilities: { read: true, write: false, events: true, actions: false }, connection: 'unavailable', health: 'offline' })
  const brief = composeDailyBrief(data, new Date('2026-09-14T14:00:00.000Z'))
  assert.equal(brief.greeting, 'Good afternoon')
  assert.match(brief.warnings.at(-1) ?? '', /unavailable/)
  assert.equal(brief.signals.length, 4)
})
