import assert from 'node:assert/strict'
import test from 'node:test'
import type { ActivityEvent } from '../src/models/activity.ts'
import type { AutomationRun } from '../src/models/automation.ts'
import type { Task } from '../src/models/task.ts'
import type { LocalStore } from '../src/storage/LocalStore.ts'
import { storageKeys } from '../src/storage/storageKeys.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'
import { InMemoryScheduleService } from '../src/services/ScheduleService.ts'
import { WeeklyReviewService } from '../src/services/WeeklyReviewService.ts'

class MemoryStore implements LocalStore {
  private values = new Map<string, unknown>()
  read<T>(key: string, fallback: T): T { return (this.values.has(key) ? this.values.get(key) : fallback) as T }
  write<T>(key: string, value: T) { this.values.set(key, structuredClone(value)) }
  remove(key: string) { this.values.delete(key) }
}

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

const now = new Date('2026-09-14T16:00:00.000Z')

function fixture(options: { jarvisUnavailable?: boolean; docIqUnavailable?: boolean } = {}) {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())
  const history = new InMemoryAutomationRunRepository([
    { id: 'fail-one', automationId: 'sync', automationName: 'Provider Sync', trigger: 'Schedule', startedAt: '2026-09-13T08:00:00.000Z', endedAt: '2026-09-13T08:01:00.000Z', durationMs: 60000, status: 'failed', outputSummary: 'failed', retryCount: 0, relatedLinks: [] },
    { id: 'fail-two', automationId: 'sync', automationName: 'Provider Sync', trigger: 'Schedule', startedAt: '2026-09-12T08:00:00.000Z', endedAt: '2026-09-12T08:01:00.000Z', durationMs: 60000, status: 'failed', outputSummary: 'failed', retryCount: 1, relatedLinks: [] },
  ])
  const activityEvents: ActivityEvent[] = [{ id: 'hvac-alert', timestamp: '2026-09-13T12:00:00.000Z', source: 'Home', type: 'HVAC alert', description: 'Filter pressure is elevated.', status: 'attention', route: 'home', important: true }]
  const schedules = new InMemoryScheduleService([{ id: 'schedule-weekly-review', automationId: 'weekly-review', name: 'LifeOS Weekly Review', enabled: true, timezone: 'UTC', cadence: { type: 'weekly', weekday: 0, time: '15:00' }, nextRun: '2026-09-14T15:00:00.000Z', executionState: 'idle' }])
  const services = {
    tasks: { getTaskData: () => ({ tasks: [
      { id: 'done', title: 'Ship feature', domain: 'Work', priority: 'high', status: 'completed', dueDate: '2026-09-12' },
      { id: 'late', title: 'Follow up lead', domain: 'Work', priority: 'high', status: 'todo', dueDate: '2026-09-10' },
    ] as Task[] }) },
    goals: { getGoalData: () => ({ goals: [{ id: 'g1', title: 'Launch', description: '', area: 'Business' as const, status: 'active' as const, targetDate: '2026-12-01', milestones: [] }] }) },
    kpis: { getKpiData: () => ({ kpis: [{ id: 'k1', name: 'MRR', area: 'Business' as const, target: 10000, current: 4000, unit: 'USD', frequency: 'monthly' as const, status: 'at-risk' as const, history: [] }] }) },
    projects: { getProjectData: () => ({ projects: [{ id: 'p1', title: 'LifeOS', description: '', domain: 'Product' as const, status: 'active' as const, targetDate: '2026-10-01', progress: 20, milestones: [], linkedTaskIds: [] }] }) },
    contentPipeline: { getContentPipelineData: () => ({ items: [{ id: 'content-1', title: 'Weekly short', format: 'Short' as const, stage: 'Published' as const, platforms: ['YouTube'], targetDate: '2026-09-13' }] }) },
    jarvis: { getJarvisData: () => options.jarvisUnavailable ? { connection: 'unavailable' as const, providerName: 'Jarvis', fetchedAt: '', status: 'Paused' as const, statusDetail: '', lastRun: '', nextRun: '', metrics: [], qualifiedProspects: [], outreachQueue: [], activity: [] } : { connection: 'connected' as const, providerName: 'Jarvis', fetchedAt: '', status: 'Ready' as const, statusDetail: '', lastRun: '', nextRun: '', metrics: [{ label: 'Replies', value: '5', detail: '', icon: 'mail' as const, tone: 'green' as const }], qualifiedProspects: [], outreachQueue: [], activity: [] } },
    docIQ: { getDocIQData: () => { if (options.docIqUnavailable) throw new Error('offline'); return { updatedLabel: '', metrics: [], recentAnalyses: [], risks: [{ title: 'Renewal exposure', document: 'a.pdf', severity: 'High' as const, detail: 'Review clause' }], actions: [], systemStatus: [] } } },
    finances: { getFinancesData: () => ({ periodLabel: '', metrics: [], properties: [], recurringBills: [], debtPayments: [], cashFlow: [{ month: 'Sep', income: 5000, expenses: 4200 }], activity: [] }) },
    activity: { getActivityData: () => ({ events: [...activityEvents] }), publish: (event: ActivityEvent) => { activityEvents.push(event) } },
    automationHistory: history,
    schedules,
  }
  return { service: new WeeklyReviewService(services, approvals, store), approvals, store, history, activityEvents, schedules }
}

test('weekly review aggregates current LifeOS services and cites source signals', () => {
  const { service, history, activityEvents } = fixture()
  const review = service.run(now, 'Manual')
  assert.equal(review.metrics.completedTasks, 1)
  assert.equal(review.metrics.overdueTasks, 1)
  assert.equal(review.metrics.atRiskKpis, 1)
  assert.equal(review.metrics.publishedContent, 1)
  assert.equal(review.metrics.failedAutomations, 2)
  assert.ok(review.signals.some(signal => signal.id === 'automation-recurring'))
  assert.ok(review.signals.some(signal => signal.source === 'Home'))
  assert.ok(review.priorities.length > 0)
  for (const priority of review.priorities) assert.ok(priority.signalIds.every(id => review.signals.some(signal => signal.id === id)))
  const run = history.get(review.id)
  assert.equal(run?.correlationId, review.id)
  assert.equal(run?.triggerSource, 'User')
  assert.ok(activityEvents.some(event => event.id === review.id && event.route === 'weekly-review'))
})

test('disconnected providers degrade without preventing a persisted review', () => {
  const { service } = fixture({ jarvisUnavailable: true, docIqUnavailable: true })
  const review = service.run(now)
  assert.ok(review.warnings.some(warning => /Jarvis/.test(warning)))
  assert.ok(review.warnings.some(warning => /DocIQ/.test(warning)))
  assert.equal(service.list().length, 1)
  assert.equal(service.run(now).id, review.id)
})

test('priority edits and dismissals are deterministic', () => {
  const { service } = fixture()
  const review = service.run(now)
  const first = review.priorities[0]!
  service.editPriority(review.id, first.id, 'Investigate the top blocker')
  assert.equal(service.get(review.id)?.priorities.find(item => item.id === first.id)?.title, 'Investigate the top blocker')
  service.dismissPriority(review.id, first.id)
  assert.equal(service.get(review.id)?.priorities.find(item => item.id === first.id)?.state, 'dismissed')
})

test('proposed write actions require approval before a task is created', async () => {
  const { service, approvals, store } = fixture()
  const review = service.run(now)
  const priority = review.priorities[0]!
  const request = service.requestPriority(review.id, priority.id)!
  assert.equal(request.state, 'pending')
  assert.equal(service.get(review.id)?.priorities.find(item => item.id === priority.id)?.state, 'awaiting-approval')
  assert.equal(store.read<Task[]>(storageKeys.tasks, []).length, 0)
  approvals.decide(request.id, 'approved')
  await approvals.executeApproved(request.id)
  const tasks = store.read<Task[]>(storageKeys.tasks, [])
  assert.equal(tasks.length, 3)
  assert.equal(tasks.filter(task => task.id === `weekly-${review.weekOf}-${priority.id}`).length, 1)
  assert.equal(service.get(review.id)?.priorities.find(item => item.id === priority.id)?.state, 'accepted')
  await approvals.executeApproved(request.id)
  assert.equal(store.read<Task[]>(storageKeys.tasks, []).filter(task => task.id === `weekly-${review.weekOf}-${priority.id}`).length, 1)
})

test('scheduler can run the weekly review once and records scheduler provenance', () => {
  const { service, history } = fixture()
  const review = service.runDue(now)!
  assert.equal(review.trigger, 'Schedule')
  assert.equal(history.get(review.id)?.triggerSource, 'Scheduler')
  assert.equal(service.runDue(now), undefined)
})
