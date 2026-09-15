import type { AutomationsData } from '../models/automation.ts'
import type { CalendarData } from '../models/calendar.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { DashboardData } from '../models/dashboard.ts'
import type { GoalData } from '../models/goal.ts'
import type { ProviderSnapshot } from '../models/integrationProvider.ts'
import type { NotificationData } from '../models/notification.ts'
import type { RoutineInstance } from '../models/routine.ts'
import type { TaskData, TaskPriority } from '../models/task.ts'

export interface DailyBriefSources {
  automations: AutomationsData
  calendar: CalendarData
  dashboard: DashboardData
  goals: GoalData
  notifications: NotificationData
  providers: ProviderSnapshot[]
  tasks: TaskData
  /** Optional so existing callers/tests are unaffected; when present, today's routine instances feed a signal, an action, and a missed-routine warning. */
  routines?: { instances: RoutineInstance[] }
}

const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

/** Deterministically composes a read-only briefing from existing LifeOS domains. */
export function composeDailyBrief(sources: DailyBriefSources, now = new Date()): DailyBriefData {
  const today = now.toISOString().slice(0, 10)
  const tasks = sources.tasks.tasks.filter(task => task.status !== 'completed').sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')).slice(0, 3)
  const notification = sources.notifications.notifications.filter(item => !item.read && item.severity !== 'normal').sort((a, b) => ({ critical: 0, important: 1, normal: 2 }[a.severity] - { critical: 0, important: 1, normal: 2 }[b.severity]))[0]
  const unhealthyAutomations = sources.automations.failed.length + sources.automations.blocked.length
  const todayEvents = sources.calendar.events.filter(event => event.date === today)
  const activeGoals = sources.goals.goals.filter(goal => goal.status === 'active')
  const unavailableProviders = sources.providers.filter(provider => provider.connection === 'unavailable' || provider.health === 'offline')
  const routineInstances = sources.routines?.instances ?? []
  const missedRoutines = routineInstances.filter(instance => instance.status === 'missed')
  const dueRoutines = routineInstances.filter(instance => instance.status === 'scheduled')
  const completedRoutines = routineInstances.filter(instance => instance.status === 'completed').length
  const actions = [
    ...(notification ? [{ id: `notice-${notification.id}`, title: notification.title, reason: notification.message, route: notification.route ?? 'activity', priority: notification.severity === 'critical' ? 'critical' as const : 'high' as const }] : []),
    ...tasks.map(task => ({ id: `task-${task.id}`, title: task.title, reason: `${task.domain}${task.dueDate === today ? ' · Due today' : task.dueDate ? ` · Due ${task.dueDate}` : ''}`, route: 'tasks' as const, priority: task.priority === 'high' ? 'high' as const : 'normal' as const })),
    ...(dueRoutines.length ? [{ id: 'routines-due', title: `${dueRoutines.length} routine${dueRoutines.length === 1 ? '' : 's'} not started`, reason: dueRoutines.map(instance => instance.routineName).slice(0, 3).join(' · '), route: 'routines' as const, priority: 'normal' as const }] : []),
  ]
  const warnings = [
    ...(unhealthyAutomations ? [`${unhealthyAutomations} automation${unhealthyAutomations === 1 ? '' : 's'} need attention.`] : []),
    ...(unavailableProviders.length ? [`${unavailableProviders.map(provider => provider.metadata.name).join(', ')} ${unavailableProviders.length === 1 ? 'is' : 'are'} unavailable; the brief uses the remaining sources.`] : []),
    ...(missedRoutines.length ? [`${missedRoutines.length} routine${missedRoutines.length === 1 ? '' : 's'} missed: ${missedRoutines.map(instance => instance.routineName).join(', ')}.`] : []),
  ]
  return {
    generatedAt: now.toISOString(),
    greeting: now.getUTCHours() < 12 ? 'Good morning' : now.getUTCHours() < 18 ? 'Good afternoon' : 'Good evening',
    actions,
    signals: [
      { id: 'calendar', label: 'Today', value: `${todayEvents.length}`, detail: todayEvents.length === 1 ? 'calendar event' : 'calendar events', status: 'neutral' },
      { id: 'goals', label: 'Active goals', value: `${activeGoals.length}`, detail: 'long-horizon outcomes', status: 'good' },
      { id: 'automations', label: 'Automation health', value: unhealthyAutomations ? `${unhealthyAutomations} alert${unhealthyAutomations === 1 ? '' : 's'}` : 'Clear', detail: unhealthyAutomations ? 'Review failures and blocks' : 'No failures or blocks', status: unhealthyAutomations ? 'attention' : 'good' },
      { id: 'system', label: sources.dashboard.systemHealthSummary.label, value: sources.dashboard.systemHealthSummary.value, detail: sources.dashboard.systemHealthSummary.detail, status: sources.dashboard.systemHealthSummary.value === '100%' ? 'good' : 'neutral' },
      ...(sources.routines ? [{ id: 'routines', label: 'Routines today', value: `${completedRoutines}/${routineInstances.length}`, detail: missedRoutines.length ? `${missedRoutines.length} missed` : 'On track', status: missedRoutines.length ? 'attention' as const : 'good' as const }] : []),
    ],
    warnings,
  }
}

interface BriefDependencies {
  automations: { getAutomationsData(): AutomationsData }
  calendar: { getCalendarData(): CalendarData }
  dashboard: { getDashboardData(): DashboardData }
  goals: { getGoalData(): GoalData }
  integrationProviders: { listProviders(): ProviderSnapshot[] }
  notifications: { getNotificationData(): NotificationData }
  tasks: { getTaskData(): TaskData }
  routines?: { listInstances(filter?: { date?: string }): RoutineInstance[] }
}

export class CompositeDailyBriefService {
  private readonly services: BriefDependencies
  constructor(services: BriefDependencies) { this.services = services }
  getDailyBrief(now = new Date()) {
    let providers: ProviderSnapshot[]
    try { providers = this.services.integrationProviders.listProviders() } catch {
      providers = [{ metadata: { id: 'jarvis', name: 'Integration providers', description: 'Optional provider health could not be read.', category: 'productivity' }, connection: 'unavailable', health: 'offline', capabilities: { read: false, write: false, events: false, actions: false }, message: 'Provider status unavailable', credential: { state: 'missing' } }]
    }
    let routines: { instances: RoutineInstance[] } | undefined
    if (this.services.routines) { try { routines = { instances: this.services.routines.listInstances({ date: now.toISOString().slice(0, 10) }) } } catch { routines = undefined } }
    return composeDailyBrief({ automations: this.services.automations.getAutomationsData(), calendar: this.services.calendar.getCalendarData(), dashboard: this.services.dashboard.getDashboardData(), goals: this.services.goals.getGoalData(), notifications: this.services.notifications.getNotificationData(), providers, tasks: this.services.tasks.getTaskData(), routines }, now)
  }
}
