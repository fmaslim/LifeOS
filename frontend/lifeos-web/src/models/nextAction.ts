import type { RouteName } from './shell'
import type { TaskDomain, TaskPriority } from './task'

/** Which existing domain a candidate recommendation was derived from. Purely descriptive; drives icon/labeling in the UI. */
export type NextActionKind =
  | 'task'
  | 'project-next-action'
  | 'blocked-project'
  | 'goal-next-action'
  | 'calendar'
  | 'routine'
  | 'kpi'
  | 'weekly-review'
  | 'system-signal'

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

/** One labeled fact backing a recommendation's score. Rendered verbatim in the UI so a recommendation is never a black box. */
export interface RecommendationEvidence { label: string; detail: string }

/**
 * What accepting a recommendation would do. `navigate` never mutates anything - the recommendation
 * only points somewhere the user can already act directly (e.g. the Routines page for a missed
 * routine). The other three always require explicit approval through ApprovalService before any
 * write happens, except `weekly-review-priority`, which delegates entirely to
 * WeeklyReviewService.requestPriority - that service already owns its own approval-gated flow, so
 * this recommendation type never runs approval logic of its own.
 */
export type RecommendationEffect =
  | { type: 'navigate' }
  | { type: 'bump-task-priority'; taskId: string; targetPriority: TaskPriority }
  | { type: 'create-task'; title: string; domain: TaskDomain; priority: TaskPriority }
  | { type: 'weekly-review-priority'; reviewId: string; priorityId: string }

export interface NextActionRecommendation {
  id: string
  kind: NextActionKind
  title: string
  reason: string
  route: RouteName
  priority: RecommendationPriority
  score: number
  evidence: RecommendationEvidence[]
  effect: RecommendationEffect
  /** Deterministic hash of this recommendation's evidence + effect. Compared against a stored decision's hash on every read so a dismissed/deferred recommendation only resurfaces once its underlying signals actually change. */
  evidenceHash: string
}

export type NextActionDecisionState = 'deferred' | 'dismissed'

/** A persisted user decision to suppress a recommendation. Never itself a task/goal/project mutation. */
export interface NextActionDecision {
  id: string
  state: NextActionDecisionState
  evidenceHash: string
  decidedAt: string
  /** Only set for deferred decisions: the recommendation resurfaces once `now >= deferUntil`, even with unchanged evidence. */
  deferUntil?: string
}

export interface NextActionOverview {
  recommendations: NextActionRecommendation[]
  generatedAt: string
  warnings: string[]
  suppressedCount: number
}
