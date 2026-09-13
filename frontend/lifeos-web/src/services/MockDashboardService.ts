import { dashboardMockData } from '../data/dashboardMockData'
import type { DashboardData } from '../models/dashboard'
import type { DashboardService } from './DashboardService'

/** Frontend-only service implementation; swap this class for an API implementation later. */
export class MockDashboardService implements DashboardService {
  getDashboardData(): DashboardData {
    return dashboardMockData
  }
}
