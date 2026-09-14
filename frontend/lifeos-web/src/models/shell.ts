import type { DashboardIcon } from './dashboard'

export type RouteName = 'dashboard' | 'daily-brief' | 'today' | 'activity' | 'calendar' | 'notes' | 'tasks' | 'goals' | 'projects' | 'habits' | 'learning' | 'contacts' | 'reading' | 'documents' | 'budget' | 'property' | 'content-pipeline' | 'automation-builder' | 'automations' | 'schedules' | 'content' | 'jarvis' | 'dociq' | 'finances' | 'home' | 'health' | 'settings'

export interface ShellNavigationItem { label: string; route: RouteName; icon: DashboardIcon }
export interface WorkspaceProfile { initials: string; name: string; workspaceName: string }
export interface PlaceholderPageData { route: RouteName; eyebrow: string; title: string; description: string; status: string; icon: DashboardIcon }
export interface ShellData { navigation: ShellNavigationItem[]; profile: WorkspaceProfile; placeholderPages: PlaceholderPageData[] }
