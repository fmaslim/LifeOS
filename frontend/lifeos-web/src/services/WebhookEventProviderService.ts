import type { AutomationEvent } from '../models/automation.ts'

const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')

interface StoredWebhookEvent { id: string; type: string; source: string; timestamp: string; correlationId?: string | null; metadata?: Record<string, unknown> | null; payload: Record<string, unknown> }

export class WebhookEventProviderService {
  async fetchEvents(): Promise<AutomationEvent[]> {
    try {
      const response = await fetch(`${apiBase}/api/events/inbox`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!response.ok) return []
      const items = await response.json() as StoredWebhookEvent[]
      return items.map(item => ({ id: item.id, type: item.type, source: item.source, timestamp: item.timestamp, correlationId: item.correlationId ?? undefined, metadata: item.metadata ?? undefined, payload: item.payload }))
    } catch { return [] }
  }
}

export const webhookEventProviderService = new WebhookEventProviderService()
