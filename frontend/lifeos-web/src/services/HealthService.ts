import type { HealthData } from '../models/health'

/** Contract for wellbeing data; an API-backed service can implement this later. */
export interface HealthService { getHealthData(): HealthData }
