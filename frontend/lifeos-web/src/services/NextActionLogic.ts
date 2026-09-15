import type { CalendarData, CalendarEvent } from '../models/calendar.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { Goal, GoalData, GoalKpi, KpiData } from '../models/goal.ts'
import type { NextActionDecision, NextActionRecommendation, RecommendationEvidence, RecommendationPriority } from '../models/nextAction.ts'
import type { PlanningOverview, ProjectDependency } from '../models/planning.ts'
import type { Project, ProjectData } from '../models/project.ts'
import type { RoutineInstance } from '../models/routine.ts'
import type { Task, TaskData, TaskPriority } from '../models/task.ts'
import type { WeeklyReview } from '../models/weeklyReview.ts'
import { computeChecksum } from './BackupLogic.ts'
import { kpiProgress, kpiTrend } from './KpiService.ts'

/**
 * Pure next-action ranking/derivation, mirroring PlanningLogic.ts and BackupLogic.ts: no storage,
 * no approvals, no network. Every candidate is derived read-only from data other services already
 * expose (PlanningService.getOverview for project/goal next-action status, RoutineService instances,
 * KpiService's own progress/trend helpers, WeeklyReviewService's proposed priorities, and
 * DailyBriefService's composed notification-driven action) - this module never recomputes staleness,
 * blocking, or health logic that already lives elsewhere.
 */

export interface NextActionSources {
  tasks: TaskData
  goals: GoalData
  projects: ProjectData
  planning: PlanningOverview
  dependencies: ProjectDependency[]
  calendar: CalendarData
  /** Today's routine instances only (matches CompositeDailyBriefService's own routines usage). */
  routines: RoutineInstance[]
  kpis: KpiData
  /** The most recent Weekly Review, if any. */
  weeklyReview?: WeeklyReview
  /** Optional: only the notification-driven top action is reused, as a single "system signal" candidate. */
  dailyBrief?: DailyBriefData
}

const priorityWeight: Record<TaskPriority, number> = { high: 50, medium: 30, low: 15 }

function daysUntil(dateStr: string | undefined, today: string): number | undefined {
  if (!dateStr) return undefined
  return Math.round((Date.parse(`${dateStr}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000)
}

function dueBonus(days: number | undefined): number {
  if (days === undefined) return 0
  if (days < 0) return 30
  if (days === 0) return 20
  if (days <= 3) return 10
  return 0
}

function clampScore(score: number): number { return Math.max(0, Math.min(100, Math.round(score))) }

/** Score buckets are intentionally coarse and stable so small day-to-day score drift doesn't itself change a recommendation's displayed priority tier. */
export function priorityLabel(score: number): RecommendationPriority {
  if (score >= 85) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

/** Hashes only the facts a person would actually read (evidence + what accepting would do) - never the score or a timestamp - so a dismissed/deferred recommendation is suppressed until one of those facts genuinely changes. */
function evidenceHashOf(evidence: RecommendationEvidence[], effect: NextActionRecommendation['effect']): string {
  return computeChecksum(JSON.stringify({ evidence, effect }))
}

export function computeTaskCandidates(tasks: Task[], today: string): NextActionRecommendation[] {
  return tasks.filter(task => task.status !== 'completed').map(task => {
    const days = daysUntil(task.dueDate, today)
    const score = clampScore(priorityWeight[task.priority] + dueBonus(days))
    const evidence: RecommendationEvidence[] = [
      { label: 'Priority', detail: task.priority },
      { label: 'Due date', detail: task.dueDate ? (days !== undefined && days < 0 ? `${task.dueDate} (overdue)` : task.dueDate) : 'No due date' },
      { label: 'Domain', detail: task.domain },
    ]
    const effect: NextActionRecommendation['effect'] = task.priority !== 'high' && days !== undefined && days <= 0
      ? { type: 'bump-task-priority', taskId: task.id, targetPriority: 'high' }
      : { type: 'navigate' }
    const reason = days !== undefined && days < 0 ? `Overdue since ${task.dueDate}` : days === 0 ? 'Due today' : task.dueDate ? `Due ${task.dueDate}` : `${task.priority} priority, no due date`
    return { id: `task:${task.id}`, kind: 'task', title: task.title, reason, route: 'tasks', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

/** Only active, unblocked projects with a deterministic next action (PlanningLogic.computeNextAction, via the overview) are surfaced here - a blocked project's next action isn't actionable yet, so it is represented by computeBlockedProjectCandidates instead. */
export function computeProjectNextActionCandidates(projects: Project[], planning: PlanningOverview, dependencies: ProjectDependency[]): NextActionRecommendation[] {
  const blocked = new Set(planning.blockedProjectIds)
  const criticalIds = new Set(planning.criticalPath.map(step => step.projectId))
  const dependentsCount = new Map<string, number>()
  for (const dependency of dependencies) dependentsCount.set(dependency.dependsOnProjectId, (dependentsCount.get(dependency.dependsOnProjectId) ?? 0) + 1)
  const byId = new Map(projects.map(project => [project.id, project]))
  const out: NextActionRecommendation[] = []
  for (const status of planning.projectStatuses) {
    const project = byId.get(status.projectId)
    if (!project || project.status !== 'active' || !status.nextAction || blocked.has(status.projectId)) continue
    const unblocks = dependentsCount.get(status.projectId) ?? 0
    const onCriticalPath = criticalIds.has(status.projectId)
    let score = 40
    if (status.stale) score += 20
    if (onCriticalPath) score += 15
    score += Math.min(30, unblocks * 15)
    const evidence: RecommendationEvidence[] = [
      { label: 'Next action', detail: status.nextAction.source === 'task' ? `Task: ${status.nextAction.title}` : `Milestone: ${status.nextAction.title}` },
      ...(status.stale ? [{ label: 'Status', detail: `Stale - ${status.staleReasons.join('; ')}` }] : []),
      ...(unblocks ? [{ label: 'Dependents', detail: `Unblocks ${unblocks} project(s) once complete` }] : []),
      ...(onCriticalPath ? [{ label: 'Critical path', detail: 'On the longest active dependency chain' }] : []),
    ]
    const effect: NextActionRecommendation['effect'] = status.nextAction.taskId && status.nextAction.priority !== 'high' ? { type: 'bump-task-priority', taskId: status.nextAction.taskId, targetPriority: 'high' } : { type: 'navigate' }
    const finalScore = clampScore(score)
    out.push({ id: `project-next-action:${project.id}`, kind: 'project-next-action', title: `${project.title}: ${status.nextAction.title}`, reason: status.nextAction.source === 'task' ? 'Next linked task for an active project' : 'Next milestone for an active project', route: 'planning', priority: priorityLabel(finalScore), score: finalScore, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) })
  }
  return out
}

export function computeBlockedProjectCandidates(projects: Project[], planning: PlanningOverview): NextActionRecommendation[] {
  const byId = new Map(projects.map(project => [project.id, project]))
  return planning.projectStatuses.filter(status => status.blockedReasons.length > 0).map(status => {
    const project = byId.get(status.projectId)
    const score = clampScore(25 + status.blockedReasons.length * 5)
    const evidence: RecommendationEvidence[] = status.blockedReasons.map(reason => ({ label: 'Blocker', detail: reason }))
    const effect: NextActionRecommendation['effect'] = { type: 'navigate' }
    return { id: `blocked-project:${status.projectId}`, kind: 'blocked-project', title: `Resolve blocker: ${project?.title ?? status.projectId}`, reason: 'This project cannot proceed until its dependency resolves.', route: 'planning', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

/** Reuses PlanningLogic's own goalsWithoutNextActionIds (via the overview) rather than recomputing goalHasActiveNextAction. */
export function computeGoalCandidates(goals: Goal[], planning: PlanningOverview): NextActionRecommendation[] {
  const byId = new Map(goals.map(goal => [goal.id, goal]))
  const out: NextActionRecommendation[] = []
  for (const goalId of planning.goalsWithoutNextActionIds) {
    const goal = byId.get(goalId)
    if (!goal) continue
    const evidence: RecommendationEvidence[] = [{ label: 'Area', detail: goal.area }, { label: 'Status', detail: 'No active next action across linked projects or milestones' }]
    const effect: NextActionRecommendation['effect'] = { type: 'create-task', title: `Define next action for ${goal.title}`, domain: 'Personal', priority: 'medium' }
    const score = clampScore(35)
    out.push({ id: `goal-next-action:${goal.id}`, kind: 'goal-next-action', title: `Define a next action for "${goal.title}"`, reason: `Active ${goal.area} goal has no linked project or milestone in progress.`, route: 'goals', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) })
  }
  return out
}

export function computeCalendarCandidates(events: CalendarEvent[], today: string): NextActionRecommendation[] {
  return events.filter(event => event.date === today).map(event => {
    const score = clampScore(event.allDay ? 15 : 30)
    const evidence: RecommendationEvidence[] = [{ label: 'Category', detail: event.category }, { label: 'Time', detail: event.allDay ? 'All day' : `${event.startTime ?? '?'}-${event.endTime ?? '?'}` }]
    const effect: NextActionRecommendation['effect'] = { type: 'navigate' }
    return { id: `calendar:${event.id}`, kind: 'calendar', title: event.title, reason: 'Scheduled for today', route: 'calendar', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

export function computeRoutineCandidates(instances: RoutineInstance[]): NextActionRecommendation[] {
  return instances.filter(instance => instance.status === 'missed' || instance.status === 'scheduled').map(instance => {
    const score = clampScore(instance.status === 'missed' ? 45 : 20)
    const evidence: RecommendationEvidence[] = [{ label: 'Status', detail: instance.status }, { label: 'Kind', detail: instance.kind }]
    const effect: NextActionRecommendation['effect'] = { type: 'navigate' }
    return { id: `routine:${instance.id}`, kind: 'routine', title: instance.routineName, reason: instance.status === 'missed' ? "Missed today's window" : 'Not started today', route: 'routines', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

export function computeKpiCandidates(kpis: GoalKpi[]): NextActionRecommendation[] {
  return kpis.filter(kpi => kpi.status !== 'archived' && (kpi.status === 'at-risk' || kpiProgress(kpi) < 60)).map(kpi => {
    const progress = kpiProgress(kpi)
    const score = clampScore(30 + (60 - progress))
    const evidence: RecommendationEvidence[] = [{ label: 'Progress', detail: `${progress}% of target` }, { label: 'Status', detail: kpi.status }, { label: 'Trend', detail: `${kpiTrend(kpi)}% since last snapshot` }]
    const effect: NextActionRecommendation['effect'] = { type: 'navigate' }
    return { id: `kpi:${kpi.id}`, kind: 'kpi', title: `Review KPI: ${kpi.name}`, reason: `${progress}% of target, currently ${kpi.status}`, route: 'kpis', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

/** Delegates entirely to WeeklyReviewService for accept/dismiss (see the model comment on RecommendationEffect); only 'proposed' priorities are candidates, so once a priority is requested/accepted/dismissed there it stops being suggested here without any separate suppression record. */
export function computeWeeklyReviewCandidates(review: WeeklyReview | undefined): NextActionRecommendation[] {
  if (!review) return []
  return review.priorities.filter(priority => priority.state === 'proposed').map(priority => {
    const evidence: RecommendationEvidence[] = [{ label: 'Reason', detail: priority.reason }, { label: 'Week of', detail: review.weekOf }]
    const effect: NextActionRecommendation['effect'] = { type: 'weekly-review-priority', reviewId: review.id, priorityId: priority.id }
    const score = clampScore(50)
    return { id: `weekly-review:${review.id}:${priority.id}`, kind: 'weekly-review', title: priority.title, reason: 'Proposed in the latest Weekly Review', route: 'weekly-review', priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }
  })
}

/** Reuses only the single notification-driven action DailyBriefService already composed (never automations/provider health, and never recomputed) - the one Daily Brief signal that isn't already covered by another candidate source here. */
export function computeSystemSignalCandidates(brief: DailyBriefData | undefined): NextActionRecommendation[] {
  if (!brief) return []
  const notice = brief.actions.find(action => action.id.startsWith('notice-'))
  if (!notice) return []
  const score = clampScore(notice.priority === 'critical' ? 90 : notice.priority === 'high' ? 65 : 40)
  const evidence: RecommendationEvidence[] = [{ label: 'Source', detail: 'Daily Brief' }, { label: 'Reason', detail: notice.reason }]
  const effect: NextActionRecommendation['effect'] = { type: 'navigate' }
  return [{ id: `system-signal:${notice.id}`, kind: 'system-signal', title: notice.title, reason: notice.reason, route: notice.route, priority: priorityLabel(score), score, evidence, effect, evidenceHash: evidenceHashOf(evidence, effect) }]
}

export function computeNextActionCandidates(sources: NextActionSources, now: Date): NextActionRecommendation[] {
  const today = now.toISOString().slice(0, 10)
  return [
    ...computeTaskCandidates(sources.tasks.tasks, today),
    ...computeProjectNextActionCandidates(sources.projects.projects, sources.planning, sources.dependencies),
    ...computeBlockedProjectCandidates(sources.projects.projects, sources.planning),
    ...computeGoalCandidates(sources.goals.goals, sources.planning),
    ...computeCalendarCandidates(sources.calendar.events, today),
    ...computeRoutineCandidates(sources.routines),
    ...computeKpiCandidates(sources.kpis.kpis),
    ...computeWeeklyReviewCandidates(sources.weeklyReview),
    ...computeSystemSignalCandidates(sources.dailyBrief),
  ]
}

/** Deterministic ordering: highest score first, ties broken by id so output never depends on input/array order. */
export function rankRecommendations(candidates: NextActionRecommendation[], limit: number): NextActionRecommendation[] {
  return candidates.slice().sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit))
}

/**
 * Splits candidates into what should currently be shown vs. what a prior dismiss/defer decision
 * still suppresses. A decision only keeps suppressing its recommendation while the recommendation's
 * evidenceHash still matches the hash recorded at decision time (i.e. nothing about why it was
 * recommended has changed) - and, for a deferred decision, only until `deferUntil` passes.
 */
export function applyDecisions(candidates: NextActionRecommendation[], decisions: NextActionDecision[], now: Date): { visible: NextActionRecommendation[]; suppressed: NextActionRecommendation[] } {
  const byId = new Map(decisions.map(decision => [decision.id, decision]))
  const visible: NextActionRecommendation[] = []
  const suppressed: NextActionRecommendation[] = []
  const nowIso = now.toISOString()
  for (const candidate of candidates) {
    const decision = byId.get(candidate.id)
    if (!decision || decision.evidenceHash !== candidate.evidenceHash) { visible.push(candidate); continue }
    if (decision.state === 'dismissed') { suppressed.push(candidate); continue }
    if (decision.deferUntil && decision.deferUntil <= nowIso) { visible.push(candidate); continue }
    suppressed.push(candidate)
  }
  return { visible, suppressed }
}
