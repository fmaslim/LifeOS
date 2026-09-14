import { calendarMockData } from '../data/calendarMockData'
import type { CalendarData, CalendarEvent } from '../models/calendar'
import { localStore } from '../storage/LocalStore'
import { storageKeys } from '../storage/storageKeys'
import type { CalendarService } from './CalendarService'

/** Local-first adapter. Provider refreshes are reconciled into the existing calendar collection before the app shell loads. */
export class MockCalendarService implements CalendarService {
  getCalendarData(): CalendarData {
    return { ...calendarMockData, events: localStore.read<CalendarEvent[]>(storageKeys.calendar, calendarMockData.events) }
  }
}
