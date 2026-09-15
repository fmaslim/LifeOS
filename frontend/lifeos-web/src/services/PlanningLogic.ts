import type { Goal, GoalArea } from '../models/goal.ts'
import type { CriticalPathStep, GoalPlanningStatus, GoalProjectLink, LinkSuggestion, NextAction, PlanningOverview, ProjectDependency, ProjectPlanningStatus } from '../models/planning.ts'
import type { Project, ProjectDomain } from '../models/project.ts'
import type { Task } from '../models/task.ts'

/** Pure goal-to-project planning derivation. No storage, no approvals: everything here is a read-only projection over existing Goal/Project/Task data, kept deterministic and unit-testable in isolation. */

const priorityRank: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }

/** The single deterministic next action for a project: its earliest-due, not-yet-completed linked task (ties broken by priority then id), or failing that the project's next incomplete milestone. Undefined only when neither exists. */
export function computeNextAction(project: Project, tasks: Task[]): NextAction | undefined {
  const incomplete = tasks.filter(task => project.linkedTaskIds.includes(task.id) && task.status !== 'completed')
  if (incomplete.length) {
    const [best] = incomplete.slice().sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') || priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id))
    return { source: 'task', title: best!.title, taskId: best!.id, dueDate: best!.dueDate, priority: best!.priority }
  }
  const milestone = project.milestones.find(item => !item.completed)
  if (milestone) return { source: 'milestone', title: milestone.title }
  return undefined
}

/** Reasons a project cannot proceed: every dependency it has on a not-yet-completed project. Only active/planning projects are evaluated; a paused or completed project is not "blocked", it is simply not moving. */
export function computeBlockedReasons(project: Project, projects: Project[], dependencies: ProjectDependency[]): string[] {
  if (project.status !== 'active' && project.status !== 'planning') return []
  const byId = new Map(projects.map(item => [item.id, item]))
  return dependencies
    .filter(dependency => dependency.projectId === project.id)
    .map(dependency => byId.get(dependency.dependsOnProjectId))
    .filter((blocker): blocker is Project => blocker !== undefined && blocker.status !== 'completed')
    .map(blocker => `Blocked by "${blocker.title}" (${blocker.status})`)
}

/** An active project is stale when it has no deterministic next action, or its target date has already passed without reaching completion. */
export function computeStaleReasons(project: Project, tasks: Task[], today: string): string[] {
  if (project.status !== 'active') return []
  const reasons: string[] = []
  if (!computeNextAction(project, tasks)) reasons.push('No deterministic next action is available for this active project.')
  if (project.targetDate && project.targetDate < today && project.progress < 100) reasons.push(`Target date ${project.targetDate} has passed at ${project.progress}% progress.`)
  return reasons
}

/** Longest chain of not-yet-completed projects connected by dependency edges (dependsOn -> dependent), i.e. the sequence most likely to delay the overall plan. Cycles are broken deterministically by refusing to revisit a node already on the current path. */
export function computeCriticalPath(projects: Project[], dependencies: ProjectDependency[]): CriticalPathStep[] {
  const byId = new Map(projects.map(project => [project.id, project]))
  const graph = new Map<string, string[]>()
  for (const dependency of dependencies) {
    if (!byId.has(dependency.projectId) || !byId.has(dependency.dependsOnProjectId)) continue
    const children = graph.get(dependency.dependsOnProjectId) ?? []
    children.push(dependency.projectId)
    graph.set(dependency.dependsOnProjectId, children)
  }
  let best: string[] = []
  const visit = (nodeId: string, path: string[], visiting: Set<string>) => {
    const nextPath = [...path, nodeId]
    if (nextPath.length > best.length) best = nextPath
    const nextVisiting = new Set(visiting)
    nextVisiting.add(nodeId)
    for (const child of (graph.get(nodeId) ?? []).slice().sort()) {
      if (nextVisiting.has(child) || byId.get(child)?.status === 'completed') continue
      visit(child, nextPath, nextVisiting)
    }
  }
  for (const project of projects.filter(item => item.status !== 'completed').slice().sort((a, b) => a.id.localeCompare(b.id))) visit(project.id, [], new Set())
  return best.map(id => { const project = byId.get(id)!; return { projectId: project.id, title: project.title, targetDate: project.targetDate } })
}

/** An active goal has an active next action when at least one of its linked, not-yet-completed projects has one, or, if it has no linked projects, when the goal itself still has an incomplete milestone. Paused/completed goals are never flagged. */
export function goalHasActiveNextAction(goal: Goal, links: GoalProjectLink[], projects: Project[], tasks: Task[]): boolean {
  if (goal.status !== 'active') return true
  const linkedProjectIds = links.filter(link => link.goalId === goal.id).map(link => link.projectId)
  if (linkedProjectIds.length) {
    const byId = new Map(projects.map(project => [project.id, project]))
    return linkedProjectIds.some(id => { const project = byId.get(id); return project && project.status !== 'completed' && Boolean(computeNextAction(project, tasks)) })
  }
  return goal.milestones.some(milestone => !milestone.completed)
}

const areaToDomains: Record<GoalArea, ProjectDomain[]> = { Business: ['Product'], Content: ['Content'], Finance: ['Finance'], Home: ['Home'], Learning: ['Personal'] }

/** Heuristic, read-only planning suggestions: an active goal and an unlinked, not-completed project whose domain matches the goal's area. Never writes anything; a caller must route acceptance through an approval before persisting the link. */
export function generateLinkSuggestions(goals: Goal[], projects: Project[], links: GoalProjectLink[]): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = []
  for (const goal of goals) {
    if (goal.status !== 'active') continue
    const linked = new Set(links.filter(link => link.goalId === goal.id).map(link => link.projectId))
    const matchDomains = areaToDomains[goal.area] ?? []
    for (const project of projects) {
      if (linked.has(project.id) || project.status === 'completed' || !matchDomains.includes(project.domain)) continue
      suggestions.push({ goalId: goal.id, projectId: project.id, reason: `${project.domain} project matches the ${goal.area} goal area.` })
    }
  }
  return suggestions.sort((a, b) => a.goalId.localeCompare(b.goalId) || a.projectId.localeCompare(b.projectId))
}

export function buildPlanningOverview(goals: Goal[], projects: Project[], tasks: Task[], links: GoalProjectLink[], dependencies: ProjectDependency[], now = new Date()): PlanningOverview {
  const today = now.toISOString().slice(0, 10)
  const projectStatuses: ProjectPlanningStatus[] = projects.map(project => ({
    projectId: project.id,
    nextAction: computeNextAction(project, tasks),
    blockedReasons: computeBlockedReasons(project, projects, dependencies),
    stale: computeStaleReasons(project, tasks, today).length > 0,
    staleReasons: computeStaleReasons(project, tasks, today),
  }))
  const goalStatuses: GoalPlanningStatus[] = goals.map(goal => ({
    goalId: goal.id,
    linkedProjectIds: links.filter(link => link.goalId === goal.id).map(link => link.projectId),
    hasActiveNextAction: goalHasActiveNextAction(goal, links, projects, tasks),
  }))
  return {
    projectStatuses,
    goalStatuses,
    criticalPath: computeCriticalPath(projects, dependencies),
    blockedProjectIds: projectStatuses.filter(status => status.blockedReasons.length > 0).map(status => status.projectId),
    staleProjectIds: projectStatuses.filter(status => status.stale).map(status => status.projectId),
    goalsWithoutNextActionIds: goalStatuses.filter(status => !status.hasActiveNextAction).map(status => status.goalId),
    suggestions: generateLinkSuggestions(goals, projects, links),
  }
}
