import type { DashboardIcon, DashboardTone } from './dashboard'

export type HomeIcon = Extract<DashboardIcon, 'home' | 'users' | 'wallet' | 'bolt' | 'files' | 'settings' | 'alert' | 'clock' | 'check' | 'arrow'>
export type HomeTone = DashboardTone

export interface HomeMetric { label: string; value: string; detail: string; icon: HomeIcon; tone: HomeTone }
export interface OccupancyRoom { id: string; name: string; occupant: string; detail: string; status: 'Occupied' | 'Available' | 'Private'; tone: HomeTone }
export interface HomeSystem { id: string; name: string; detail: string; status: 'Healthy' | 'Attention' | 'Offline'; icon: HomeIcon; tone: HomeTone }
export interface HomeProject { id: string; title: string; detail: string; due: string; priority: 'Scheduled' | 'This week' | 'Needs attention'; icon: HomeIcon; tone: HomeTone }
export interface HouseholdActivity { id: string; title: string; description: string; time: string; icon: HomeIcon; tone: HomeTone }

/** Complete view model for the frontend-only Home/property workspace. */
export interface HomeData {
  propertyName: string
  propertyDetail: string
  periodLabel: string
  metrics: HomeMetric[]
  occupancy: OccupancyRoom[]
  systems: HomeSystem[]
  projects: HomeProject[]
  activity: HouseholdActivity[]
}
