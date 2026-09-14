import type { ActivityData } from '../models/activity.ts'
import type { AutomationRun } from '../models/automation.ts'
import type { ContentPipelineData } from '../models/contentPipeline.ts'
import type { DocIQData } from '../models/dociq.ts'
import type { FinancesData } from '../models/finances.ts'
import type { GoalData, KpiData } from '../models/goal.ts'
import type { JarvisData } from '../models/jarvis.ts'
import type { ProjectData } from '../models/project.ts'
import type { Task, TaskData } from '../models/task.ts'
import type { WeeklyPriority, WeeklyReview, WeeklyReviewSignal } from '../models/weeklyReview.ts'
import type { ApprovalService } from './ApprovalService.ts'
import type { LocalStore } from '../storage/LocalStore.ts'
import { localStore } from '../storage/LocalStore.ts'
import { storageKeys } from '../storage/storageKeys.ts'
import { kpiProgress } from './KpiService.ts'

interface WeeklyReviewDependencies {
  tasks: { getTaskData(): TaskData }
  goals: { getGoalData(): GoalData }
  kpis: { getKpiData(): KpiData }
  projects: { getProjectData(): ProjectData }
  contentPipeline: { getContentPipelineData(): ContentPipelineData }
  jarvis: { getJarvisData(): JarvisData }
  docIQ: { getDocIQData(): DocIQData }
  finances: { getFinancesData(): FinancesData }
  activity: { getActivityData(): ActivityData; publish(event: ActivityData['events'][number]): void }
  automationHistory: { list(filter?: { from?: string }): AutomationRun[]; get(id: string): AutomationRun | undefined; save(run: AutomationRun): void }
  schedules: { claimDue(id: string, now: Date): boolean; markExecution(id: string, state: 'idle' | 'queued' | 'running' | 'failed'): void }
}

const dayMs = 86_400_000
const startOfWeek = (date: Date) => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const mondayOffset = (copy.getUTCDay() + 6) % 7
  copy.setUTCDate(copy.getUTCDate() - mondayOffset)
  return copy.toISOString().slice(0, 10)
}
const sourceId = (prefix: string, value: string) => `${prefix}-${value}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 96)

export class WeeklyReviewService {
  private readonly services: WeeklyReviewDependencies
  private readonly approvals: ApprovalService
  private readonly store: LocalStore
  private readonly scheduleId: string

  constructor(services: WeeklyReviewDependencies, approvals: ApprovalService, store: LocalStore = localStore, scheduleId = 'schedule-weekly-review') {
    this.services = services
    this.approvals = approvals
    this.store = store
    this.scheduleId = scheduleId
  }

  list() { return this.store.read<WeeklyReview[]>(storageKeys.weeklyReviews, []).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)) }
  get(id: string) { return this.list().find(review => review.id === id) }

  runDue(now = new Date()) {
    if (!this.services.schedules.claimDue(this.scheduleId, now)) return undefined
    this.services.schedules.markExecution(this.scheduleId, 'running')
    try { const review = this.run(now, 'Schedule'); this.services.schedules.markExecution(this.scheduleId, 'idle'); return review }
    catch { this.services.schedules.markExecution(this.scheduleId, 'failed'); throw new Error('Weekly Review could not complete.') }
  }

  run(now = new Date(), trigger: WeeklyReview['trigger'] = 'Manual'): WeeklyReview {
    const weekOf = startOfWeek(now)
    const id = `weekly-review-${weekOf}`
    const existing = this.get(id)
    if (existing) return existing

    const warnings: string[] = []
    const safe = <T>(label: string, action: () => T, fallback: T): T => { try { return action() } catch { warnings.push(`${label} was unavailable; the review continued.`); return fallback } }
    const tasks = safe('Tasks', () => this.services.tasks.getTaskData().tasks, [])
    const goals = safe('Goals', () => this.services.goals.getGoalData().goals, [])
    const kpis = safe('KPIs', () => this.services.kpis.getKpiData().kpis, [])
    const projects = safe('Projects', () => this.services.projects.getProjectData().projects, [])
    const content = safe('Content pipeline', () => this.services.contentPipeline.getContentPipelineData().items, [])
    const jarvis = safe<JarvisData | undefined>('Jarvis', () => this.services.jarvis.getJarvisData(), undefined)
    const dociq = safe<DocIQData | undefined>('DocIQ', () => this.services.docIQ.getDocIQData(), undefined)
    const finances = safe<FinancesData | undefined>('Finances', () => this.services.finances.getFinancesData(), undefined)
    const from = new Date(now.getTime() - 7 * dayMs).toISOString()
    const runs = safe('Automation history', () => this.services.automationHistory.list({ from }), [])
    const events = safe('Activity', () => this.services.activity.getActivityData().events.filter(event => event.timestamp >= from), [])

    const today = now.toISOString().slice(0, 10)
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    const overdue = tasks.filter(task => task.status !== 'completed' && task.dueDate && task.dueDate < today)
    const atRisk = kpis.filter(kpi => kpi.status === 'at-risk' || (kpi.status !== 'archived' && kpiProgress(kpi) < 60))
    const completedProjects = projects.filter(project => project.status === 'completed').length
    const published = content.filter(item => item.stage === 'Published').length
    const contentFailed = content.filter(item => item.stage === 'Failed')
    const failedRuns = runs.filter(run => run.status === 'failed')
    const retriedRuns = runs.filter(run => run.status === 'retried')
    const signals: WeeklyReviewSignal[] = []
    const add = (signal: WeeklyReviewSignal) => signals.push(signal)

    if (completedTasks) add({ id: 'tasks-completed', source: 'Tasks', title: `${completedTasks} task${completedTasks === 1 ? '' : 's'} completed`, detail: 'Completed work contributed positive weekly momentum.', kind: 'win', route: 'tasks' })
    if (overdue.length) add({ id: 'tasks-overdue', source: 'Tasks', title: `${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}`, detail: overdue.slice(0, 3).map(task => task.title).join(' · '), kind: 'miss', route: 'tasks' })
    const completedGoals = goals.filter(goal => goal.status === 'completed')
    if (completedGoals.length) add({ id: 'goals-completed', source: 'Goals', title: `${completedGoals.length} goal${completedGoals.length === 1 ? '' : 's'} completed`, detail: completedGoals.map(goal => goal.title).join(' · '), kind: 'win', route: 'goals' })
    if (atRisk.length) add({ id: 'kpis-at-risk', source: 'KPIs', title: `${atRisk.length} KPI${atRisk.length === 1 ? '' : 's'} need attention`, detail: atRisk.slice(0, 4).map(kpi => `${kpi.name} ${kpiProgress(kpi)}%`).join(' · '), kind: 'miss', route: 'kpis' })
    const strongKpis = kpis.filter(kpi => kpi.status === 'achieved' || (kpi.status === 'on-track' && kpiProgress(kpi) >= 80))
    if (strongKpis.length) add({ id: 'kpis-strong', source: 'KPIs', title: `${strongKpis.length} KPI${strongKpis.length === 1 ? '' : 's'} on strong footing`, detail: strongKpis.slice(0, 4).map(kpi => `${kpi.name} ${kpiProgress(kpi)}%`).join(' · '), kind: 'win', route: 'kpis' })
    const blockedProjects = projects.filter(project => project.status === 'paused' || (project.status === 'active' && project.progress < 25))
    if (completedProjects) add({ id: 'projects-completed', source: 'Projects', title: `${completedProjects} project${completedProjects === 1 ? '' : 's'} completed`, detail: 'Completed project work is reflected in this review.', kind: 'win', route: 'projects' })
    if (blockedProjects.length) add({ id: 'projects-blocked', source: 'Projects', title: `${blockedProjects.length} project${blockedProjects.length === 1 ? '' : 's'} blocked or stalled`, detail: blockedProjects.slice(0, 3).map(project => `${project.title} (${project.progress}%)`).join(' · '), kind: 'blocked', route: 'projects' })
    if (published) add({ id: 'content-published', source: 'Content', title: `${published} content item${published === 1 ? '' : 's'} published`, detail: 'Published output was detected in the content pipeline.', kind: 'win', route: 'content-pipeline' })
    if (contentFailed.length) add({ id: 'content-failed', source: 'Content', title: `${contentFailed.length} content job${contentFailed.length === 1 ? '' : 's'} failed`, detail: contentFailed.slice(0, 3).map(item => item.title).join(' · '), kind: 'miss', route: 'content-pipeline' })

    if (!jarvis || jarvis.connection === 'unavailable') { warnings.push('Jarvis is disconnected or unavailable.'); add({ id: 'jarvis-unavailable', source: 'Jarvis', title: 'Jarvis data unavailable', detail: 'Prospecting signals were omitted without blocking the review.', kind: 'anomaly', route: 'jarvis' }) }
    else add({ id: 'jarvis-status', source: 'Jarvis', title: `Jarvis is ${jarvis.connection}`, detail: jarvis.metrics.slice(0, 3).map(metric => `${metric.label}: ${metric.value}`).join(' · '), kind: jarvis.connection === 'stale' ? 'anomaly' : 'info', route: 'jarvis' })

    if (!dociq) warnings.push('DocIQ is unavailable.')
    else {
      const highRisks = dociq.risks.filter(risk => risk.severity === 'High')
      if (highRisks.length) add({ id: 'dociq-risks', source: 'DocIQ', title: `${highRisks.length} high-severity DocIQ risk${highRisks.length === 1 ? '' : 's'}`, detail: highRisks.slice(0, 3).map(risk => risk.title).join(' · '), kind: 'anomaly', route: 'dociq' })
      else add({ id: 'dociq-stable', source: 'DocIQ', title: 'No high-severity DocIQ risks', detail: dociq.metrics.slice(0, 2).map(metric => `${metric.label}: ${metric.value}`).join(' · '), kind: 'info', route: 'dociq' })
    }

    if (!finances) warnings.push('Finance data is unavailable.')
    else {
      const latest = finances.cashFlow.at(-1)
      if (latest) {
        const net = latest.income - latest.expenses
        add({ id: 'finance-cash-flow', source: 'Finances', title: `Latest net cash flow ${net >= 0 ? 'positive' : 'negative'}`, detail: `${latest.month}: ${net.toLocaleString()} net`, kind: net >= 0 ? 'win' : 'anomaly', route: 'finances' })
      }
    }

    if (failedRuns.length) add({ id: 'automation-failures', source: 'Automations', title: `${failedRuns.length} automation failure${failedRuns.length === 1 ? '' : 's'}`, detail: failedRuns.slice(0, 4).map(run => run.automationName).join(' · '), kind: 'miss', route: 'automation-history' })
    if (retriedRuns.length) add({ id: 'automation-retries', source: 'Automations', title: `${retriedRuns.length} workflow${retriedRuns.length === 1 ? '' : 's'} recovered after retry`, detail: retriedRuns.slice(0, 4).map(run => run.automationName).join(' · '), kind: 'info', route: 'automation-history' })
    const failureCounts = failedRuns.reduce<Record<string, number>>((counts, run) => ({ ...counts, [run.automationName]: (counts[run.automationName] ?? 0) + 1 }), {})
    const recurring = Object.entries(failureCounts).filter(([, count]) => count > 1)
    if (recurring.length) add({ id: 'automation-recurring', source: 'Automations', title: 'Recurring automation failures detected', detail: recurring.map(([name, count]) => `${name} ×${count}`).join(' · '), kind: 'anomaly', route: 'automation-history' })

    for (const event of events.filter(item => item.important && (item.source === 'Home' || item.source === 'System')).slice(0, 4)) add({ id: sourceId('household', event.id), source: event.source, title: event.type, detail: event.description, kind: event.status === 'attention' ? 'anomaly' : 'info', route: event.route })

    const attention = signals.filter(signal => signal.kind === 'miss' || signal.kind === 'blocked' || signal.kind === 'anomaly')
    const candidateSignals = attention.length ? attention : signals.filter(signal => signal.kind === 'win' || signal.kind === 'info').slice(0, 2)
    const priorities: WeeklyPriority[] = candidateSignals.slice(0, 5).map((signal, index) => ({ id: `priority-${index + 1}`, title: signal.kind === 'win' || signal.kind === 'info' ? `Protect momentum: ${signal.title}` : `Address: ${signal.title}`, reason: `${signal.source}: ${signal.detail}`, signalIds: [signal.id], state: 'proposed' }))
    const wins = signals.filter(signal => signal.kind === 'win').length
    const misses = attention.length
    const review: WeeklyReview = { id, weekOf, generatedAt: now.toISOString(), trigger, summary: `${wins} wins, ${misses} items needing attention, and ${priorities.length} proposed priorities for next week.`, metrics: { completedTasks, overdueTasks: overdue.length, atRiskKpis: atRisk.length, completedProjects, publishedContent: published, failedAutomations: failedRuns.length }, signals, priorities, warnings }
    this.persist(review)

    const endedAt = new Date(now.getTime() + 50).toISOString()
    this.services.automationHistory.save({ id, automationId: 'weekly-review', automationName: 'LifeOS Weekly Review', trigger, triggerSource: trigger === 'Schedule' ? 'Scheduler' : 'User', correlationId: id, startedAt: now.toISOString(), endedAt, durationMs: 50, status: 'completed', outputSummary: review.summary, retryCount: 0, relatedLinks: [{ label: 'Open Weekly Review', href: '#/weekly-review' }] })
    this.services.activity.publish({ id, timestamp: endedAt, source: 'Automations', type: 'Weekly Review generated', description: review.summary, status: misses ? 'attention' : 'success', route: 'weekly-review', correlationId: id, runId: id, important: true })
    return review
  }

  editPriority(reviewId: string, priorityId: string, title: string) { return this.updatePriority(reviewId, priorityId, priority => priority.state === 'proposed' ? { ...priority, title: title.trim() || priority.title } : priority) }
  dismissPriority(reviewId: string, priorityId: string) { return this.updatePriority(reviewId, priorityId, priority => priority.state === 'proposed' ? { ...priority, state: 'dismissed' } : priority) }

  requestPriority(reviewId: string, priorityId: string) {
    const review = this.get(reviewId); const priority = review?.priorities.find(item => item.id === priorityId)
    if (!review || !priority || priority.state !== 'proposed') return undefined
    const approval = this.approvals.request({ source: 'Weekly Review', action: 'tasks.create', summary: `Create next-week task: ${priority.title}`, risk: 'medium', correlationId: `${review.id}:${priority.id}`, payloadPreview: { title: priority.title, reason: priority.reason, sourceSignalIds: priority.signalIds } }, () => {
      const currentTasks = this.store.read<Task[]>(storageKeys.tasks, this.services.tasks.getTaskData().tasks)
      const taskId = `weekly-${review.weekOf}-${priority.id}`
      if (!currentTasks.some(task => task.id === taskId)) this.store.write(storageKeys.tasks, [...currentTasks, { id: taskId, title: priority.title, domain: 'Work', priority: 'high', status: 'todo', source: `Weekly Review ${review.weekOf}` }])
      this.updatePriority(review.id, priority.id, item => ({ ...item, state: 'accepted', approvalId: approval.id }))
    })
    this.updatePriority(review.id, priority.id, item => ({ ...item, state: 'awaiting-approval', approvalId: approval.id }))
    return approval
  }

  private updatePriority(reviewId: string, priorityId: string, update: (priority: WeeklyPriority) => WeeklyPriority) {
    const reviews = this.list(); let changed: WeeklyReview | undefined
    const next = reviews.map(review => review.id !== reviewId ? review : (changed = { ...review, priorities: review.priorities.map(priority => priority.id === priorityId ? update(priority) : priority) }, changed))
    this.store.write(storageKeys.weeklyReviews, next)
    return changed
  }
  private persist(review: WeeklyReview) { const reviews = this.list().filter(item => item.id !== review.id); this.store.write(storageKeys.weeklyReviews, [review, ...reviews]) }
}
