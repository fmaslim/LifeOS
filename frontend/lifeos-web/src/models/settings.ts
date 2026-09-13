import type { DashboardIcon, DashboardTone } from './dashboard'

export type AppearanceMode = 'dark' | 'system' | 'light'
export type ApprovalBehavior = 'ask' | 'always' | 'never'

export interface SettingsProfile { name: string; email: string; initials: string; workspaceName: string; timezone: string }
export interface NotificationPreference { id: string; label: string; description: string; enabled: boolean }
export interface IntegrationPreview { id: string; name: string; description: string; icon: DashboardIcon; tone: DashboardTone; detail: string }
export interface AutomationDefaults { runTime: string; approvalBehavior: ApprovalBehavior; weeklyReview: boolean }
export interface PrivacyItem { title: string; description: string; action: string }
export interface SettingsData {
  profile: SettingsProfile
  appearance: AppearanceMode
  notifications: NotificationPreference[]
  integrations: IntegrationPreview[]
  automationDefaults: AutomationDefaults
  privacyItems: PrivacyItem[]
}
