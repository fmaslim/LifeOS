import { activityMockData } from '../data/activityMockData'
import type { ActivityData } from '../models/activity'
import type { ActivityService } from './ActivityService'
export class MockActivityService implements ActivityService { getActivityData(): ActivityData { return activityMockData } }
