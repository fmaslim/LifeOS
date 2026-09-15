import type { TaskPriority } from './task'

/** A typed, user-editable relationship between a Goal and a Project. Purely additive: Goal and Project keep their existing shapes. */
export interface GoalProjectLink { id: string; goalId: string; projectId: string; note?: string; createdAt: string }

/** Records that `projectId` cannot be considered unblocked until `dependsOnProjectId` reaches a completed status. */
export interface ProjectDependency { id: string; projectId: string; dependsOnProjectId: string; reason: string; createdAt: string }

export interface PlanningData { links: GoalProjectLink[]; dependencies: ProjectDependency[] }

export type NextActionSource = 'task' | 'milestone'

/** The single deterministic next step for a project: its earliest incomplete linked task, or failing that its next incomplete milestone. */
export interface NextAction { source: NextActionSource; title: string; taskId?: string; dueDate?: string; priority?: TaskPriority }

export interface ProjectPlanningStatus {
  projectId: string
  nextAction?: NextAction
  blockedReasons: string[]
  stale: boolean
  staleReasons: string[]
}

export interface GoalPlanningStatus { goalId: string; linkedProjectIds: string[]; hasActiveNextAction: boolean }

export interface CriticalPathStep { projectId: string; title: string; targetDate: string }

/** A non-destructive planning suggestion. Accepting one always goes through ApprovalService before any write happens. */
export interface LinkSuggestion { goalId: string; projectId: string; reason: string }

export interface PlanningOverview {
  projectStatuses: ProjectPlanningStatus[]
  goalStatuses: GoalPlanningStatus[]
  criticalPath: CriticalPathStep[]
  blockedProjectIds: string[]
  staleProjectIds: string[]
  goalsWithoutNextActionIds: string[]
  suggestions: LinkSuggestion[]
}
