import type { RouteName } from './shell.ts'

export interface BriefAction { id: string; title: string; reason: string; route: RouteName; priority: 'critical' | 'high' | 'normal' }
export interface BriefSignal { id: string; label: string; value: string; detail: string; status: 'good' | 'attention' | 'neutral' }
export interface DailyBriefData { generatedAt: string; greeting: string; actions: BriefAction[]; signals: BriefSignal[]; warnings: string[] }
