import type { DashboardData } from '../models/dashboard'

// Placeholder dashboard data only. Replace this module with an API-backed data source when backend integration begins.
export const dashboardMockData: DashboardData = {
  currentDateLabel: 'Sunday, September 13',
  navigation: [{ label: 'Dashboard', icon: 'grid' }, { label: 'Automations', icon: 'bolt' }, { label: 'Content', icon: 'play' }, { label: 'Jarvis', icon: 'sparkles' }, { label: 'DocIQ', icon: 'file' }, { label: 'Finances', icon: 'wallet' }, { label: 'Home', icon: 'home' }, { label: 'Health', icon: 'heart' }],
  automationSummary: { label: 'Active Automations', value: '12', detail: '2 ran in the last hour', icon: 'bolt', tone: 'violet' },
  youtubePipelineSummary: { label: 'YouTube Pipeline', value: '4', detail: 'Videos in progress', icon: 'play', tone: 'rose' },
  jarvisSummary: { label: 'Jarvis Prospects', value: '28', detail: '+6 new today', icon: 'sparkles', tone: 'amber' },
  docIQSummary: { label: 'DocIQ Status', value: 'Ready', detail: 'All documents indexed', icon: 'file', tone: 'blue' },
  rentalIncomeSummary: { label: 'Monthly Rental Income', value: '$8,420', detail: 'On track this month', icon: 'wallet', tone: 'green' },
  systemHealthSummary: { label: 'System Health', value: '98%', detail: 'All systems operational', icon: 'heart', tone: 'teal' },
  dailyOperations: [{ title: 'Generate YouTube Short', meta: 'Content pipeline · Due today', icon: 'play', tone: 'rose' }, { title: 'Run Jarvis prospecting', meta: 'Lead generation · Scheduled 10:00 AM', icon: 'sparkles', tone: 'amber' }, { title: 'Check automation failures', meta: 'System maintenance · 1 item needs review', icon: 'bolt', tone: 'violet' }, { title: 'Review DocIQ activity', meta: 'Knowledge base · 3 documents added', icon: 'file', tone: 'blue' }],
  recentActivity: [{ title: 'Automation completed', description: 'Weekly finance snapshot was generated', time: '12 min ago', icon: 'bolt', tone: 'violet' }, { title: 'New prospect added', description: 'Jarvis added 6 qualified prospects', time: '46 min ago', icon: 'sparkles', tone: 'amber' }, { title: 'Document processed', description: 'Lease renewal indexed by DocIQ', time: '2 hrs ago', icon: 'file', tone: 'blue' }],
}
