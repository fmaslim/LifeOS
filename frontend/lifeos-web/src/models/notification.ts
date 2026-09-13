import type { RouteName } from './shell'
export type NotificationSource = 'Automations' | 'Tasks' | 'Goals' | 'Content' | 'Jarvis' | 'DocIQ' | 'Home' | 'Health' | 'Finances'
export type NotificationSeverity = 'critical' | 'important' | 'normal'
export interface LifeNotification { id: string; title: string; message: string; source: NotificationSource; severity: NotificationSeverity; timestamp: string; read: boolean; route?: RouteName }
export interface NotificationData { notifications: LifeNotification[] }
