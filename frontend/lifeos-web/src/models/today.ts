import type { DashboardIcon, DashboardTone } from './dashboard'

export type TodayIcon = Extract<DashboardIcon, 'alert' | 'arrow' | 'bolt' | 'check' | 'clock' | 'file' | 'heart' | 'home' | 'mail' | 'sparkles' | 'wallet'>
export type TodayTone = DashboardTone

export interface TodayPriority { id: string; title: string; detail: string; source: string; icon: TodayIcon; tone: TodayTone }
export interface TodayTask { id: string; title: string; detail: string; source: string; due: string; icon: TodayIcon; tone: TodayTone }
export interface TodayScheduleItem { id: string; time: string; title: string; detail: string; source: string; icon: TodayIcon; tone: TodayTone }
export interface TodayReminder { id: string; title: string; detail: string; source: string; icon: TodayIcon; tone: TodayTone }
export interface TodaySignal { id: string; label: string; title: string; detail: string; source: string; severity: 'Attention' | 'Watch' | 'Good'; icon: TodayIcon; tone: TodayTone }

/** Complete frontend view model for the integration-free Today workspace. */
export interface TodayData {
  dateLabel: string
  greeting: string
  summary: string
  focusLabel: string
  priorities: TodayPriority[]
  tasks: TodayTask[]
  schedule: TodayScheduleItem[]
  reminders: TodayReminder[]
  signals: TodaySignal[]
}
