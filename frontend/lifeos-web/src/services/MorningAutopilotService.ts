import type { ActivityEvent } from '../models/activity.ts'
import type { AutomationRun } from '../models/automation.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { ProviderSnapshot } from '../models/integrationProvider.ts'
import type { MorningAutopilotRun, MorningAutopilotStep } from '../models/morningAutopilot.ts'
import type { NotificationEvent } from '../models/notification.ts'

interface MorningDependencies {
  schedules: { claimDue(id: string, now: Date): boolean; markExecution(id: string, state: 'idle' | 'queued' | 'running' | 'failed'): void }
  dailyBrief: { getDailyBrief(now?: Date): DailyBriefData }
  integrationProviders: { listProviders(): ProviderSnapshot[] }
  automationHistory: { list(filter?: { from?: string }): AutomationRun[]; get(id: string): AutomationRun | undefined; save(run: AutomationRun): void }
  notifications: { publish(event: NotificationEvent): unknown }
  activity: { publish(event: ActivityEvent): void }
}

const localDay = (now: Date, timezone: string) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
const fallbackBrief = (now: Date): DailyBriefData => ({ generatedAt: now.toISOString(), greeting: 'Good morning', actions: [], signals: [], warnings: ['Optional sources were unavailable; review Activity for details.'] })

/** Coordinates one safe, observable morning run while keeping provider failures isolated. */
export class MorningAutopilotService {
  private readonly completed = new Map<string, MorningAutopilotRun>()
  private readonly services: MorningDependencies
  private readonly timezone: string
  private readonly scheduleId: string
  constructor(services: MorningDependencies, timezone = 'America/New_York', scheduleId = 'schedule-morning-brief') { this.services = services; this.timezone = timezone; this.scheduleId = scheduleId }

  runDue(now = new Date()) {
    if (!this.services.schedules.claimDue(this.scheduleId, now)) return undefined
    this.services.schedules.markExecution(this.scheduleId, 'running')
    try {
      const result = this.run(now, 'Schedule')
      this.services.schedules.markExecution(this.scheduleId, 'idle')
      return result
    } catch {
      this.services.schedules.markExecution(this.scheduleId, 'failed')
      throw new Error('Morning Autopilot could not complete.')
    }
  }

  run(now = new Date(), trigger = 'Manual'): MorningAutopilotRun | undefined {
    const day = localDay(now, this.timezone)
    const id = `morning-autopilot-${day}`
    const cached = this.completed.get(id)
    if (cached) return cached
    if (this.services.automationHistory.get(id)) return undefined

    const steps: MorningAutopilotStep[] = []
    const capture = <T>(id: string, label: string, action: () => T, fallback: T): T => {
      try { const value = action(); steps.push({ id, label, status: 'completed', summary: `${label} completed.` }); return value }
      catch { steps.push({ id, label, status: 'degraded', summary: `${label} is temporarily unavailable; the workflow continued.` }); return fallback }
    }

    const providers = capture('integration-health', 'Integration health check', () => this.services.integrationProviders.listProviders(), [])
    const overnightFrom = new Date(now.getTime() - 12 * 3_600_000).toISOString()
    const overnight = capture('overnight-recovery', 'Overnight failure and retry check', () => this.services.automationHistory.list({ from: overnightFrom }), [])
    const brief = capture('daily-brief', 'Daily Brief generation', () => this.services.dailyBrief.getDailyBrief(now), fallbackBrief(now))
    const failed = overnight.filter(run => run.status === 'failed').length
    const retried = overnight.filter(run => run.status === 'retried').length
    const unavailable = providers.filter(provider => provider.connection === 'unavailable' || provider.health === 'offline').length
    const importantAlerts = [...new Set([
      ...(steps.some(step => step.status === 'degraded') ? ['One or more optional morning sources were unavailable.'] : []),
      ...(failed ? [`${failed} overnight automation failure${failed === 1 ? '' : 's'} need attention.`] : []),
      ...(retried ? [`${retried} overnight workflow${retried === 1 ? '' : 's'} recovered after retry.`] : []),
      ...brief.warnings,
    ])]
    const endedAt = new Date(now.getTime() + 25).toISOString()
    const status = steps.some(step => step.status === 'degraded') ? 'degraded' as const : 'completed' as const
    const result: MorningAutopilotRun = { id, idempotencyKey: id, startedAt: now.toISOString(), endedAt, status, brief, steps, importantAlerts }
    const outputSummary = `Daily Brief generated with ${brief.actions.length} priority actions. Provider health: ${providers.length - unavailable}/${providers.length} available. Overnight: ${failed} failures, ${retried} recovered retries.`
    this.services.automationHistory.save({ id, automationId: 'morning-autopilot', automationName: 'LifeOS Morning Autopilot', trigger, startedAt: result.startedAt, endedAt, durationMs: 25, status: 'completed', outputSummary, errorDetails: status === 'degraded' ? 'Optional source unavailable; remaining morning steps completed.' : undefined, retryCount: 0, relatedLinks: [{ label: 'Open Daily Brief', href: '#/daily-brief' }, { label: 'Open Agent Control', href: '#/agent-control' }] })
    if (importantAlerts.length) this.services.notifications.publish({ title: 'Morning Autopilot needs attention', message: importantAlerts.join(' '), source: 'Automations', severity: 'important', timestamp: endedAt, route: 'automation-history', deduplicationKey: id })
    this.services.activity.publish({ id, timestamp: endedAt, source: 'Automations', type: 'Morning Autopilot run', description: outputSummary, status: status === 'degraded' ? 'attention' : 'success', route: 'automation-history', correlationId: id, runId: id, important: true })
    this.completed.set(id, result)
    return result
  }
}
