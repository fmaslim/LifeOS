import type { DailyBriefData } from './dailyBrief.ts'

export type MorningAutopilotStepStatus = 'completed' | 'degraded'
export interface MorningAutopilotStep { id: string; label: string; status: MorningAutopilotStepStatus; summary: string }
export interface MorningAutopilotRun {
  id: string
  idempotencyKey: string
  startedAt: string
  endedAt: string
  status: 'completed' | 'degraded'
  brief: DailyBriefData
  steps: MorningAutopilotStep[]
  importantAlerts: string[]
}
