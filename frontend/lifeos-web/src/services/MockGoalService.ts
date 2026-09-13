import { goalMockData } from '../data/goalMockData'
import type { GoalData } from '../models/goal'
import type { GoalService } from './GoalService'

/** Local implementation used while Goals remains frontend-only. */
export class MockGoalService implements GoalService {
  getGoalData(): GoalData { return goalMockData }
}
