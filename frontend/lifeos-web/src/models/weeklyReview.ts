import type { RouteName } from './shell'

export type WeeklySignalKind = 'win' | 'miss' | 'blocked' | 'anomaly' | 'info'
export interface WeeklyReviewSignal { id: string; source: string; title: string; detail: string; kind: WeeklySignalKind; route?: RouteName }
export type WeeklyPriorityState = 'proposed' | 'awaiting-approval' | 'accepted' | 'dismissed'
export interface WeeklyPriority { id: string; title: string; reason: string; signalIds: string[]; state: WeeklyPriorityState; approvalId?: string }
export interface WeeklyReviewMetrics { completedTasks: number; overdueTasks: number; atRiskKpis: number; completedProjects: number; publishedContent: number; failedAutomations: number }
export interface WeeklyReview {
  id: string
  weekOf: string
  generatedAt: string
  trigger: 'Manual' | 'Schedule'
  summary: string
  metrics: WeeklyReviewMetrics
  signals: WeeklyReviewSignal[]
  priorities: WeeklyPriority[]
  warnings: string[]
}
