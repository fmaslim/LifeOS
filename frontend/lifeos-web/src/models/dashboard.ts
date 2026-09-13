export type DashboardIcon = 'grid' | 'bolt' | 'play' | 'sparkles' | 'file' | 'wallet' | 'home' | 'heart' | 'settings' | 'arrow' | 'more' | 'check' | 'clock' | 'search' | 'users' | 'send' | 'mail' | 'chart' | 'refresh' | 'chevron'
export type DashboardTone = 'violet' | 'rose' | 'amber' | 'blue' | 'green' | 'teal'

export interface AutomationSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface YouTubePipelineSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface JarvisSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface DocIQSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface RentalIncomeSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface SystemHealthSummary { label: string; value: string; detail: string; icon: DashboardIcon; tone: DashboardTone }
export interface DailyOperation { title: string; meta: string; icon: DashboardIcon; tone: DashboardTone }
export interface RecentActivity { title: string; description: string; time: string; icon: DashboardIcon; tone: DashboardTone }
export interface NavigationItem { label: string; icon: DashboardIcon }
export interface DashboardData {
  navigation: NavigationItem[]
  automationSummary: AutomationSummary
  youtubePipelineSummary: YouTubePipelineSummary
  jarvisSummary: JarvisSummary
  docIQSummary: DocIQSummary
  rentalIncomeSummary: RentalIncomeSummary
  systemHealthSummary: SystemHealthSummary
  dailyOperations: DailyOperation[]
  recentActivity: RecentActivity[]
  currentDateLabel: string
}
