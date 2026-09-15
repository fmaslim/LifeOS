import type { ApprovalRequest } from '../models/approval.ts'
import type { CalendarData } from '../models/calendar.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { GoalData, KpiData } from '../models/goal.ts'
import type { NextActionDecision, NextActionOverview, NextActionRecommendation } from '../models/nextAction.ts'
import type { PlanningOverview, ProjectDependency } from '../models/planning.ts'
import type { ProjectData } from '../models/project.ts'
import type { RoutineInstance } from '../models/routine.ts'
import type { Task, TaskData, TaskDomain, TaskPriority } from '../models/task.ts'
import type { WeeklyReview } from '../models/weeklyReview.ts'
import type { ApprovalService } from './ApprovalService.ts'
import { applyDecisions, computeNextActionCandidates, rankRecommendations, type NextActionSources } from './NextActionLogic.ts'
import type { LocalStore } from '../storage/LocalStore.ts'
import { localStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'

export interface NextActionDependencies {
  tasks: { getTaskData(): TaskData }
  goals: { getGoalData(): GoalData }
  projects: { getProjectData(): ProjectData }
  planning: { getOverview(now?: Date): PlanningOverview; listDependencies(): ProjectDependency[] }
  calendar: { getCalendarData(): CalendarData }
  /** Only today's instances are read, matching CompositeDailyBriefService's own usage. */
  routines: { listInstances(filter?: { date?: string }): RoutineInstance[] }
  kpis: { getKpiData(): KpiData }
  weeklyReview: { list(): WeeklyReview[]; requestPriority(reviewId: string, priorityId: string): ApprovalRequest | undefined; dismissPriority(reviewId: string, priorityId: string): WeeklyReview | undefined; editPriority(reviewId: string, priorityId: string, title: string): WeeklyReview | undefined }
  /** Optional so this service degrades gracefully wherever a caller doesn't wire Daily Brief in (e.g. focused tests). */
  dailyBrief?: { getDailyBrief(now?: Date): DailyBriefData }
}

export interface AcceptOverrides { title?: string; priority?: TaskPriority }

const safeMessage = (label: string) => `${label} was unavailable; recommendations continued without it.`

/**
 * Deterministic, provider-free next-action recommendations composed entirely from other LifeOS
 * services' already-computed state (PlanningService.getOverview for project/goal next-action,
 * blocked, and critical-path status; RoutineService's today's instances; KpiService's own
 * progress/trend helpers; WeeklyReviewService's proposed priorities; DailyBriefService's
 * notification-driven action). See NextActionLogic.ts for the pure scoring/ranking.
 *
 * Every source read is individually isolated: a broken/throwing dependency drops that source's
 * candidates and records a warning rather than failing the whole recommendation list, so this
 * always returns a bounded ranked list even when part of the app is degraded - the same
 * "deterministic fallback" contract WeeklyReviewService.run's `safe()` helper implements.
 *
 * Accepting a recommendation never writes anything directly: it always goes through
 * ApprovalService (mirroring PlanningService.requestLinkSuggestion / BackupService.requestRestore),
 * except weekly-review-sourced recommendations, which delegate entirely to
 * WeeklyReviewService.requestPriority/dismissPriority/editPriority instead of re-implementing that
 * service's own approval flow. Dismiss/defer are persisted locally (storageKeys.nextActionDecisions)
 * as an evidence-hash-pinned decision: a suppressed recommendation only resurfaces once its
 * evidence actually changes (or, for a defer, once the defer window elapses) - see
 * NextActionLogic.applyDecisions.
 */
export class NextActionService {
  private readonly services: NextActionDependencies
  private readonly approvals: ApprovalService
  private readonly store: LocalStore
  private readonly limit: number

  constructor(services: NextActionDependencies, approvals: ApprovalService, store: LocalStore = localStore, limit = 8) {
    this.services = services
    this.approvals = approvals
    this.store = store
    this.limit = limit
  }

  private readDecisions(): NextActionDecision[] { return this.store.read<NextActionDecision[]>(storageKeys.nextActionDecisions, []) }
  private saveDecisions(decisions: NextActionDecision[]) { this.store.write(storageKeys.nextActionDecisions, decisions) }
  private upsertDecision(decision: NextActionDecision) { this.saveDecisions([...this.readDecisions().filter(item => item.id !== decision.id), decision]) }

  /** Gathers every candidate source, isolating failures per-source. Returns the full (unranked, undismissed-filtered) candidate set plus any warnings, so accept/dismiss/defer can locate a recommendation even if it currently falls outside the bounded top-N shown by getOverview. */
  private gatherCandidates(now: Date): { candidates: NextActionRecommendation[]; warnings: string[] } {
    const warnings: string[] = []
    const safe = <T,>(label: string, action: () => T, fallback: T): T => { try { return action() } catch { warnings.push(safeMessage(label)); return fallback } }
    // Reads through the store (seeded from the service) rather than the service alone, so a task this service itself just
    // reprioritized (or that another page edited this session) is reflected immediately - the same store-read-with-seed-fallback
    // pattern RoutineService.completeTaskStep and WeeklyReviewService.requestPriority already use before writing.
    const tasks = safe('Tasks', () => ({ tasks: this.store.read<Task[]>(storageKeys.tasks, this.services.tasks.getTaskData().tasks) }), { tasks: [] })
    const goals = safe('Goals', () => this.services.goals.getGoalData(), { goals: [] })
    const projects = safe('Projects', () => this.services.projects.getProjectData(), { projects: [] })
    const planning = safe('Planning', () => this.services.planning.getOverview(now), { projectStatuses: [], goalStatuses: [], criticalPath: [], blockedProjectIds: [], staleProjectIds: [], goalsWithoutNextActionIds: [], suggestions: [] })
    const dependencies = safe('Planning dependencies', () => this.services.planning.listDependencies(), [])
    const calendar = safe('Calendar', () => this.services.calendar.getCalendarData(), { events: [], categories: {} as CalendarData['categories'] })
    const today = now.toISOString().slice(0, 10)
    const routines = safe('Routines', () => this.services.routines.listInstances({ date: today }), [])
    const kpis = safe('KPIs', () => this.services.kpis.getKpiData(), { kpis: [] })
    const weeklyReview = safe<WeeklyReview | undefined>('Weekly Review', () => this.services.weeklyReview.list()[0], undefined)
    const dailyBrief = this.services.dailyBrief ? safe<DailyBriefData | undefined>('Daily Brief', () => this.services.dailyBrief!.getDailyBrief(now), undefined) : undefined
    const sources: NextActionSources = { tasks, goals, projects, planning, dependencies, calendar, routines, kpis, weeklyReview, dailyBrief }
    return { candidates: computeNextActionCandidates(sources, now), warnings }
  }

  private findRecommendation(id: string, now: Date): NextActionRecommendation | undefined {
    return this.gatherCandidates(now).candidates.find(candidate => candidate.id === id)
  }

  /** Read-only: a bounded, ranked list of next-action recommendations with dismissed/deferred-and-unchanged candidates already filtered out. Never throws - source failures are isolated and reported as warnings instead. */
  getOverview(now = new Date()): NextActionOverview {
    const { candidates, warnings } = this.gatherCandidates(now)
    const { visible, suppressed } = applyDecisions(candidates, this.readDecisions(), now)
    const recommendations = rankRecommendations(visible, this.limit)
    return { recommendations, generatedAt: now.toISOString(), warnings, suppressedCount: suppressed.length }
  }

  listDecisions(): NextActionDecision[] { return this.readDecisions() }

  /** Suppresses a recommendation until its evidence changes. Weekly-review-sourced recommendations delegate to WeeklyReviewService.dismissPriority instead of recording a local decision, since that service already owns permanent dismissal for its own priorities. */
  dismiss(id: string, now = new Date()): NextActionRecommendation | undefined {
    const recommendation = this.findRecommendation(id, now)
    if (!recommendation) return undefined
    if (recommendation.effect.type === 'weekly-review-priority') { this.services.weeklyReview.dismissPriority(recommendation.effect.reviewId, recommendation.effect.priorityId); return recommendation }
    this.upsertDecision({ id, state: 'dismissed', evidenceHash: recommendation.evidenceHash, decidedAt: now.toISOString() })
    return recommendation
  }

  /** Suppresses a recommendation until `deferHours` have elapsed or its evidence changes, whichever comes first. Always a local decision, including for weekly-review-sourced recommendations - WeeklyReviewService has no snooze concept of its own, and defer never touches the underlying priority. */
  defer(id: string, now = new Date(), deferHours = 24): NextActionRecommendation | undefined {
    const recommendation = this.findRecommendation(id, now)
    if (!recommendation) return undefined
    this.upsertDecision({ id, state: 'deferred', evidenceHash: recommendation.evidenceHash, decidedAt: now.toISOString(), deferUntil: new Date(now.getTime() + deferHours * 3_600_000).toISOString() })
    return recommendation
  }

  /** Removes any stored dismiss/defer decision for a recommendation, letting it resurface immediately on the next read regardless of its evidence hash. */
  restore(id: string) { this.saveDecisions(this.readDecisions().filter(item => item.id !== id)) }

  /**
   * Requests approval for the mutation a recommendation implies (or delegates to WeeklyReviewService
   * for a weekly-review-sourced one). Nothing is written until that request is separately approved
   * and executed through ApprovalService.executeApproved. `overrides` supports editing the title/
   * priority the recommendation would apply before that approval is requested. Returns undefined for
   * a 'navigate'-only recommendation, which has nothing to accept - open its route directly instead.
   */
  accept(id: string, overrides: AcceptOverrides = {}, now = new Date()): ApprovalRequest | undefined {
    const recommendation = this.findRecommendation(id, now)
    if (!recommendation) return undefined
    const effect = recommendation.effect
    if (effect.type === 'navigate') return undefined

    if (effect.type === 'weekly-review-priority') {
      if (overrides.title) this.services.weeklyReview.editPriority(effect.reviewId, effect.priorityId, overrides.title)
      return this.services.weeklyReview.requestPriority(effect.reviewId, effect.priorityId)
    }

    if (effect.type === 'bump-task-priority') {
      const targetPriority = overrides.priority ?? effect.targetPriority
      return this.approvals.request(
        { source: 'Next Actions', action: 'tasks.prioritize', summary: `Raise priority of "${recommendation.title}" to ${targetPriority}`, risk: 'low', correlationId: `next-action-priority:${effect.taskId}`, payloadPreview: { taskId: effect.taskId, targetPriority } },
        () => {
          const tasks = this.store.read<Task[]>(storageKeys.tasks, this.services.tasks.getTaskData().tasks)
          this.store.write(storageKeys.tasks, tasks.map(task => task.id === effect.taskId ? { ...task, priority: targetPriority } : task))
        },
      )
    }

    const title = (overrides.title ?? effect.title).trim() || effect.title
    const priority = overrides.priority ?? effect.priority
    const domain: TaskDomain = effect.domain
    return this.approvals.request(
      { source: 'Next Actions', action: 'tasks.create', summary: `Create task: ${title}`, risk: 'medium', correlationId: `next-action-task:${id}`, payloadPreview: { title, domain, priority } },
      () => {
        const tasks = this.store.read<Task[]>(storageKeys.tasks, this.services.tasks.getTaskData().tasks)
        const taskId = `next-action-${id}`
        if (!tasks.some(task => task.id === taskId)) this.store.write(storageKeys.tasks, [...tasks, { id: taskId, title, domain, priority, status: 'todo', source: 'Next Actions' }])
      },
    )
  }
}
