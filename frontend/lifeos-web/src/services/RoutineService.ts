import type { AutomationRun } from '../models/automation.ts'
import type { Habit, HabitData } from '../models/habit.ts'
import type { RoutineCadence, RoutineData, RoutineDefinition, RoutineInstance, RoutineInstanceStatus, RoutineStepDefinition, RoutineStepRun, RoutineTimeWindow } from '../models/routine.ts'
import type { Task, TaskData } from '../models/task.ts'
import type { LocalStore } from '../storage/LocalStore.ts'
import { localStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'
import { routineMockData } from '../data/routineMockData.ts'
import { queueAutomationAction } from './ApprovalGates.ts'
import type { ApprovalService } from './ApprovalService.ts'

const dayMs = 86_400_000
const localDateKey = (date: Date) => date.toISOString().slice(0, 10)

/** Pure recurrence check: does this cadence produce an occurrence on this local date? */
export function isCadenceDueOn(cadence: RoutineCadence, date: string): boolean {
  if (cadence.type === 'daily') return true
  if (cadence.type === 'weekly') return cadence.weekdays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())
  const elapsed = Math.round((Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${cadence.anchorDate}T00:00:00.000Z`)) / dayMs)
  return elapsed >= 0 && elapsed % cadence.intervalDays === 0
}

/** The instant after which an instance still incomplete counts as missed/partial rather than scheduled/in-progress. */
export function windowEndFor(date: string, timeWindow?: RoutineTimeWindow): string {
  return `${date}T${timeWindow?.end ?? '23:59'}:00.000Z`
}

/** Deterministic per-recurrence id: at most one instance can ever exist for a given routine+date pair. */
export function instanceIdFor(routineId: string, date: string) { return `${routineId}--${date}` }

/** Pure status derivation so duplicate-prevention and missed/partial detection are unit-testable without storage. */
export function deriveInstanceStatus(steps: RoutineStepRun[], now: Date, windowEnd: string): RoutineInstanceStatus {
  const total = steps.length
  const finished = steps.filter(step => step.status === 'done' || step.status === 'skipped').length
  if (total > 0 && finished === total) return 'completed'
  if (now.toISOString() > windowEnd) return finished > 0 ? 'partial' : 'missed'
  return steps.some(step => step.status !== 'pending') ? 'in-progress' : 'scheduled'
}

export interface RoutineDependencies {
  tasks: { getTaskData(): TaskData }
  habits: { getHabitData(): HabitData }
  automationHistory: { save(run: AutomationRun): void }
}

/**
 * Composes routine definitions and their recurring instances on top of existing Task,
 * Habit, and Automation data. Automation steps go through the same approval gate as
 * other automation-originated mutations (ApprovalGates.queueAutomationAction); task and
 * habit steps mutate local storage directly, matching the direct-completion convention
 * already used by TasksPage and HabitsPage.
 */
export class RoutineService {
  private readonly services: RoutineDependencies
  private readonly approvals: ApprovalService
  private readonly store: LocalStore
  private readonly seedRoutines: RoutineDefinition[]

  constructor(services: RoutineDependencies, approvals: ApprovalService, store: LocalStore = localStore, seedRoutines: RoutineDefinition[] = routineMockData.routines) {
    this.services = services
    this.approvals = approvals
    this.store = store
    this.seedRoutines = seedRoutines
  }

  listRoutines(): RoutineDefinition[] { return this.store.read<RoutineDefinition[]>(storageKeys.routines, this.seedRoutines) }
  getRoutine(id: string) { return this.listRoutines().find(routine => routine.id === id) }
  private saveRoutines(routines: RoutineDefinition[]) { this.store.write(storageKeys.routines, routines) }

  createRoutine(input: Omit<RoutineDefinition, 'id'> & { id?: string }): RoutineDefinition {
    const routines = this.listRoutines()
    const id = input.id ?? `routine-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
    if (routines.some(routine => routine.id === id)) throw new Error(`Routine already exists: ${id}`)
    const routine: RoutineDefinition = { ...input, id }
    this.saveRoutines([...routines, routine])
    return routine
  }

  updateRoutine(id: string, patch: Partial<Omit<RoutineDefinition, 'id'>>): RoutineDefinition | undefined {
    const routines = this.listRoutines()
    let updated: RoutineDefinition | undefined
    const next = routines.map(routine => {
      if (routine.id !== id) return routine
      updated = { ...routine, ...patch }
      return updated
    })
    if (updated) this.saveRoutines(next)
    return updated
  }

  setRoutineEnabled(id: string, enabled: boolean) { return this.updateRoutine(id, { enabled }) }

  private readInstances(): RoutineInstance[] { return this.store.read<RoutineInstance[]>(storageKeys.routineInstances, []) }
  private saveInstances(instances: RoutineInstance[]) { this.store.write(storageKeys.routineInstances, instances) }

  private refreshStatuses(instances: RoutineInstance[], now: Date): RoutineInstance[] {
    let changed = false
    const next = instances.map(instance => {
      if (instance.status === 'completed') return instance
      const status = deriveInstanceStatus(instance.steps, now, instance.windowEnd)
      if (status === instance.status) return instance
      changed = true
      return { ...instance, status }
    })
    if (changed) this.saveInstances(next)
    return next
  }

  listInstances(filter: { routineId?: string; date?: string } = {}, now = new Date()): RoutineInstance[] {
    return this.refreshStatuses(this.readInstances(), now)
      .filter(instance => (!filter.routineId || instance.routineId === filter.routineId) && (!filter.date || instance.date === filter.date))
      .sort((a, b) => b.date.localeCompare(a.date) || a.routineName.localeCompare(b.routineName))
  }

  getInstance(id: string, now = new Date()) { return this.refreshStatuses(this.readInstances(), now).find(instance => instance.id === id) }

  getRoutineData(now = new Date()): RoutineData { return { routines: this.listRoutines(), instances: this.listInstances({}, now) } }

  /** Creates any due-and-missing instances for `now`'s local date. Idempotent: calling this repeatedly for the same date never creates a second instance for the same routine (duplicate-prevention). */
  ensureScheduledInstances(now = new Date()): RoutineInstance[] {
    const date = localDateKey(now)
    const existing = this.readInstances()
    const created: RoutineInstance[] = []
    for (const routine of this.listRoutines()) {
      if (!routine.enabled || !isCadenceDueOn(routine.cadence, date)) continue
      const id = instanceIdFor(routine.id, date)
      if (existing.some(instance => instance.id === id) || created.some(instance => instance.id === id)) continue
      const windowEnd = windowEndFor(date, routine.timeWindow)
      const steps: RoutineStepRun[] = routine.steps.map(step => ({ stepId: step.id, title: step.title, integration: step.integration, status: 'pending' }))
      created.push({ id, routineId: routine.id, routineName: routine.name, kind: routine.kind, date, status: deriveInstanceStatus(steps, now, windowEnd), windowEnd, steps })
    }
    if (created.length) this.saveInstances([...existing, ...created])
    return created
  }

  startInstance(id: string, now = new Date()): RoutineInstance | undefined {
    return this.updateInstance(id, instance => instance.status === 'scheduled' ? { ...instance, status: 'in-progress', startedAt: instance.startedAt ?? now.toISOString() } : instance, now)
  }

  skipStep(instanceId: string, stepId: string, now = new Date()): RoutineInstance | undefined {
    return this.updateInstance(instanceId, instance => {
      if (!instance.steps.some(step => step.stepId === stepId && step.status === 'pending')) return instance
      return { ...instance, startedAt: instance.startedAt ?? now.toISOString(), steps: instance.steps.map(step => step.stepId === stepId ? { ...step, status: 'skipped' as const, completedAt: now.toISOString() } : step) }
    }, now)
  }

  completeStep(instanceId: string, stepId: string, now = new Date()): RoutineInstance | undefined {
    const instance = this.readInstances().find(item => item.id === instanceId)
    const routine = instance && this.getRoutine(instance.routineId)
    const stepDef = routine?.steps.find(step => step.id === stepId)
    const stepRun = instance?.steps.find(step => step.stepId === stepId)
    if (!instance || !routine || !stepDef || !stepRun || stepRun.status === 'done' || stepRun.status === 'skipped' || stepRun.status === 'awaiting-approval') return instance

    if (stepDef.integration === 'automation') {
      const approval = queueAutomationAction(this.approvals, { automationId: stepDef.automationId ?? 'unknown', action: stepDef.automationAction ?? 'run', runId: `${instanceId}:${stepId}` }, () => this.finalizeAutomationStep(instanceId, stepId))
      return this.updateInstance(instanceId, current => ({ ...current, startedAt: current.startedAt ?? now.toISOString(), steps: current.steps.map(step => step.stepId === stepId ? { ...step, status: 'awaiting-approval' as const, approvalId: approval.id } : step) }), now)
    }

    if (stepDef.integration === 'task') this.completeTaskStep(instanceId, stepDef, now)
    else if (stepDef.integration === 'habit') this.completeHabitStep(stepDef, now)

    return this.updateInstance(instanceId, current => ({ ...current, startedAt: current.startedAt ?? now.toISOString(), steps: current.steps.map(step => step.stepId === stepId ? { ...step, status: 'done' as const, completedAt: now.toISOString() } : step) }), now)
  }

  private finalizeAutomationStep(instanceId: string, stepId: string, now = new Date()) {
    const updated = this.updateInstance(instanceId, current => ({ ...current, steps: current.steps.map(step => step.stepId === stepId ? { ...step, status: 'done' as const, completedAt: now.toISOString() } : step) }), now)
    const step = updated?.steps.find(item => item.stepId === stepId)
    if (!updated || !step) return
    this.services.automationHistory.save({ id: `routine-${instanceId}-${stepId}`, automationId: step.title, automationName: step.title, trigger: 'Manual', correlationId: `${instanceId}:${stepId}`, startedAt: now.toISOString(), endedAt: now.toISOString(), durationMs: 0, status: 'completed', outputSummary: `Completed as part of routine "${updated.routineName}".`, retryCount: 0, relatedLinks: [{ label: 'Open Routines', href: '#/routines' }] })
  }

  private completeTaskStep(instanceId: string, step: RoutineStepDefinition, now: Date) {
    const tasks = this.store.read<Task[]>(storageKeys.tasks, this.services.tasks.getTaskData().tasks)
    if (step.taskId) { this.store.write(storageKeys.tasks, tasks.map(task => task.id === step.taskId ? { ...task, status: 'completed' as const } : task)); return }
    if (!step.taskTemplate) return
    const id = `routine-task-${instanceId}-${step.id}`
    if (tasks.some(task => task.id === id)) return
    const task: Task = { id, title: step.taskTemplate.title, domain: step.taskTemplate.domain, priority: step.taskTemplate.priority, status: 'completed', dueDate: localDateKey(now), source: 'Routines' }
    this.store.write(storageKeys.tasks, [...tasks, task])
  }

  private completeHabitStep(step: RoutineStepDefinition, now: Date) {
    if (!step.habitId) return
    const habits = this.store.read<Habit[]>(storageKeys.habits, this.services.habits.getHabitData().habits)
    const today = localDateKey(now)
    this.store.write(storageKeys.habits, habits.map(habit => habit.id === step.habitId && !habit.completedDates.includes(today) ? { ...habit, completedDates: [...habit.completedDates, today], streak: habit.streak + 1 } : habit))
  }

  private updateInstance(id: string, update: (instance: RoutineInstance) => RoutineInstance, now: Date): RoutineInstance | undefined {
    const instances = this.refreshStatuses(this.readInstances(), now)
    let changed: RoutineInstance | undefined
    const next = instances.map(instance => {
      if (instance.id !== id) return instance
      const updatedInstance = update(instance)
      const status = deriveInstanceStatus(updatedInstance.steps, now, updatedInstance.windowEnd)
      changed = { ...updatedInstance, status, completedAt: status === 'completed' ? (updatedInstance.completedAt ?? now.toISOString()) : updatedInstance.completedAt }
      return changed
    })
    if (changed) this.saveInstances(next)
    return changed
  }
}
