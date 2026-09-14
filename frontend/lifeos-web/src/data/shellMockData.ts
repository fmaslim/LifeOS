import type { ShellData } from '../models/shell'

// Placeholder shell data only. Replace it with a backend-backed source when integrations are introduced.
export const shellMockData: ShellData = {
  profile: { initials: 'FM', name: 'Frank Maslowski', workspaceName: 'Personal workspace' },
  navigation: [
    { label: 'Dashboard', route: 'dashboard', icon: 'grid' }, { label: 'Today', route: 'today', icon: 'check' }, { label: 'Activity', route: 'activity', icon: 'refresh' }, { label: 'Calendar', route: 'calendar', icon: 'calendar' }, { label: 'Notes', route: 'notes', icon: 'file' }, { label: 'Tasks', route: 'tasks', icon: 'check' }, { label: 'Goals', route: 'goals', icon: 'target' }, { label: 'Projects', route: 'projects', icon: 'folder' }, { label: 'Habits', route: 'habits', icon: 'refresh' }, { label: 'Learning', route: 'learning', icon: 'files' }, { label: 'Contacts', route: 'contacts', icon: 'users' }, { label: 'Reading', route: 'reading', icon: 'files' }, { label: 'Documents', route: 'documents', icon: 'file' }, { label: 'Budget', route: 'budget', icon: 'wallet' }, { label: 'Property', route: 'property', icon: 'home' }, { label: 'Content Pipeline', route: 'content-pipeline', icon: 'play' }, { label: 'Automations', route: 'automations', icon: 'bolt' }, { label: 'Content', route: 'content', icon: 'play' }, { label: 'Jarvis', route: 'jarvis', icon: 'sparkles' }, { label: 'DocIQ', route: 'dociq', icon: 'file' }, { label: 'Finances', route: 'finances', icon: 'wallet' }, { label: 'Home', route: 'home', icon: 'home' }, { label: 'Health', route: 'health', icon: 'heart' }, { label: 'Settings', route: 'settings', icon: 'settings' },
  ],
  placeholderPages: [
    { route: 'automations', eyebrow: 'Workflow control', title: 'Automations', description: 'Monitor, organize, and build the systems that keep LifeOS moving.', status: 'Automation workspace coming soon', icon: 'bolt' },
    { route: 'content', eyebrow: 'Creative engine', title: 'Content', description: 'Plan and manage your content pipeline from one focused workspace.', status: 'Content workspace coming soon', icon: 'play' },
    { route: 'dociq', eyebrow: 'Knowledge base', title: 'DocIQ', description: 'Keep the documents and knowledge that matter organized and accessible.', status: 'DocIQ workspace coming soon', icon: 'file' },
    { route: 'finances', eyebrow: 'Financial overview', title: 'Finances', description: 'A clear home for your income, properties, and financial decisions.', status: 'Finance workspace coming soon', icon: 'wallet' },
    { route: 'home', eyebrow: 'Household system', title: 'Home', description: 'Bring your household priorities and operations into one calm workspace.', status: 'Home workspace coming soon', icon: 'home' },
    { route: 'health', eyebrow: 'Personal wellbeing', title: 'Health', description: 'A focused view of the habits and signals that support your wellbeing.', status: 'Health workspace coming soon', icon: 'heart' },
    { route: 'settings', eyebrow: 'Workspace preferences', title: 'Settings', description: 'Configure your LifeOS workspace as new integrations become available.', status: 'Settings workspace coming soon', icon: 'settings' },
  ],
}
