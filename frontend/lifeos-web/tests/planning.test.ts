import assert from 'node:assert/strict'
import test from 'node:test'
import type { Goal } from '../src/models/goal.ts'
import type { Project } from '../src/models/project.ts'
import type { Task } from '../src/models/task.ts'
import type { GoalProjectLink, ProjectDependency } from '../src/models/planning.ts'
import type { LocalStore } from '../src/storage/LocalStore.ts'
import { storageKeys } from '../src/storage/storageKeys.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import { buildPlanningOverview, computeBlockedReasons, computeCriticalPath, computeNextAction, computeStaleReasons, generateLinkSuggestions, goalHasActiveNextAction } from '../src/services/PlanningLogic.ts'
import { PlanningService, type PlanningDependencies } from '../src/services/PlanningService.ts'

class MemoryStore implements LocalStore {
  private values = new Map<string, unknown>()
  read<T>(key: string, fallback: T): T { return (this.values.has(key) ? this.values.get(key) : fallback) as T }
  write<T>(key: string, value: T) { this.values.set(key, structuredClone(value)) }
  remove(key: string) { this.values.delete(key) }
}

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

const now = new Date('2026-09-15T12:00:00.000Z')

const goalActive: Goal = { id: 'g-active', title: 'Active Goal', description: '', area: 'Business', status: 'active', targetDate: '2026-12-01', milestones: [{ id: 'm1', title: 'M1', completed: false }] }
const goalNoFallback: Goal = { id: 'g-no-fallback', title: 'Untended Goal', description: '', area: 'Finance', status: 'active', targetDate: '2026-12-01', milestones: [] }
const goalPaused: Goal = { id: 'g-paused', title: 'Paused Goal', description: '', area: 'Home', status: 'paused', targetDate: '2027-01-01', milestones: [] }
const goals: Goal[] = [goalActive, goalNoFallback, goalPaused]

const projectA: Project = { id: 'p-a', title: 'Project A', description: '', domain: 'Product', status: 'active', targetDate: '2026-10-01', progress: 50, linkedTaskIds: ['t-1'], milestones: [{ id: 'pa1', title: 'PA1', completed: false }] }
const projectB: Project = { id: 'p-b', title: 'Project B', description: '', domain: 'Content', status: 'active', targetDate: '2026-08-01', progress: 20, linkedTaskIds: [], milestones: [{ id: 'pb1', title: 'PB1', completed: true }] }
const projectC: Project = { id: 'p-c', title: 'Project C', description: '', domain: 'Home', status: 'planning', targetDate: '2026-11-01', progress: 0, linkedTaskIds: [], milestones: [{ id: 'pc1', title: 'PC1', completed: false }] }
const projectDone: Project = { id: 'p-done', title: 'Project Done', description: '', domain: 'Product', status: 'completed', targetDate: '2026-01-01', progress: 100, linkedTaskIds: [], milestones: [] }
const projects: Project[] = [projectA, projectB, projectC, projectDone]

const taskHigh: Task = { id: 't-1', title: 'Task 1 (high)', domain: 'Work', priority: 'high', status: 'todo', dueDate: '2026-09-20' }
const taskLow: Task = { id: 't-2', title: 'Task 2 (low, earlier due)', domain: 'Work', priority: 'low', status: 'todo', dueDate: '2026-09-16' }
const taskDone: Task = { id: 't-3', title: 'Task 3 (done)', domain: 'Work', priority: 'high', status: 'completed', dueDate: '2026-09-01' }
const tasks: Task[] = [taskHigh, taskLow, taskDone]

test('computeNextAction prefers the earliest-due incomplete linked task, then priority, then falls back to a milestone', () => {
  assert.deepEqual(computeNextAction(projectA, tasks), { source: 'task', title: 'Task 1 (high)', taskId: 't-1', dueDate: '2026-09-20', priority: 'high' })
  // Two incomplete tasks with the same due date: earlier tie-break is priority.
  const tiedProject: Project = { ...projectA, linkedTaskIds: ['t-1', 't-2'] }
  const tied = computeNextAction(tiedProject, [taskHigh, { ...taskLow, dueDate: '2026-09-20' }])
  assert.equal(tied?.taskId, 't-1') // high beats low at the same due date
  // No incomplete linked tasks (only a completed one): falls back to the next incomplete milestone.
  const milestoneOnly: Project = { ...projectA, linkedTaskIds: ['t-3'] }
  assert.deepEqual(computeNextAction(milestoneOnly, tasks), { source: 'milestone', title: 'PA1' })
  // Neither an incomplete task nor an incomplete milestone: no deterministic next action.
  assert.equal(computeNextAction(projectB, tasks), undefined)
})

test('computeBlockedReasons only flags active/planning projects with an unfinished dependency', () => {
  const dependencies: ProjectDependency[] = [
    { id: 'dep-c-a', projectId: 'p-c', dependsOnProjectId: 'p-a', reason: 'C needs A', createdAt: now.toISOString() },
    { id: 'dep-b-done', projectId: 'p-b', dependsOnProjectId: 'p-done', reason: 'B needs Done', createdAt: now.toISOString() },
  ]
  assert.deepEqual(computeBlockedReasons(projectC, projects, dependencies), ['Blocked by "Project A" (active)'])
  assert.deepEqual(computeBlockedReasons(projectB, projects, dependencies), []) // dependency is on a completed project
  assert.deepEqual(computeBlockedReasons(projectDone, projects, dependencies), []) // completed projects are never "blocked"
})

test('computeStaleReasons flags active projects with no next action or a missed target date', () => {
  assert.deepEqual(computeStaleReasons(projectA, tasks, '2026-09-15'), []) // has a clear next action, target date not passed
  const reasons = computeStaleReasons(projectB, tasks, '2026-09-15')
  assert.ok(reasons.some(reason => /No deterministic next action/.test(reason)))
  assert.ok(reasons.some(reason => /Target date 2026-08-01 has passed/.test(reason)))
  assert.deepEqual(computeStaleReasons(projectC, tasks, '2026-09-15'), []) // planning status is not evaluated for staleness
})

test('computeCriticalPath returns the longest not-yet-completed dependency chain and ignores cycles', () => {
  const dependencies: ProjectDependency[] = [{ id: 'dep-c-a', projectId: 'p-c', dependsOnProjectId: 'p-a', reason: 'C needs A', createdAt: now.toISOString() }]
  assert.deepEqual(computeCriticalPath(projects, dependencies).map(step => step.projectId), ['p-a', 'p-c'])
  // A cycle must not infinite-loop; the deterministic guard refuses to revisit a node already on the path.
  const cyclic: ProjectDependency[] = [...dependencies, { id: 'dep-a-c', projectId: 'p-a', dependsOnProjectId: 'p-c', reason: 'cycle', createdAt: now.toISOString() }]
  const cyclicResult = computeCriticalPath(projects, cyclic)
  assert.ok(cyclicResult.length >= 2)
})

test('goalHasActiveNextAction falls back to the goal\'s own milestones only when it has no linked projects', () => {
  assert.equal(goalHasActiveNextAction(goalActive, [], projects, tasks), true) // no links, but has an incomplete milestone
  assert.equal(goalHasActiveNextAction(goalNoFallback, [], projects, tasks), false) // no links and no milestones
  assert.equal(goalHasActiveNextAction(goalPaused, [], projects, tasks), true) // non-active goals are never flagged
  const links: GoalProjectLink[] = [{ id: 'link-1', goalId: 'g-no-fallback', projectId: 'p-b', createdAt: now.toISOString() }]
  assert.equal(goalHasActiveNextAction(goalNoFallback, links, projects, tasks), false) // linked project has no next action either
  const links2: GoalProjectLink[] = [{ id: 'link-2', goalId: 'g-no-fallback', projectId: 'p-a', createdAt: now.toISOString() }]
  assert.equal(goalHasActiveNextAction(goalNoFallback, links2, projects, tasks), true) // linked project has a next action
})

test('generateLinkSuggestions proposes unlinked, non-completed projects whose domain matches an active goal\'s area', () => {
  const suggestions = generateLinkSuggestions(goals, projects, [])
  assert.deepEqual(suggestions, [{ goalId: 'g-active', projectId: 'p-a', reason: 'Product project matches the Business goal area.' }])
  // Already linked: no longer suggested.
  const links: GoalProjectLink[] = [{ id: 'link-1', goalId: 'g-active', projectId: 'p-a', createdAt: now.toISOString() }]
  assert.deepEqual(generateLinkSuggestions(goals, projects, links), [])
})

test('buildPlanningOverview assembles project/goal status, critical path, and suggestions consistently', () => {
  const dependencies: ProjectDependency[] = [{ id: 'dep-c-a', projectId: 'p-c', dependsOnProjectId: 'p-a', reason: 'C needs A', createdAt: now.toISOString() }]
  const overview = buildPlanningOverview(goals, projects, tasks, [], dependencies, now)
  assert.ok(overview.blockedProjectIds.includes('p-c'))
  assert.ok(overview.staleProjectIds.includes('p-b'))
  assert.ok(overview.goalsWithoutNextActionIds.includes('g-no-fallback'))
  assert.equal(overview.criticalPath.map(step => step.projectId).join(','), 'p-a,p-c')
  assert.ok(overview.suggestions.some(suggestion => suggestion.goalId === 'g-active' && suggestion.projectId === 'p-a'))
})

function fixture() {
  const store = new MemoryStore()
  const approvals = new ApprovalService(undefined, new ApprovalStorage())
  const services: PlanningDependencies = {
    goals: { getGoalData: () => ({ goals }) },
    projects: { getProjectData: () => ({ projects }) },
    tasks: { getTaskData: () => ({ tasks }) },
  }
  const service = new PlanningService(services, approvals, store, { links: [], dependencies: [] })
  return { service, store, approvals }
}

test('linkGoalToProject and unlinkGoalFromProject are direct, idempotent writes', () => {
  const { service } = fixture()
  const first = service.linkGoalToProject('g-active', 'p-b', 'note')
  const second = service.linkGoalToProject('g-active', 'p-b', 'different note')
  assert.equal(first.id, second.id)
  assert.equal(service.listLinks().length, 1)
  service.unlinkGoalFromProject(first.id)
  assert.equal(service.listLinks().length, 0)
})

test('addDependency rejects self-dependencies and dedupes, removeDependency removes', () => {
  const { service } = fixture()
  assert.equal(service.addDependency('p-a', 'p-a', 'self'), undefined)
  const first = service.addDependency('p-c', 'p-a', 'C needs A')!
  const second = service.addDependency('p-c', 'p-a', 'ignored duplicate reason')!
  assert.equal(first.id, second.id)
  assert.equal(service.listDependencies().length, 1)
  service.removeDependency(first.id)
  assert.equal(service.listDependencies().length, 0)
})

test('requestLinkSuggestion requires approval before the link is written, and refuses already-linked or unknown pairs', async () => {
  const { service, approvals, store } = fixture()
  assert.equal(service.requestLinkSuggestion('missing-goal', 'p-a'), undefined)
  const request = service.requestLinkSuggestion('g-active', 'p-a')!
  assert.equal(request.state, 'pending')
  assert.equal(service.listLinks().length, 0) // nothing written yet
  assert.equal(store.read(storageKeys.goalProjectLinks, []).length, 0)
  assert.equal(service.requestLinkSuggestion('g-active', 'p-a')?.id, request.id) // deduped, not a second request
  assert.equal(approvals.list('pending').length, 1)
  approvals.decide(request.id, 'approved')
  await approvals.executeApproved(request.id)
  const links = service.listLinks()
  assert.equal(links.length, 1)
  assert.equal(links[0]?.goalId, 'g-active')
  assert.equal(links[0]?.projectId, 'p-a')
  assert.equal(links[0]?.note, 'Accepted planning suggestion')
  assert.equal(service.requestLinkSuggestion('g-active', 'p-a'), undefined) // already linked now
})

test('getOverview reflects direct writes made through the service', () => {
  const { service } = fixture()
  assert.ok(service.getOverview(now).goalsWithoutNextActionIds.includes('g-no-fallback'))
  service.linkGoalToProject('g-no-fallback', 'p-a')
  assert.ok(!service.getOverview(now).goalsWithoutNextActionIds.includes('g-no-fallback'))
})
