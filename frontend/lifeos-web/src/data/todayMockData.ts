import type { TodayData } from '../models/today'

// Centralized frontend-only Today data. It intentionally does not call external services.
export const todayMockData: TodayData = {
  dateLabel: 'Friday, September 13',
  greeting: 'Good morning, Frank',
  summary: 'A focused plan for the work and signals that matter most today.',
  focusLabel: '3 priorities · 5 tasks · 2 scheduled',
  priorities: [
    { id: 'priority-launch', title: 'Review the LifeOS launch brief', detail: 'Clarify the final scope before the afternoon decision window.', source: 'DocIQ · Launch brief', icon: 'file', tone: 'violet' },
    { id: 'priority-property', title: 'Confirm washer service access', detail: 'Send the access window to Olivia before the technician arrives.', source: 'Home · Maintenance', icon: 'home', tone: 'amber' },
    { id: 'priority-finance', title: 'Reconcile September rental income', detail: 'Match the latest payment against the household ledger.', source: 'Finances · Rental income', icon: 'wallet', tone: 'green' },
  ],
  tasks: [
    { id: 'task-brief', title: 'Add decision notes to the launch brief', detail: '20 min focus block', source: 'DocIQ', due: 'Due 10:30 AM', icon: 'file', tone: 'violet' },
    { id: 'task-washer', title: 'Message Olivia about the service window', detail: 'A quick confirmation keeps the visit on track', source: 'Home', due: 'Due 11:00 AM', icon: 'home', tone: 'amber' },
    { id: 'task-invoice', title: 'Review the September utility invoice', detail: 'Compare usage against the monthly plan', source: 'Finances', due: 'Due 2:00 PM', icon: 'wallet', tone: 'blue' },
    { id: 'task-walk', title: 'Take a 20-minute reset walk', detail: 'A light movement break between focus blocks', source: 'Health', due: 'Flexible', icon: 'heart', tone: 'rose' },
    { id: 'task-digest', title: 'Approve the weekly systems digest', detail: 'Check the automation summary before it is sent', source: 'Automations', due: 'Due 4:30 PM', icon: 'bolt', tone: 'teal' },
  ],
  schedule: [
    { id: 'schedule-focus', time: '10:00 AM', title: 'Launch brief focus block', detail: 'Protect the decision-making hour', source: 'Calendar · Focus', icon: 'file', tone: 'violet' },
    { id: 'schedule-service', time: '1:00 PM', title: 'Washer diagnostic visit', detail: 'Cedar House · confirm access beforehand', source: 'Home · Maintenance', icon: 'home', tone: 'amber' },
  ],
  reminders: [
    { id: 'reminder-meds', title: 'Refill pickup reminder', detail: 'Pharmacy pickup window closes at 6:00 PM.', source: 'Health · Reminders', icon: 'heart', tone: 'rose' },
    { id: 'reminder-receipt', title: 'Save utility receipt', detail: 'File it after invoice review to keep the ledger current.', source: 'Finances · Inbox', icon: 'wallet', tone: 'blue' },
  ],
  signals: [
    { id: 'signal-hvac', label: 'Home', title: 'HVAC filter is due soon', detail: 'Replacement is due in 20 days; add it to the next maintenance run.', source: 'Home · Systems', severity: 'Watch', icon: 'alert', tone: 'amber' },
    { id: 'signal-cash', label: 'Finances', title: 'Rent payment matched', detail: 'September income is on plan after the latest ledger match.', source: 'Finances · Rental income', severity: 'Good', icon: 'wallet', tone: 'green' },
    { id: 'signal-automation', label: 'Automations', title: 'Digest needs approval', detail: 'One weekly summary is waiting before its scheduled send.', source: 'Automations · Weekly digest', severity: 'Attention', icon: 'bolt', tone: 'violet' },
  ],
}
