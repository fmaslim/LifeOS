import type { HealthData } from '../models/health'

// Centralized frontend-only mock data for the Health workspace.
export const healthMockData: HealthData = {
  dateLabel: 'Wednesday, September 13',
  readiness: 'Balanced day ahead',
  summaries: [
    { label: 'Activity', value: '7,842', detail: 'of 10,000 steps', progress: 78, icon: 'bolt', tone: 'amber' },
    { label: 'Sleep', value: '7h 24m', detail: '84% sleep score', progress: 84, icon: 'clock', tone: 'violet' },
    { label: 'Hydration', value: '5 / 8', detail: 'glasses logged', progress: 63, icon: 'refresh', tone: 'blue' },
    { label: 'Med adherence', value: '2 / 2', detail: 'doses completed', progress: 100, icon: 'check', tone: 'green' },
    { label: 'Rehab & fitness', value: '32 min', detail: 'of 45 min planned', progress: 71, icon: 'heart', tone: 'teal' },
  ],
  habits: [
    { id: 'morning-medication', title: 'Morning medication', detail: 'Completed at 8:10 AM', completed: true, icon: 'check', tone: 'green' },
    { id: 'mobility', title: 'Mobility routine', detail: '12-minute guided session', completed: true, icon: 'heart', tone: 'teal' },
    { id: 'water', title: 'Finish three more glasses of water', detail: '5 of 8 glasses logged', completed: false, icon: 'refresh', tone: 'blue' },
    { id: 'walk', title: 'Evening walk', detail: '2,158 steps to daily goal', completed: false, icon: 'bolt', tone: 'amber' },
  ],
  trends: [
    { id: 'movement', label: 'Weekly movement', value: '4 of 5 days', detail: 'One more active day keeps your streak going.', progress: 80, tone: 'amber' },
    { id: 'sleep', label: 'Sleep consistency', value: '86%', detail: 'Bedtime has stayed within 34 minutes.', progress: 86, tone: 'violet' },
    { id: 'rehab', label: 'Rehab plan', value: '71%', detail: 'Three sessions remain this week.', progress: 71, tone: 'teal' },
  ],
  reminders: [
    { id: 'hydration', title: 'Hydration check-in', detail: 'Log your next glass of water', time: '2:30 PM', kind: 'Reminder', icon: 'refresh', tone: 'blue' },
    { id: 'physical-therapy', title: 'Physical therapy', detail: 'Northside Wellness · Room 204', time: 'Tomorrow, 9:00 AM', kind: 'Appointment', icon: 'heart', tone: 'teal' },
    { id: 'refill', title: 'Prescription refill', detail: 'Review refill request before Friday', time: 'Friday', kind: 'Reminder', icon: 'check', tone: 'green' },
  ],
  activity: [
    { id: 'walk', title: 'Outdoor walk logged', description: '28 min · 3,416 steps added to today', time: '11:42 AM', icon: 'bolt', tone: 'amber' },
    { id: 'sleep', title: 'Sleep synced', description: '7h 24m with a steady bedtime window', time: '7:18 AM', icon: 'clock', tone: 'violet' },
    { id: 'rehab', title: 'Mobility routine completed', description: '12 min · Lower body recovery', time: 'Yesterday', icon: 'heart', tone: 'teal' },
  ],
}
