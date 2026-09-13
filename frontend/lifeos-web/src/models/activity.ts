import type { RouteName } from './shell'
export type ActivitySource = 'Automations' | 'Content' | 'Jarvis' | 'DocIQ' | 'Tasks' | 'Goals' | 'Home' | 'Health' | 'Finances'
export type ActivityStatus = 'success' | 'attention' | 'in-progress' | 'info'
export interface ActivityEvent { id: string; timestamp: string; source: ActivitySource; type: string; description: string; status: ActivityStatus; route?: RouteName }
export interface ActivityData { events: ActivityEvent[] }
