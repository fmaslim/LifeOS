import type { DashboardData } from '../models/dashboard'

export interface DashboardService {
  getDashboardData(): DashboardData
}
