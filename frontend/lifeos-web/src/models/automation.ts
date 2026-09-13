import type { DashboardIcon, DashboardTone } from './dashboard'

export type AutomationStatus = 'active' | 'scheduled' | 'completed' | 'failed' | 'blocked'

export interface Automation { id: string; name: string; description: string; status: AutomationStatus; icon: DashboardIcon; tone: DashboardTone; lastRun: string; nextRun?: string; schedule?: string; runs?: string; issue?: string }
export interface AutomationsData { active: Automation[]; scheduled: Automation[]; completed: Automation[]; failed: Automation[]; blocked: Automation[] }
