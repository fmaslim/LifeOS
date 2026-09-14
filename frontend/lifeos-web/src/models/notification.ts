import type { RouteName } from './shell'
export type NotificationSource = 'Automations' | 'Integrations' | 'GitHub' | 'Tasks' | 'Goals' | 'Content' | 'Jarvis' | 'DocIQ' | 'Home' | 'Health' | 'Finances' | 'System'
export type NotificationSeverity = 'critical' | 'important' | 'normal'
export interface LifeNotification { id: string; title: string; message: string; source: NotificationSource; severity: NotificationSeverity; timestamp: string; read: boolean; route?: RouteName; deduplicationKey?: string }
export interface NotificationEvent { title: string; message: string; source: NotificationSource; severity: NotificationSeverity; timestamp: string; route?: RouteName; deduplicationKey: string }
export interface NotificationData { notifications: LifeNotification[] }
