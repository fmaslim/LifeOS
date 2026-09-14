import type { ActivityService } from './ActivityService.ts'
import type { AutomationRunRepository } from './AutomationHistoryService.ts'
import type { AutomationEvent, EventTriggerCondition, EventTriggerDefinition } from '../models/automation.ts'

export interface EventAutomationResult { triggerId: string; automationId: string; status: 'completed' | 'failed'; runId: string }
export type EventAutomationHandler = (event: AutomationEvent) => void | Promise<void>
export interface EventProvider { fetchEvents(): Promise<AutomationEvent[]> }

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value)
}

function matchesCondition(event: AutomationEvent, condition: EventTriggerCondition) {
  const root = { payload: event.payload, metadata: event.metadata ?? {}, source: event.source, type: event.type, correlationId: event.correlationId }
  const actual = readPath(root, condition.path)
  if (condition.operator === 'exists') return actual !== undefined && actual !== null
  if (condition.operator === 'equals') return actual === condition.value
  if (condition.operator === 'not-equals') return actual !== condition.value
  if (condition.operator === 'contains') return Array.isArray(actual) ? actual.includes(condition.value) : String(actual ?? '').includes(String(condition.value ?? ''))
  return false
}

export function validateAutomationEvent(event: AutomationEvent) {
  if (!event.id.trim() || !event.type.trim() || !event.source.trim()) return false
  const timestamp = Date.parse(event.timestamp)
  return Number.isFinite(timestamp) && typeof event.payload === 'object' && event.payload !== null
}

export class EventAutomationService {
  private readonly triggers = new Map<string, { definition: EventTriggerDefinition; handler: EventAutomationHandler }>()
  private readonly processed = new Set<string>()
  private readonly history: AutomationRunRepository
  private readonly activity: ActivityService

  constructor(history: AutomationRunRepository, activity: ActivityService) { this.history = history; this.activity = activity }

  register(definition: EventTriggerDefinition, handler: EventAutomationHandler) { this.triggers.set(definition.id, { definition, handler }) }
  unregister(triggerId: string) { this.triggers.delete(triggerId) }
  listTriggers() { return [...this.triggers.values()].map(item => ({ ...item.definition, conditions: item.definition.conditions?.map(condition => ({ ...condition })) })) }

  async sync(provider: EventProvider) { return this.ingestMany(await provider.fetchEvents()) }

  async ingest(event: AutomationEvent): Promise<EventAutomationResult[]> {
    if (!validateAutomationEvent(event)) return []
    const dedupeKey = `${event.source}:${event.id}`
    if (this.processed.has(dedupeKey)) return []
    this.processed.add(dedupeKey)
    const results: EventAutomationResult[] = []
    for (const { definition, handler } of this.triggers.values()) {
      if (!definition.enabled || definition.eventType !== event.type || (definition.source && definition.source !== event.source)) continue
      if ((definition.conditions ?? []).some(condition => !matchesCondition(event, condition))) continue
      const startedAt = new Date().toISOString()
      const runId = `event-${definition.id}-${event.source}-${event.id}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 140)
      try {
        await handler(event)
        const endedAt = new Date().toISOString()
        this.history.save({ id: runId, automationId: definition.automationId, automationName: definition.name, trigger: `Event · ${event.source} · ${event.type}`, triggerSource: event.source, correlationId: event.correlationId, startedAt, endedAt, durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)), status: 'completed', outputSummary: `Triggered by ${event.type} from ${event.source}.`, retryCount: 0, relatedLinks: [{ label: 'Open automation', href: '#/automations' }] })
        this.activity.publish({ id: `event-run-${runId}`, timestamp: endedAt, source: 'Automations', type: 'Event-triggered automation', description: `${definition.name} ran from ${event.source}:${event.type}.`, status: 'success', route: 'automation-history', correlationId: event.correlationId, runId, important: true })
        results.push({ triggerId: definition.id, automationId: definition.automationId, status: 'completed', runId })
      } catch (error) {
        const endedAt = new Date().toISOString()
        this.history.save({ id: runId, automationId: definition.automationId, automationName: definition.name, trigger: `Event · ${event.source} · ${event.type}`, triggerSource: event.source, correlationId: event.correlationId, startedAt, endedAt, durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)), status: 'failed', outputSummary: 'Event-triggered workflow failed safely.', errorDetails: error instanceof Error ? error.message : 'Event handler failed.', retryCount: 0, relatedLinks: [{ label: 'Open run history', href: '#/automation-history' }] })
        this.activity.publish({ id: `event-run-${runId}`, timestamp: endedAt, source: 'Automations', type: 'Event-triggered automation failed', description: `${definition.name} failed without stopping other event handlers.`, status: 'attention', route: 'automation-history', correlationId: event.correlationId, runId, important: true })
        results.push({ triggerId: definition.id, automationId: definition.automationId, status: 'failed', runId })
      }
    }
    return results
  }

  async ingestMany(events: AutomationEvent[]) { const results: EventAutomationResult[] = []; for (const event of events) results.push(...await this.ingest(event)); return results }
}
