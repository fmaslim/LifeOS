import type { GoalData } from '../models/goal'

/** Contract for Goals data; replaceable by a backend adapter in the future. */
export interface GoalService { getGoalData(): GoalData }
