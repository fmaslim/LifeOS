import type { SettingsData } from '../models/settings'

// Frontend-only settings preview. No accounts, credentials, or external services are connected.
export const settingsMockData: SettingsData = {
  profile: { name: 'Frank Maslowski', email: 'frank@lifeos.local', initials: 'FM', workspaceName: 'Personal workspace', timezone: 'America/New_York' },
  appearance: 'dark',
  notifications: [
    { id: 'daily-brief', label: 'Daily brief', description: 'A calm summary when your day begins.', enabled: true },
    { id: 'automation-review', label: 'Automation review', description: 'When a workflow needs your approval.', enabled: true },
    { id: 'weekly-review', label: 'Weekly review', description: 'A weekly reset for your active systems.', enabled: false },
    { id: 'quiet-updates', label: 'Quiet updates', description: 'Small product and workspace changes.', enabled: false },
  ],
  integrations: [
    { id: 'youtube', name: 'YouTube', description: 'Plan, publish, and review your content pipeline.', icon: 'play', tone: 'rose', detail: 'Not connected' },
    { id: 'jarvis', name: 'Jarvis', description: 'Bring your personal assistant into focused workflows.', icon: 'sparkles', tone: 'amber', detail: 'Coming soon' },
    { id: 'dociq', name: 'DocIQ', description: 'Organize documents and surface key decisions.', icon: 'file', tone: 'blue', detail: 'Not connected' },
    { id: 'finance', name: 'Finance', description: 'See financial snapshots and property operations.', icon: 'wallet', tone: 'green', detail: 'Not connected' },
    { id: 'health', name: 'Health', description: 'Keep wellbeing signals and routines in view.', icon: 'heart', tone: 'teal', detail: 'Coming soon' },
    { id: 'smart-home', name: 'Smart home', description: 'Coordinate household routines from one place.', icon: 'home', tone: 'violet', detail: 'Not connected' },
  ],
  automationDefaults: { runTime: '7:00 AM', approvalBehavior: 'ask', weeklyReview: true },
  privacyItems: [
    { title: 'Data controls', description: 'Manage local workspace data and future export options.', action: 'View controls' },
    { title: 'Activity history', description: 'Review the activity that will appear as you use LifeOS.', action: 'View history' },
    { title: 'Workspace reset', description: 'A future option to clear this local preview workspace.', action: 'Learn more' },
  ],
}
