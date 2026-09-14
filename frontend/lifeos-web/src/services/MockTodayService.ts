import { todayMockData } from '../data/todayMockData'
import type { CalendarEvent } from '../models/calendar'
import type { TodayData, TodayScheduleItem } from '../models/today'
import { localStore } from '../storage/LocalStore'
import { storageKeys } from '../storage/storageKeys'
import type { TodayService } from './TodayService'

const formatTime = (event: CalendarEvent) => event.allDay ? 'All day' : event.startTime ?? 'Scheduled'

/** Local-first Today service that consumes the same reconciled calendar collection as Calendar and Daily Brief. */
export class MockTodayService implements TodayService {
  getTodayData(): TodayData {
    const today = new Date().toISOString().slice(0, 10)
    const events = localStore.read<CalendarEvent[]>(storageKeys.calendar, []).filter(event => event.date === today)
    const providerSchedule: TodayScheduleItem[] = events.map(event => ({ id: `today-${event.id}`, time: formatTime(event), title: event.title, detail: event.description ?? 'Calendar event', source: 'Calendar', icon: 'clock', tone: 'blue' }))
    return { ...todayMockData, schedule: providerSchedule.length ? providerSchedule : todayMockData.schedule }
  }
}
