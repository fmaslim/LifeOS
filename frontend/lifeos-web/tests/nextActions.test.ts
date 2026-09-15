import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalendarData, CalendarEvent } from '../src/models/calendar.ts'
import type { DailyBriefData } from '../src/models/dailyBrief.ts'
import type { Goal, GoalData, GoalKpi, KpiData } from '../src/models/goal.ts'
import type { NextActionDecision, NextActionRecommendation } from '../src/models/nextAction.ts'
import type { PlanningOverview, ProjectDependency } from '../src/models/planning.ts'
import type { Project, ProjectData } from '../src/models/project.ts'
import type { RoutineInstance } from '../src/models/routine.ts'
import type { Task, TaskData } from '../src/models/task.ts'
import type { WeeklyReview } from '../src/models/weeklyReview.ts'
import type { LocalStore } from '../src/storage/LocalStore.ts'
import { storageKeys } from '../src/storage/storageKeys.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import {
  applyDecisions,
  computeBlockedProjectCandidates,
  computeCalendarCandidates,
  computeGoalCandidates,
  computeKpiCandidates,
  computeProjectNextActionCandidates,
  computeRoutineCandidates,
  computeSystemSignalCandidates,
  computeTaskCandidates,
  computeWeeklyReviewCandidates,
  rankRecommendations,
} from '../src/services/NextActionLogic.ts'
import { NextActionService, type NextActionDependencies } from '../src/services/NextActionService.ts'

class MemoryStore implements LocalStore {
  private values = new Map<string, unknown>()
  read<T>(key: string, fallback: T): T { return (this.values.has(key) ? this.values.get(key) : fallback) as T }
  write<T>(key: string, value: T) { this.values.set(key, structuredClone(value)) }
  remove(key: string) { this.values.delete(key) }
}

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

const now = new Date('2026-09-15T12:00:00.000Z')
const today = '2026-09-15'

// --- Pure logic (NextActionLogic.ts) ---

test('computeTaskCandidates scores overdue > due-today > future, and only proposes a priority bump for a non-high task that is due or overdue', () => {
  const tasks: Task[] = [
    { id: 't-overdue', title: 'Overdue low', domain: 'Work', priority: 'low', status: 'todo', dueDate: '2026-09-10' },
    { id: 't-today-high', title: 'Due today, already high', domain: 'Work', priority: 'high', status: 'todo', dueDate: '2026-09-15' },
    { id: 't-future', title: 'Future medium', domain: 'Work', priority: 'medium', status: 'todo', dueDate: '2026-09-25' },
    { id: 't-done', title: 'Completed', domain: 'Work', priority: 'high', status: 'completed', dueDate: '2026-09-01' },
  ]
  const candidates = computeTaskCandidates(tasks, today)
  assert.equal(candidates.length, 3) // completed task excluded
  const overdue = candidates.find(item => item.id === 'task:t-overdue')!
  const dueToday = candidates.find(item => item.id === 'task:t-today-high')!
  const future = candidates.find(item => item.id === 'task:t-future')!
  assert.ok(overdue.score > future.score)
  assert.deepEqual(overdue.effect, { type: 'bump-task-priority', taskId: 't-overdue', targetPriority: 'high' })
  assert.deepEqual(dueToday.effect, { type: 'navigate' }) // already high priority: nothing to bump
  assert.deepEqual(future.effect, { type: 'navigate' }) // not due soon enough to propose a bump
  assert.match(overdue.reason, /Overdue since 2026-09-10/)
})

test('computeProjectNextActionCandidates skips blocked projects and rewards stale/critical-path/dependents', () => {
  const projects: Project[] = [
    { id: 'p-a', title: 'Project A', description: '', domain: 'Product', status: 'active', targetDate: '', progress: 50, linkedTaskIds: [], milestones: [] },
    { id: 'p-b', title: 'Project B (blocked)', description: '', domain: 'Product', status: 'active', targetDate: '', progress: 10, linkedTaskIds: [], milestones: [] },
  ]
  const planning: PlanningOverview = {
    projectStatuses: [
      { projectId: 'p-a', nextAction: { source: 'task', title: 'Ship it', taskId: 't-1', priority: 'medium' }, blockedReasons: [], stale: true, staleReasons: ['stale reason'] },
      { projectId: 'p-b', nextAction: { source: 'task', title: 'Blocked task', taskId: 't-2', priority: 'high' }, blockedReasons: ['Blocked by "X"'], stale: false, staleReasons: [] },
    ],
    goalStatuses: [], criticalPath: [{ projectId: 'p-a', title: 'Project A', targetDate: '' }],
    blockedProjectIds: ['p-b'], staleProjectIds: ['p-a'], goalsWithoutNextActionIds: [], suggestions: [],
  }
  const dependencies: ProjectDependency[] = [{ id: 'dep-b-a', projectId: 'p-b', dependsOnProjectId: 'p-a', reason: 'B needs A', createdAt: now.toISOString() }]
  const candidates = computeProjectNextActionCandidates(projects, planning, dependencies)
  assert.equal(candidates.length, 1) // p-b is blocked, excluded here
  const candidate = candidates[0]!
  assert.equal(candidate.id, 'project-next-action:p-a')
  assert.deepEqual(candidate.effect, { type: 'bump-task-priority', taskId: 't-1', targetPriority: 'high' })
  assert.ok(candidate.evidence.some(item => item.label === 'Dependents' && /Unblocks 1/.test(item.detail)))
  assert.ok(candidate.evidence.some(item => item.label === 'Critical path'))
})

test('computeProjectNextActionCandidates proposes no bump when the next action\'s task is already high priority - there is nothing left to accept', () => {
  const projects: Project[] = [{ id: 'p-a', title: 'Project A', description: '', domain: 'Product', status: 'active', targetDate: '', progress: 50, linkedTaskIds: [], milestones: [] }]
  const planning: PlanningOverview = {
    projectStatuses: [{ projectId: 'p-a', nextAction: { source: 'task', title: 'Already high', taskId: 't-1', priority: 'high' }, blockedReasons: [], stale: false, staleReasons: [] }],
    goalStatuses: [], criticalPath: [], blockedProjectIds: [], staleProjectIds: [], goalsWithoutNextActionIds: [], suggestions: [],
  }
  const candidates = computeProjectNextActionCandidates(projects, planning, [])
  assert.deepEqual(candidates[0]?.effect, { type: 'navigate' })
})

test('computeBlockedProjectCandidates surfaces every blocked project with its blocking reasons as evidence', () => {
  const projects: Project[] = [{ id: 'p-c', title: 'Project C', description: '', domain: 'Home', status: 'planning', targetDate: '', progress: 0, linkedTaskIds: [], milestones: [] }]
  const planning: PlanningOverview = { projectStatuses: [{ projectId: 'p-c', blockedReasons: ['Blocked by "A" (active)'], stale: false, staleReasons: [] }], goalStatuses: [], criticalPath: [], blockedProjectIds: ['p-c'], staleProjectIds: [], goalsWithoutNextActionIds: [], suggestions: [] }
  const candidates = computeBlockedProjectCandidates(projects, planning)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0]?.route, 'planning')
  assert.deepEqual(candidates[0]?.effect, { type: 'navigate' })
  assert.ok(candidates[0]?.evidence.some(item => /Blocked by "A"/.test(item.detail)))
})

test('computeGoalCandidates proposes a create-task effect for each goal PlanningLogic flagged as having no active next action', () => {
  const goals: Goal[] = [{ id: 'g-1', title: 'Ship the SaaS', description: '', area: 'Business', status: 'active', targetDate: '', milestones: [] }]
  const planning: PlanningOverview = { projectStatuses: [], goalStatuses: [], criticalPath: [], blockedProjectIds: [], staleProjectIds: [], goalsWithoutNextActionIds: ['g-1'], suggestions: [] }
  const candidates = computeGoalCandidates(goals, planning)
  assert.equal(candidates.length, 1)
  assert.deepEqual(candidates[0]?.effect, { type: 'create-task', title: 'Define next action for Ship the SaaS', domain: 'Personal', priority: 'medium' })
})

test('computeCalendarCandidates only includes today\'s events and scores timed events above all-day ones', () => {
  const events: CalendarEvent[] = [
    { id: 'e-1', title: 'Timed today', date: today, category: 'work', allDay: false, startTime: '09:00', endTime: '10:00' },
    { id: 'e-2', title: 'All day today', date: today, category: 'home', allDay: true },
    { id: 'e-3', title: 'Tomorrow', date: '2026-09-16', category: 'work', allDay: false },
  ]
  const candidates = computeCalendarCandidates(events, today)
  assert.equal(candidates.length, 2)
  const timed = candidates.find(item => item.id === 'calendar:e-1')!
  const allDay = candidates.find(item => item.id === 'calendar:e-2')!
  assert.ok(timed.score > allDay.score)
})

test('computeRoutineCandidates flags missed above scheduled-but-not-started instances', () => {
  const instances: RoutineInstance[] = [
    { id: 'r-1', routineId: 'rt-1', routineName: 'Morning routine', kind: 'morning', date: today, status: 'missed', windowEnd: '', steps: [] },
    { id: 'r-2', routineId: 'rt-2', routineName: 'Evening routine', kind: 'evening', date: today, status: 'scheduled', windowEnd: '', steps: [] },
    { id: 'r-3', routineId: 'rt-3', routineName: 'Done routine', kind: 'weekly', date: today, status: 'completed', windowEnd: '', steps: [] },
  ]
  const candidates = computeRoutineCandidates(instances)
  assert.equal(candidates.length, 2)
  const missed = candidates.find(item => item.id === 'routine:r-1')!
  const scheduled = candidates.find(item => item.id === 'routine:r-2')!
  assert.ok(missed.score > scheduled.score)
})

test('computeKpiCandidates includes at-risk and below-60%-progress KPIs, excludes archived and on-track ones', () => {
  const kpis: GoalKpi[] = [
    { id: 'k-1', name: 'At risk', area: 'Business', target: 100, current: 40, unit: '%', frequency: 'weekly', status: 'at-risk', history: [] },
    { id: 'k-2', name: 'Low progress', area: 'Content', target: 100, current: 50, unit: '%', frequency: 'weekly', status: 'on-track', history: [] },
    { id: 'k-3', name: 'On track', area: 'Content', target: 100, current: 90, unit: '%', frequency: 'weekly', status: 'on-track', history: [] },
    { id: 'k-4', name: 'Archived', area: 'Content', target: 100, current: 10, unit: '%', frequency: 'weekly', status: 'archived', history: [] },
  ]
  const candidates = computeKpiCandidates(kpis)
  assert.deepEqual(candidates.map(item => item.id).sort(), ['kpi:k-1', 'kpi:k-2'])
})

test('computeWeeklyReviewCandidates only surfaces proposed priorities', () => {
  const review: WeeklyReview = {
    id: 'wr-1', weekOf: '2026-09-08', generatedAt: now.toISOString(), trigger: 'Manual', summary: '', metrics: { completedTasks: 0, overdueTasks: 0, atRiskKpis: 0, completedProjects: 0, publishedContent: 0, failedAutomations: 0 }, signals: [],
    priorities: [
      { id: 'p-1', title: 'Address X', reason: 'reason', signalIds: [], state: 'proposed' },
      { id: 'p-2', title: 'Already accepted', reason: 'reason', signalIds: [], state: 'accepted' },
    ], warnings: [],
  }
  const candidates = computeWeeklyReviewCandidates(review)
  assert.equal(candidates.length, 1)
  assert.deepEqual(candidates[0]?.effect, { type: 'weekly-review-priority', reviewId: 'wr-1', priorityId: 'p-1' })
})

test('computeSystemSignalCandidates reuses only the Daily Brief\'s notification-driven action', () => {
  const brief: DailyBriefData = { generatedAt: now.toISOString(), greeting: 'Good morning', actions: [{ id: 'notice-n1', title: 'Critical alert', reason: 'Something broke', route: 'activity', priority: 'critical' }, { id: 'task-t1', title: 'A task', reason: 'reason', route: 'tasks', priority: 'normal' }], signals: [], warnings: [] }
  const candidates = computeSystemSignalCandidates(brief)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0]?.id, 'system-signal:notice-n1')
  assert.equal(candidates[0]?.priority, 'critical')
  assert.equal(computeSystemSignalCandidates(undefined).length, 0)
})

test('rankRecommendations sorts by score descending, ties broken by id, and applies the bound', () => {
  const make = (id: string, score: number): NextActionRecommendation => ({ id, kind: 'task', title: id, reason: '', route: 'tasks', priority: 'low', score, evidence: [], effect: { type: 'navigate' }, evidenceHash: 'h' })
  const ranked = rankRecommendations([make('b', 50), make('a', 50), make('c', 90)], 2)
  assert.deepEqual(ranked.map(item => item.id), ['c', 'a']) // c highest score; a beats b on id tie-break
})

test('applyDecisions suppresses a dismissed/deferred recommendation only while its evidence hash is unchanged, and honors deferUntil', () => {
  const candidate: NextActionRecommendation = { id: 'task:t-1', kind: 'task', title: 'X', reason: '', route: 'tasks', priority: 'low', score: 10, evidence: [{ label: 'Priority', detail: 'low' }], effect: { type: 'navigate' }, evidenceHash: 'hash-a' }
  const dismissed: NextActionDecision = { id: 'task:t-1', state: 'dismissed', evidenceHash: 'hash-a', decidedAt: now.toISOString() }
  const { visible: visible1, suppressed: suppressed1 } = applyDecisions([candidate], [dismissed], now)
  assert.equal(visible1.length, 0)
  assert.equal(suppressed1.length, 1)

  const changed = { ...candidate, evidenceHash: 'hash-b' }
  const { visible: visible2 } = applyDecisions([changed], [dismissed], now)
  assert.equal(visible2.length, 1) // evidence changed: resurfaces despite the dismissal

  const deferred: NextActionDecision = { id: 'task:t-1', state: 'deferred', evidenceHash: 'hash-a', decidedAt: now.toISOString(), deferUntil: new Date(now.getTime() + 3_600_000).toISOString() }
  const { visible: stillDeferred } = applyDecisions([candidate], [deferred], now)
  assert.equal(stillDeferred.length, 0)
  const { visible: afterWindow } = applyDecisions([candidate], [deferred], new Date(now.getTime() + 2 * 3_600_000))
  assert.equal(afterWindow.length, 1)
})

// --- NextActionService integration ---

function fixture() {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())

  const tasks: Task[] = [
    { id: 't-overdue', title: 'Overdue low', domain: 'Work', priority: 'low', status: 'todo', dueDate: '2026-09-10' },
    { id: 't-navigate', title: 'Ongoing high priority', domain: 'Work', priority: 'high', status: 'todo' },
  ]
  store.write(storageKeys.tasks, tasks)

  const goal: Goal = { id: 'g-1', title: 'Ship the SaaS', description: '', area: 'Business', status: 'active', targetDate: '', milestones: [] }
  const planningOverview: PlanningOverview = { projectStatuses: [], goalStatuses: [], criticalPath: [], blockedProjectIds: [], staleProjectIds: [], goalsWithoutNextActionIds: ['g-1'], suggestions: [] }

  const weeklyPriority = { id: 'p-1', title: 'Address the KPI slide', reason: 'KPIs: 1 at risk', signalIds: [], state: 'proposed' as const }
  let weeklyReview: WeeklyReview = { id: 'wr-1', weekOf: '2026-09-08', generatedAt: now.toISOString(), trigger: 'Manual', summary: '', metrics: { completedTasks: 0, overdueTasks: 0, atRiskKpis: 0, completedProjects: 0, publishedContent: 0, failedAutomations: 0 }, signals: [], priorities: [weeklyPriority], warnings: [] }

  const weeklyReviewFake = {
    list: () => [weeklyReview],
    requestPriority: (reviewId: string, priorityId: string) => {
      if (reviewId !== weeklyReview.id) return undefined
      const priority = weeklyReview.priorities.find(item => item.id === priorityId)
      if (!priority || priority.state !== 'proposed') return undefined
      const approval = approvals.request({ source: 'Weekly Review', action: 'tasks.create', summary: `Create next-week task: ${priority.title}`, risk: 'medium', correlationId: `${reviewId}:${priorityId}` }, () => {
        weeklyReview = { ...weeklyReview, priorities: weeklyReview.priorities.map(item => item.id === priorityId ? { ...item, state: 'accepted' } : item) }
      })
      weeklyReview = { ...weeklyReview, priorities: weeklyReview.priorities.map(item => item.id === priorityId ? { ...item, state: 'awaiting-approval' } : item) }
      return approval
    },
    dismissPriority: (reviewId: string, priorityId: string) => {
      if (reviewId !== weeklyReview.id) return undefined
      weeklyReview = { ...weeklyReview, priorities: weeklyReview.priorities.map(item => item.id === priorityId ? { ...item, state: 'dismissed' } : item) }
      return weeklyReview
    },
    editPriority: (reviewId: string, priorityId: string, title: string) => {
      if (reviewId !== weeklyReview.id) return undefined
      weeklyReview = { ...weeklyReview, priorities: weeklyReview.priorities.map(item => item.id === priorityId ? { ...item, title } : item) }
      return weeklyReview
    },
  }

  const services: NextActionDependencies = {
    tasks: { getTaskData: (): TaskData => ({ tasks }) },
    goals: { getGoalData: (): GoalData => ({ goals: [goal] }) },
    projects: { getProjectData: (): ProjectData => ({ projects: [] }) },
    planning: { getOverview: () => planningOverview, listDependencies: () => [] },
    calendar: { getCalendarData: (): CalendarData => ({ events: [], categories: {} as CalendarData['categories'] }) },
    routines: { listInstances: () => [] },
    kpis: { getKpiData: (): KpiData => ({ kpis: [] }) },
    weeklyReview: weeklyReviewFake,
  }

  const service = new NextActionService(services, approvals, store, 8)
  return { service, store, approvals, weeklyPriorityId: weeklyPriority.id, reviewId: weeklyReview.id }
}

test('getOverview returns a bounded, ranked, deterministic list assembled from every source', () => {
  const { service } = fixture()
  const overview = service.getOverview(now)
  assert.equal(overview.warnings.length, 0)
  const ids = overview.recommendations.map(item => item.id)
  assert.ok(ids.includes('task:t-overdue'))
  assert.ok(ids.includes('goal-next-action:g-1'))
  assert.ok(ids.includes('weekly-review:wr-1:p-1'))
  // deterministic: same inputs produce the same order every time
  assert.deepEqual(service.getOverview(now).recommendations.map(item => item.id), ids)
})

test('a source dependency that throws is isolated: its candidates are dropped, a warning is recorded, and every other source still contributes', () => {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())
  const deps: NextActionDependencies = {
    tasks: { getTaskData: () => ({ tasks: [{ id: 't-1', title: 'A task', domain: 'Work', priority: 'high', status: 'todo' as const }] }) },
    goals: { getGoalData: () => ({ goals: [] }) },
    projects: { getProjectData: () => ({ projects: [] }) },
    planning: { getOverview: () => ({ projectStatuses: [], goalStatuses: [], criticalPath: [], blockedProjectIds: [], staleProjectIds: [], goalsWithoutNextActionIds: [], suggestions: [] }), listDependencies: () => [] },
    calendar: { getCalendarData: () => { throw new Error('calendar provider unavailable') } },
    routines: { listInstances: () => [] },
    kpis: { getKpiData: () => ({ kpis: [] }) },
    weeklyReview: { list: () => [], requestPriority: () => undefined, dismissPriority: () => undefined, editPriority: () => undefined },
  }
  const isolated = new NextActionService(deps, approvals, store, 8)
  const overview = isolated.getOverview(now)
  assert.ok(overview.warnings.some(warning => /Calendar/.test(warning)))
  assert.ok(overview.recommendations.some(item => item.id === 'task:t-1')) // unaffected source still present
})

test('dismiss suppresses a recommendation from getOverview until its evidence changes, and does not block accepting it directly', async () => {
  const { service, store, approvals } = fixture()
  const before = service.getOverview(now)
  assert.ok(before.recommendations.some(item => item.id === 'task:t-overdue'))

  service.dismiss('task:t-overdue', now)
  const afterDismiss = service.getOverview(now)
  assert.ok(!afterDismiss.recommendations.some(item => item.id === 'task:t-overdue'))
  assert.equal(afterDismiss.suppressedCount, 1)

  // Evidence unchanged: still suppressed on a later read.
  const stillDismissed = service.getOverview(new Date(now.getTime() + 3_600_000))
  assert.ok(!stillDismissed.recommendations.some(item => item.id === 'task:t-overdue'))
  assert.equal(service.listDecisions().find(decision => decision.id === 'task:t-overdue')?.state, 'dismissed')

  // restore() clears the decision and it reappears immediately.
  service.restore('task:t-overdue')
  assert.ok(service.getOverview(now).recommendations.some(item => item.id === 'task:t-overdue'))

  // Accepting requests approval; nothing is written until it is granted and executed.
  const approval = service.accept('task:t-overdue', {}, now)!
  assert.equal(approval.state, 'pending')
  assert.equal(store.read<Task[]>(storageKeys.tasks, []).find(task => task.id === 't-overdue')?.priority, 'low') // not yet applied
  approvals.decide(approval.id, 'approved')
  await approvals.executeApproved(approval.id)
  assert.equal(store.read<Task[]>(storageKeys.tasks, []).find(task => task.id === 't-overdue')?.priority, 'high')

  // The task is now high priority and not due/overdue-triggering-a-bump path applies: the recommendation's evidence has changed accordingly.
  const afterAccept = service.getOverview(now).recommendations.find(item => item.id === 'task:t-overdue')
  assert.deepEqual(afterAccept?.effect, { type: 'navigate' })
})

test('defer suppresses a recommendation until the defer window elapses', () => {
  const { service } = fixture()
  service.defer('task:t-overdue', now, 1)
  assert.ok(!service.getOverview(now).recommendations.some(item => item.id === 'task:t-overdue'))
  assert.ok(!service.getOverview(new Date(now.getTime() + 30 * 60_000)).recommendations.some(item => item.id === 'task:t-overdue'))
  assert.ok(service.getOverview(new Date(now.getTime() + 2 * 3_600_000)).recommendations.some(item => item.id === 'task:t-overdue'))
})

test('accepting a create-task recommendation requests approval and only creates the task once executed', async () => {
  const { service, store, approvals } = fixture()
  const approval = service.accept('goal-next-action:g-1', {}, now)!
  assert.equal(approval.state, 'pending')
  assert.equal(store.read<Task[]>(storageKeys.tasks, []).some(task => task.id === 'next-action-goal-next-action:g-1'), false)
  approvals.decide(approval.id, 'approved')
  await approvals.executeApproved(approval.id)
  const created = store.read<Task[]>(storageKeys.tasks, []).find(task => task.id === 'next-action-goal-next-action:g-1')
  assert.ok(created)
  assert.equal(created?.title, 'Define next action for Ship the SaaS')
})

test('editing overrides the title of a create-task recommendation before it is created', async () => {
  const { service, store, approvals } = fixture()
  const approval = service.accept('goal-next-action:g-1', { title: 'Custom follow-up title' }, now)!
  approvals.decide(approval.id, 'approved')
  await approvals.executeApproved(approval.id)
  const created = store.read<Task[]>(storageKeys.tasks, []).find(task => task.id === 'next-action-goal-next-action:g-1')
  assert.equal(created?.title, 'Custom follow-up title')
})

test('a weekly-review-sourced recommendation delegates accept/dismiss to WeeklyReviewService instead of using a local decision record', async () => {
  const { service, weeklyPriorityId, reviewId } = fixture()
  const id = `weekly-review:${reviewId}:${weeklyPriorityId}`
  assert.ok(service.getOverview(now).recommendations.some(item => item.id === id))

  const approval = service.accept(id, {}, now)!
  assert.equal(approval.state, 'pending')
  assert.equal(approval.correlationId, `${reviewId}:${weeklyPriorityId}`)
  // The underlying priority moved to 'awaiting-approval' immediately, so it no longer appears as a candidate - no NextAction decision needed.
  assert.ok(!service.getOverview(now).recommendations.some(item => item.id === id))
  assert.equal(service.listDecisions().some(decision => decision.id === id), false)
})

test('dismissing a weekly-review-sourced recommendation delegates to WeeklyReviewService.dismissPriority', () => {
  const { service, weeklyPriorityId, reviewId } = fixture()
  const id = `weekly-review:${reviewId}:${weeklyPriorityId}`
  service.dismiss(id, now)
  assert.ok(!service.getOverview(now).recommendations.some(item => item.id === id))
  assert.equal(service.listDecisions().some(decision => decision.id === id), false) // delegated, not locally recorded
})

test('accept returns undefined for a navigate-only recommendation - there is nothing to approve - and for an unknown id', () => {
  const { service } = fixture()
  const navigateOnly = service.getOverview(now).recommendations.find(item => item.id === 'task:t-navigate')
  assert.deepEqual(navigateOnly?.effect, { type: 'navigate' })
  assert.equal(service.accept('task:t-navigate', {}, now), undefined)
  assert.equal(service.accept('does-not-exist', {}, now), undefined)
})
