import { todayMockData } from '../data/todayMockData'
import type { TodayData } from '../models/today'
import type { TodayService } from './TodayService'

/** Local mock implementation. No APIs, integrations, or user data are accessed. */
export class MockTodayService implements TodayService {
  getTodayData(): TodayData { return todayMockData }
}
