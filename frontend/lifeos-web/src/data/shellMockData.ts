import type { ShellData } from '../models/shell'

// Placeholder shell data only. Replace it with a backend-backed source when integrations are introduced.
export const shellMockData: ShellData = {
  profile: { initials: 'FM', name: 'Frank Maslowski', workspaceName: 'Personal workspace' },
  navigation: [
    { label: 'Inbox', route: 'inbox', icon: 'file' },
    { label: 'Production Health', route: 'production-health', icon: 'alert' },
    { label: 'Releases', route: 'releases', icon: 'refresh' },
    { label: 'KPIs', route: 'kpis', icon: 'chart' },
    { label: 'AI Assistant', route: 'assistant', icon: 'sparkles' },
    { label: 'Approvals', route: 'approvals', icon: 'review' },
    { label: 'Agent Control', route: 'agent-control', icon: 'bolt' },
    { label: 'GitHub', route: 'github', icon: 'folder' },
    { label: 'Run History', route: 'automation-history', icon: 'refresh' },
    { label: 'Schedules', route: 'schedules', icon: 'clock' },
    { label: 'Daily Brief', route: 'daily-brief', icon: 'sparkles' },
    { label: 'Weekly Review', route: 'weekly-review', icon: 'review' },
    { label: 'Dashboard', route: 'dashboard', icon: 'grid' }, { label: 'Today', route: 'today', icon: 'check' }, { label: 'Activity', route: 'activity', icon: 'refresh' }, { label: 'Calendar', route: 'calendar', icon: 'calendar' }, { label: 'Notes', route: 'notes', icon: 'file' }, { label: 'Tasks', route: 'tasks', icon: 'check' }, { label: 'Goals', route: 'goals', icon: 'target' }, { label: 'Projects', route: 'projects', icon: 'folder' }, { label: 'Habits', route: 'habits', icon: 'refresh' }, { label: 'Routines', route: 'routines', icon: 'clock' }, { label: 'Learning', route: 'learning', icon: 'files' }, { label: 'Contacts', route: 'contacts', icon: 'users' }, { label: 'Reading', route: 'reading', icon: 'files' }, { label: 'Documents', route: 'documents', icon: 'file' }, { label: 'Budget', route: 'budget', icon: 'wallet' }, { label: 'Property', route: 'property', icon: 'home' }, { label: 'Content Pipeline', route: 'content-pipeline', icon: 'play' }, { label: 'Automation Builder', route: 'automation-builder', icon: 'bolt' }, { label: 'Automations', route: 'automations', icon: 'bolt' }, { label: 'Content', route: 'content', icon: 'play' }, { label: 'Jarvis', route: 'jarvis', icon: 'sparkles' }, { label: 'DocIQ', route: 'dociq', icon: 'file' }, { label: 'Finances', route: 'finances', icon: 'wallet' }, { label: 'Home', route: 'home', icon: 'home' }, { label: 'Health', route: 'health', icon: 'heart' }, { label: 'Settings', route: 'settings', icon: 'settings' },
  ],
  placeholderPages: [
    { route: 'weekly-review', eyebrow: 'Operating review', title: 'Weekly Review', description: 'Cross-LifeOS progress and next-week planning.', status: 'Ready', icon: 'review' },
  ],
}
