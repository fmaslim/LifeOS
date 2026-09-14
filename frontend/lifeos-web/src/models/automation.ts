import type { DashboardIcon, DashboardTone } from './dashboard'

export type AutomationStatus = 'active' | 'scheduled' | 'completed' | 'failed' | 'blocked'

export interface Automation { id: string; name: string; description: string; status: AutomationStatus; icon: DashboardIcon; tone: DashboardTone; lastRun: string; nextRun?: string; schedule?: string; runs?: string; issue?: string }
export interface AutomationsData { active: Automation[]; scheduled: Automation[]; completed: Automation[]; failed: Automation[]; blocked: Automation[] }

export type ScheduleCadence = { type: 'daily'; time: string } | { type: 'weekly'; weekday: number; time: string } | { type: 'custom'; intervalDays: number; time: string; anchorDate: string }
export type ScheduleExecutionState = 'idle' | 'queued' | 'running' | 'failed'
export interface AutomationSchedule { id: string; automationId: string; name: string; enabled: boolean; timezone: string; cadence: ScheduleCadence; previousRun?: string; nextRun: string; executionState: ScheduleExecutionState }
export interface ScheduleData { schedules: AutomationSchedule[] }

export type EventConditionOperator = 'equals' | 'not-equals' | 'contains' | 'exists'
export interface EventTriggerCondition { path: string; operator: EventConditionOperator; value?: unknown }
export interface EventTriggerDefinition { id: string; automationId: string; name: string; enabled: boolean; eventType: string; source?: string; conditions?: EventTriggerCondition[] }
export interface AutomationEvent { id: string; type: string; source: string; timestamp: string; correlationId?: string; metadata?: Record<string, unknown>; payload: Record<string, unknown> }

export type AutomationRunStatus = 'completed' | 'failed' | 'canceled' | 'retried'
export interface AutomationRun { id: string; automationId: string; automationName: string; trigger: string; triggerSource?: string; correlationId?: string; startedAt: string; endedAt: string; durationMs: number; status: AutomationRunStatus; outputSummary: string; errorDetails?: string; retryCount: number; retryReason?: string; relatedLinks: Array<{ label: string; href: string }> }
export interface AutomationRunFilter { automationId?: string; status?: AutomationRunStatus; from?: string; to?: string }
