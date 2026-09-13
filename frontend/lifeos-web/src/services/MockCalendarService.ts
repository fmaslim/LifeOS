import { calendarMockData } from '../data/calendarMockData'
import type { CalendarData } from '../models/calendar'
import type { CalendarService } from './CalendarService'

/** Local mock provider; replace only when a user-authorized calendar integration is introduced. */
export class MockCalendarService implements CalendarService { getCalendarData(): CalendarData { return calendarMockData } }
