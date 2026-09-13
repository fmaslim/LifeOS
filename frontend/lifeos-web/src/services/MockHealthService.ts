import { healthMockData } from '../data/healthMockData'
import type { HealthData } from '../models/health'
import type { HealthService } from './HealthService'

/** Local mock implementation. No health records, credentials, or integrations are used. */
export class MockHealthService implements HealthService {
  getHealthData(): HealthData { return healthMockData }
}
