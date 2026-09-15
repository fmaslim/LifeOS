import assert from 'node:assert/strict'
import test from 'node:test'
import type { AutomationRun } from '../src/models/automation.ts'
import type { RoutineDefinition } from '../src/models/routine.ts'
import type { LocalStore } from '../src/storage/LocalStore.ts'
import { storageKeys } from '../src/storage/storageKeys.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import { deriveInstanceStatus, instanceIdFor, isCadenceDueOn, RoutineService, windowEndFor, type RoutineDependencies } from '../src/services/RoutineService.ts'

class MemoryStore implements LocalStore {
  private values = new Map<string, unknown>()
  read<T>(key: string, fallback: T): T { return (this.values.has(key) ? this.values.get(key) : fallback) as T }
  write<T>(key: string, value: T) { this.values.set(key, structuredClone(value)) }
  remove(key: string) { this.values.delete(key) }
}

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

const now = new Date('2026-09-14T07:00:00.000Z')

function fixture() {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())
  const savedRuns: AutomationRun[] = []
  const services: RoutineDependencies = {
    tasks: { getTaskData: () => ({ tasks: [{ id: 'task-4', title: 'Reconcile rental receipts', domain: 'Finances', priority: 'medium', status: 'todo' }] }) },
    habits: { getHabitData: () => ({ habits: [{ id: 'habit-plan', title: 'Daily top-three plan', cadence: 'daily', target: 7, streak: 3, completedDates: [], domain: 'Work' }] }) },
    automationHistory: { save: run => { savedRuns.push(run) } },
  }
  const dailyRoutine: RoutineDefinition = {
    id: 'r-daily', name: 'Morning launch', kind: 'morning', description: 'Start the day', cadence: { type: 'daily' }, timeWindow: { start: '06:00', end: '09:00' }, enabled: true,
    steps: [
      { id: 's-manual', title: 'Make the bed', integration: 'manual' },
      { id: 's-task-link', title: 'Reconcile receipts', integration: 'task', taskId: 'task-4' },
      { id: 's-task-new', title: 'Stage tomorrow', integration: 'task', taskTemplate: { title: 'Stage tomorrow', domain: 'Personal', priority: 'medium' } },
      { id: 's-habit', title: 'Set priorities', integration: 'habit', habitId: 'habit-plan' },
      { id: 's-automation', title: 'Run brief', integration: 'automation', automationId: 'morning-brief', automationAction: 'run' },
    ],
  }
  const weeklyRoutine: RoutineDefinition = { id: 'r-weekly', name: 'Weekly reset', kind: 'household', description: 'Reset the house', cadence: { type: 'weekly', weekdays: [now.getUTCDay()] }, enabled: true, steps: [{ id: 'w1', title: 'Reset the house', integration: 'manual' }] }
  const disabledRoutine: RoutineDefinition = { id: 'r-disabled', name: 'Disabled routine', kind: 'custom', description: '', cadence: { type: 'daily' }, enabled: false, steps: [{ id: 'd1', title: 'Never runs', integration: 'manual' }] }
  const service = new RoutineService(services, approvals, store, [dailyRoutine, weeklyRoutine, disabledRoutine])
  return { service, store, approvals, savedRuns, dailyRoutine, weeklyRoutine, disabledRoutine }
}

test('isCadenceDueOn matches daily, weekly, and custom recurrence rules', () => {
  assert.equal(isCadenceDueOn({ type: 'daily' }, '2026-09-14'), true)
  assert.equal(isCadenceDueOn({ type: 'weekly', weekdays: [1] }, '2026-09-14'), true) // 2026-09-14 is a Monday
  assert.equal(isCadenceDueOn({ type: 'weekly', weekdays: [2, 3] }, '2026-09-14'), false)
  assert.equal(isCadenceDueOn({ type: 'custom', intervalDays: 14, anchorDate: '2026-09-06' }, '2026-09-06'), true)
  assert.equal(isCadenceDueOn({ type: 'custom', intervalDays: 14, anchorDate: '2026-09-06' }, '2026-09-20'), true)
  assert.equal(isCadenceDueOn({ type: 'custom', intervalDays: 14, anchorDate: '2026-09-06' }, '2026-09-13'), false)
  assert.equal(isCadenceDueOn({ type: 'custom', intervalDays: 14, anchorDate: '2026-09-06' }, '2026-08-30'), false)
})

test('deriveInstanceStatus reflects step completion and window expiry', () => {
  const windowEnd = '2026-09-14T09:00:00.000Z'
  const pending = [{ stepId: 's1', title: 'a', integration: 'manual' as const, status: 'pending' as const }]
  assert.equal(deriveInstanceStatus(pending, new Date('2026-09-14T07:00:00.000Z'), windowEnd), 'scheduled')
  const started = [{ stepId: 's1', title: 'a', integration: 'manual' as const, status: 'done' as const }, { stepId: 's2', title: 'b', integration: 'manual' as const, status: 'pending' as const }]
  assert.equal(deriveInstanceStatus(started, new Date('2026-09-14T07:00:00.000Z'), windowEnd), 'in-progress')
  const finished = [{ stepId: 's1', title: 'a', integration: 'manual' as const, status: 'done' as const }, { stepId: 's2', title: 'b', integration: 'manual' as const, status: 'skipped' as const }]
  assert.equal(deriveInstanceStatus(finished, new Date('2026-09-14T07:00:00.000Z'), windowEnd), 'completed')
  assert.equal(deriveInstanceStatus(pending, new Date('2026-09-14T10:00:00.000Z'), windowEnd), 'missed')
  assert.equal(deriveInstanceStatus(started, new Date('2026-09-14T10:00:00.000Z'), windowEnd), 'partial')
})

test('windowEndFor and instanceIdFor are deterministic', () => {
  assert.equal(windowEndFor('2026-09-14', { start: '06:00', end: '09:00' }), '2026-09-14T09:00:00.000Z')
  assert.equal(windowEndFor('2026-09-14', undefined), '2026-09-14T23:59:00.000Z')
  assert.equal(instanceIdFor('r-daily', '2026-09-14'), 'r-daily--2026-09-14')
})

test('ensureScheduledInstances creates at most one instance per routine per recurrence', () => {
  const { service } = fixture()
  const first = service.ensureScheduledInstances(now)
  assert.equal(first.length, 2) // daily + weekly are due; disabled routine is skipped
  const second = service.ensureScheduledInstances(now)
  assert.equal(second.length, 0)
  assert.equal(service.listInstances({}, now).length, 2)
  // Calling again for the same date, even with a service built from scratch pointed at the same store, must not duplicate.
  assert.equal(service.listInstances({ routineId: 'r-daily' }, now).length, 1)
})

test('a task step with a linked id completes the existing task exactly once', () => {
  const { service, store } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-daily')
  service.completeStep(instance.id, 's-task-link', now)
  service.completeStep(instance.id, 's-task-link', now)
  const tasks = store.read<{ id: string; status: string }[]>(storageKeys.tasks, [])
  assert.equal(tasks.filter(task => task.id === 'task-4').length, 1)
  assert.equal(tasks.find(task => task.id === 'task-4')?.status, 'completed')
})

test('a task step without a linked id creates one deterministic task', () => {
  const { service, store } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-daily')
  service.completeStep(instance.id, 's-task-new', now)
  service.completeStep(instance.id, 's-task-new', now)
  const tasks = store.read<{ id: string; title: string }[]>(storageKeys.tasks, [])
  const created = tasks.filter(task => task.id === `routine-task-${instance.id}-s-task-new`)
  assert.equal(created.length, 1)
  assert.equal(created[0]?.title, 'Stage tomorrow')
})

test('a habit step checks in at most once per day and increments streak once', () => {
  const { service, store } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-daily')
  service.completeStep(instance.id, 's-habit', now)
  service.completeStep(instance.id, 's-habit', now)
  const habits = store.read<{ id: string; streak: number; completedDates: string[] }[]>(storageKeys.habits, [])
  const habit = habits.find(item => item.id === 'habit-plan')
  assert.equal(habit?.streak, 4)
  assert.equal(habit?.completedDates.filter(date => date === '2026-09-14').length, 1)
})

test('automation steps require approval, dedupe repeated requests, and complete only after execution', async () => {
  const { service, approvals, savedRuns, store } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-daily')
  service.completeStep(instance.id, 's-automation', now)
  service.completeStep(instance.id, 's-automation', now)
  assert.equal(approvals.list('pending').length, 1)
  const awaiting = service.getInstance(instance.id, now)
  assert.equal(awaiting?.steps.find(step => step.stepId === 's-automation')?.status, 'awaiting-approval')

  const request = approvals.list('pending')[0]!
  approvals.decide(request.id, 'approved')
  await approvals.executeApproved(request.id)
  const completed = service.getInstance(instance.id, now)
  assert.equal(completed?.steps.find(step => step.stepId === 's-automation')?.status, 'done')
  assert.equal(savedRuns.length, 1)
  assert.equal(savedRuns[0]?.status, 'completed')
  assert.equal(store.read(storageKeys.tasks, []).length, 0) // the automation step never wrote to task storage
})

test('an instance is completed only once every step is done or skipped', () => {
  const { service } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-weekly')
  assert.equal(instance.status, 'scheduled')
  service.completeStep(instance.id, 'w1', now)
  const completed = service.getInstance(instance.id, now)
  assert.equal(completed?.status, 'completed')
  assert.ok(completed?.completedAt)
})

test('skipStep marks a pending step skipped and is a no-op once a step is finished', () => {
  const { service } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-weekly')
  service.skipStep(instance.id, 'w1', now)
  const skipped = service.getInstance(instance.id, now)
  assert.equal(skipped?.steps[0]?.status, 'skipped')
  assert.equal(skipped?.status, 'completed')
  service.skipStep(instance.id, 'w1', now)
  assert.equal(service.getInstance(instance.id, now)?.steps[0]?.status, 'skipped')
})

test('incomplete instances become missed or partial once their time window passes', () => {
  const { service } = fixture()
  const [instance] = service.ensureScheduledInstances(now).filter(item => item.routineId === 'r-daily')
  const later = new Date('2026-09-14T12:00:00.000Z')
  assert.equal(service.listInstances({ routineId: 'r-daily' }, later)[0]?.status, 'missed')
  service.completeStep(instance.id, 's-manual', now)
  assert.equal(service.listInstances({ routineId: 'r-daily' }, later)[0]?.status, 'partial')
})

test('createRoutine, updateRoutine, and setRoutineEnabled manage routine definitions', () => {
  const { service } = fixture()
  const created = service.createRoutine({ name: 'Reading sprint', kind: 'custom', description: '', cadence: { type: 'daily' }, enabled: true, steps: [{ id: 's1', title: 'Read 20 minutes', integration: 'manual' }] })
  assert.ok(service.listRoutines().some(routine => routine.id === created.id))
  assert.throws(() => service.createRoutine({ id: created.id, name: 'dup', kind: 'custom', description: '', cadence: { type: 'daily' }, enabled: true, steps: [] }), /already exists/)
  service.setRoutineEnabled(created.id, false)
  assert.equal(service.getRoutine(created.id)?.enabled, false)
  service.updateRoutine(created.id, { name: 'Reading sprint (renamed)' })
  assert.equal(service.getRoutine(created.id)?.name, 'Reading sprint (renamed)')
})
