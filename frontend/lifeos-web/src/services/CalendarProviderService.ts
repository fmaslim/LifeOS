import type { CalendarEvent } from '../models/calendar'

export type CalendarProviderStatus = 'loading' | 'connected' | 'disconnected' | 'unauthorized' | 'rate-limited' | 'stale' | 'unavailable'

type ProviderEvent = {
  id: string
  title: string
  start?: string | null
  end?: string | null
  startDate?: string | null
  endDate?: string | null
  description?: string | null
  htmlLink?: string | null
}

type ProviderSnapshot = {
  status: Exclude<CalendarProviderStatus, 'loading' | 'stale'>
  checkedAt: string
  events: ProviderEvent[]
  message?: string | null
}

export type CalendarProviderView = {
  status: CalendarProviderStatus
  checkedAt?: string
  message?: string
  events: CalendarEvent[]
}

const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')

export function mapProviderEvent(event: ProviderEvent): CalendarEvent {
  const start = event.start ? new Date(event.start) : null
  const end = event.end ? new Date(event.end) : null
  const date = event.startDate ?? (start ? start.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
  const time = (value: Date | null) => value ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : undefined
  return {
    id: `provider-calendar-${event.id}`,
    title: event.title,
    date,
    category: 'work',
    allDay: Boolean(event.startDate),
    startTime: time(start),
    endTime: time(end),
    description: event.description ?? undefined,
  }
}

export class CalendarProviderService {
  private cache: CalendarProviderView = { status: 'loading', events: [] }
  private inFlight?: Promise<CalendarProviderView>

  getCached(): CalendarProviderView { return this.cache }

  async refresh(): Promise<CalendarProviderView> {
    if (this.inFlight) return this.inFlight
    this.inFlight = this.load().finally(() => { this.inFlight = undefined })
    return this.inFlight
  }

  private async load(): Promise<CalendarProviderView> {
    try {
      const response = await fetch(`${apiBase}/api/calendar/events`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!response.ok) return this.set({ status: response.status === 401 ? 'unauthorized' : 'unavailable', events: [], message: 'Calendar connection is unavailable.' })
      const snapshot = (await response.json()) as ProviderSnapshot
      const checkedAt = snapshot.checkedAt
      const age = Date.now() - new Date(checkedAt).getTime()
      const status: CalendarProviderStatus = snapshot.status === 'connected' && age > 15 * 60_000 ? 'stale' : snapshot.status
      return this.set({ status, checkedAt, message: snapshot.message ?? undefined, events: snapshot.events.map(mapProviderEvent) })
    } catch {
      return this.set({ status: 'unavailable', events: [], message: 'Calendar connection is unavailable.' })
    }
  }

  async requestWrite(action: 'create' | 'update' | 'delete', event: CalendarEvent): Promise<{ status: 'approval-required'; action: string; payload: CalendarEvent }> {
    return { status: 'approval-required', action: `calendar.${action}`, payload: event }
  }

  private set(value: CalendarProviderView) { this.cache = value; return value }
}

export const calendarProviderService = new CalendarProviderService()
