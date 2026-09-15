import type { RouteName } from './shell'
export type ActivitySource = 'Automations' | 'Agents' | 'Integrations' | 'GitHub' | 'Content' | 'Jarvis' | 'DocIQ' | 'Tasks' | 'Goals' | 'Home' | 'Health' | 'Finances' | 'Approvals' | 'Backups' | 'System'
export type ActivityStatus = 'success' | 'attention' | 'in-progress' | 'info'
export interface ActivityEvent { id: string; timestamp: string; source: ActivitySource; type: string; description: string; status: ActivityStatus; route?: RouteName; correlationId?: string; runId?: string; important?: boolean }
export interface ActivityData { events: ActivityEvent[] }
