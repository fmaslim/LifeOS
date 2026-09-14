import type { AutomationsData } from '../models/automation.ts'
import type { CalendarData } from '../models/calendar.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { DashboardData } from '../models/dashboard.ts'
import type { GoalData } from '../models/goal.ts'
import type { ProviderSnapshot } from '../models/integrationProvider.ts'
import type { NotificationData } from '../models/notification.ts'
import type { TaskData, TaskPriority } from '../models/task.ts'

export interface DailyBriefSources {
  automations: AutomationsData
  calendar: CalendarData
  dashboard: DashboardData
  goals: GoalData
  notifications: NotificationData
  providers: ProviderSnapshot[]
  tasks: TaskData
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
  const actions = [
    ...(notification ? [{ id: `notice-${notification.id}`, title: notification.title, reason: notification.message, route: notification.route ?? 'activity', priority: notification.severity === 'critical' ? 'critical' as const : 'high' as const }] : []),
    ...tasks.map(task => ({ id: `task-${task.id}`, title: task.title, reason: `${task.domain}${task.dueDate === today ? ' · Due today' : task.dueDate ? ` · Due ${task.dueDate}` : ''}`, route: 'tasks' as const, priority: task.priority === 'high' ? 'high' as const : 'normal' as const })),
  ]
  const warnings = [
    ...(unhealthyAutomations ? [`${unhealthyAutomations} automation${unhealthyAutomations === 1 ? '' : 's'} need attention.`] : []),
    ...(unavailableProviders.length ? [`${unavailableProviders.map(provider => provider.metadata.name).join(', ')} ${unavailableProviders.length === 1 ? 'is' : 'are'} unavailable; the brief uses the remaining sources.`] : []),
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
}

export class CompositeDailyBriefService {
  private readonly services: BriefDependencies
  constructor(services: BriefDependencies) { this.services = services }
  getDailyBrief(now = new Date()) { return composeDailyBrief({ automations: this.services.automations.getAutomationsData(), calendar: this.services.calendar.getCalendarData(), dashboard: this.services.dashboard.getDashboardData(), goals: this.services.goals.getGoalData(), notifications: this.services.notifications.getNotificationData(), providers: this.services.integrationProviders.listProviders(), tasks: this.services.tasks.getTaskData() }, now) }
}
