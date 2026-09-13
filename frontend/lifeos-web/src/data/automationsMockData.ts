import type { AutomationsData } from '../models/automation'

// Frontend-only data. An API-backed source can replace this when automations are connected.
export const automationsMockData: AutomationsData = {
  active: [
    { id: 'morning-brief', name: 'Morning Command Brief', description: 'Collect priorities, calendar events, and key metrics into your daily brief.', status: 'active', icon: 'sparkles', tone: 'amber', lastRun: 'Today, 7:00 AM', nextRun: 'Tomorrow, 7:00 AM', schedule: 'Every day', runs: '42 runs' },
    { id: 'lead-follow-up', name: 'Lead Follow-up', description: 'Prepare a focused outreach queue for recently qualified prospects.', status: 'active', icon: 'bolt', tone: 'violet', lastRun: '38 min ago', nextRun: 'Today, 4:00 PM', schedule: 'Weekdays', runs: '18 runs' },
    { id: 'inbox-digest', name: 'Inbox Digest', description: 'Surface important messages and document actions that need attention.', status: 'active', icon: 'file', tone: 'blue', lastRun: 'Today, 8:30 AM', nextRun: 'Tomorrow, 8:30 AM', schedule: 'Every day', runs: '31 runs' },
  ],
  scheduled: [
    { id: 'weekly-finance', name: 'Weekly Finance Snapshot', description: 'Compile income, expenses, and upcoming property payments.', status: 'scheduled', icon: 'wallet', tone: 'green', lastRun: 'Last Friday, 5:00 PM', nextRun: 'Friday, 5:00 PM', schedule: 'Every Friday' },
    { id: 'content-planning', name: 'Content Planning Session', description: 'Create a fresh production queue from saved ideas and performance signals.', status: 'scheduled', icon: 'play', tone: 'rose', lastRun: 'Sep 6, 9:00 AM', nextRun: 'Sep 20, 9:00 AM', schedule: 'Every other Friday' },
  ],
  completed: [
    { id: 'lease-index', name: 'Lease Renewal Indexing', description: 'Added the latest lease renewal to DocIQ and updated its reminders.', status: 'completed', icon: 'file', tone: 'blue', lastRun: 'Today, 10:24 AM', runs: 'Completed in 24 sec' },
    { id: 'short-publish', name: 'YouTube Short Publishing', description: 'Published “3 systems for a calmer Monday” to the content pipeline.', status: 'completed', icon: 'play', tone: 'rose', lastRun: 'Yesterday, 3:16 PM', runs: 'Completed in 1 min' },
  ],
  failed: [{ id: 'property-sync', name: 'Property Ledger Sync', description: 'Sync rental ledger activity into this month’s financial overview.', status: 'failed', icon: 'wallet', tone: 'green', lastRun: 'Today, 6:15 AM', issue: 'Connection needs to be refreshed' }],
  blocked: [{ id: 'prospect-enrichment', name: 'Prospect Enrichment', description: 'Enrich new qualified leads with company details before review.', status: 'blocked', icon: 'sparkles', tone: 'amber', lastRun: 'Sep 10, 2:00 PM', issue: 'Waiting for source fields to be mapped' }],
}
