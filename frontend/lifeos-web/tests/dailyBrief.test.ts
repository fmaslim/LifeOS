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

test('routine instances are optional but, when supplied, surface a signal, an action, and missed warnings', () => {
  const withoutRoutines = composeDailyBrief(sources(), new Date('2026-09-14T08:30:00.000Z'))
  assert.equal(withoutRoutines.signals.length, 4)
  assert.equal(withoutRoutines.actions.some(action => action.id === 'routines-due'), false)

  const data = sources()
  data.routines = { instances: [
    { id: 'r1--2026-09-14', routineId: 'r1', routineName: 'Morning launch', kind: 'morning', date: '2026-09-14', status: 'scheduled', windowEnd: '2026-09-14T09:00:00.000Z', steps: [] },
    { id: 'r2--2026-09-14', routineId: 'r2', routineName: 'Evening wind-down', kind: 'evening', date: '2026-09-14', status: 'missed', windowEnd: '2026-09-14T07:00:00.000Z', steps: [] },
  ] }
  const brief = composeDailyBrief(data, new Date('2026-09-14T08:30:00.000Z'))
  assert.equal(brief.signals.length, 5)
  assert.equal(brief.signals.at(-1)?.id, 'routines')
  assert.equal(brief.signals.at(-1)?.status, 'attention')
  assert.ok(brief.actions.some(action => action.id === 'routines-due' && action.reason.includes('Morning launch')))
  assert.ok(brief.warnings.some(warning => /missed: Evening wind-down/.test(warning)))
})
