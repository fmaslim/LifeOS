export type CalendarCategory = 'work' | 'content' | 'home' | 'health' | 'finance' | 'automation'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  category: CalendarCategory
  allDay: boolean
  startTime?: string
  endTime?: string
  description?: string
}

export interface CalendarData {
  events: CalendarEvent[]
  categories: Record<CalendarCategory, { label: string; color: string }>
}
