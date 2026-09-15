import type { TaskDomain, TaskPriority } from './task'

export type RoutineKind = 'morning' | 'evening' | 'weekly' | 'household' | 'content' | 'custom'
export type RoutineStepIntegration = 'task' | 'habit' | 'automation' | 'manual'
export type RoutineStepStatus = 'pending' | 'done' | 'skipped' | 'awaiting-approval'
export type RoutineInstanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'partial' | 'missed'

/** Which local dates (YYYY-MM-DD) a routine recurs on. Mirrors AutomationSchedule's cadence shape without embedding a time-of-day, since routines model that separately as an optional time window. */
export type RoutineCadence =
  | { type: 'daily' }
  | { type: 'weekly'; weekdays: number[] }
  | { type: 'custom'; intervalDays: number; anchorDate: string }

/** Local "HH:MM" 24-hour bounds a routine instance is expected to run within. */
export interface RoutineTimeWindow { start: string; end: string }

export interface RoutineStepDefinition {
  id: string
  title: string
  integration: RoutineStepIntegration
  /** Reuses an existing Task by id when integration is 'task'. */
  taskId?: string
  /** Creates a task from this template the first time the step completes, when no taskId is linked. */
  taskTemplate?: { title: string; domain: TaskDomain; priority: TaskPriority }
  /** Reuses an existing Habit by id when integration is 'habit'. */
  habitId?: string
  /** Reuses an existing Automation by id when integration is 'automation'. */
  automationId?: string
  automationAction?: string
}

export interface RoutineDefinition {
  id: string
  name: string
  kind: RoutineKind
  description: string
  cadence: RoutineCadence
  timeWindow?: RoutineTimeWindow
  steps: RoutineStepDefinition[]
  enabled: boolean
}

export interface RoutineStepRun {
  stepId: string
  title: string
  integration: RoutineStepIntegration
  status: RoutineStepStatus
  completedAt?: string
  approvalId?: string
}

export interface RoutineInstance {
  id: string
  routineId: string
  routineName: string
  kind: RoutineKind
  /** Local occurrence date (YYYY-MM-DD) this instance was scheduled for. */
  date: string
  status: RoutineInstanceStatus
  /** ISO instant after which an incomplete instance is considered missed/partial. */
  windowEnd: string
  startedAt?: string
  completedAt?: string
  steps: RoutineStepRun[]
}

export interface RoutineData { routines: RoutineDefinition[]; instances: RoutineInstance[] }
