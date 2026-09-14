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
export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type KpiStatus = 'on-track' | 'at-risk' | 'achieved' | 'archived'
export interface KpiSnapshot { at: string; value: number }
export interface GoalKpi { id: string; goalId?: string; name: string; area: GoalArea; target: number; current: number; unit: string; frequency: KpiFrequency; status: KpiStatus; history: KpiSnapshot[] }
export interface KpiData { kpis: GoalKpi[] }
