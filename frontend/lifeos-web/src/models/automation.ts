import type { DashboardIcon, DashboardTone } from './dashboard'

export type AutomationStatus = 'active' | 'scheduled' | 'completed' | 'failed' | 'blocked'

export interface Automation { id: string; name: string; description: string; status: AutomationStatus; icon: DashboardIcon; tone: DashboardTone; lastRun: string; nextRun?: string; schedule?: string; runs?: string; issue?: string }
export interface AutomationsData { active: Automation[]; scheduled: Automation[]; completed: Automation[]; failed: Automation[]; blocked: Automation[] }

export type ScheduleCadence = { type: 'daily'; time: string } | { type: 'weekly'; weekday: number; time: string } | { type: 'custom'; intervalDays: number; time: string; anchorDate: string }
export type ScheduleExecutionState = 'idle' | 'queued' | 'running' | 'failed'
export interface AutomationSchedule { id: string; automationId: string; name: string; enabled: boolean; timezone: string; cadence: ScheduleCadence; previousRun?: string; nextRun: string; executionState: ScheduleExecutionState }
export interface ScheduleData { schedules: AutomationSchedule[] }
