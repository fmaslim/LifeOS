import type { ApprovalRequest } from '../models/approval.ts'
import type { GoalData } from '../models/goal.ts'
import type { GoalProjectLink, PlanningData, PlanningOverview, ProjectDependency } from '../models/planning.ts'
import type { ProjectData } from '../models/project.ts'
import type { TaskData } from '../models/task.ts'
import type { ApprovalService } from './ApprovalService.ts'
import { buildPlanningOverview } from './PlanningLogic.ts'
import { planningMockData } from '../data/planningMockData.ts'
import type { LocalStore } from '../storage/LocalStore.ts'
import { localStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'

export interface PlanningDependencies {
  goals: { getGoalData(): GoalData }
  projects: { getProjectData(): ProjectData }
  tasks: { getTaskData(): TaskData }
}

/**
 * Connects existing Goal and Project records with typed links, dependencies, and derived
 * planning status (next action, blocked, stale, critical path). Structural edits (linking,
 * dependency bookkeeping) are direct writes, matching how GoalsPage/ProjectsPage mutate
 * milestones directly. Heuristic link suggestions are read-only until a caller explicitly
 * accepts one, which always routes through ApprovalService before anything is written -
 * the same convention WeeklyReviewService.requestPriority uses for its proposed tasks.
 */
export class PlanningService {
  private readonly services: PlanningDependencies
  private readonly approvals: ApprovalService
  private readonly store: LocalStore
  private readonly seed: PlanningData

  constructor(services: PlanningDependencies, approvals: ApprovalService, store: LocalStore = localStore, seed: PlanningData = planningMockData) {
    this.services = services
    this.approvals = approvals
    this.store = store
    this.seed = seed
  }

  listLinks(): GoalProjectLink[] { return this.store.read<GoalProjectLink[]>(storageKeys.goalProjectLinks, this.seed.links) }
  listDependencies(): ProjectDependency[] { return this.store.read<ProjectDependency[]>(storageKeys.projectDependencies, this.seed.dependencies) }
  private saveLinks(links: GoalProjectLink[]) { this.store.write(storageKeys.goalProjectLinks, links) }
  private saveDependencies(dependencies: ProjectDependency[]) { this.store.write(storageKeys.projectDependencies, dependencies) }

  /** Direct structural edit: records that a goal and project are connected. Idempotent. */
  linkGoalToProject(goalId: string, projectId: string, note?: string): GoalProjectLink {
    const links = this.listLinks()
    const existing = links.find(link => link.goalId === goalId && link.projectId === projectId)
    if (existing) return existing
    const link: GoalProjectLink = { id: `link-${goalId}-${projectId}`, goalId, projectId, note, createdAt: new Date().toISOString() }
    this.saveLinks([...links, link])
    return link
  }

  unlinkGoalFromProject(linkId: string) { this.saveLinks(this.listLinks().filter(link => link.id !== linkId)) }

  /** Direct structural edit: records that `projectId` is blocked on `dependsOnProjectId`. Idempotent; rejects a project depending on itself. */
  addDependency(projectId: string, dependsOnProjectId: string, reason: string): ProjectDependency | undefined {
    if (projectId === dependsOnProjectId) return undefined
    const dependencies = this.listDependencies()
    const existing = dependencies.find(item => item.projectId === projectId && item.dependsOnProjectId === dependsOnProjectId)
    if (existing) return existing
    const dependency: ProjectDependency = { id: `dep-${projectId}-${dependsOnProjectId}`, projectId, dependsOnProjectId, reason: reason.trim() || 'Blocking dependency', createdAt: new Date().toISOString() }
    this.saveDependencies([...dependencies, dependency])
    return dependency
  }

  removeDependency(id: string) { this.saveDependencies(this.listDependencies().filter(item => item.id !== id)) }

  getOverview(now = new Date()): PlanningOverview {
    const goals = this.services.goals.getGoalData().goals
    const projects = this.services.projects.getProjectData().projects
    const tasks = this.services.tasks.getTaskData().tasks
    return buildPlanningOverview(goals, projects, tasks, this.listLinks(), this.listDependencies(), now)
  }

  /** Requests approval for an AI/heuristic link suggestion. Nothing is written until the request is approved and executed; a stale or already-linked suggestion is refused. */
  requestLinkSuggestion(goalId: string, projectId: string): ApprovalRequest | undefined {
    const goal = this.services.goals.getGoalData().goals.find(item => item.id === goalId)
    const project = this.services.projects.getProjectData().projects.find(item => item.id === projectId)
    if (!goal || !project) return undefined
    if (this.listLinks().some(link => link.goalId === goalId && link.projectId === projectId)) return undefined
    return this.approvals.request(
      { source: 'Planning', action: 'planning.link-goal-project', summary: `Link project "${project.title}" to goal "${goal.title}"`, risk: 'low', correlationId: `planning-link:${goalId}:${projectId}`, payloadPreview: { goalId, projectId, goalTitle: goal.title, projectTitle: project.title } },
      () => { this.linkGoalToProject(goalId, projectId, 'Accepted planning suggestion') },
    )
  }
}
