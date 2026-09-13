export type GoalStatus = 'active' | 'completed' | 'paused'
export type GoalArea = 'Business' | 'Content' | 'Finance' | 'Home' | 'Learning'

export interface GoalMilestone {
  id: string
  title: string
  completed: boolean
}

/** A long-horizon outcome, with locally trackable milestones. */
export interface Goal {
  id: string
  title: string
  description: string
  area: GoalArea
  status: GoalStatus
  targetDate: string
  milestones: GoalMilestone[]
}

export interface GoalData { goals: Goal[] }
