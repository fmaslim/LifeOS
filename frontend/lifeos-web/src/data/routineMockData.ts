import type { RoutineData } from '../models/routine.ts'

// Frontend-only seed data. Steps reference ids from the existing task/habit/automation
// mock data so routine execution reuses those real workspace records instead of
// duplicating them. No scheduled instances are seeded; RoutineService derives those
// deterministically from cadence so duplicate-prevention stays testable.
export const routineMockData: RoutineData = {
  routines: [
    {
      id: 'routine-morning',
      name: 'Morning launch',
      kind: 'morning',
      description: 'Start the day with a clear top three and a fresh command brief.',
      cadence: { type: 'daily' },
      timeWindow: { start: '06:00', end: '09:00' },
      enabled: true,
      steps: [
        { id: 'morning-bed', title: 'Make the bed', integration: 'manual' },
        { id: 'morning-priorities', title: "Set today's top three priorities", integration: 'habit', habitId: 'habit-plan' },
        { id: 'morning-brief', title: 'Run the Morning Command Brief', integration: 'automation', automationId: 'morning-brief', automationAction: 'run' },
      ],
    },
    {
      id: 'routine-evening',
      name: 'Evening wind-down',
      kind: 'evening',
      description: 'Close the day out and stage tomorrow so mornings start calm.',
      cadence: { type: 'daily' },
      timeWindow: { start: '20:00', end: '22:30' },
      enabled: true,
      steps: [
        { id: 'evening-tidy', title: 'Tidy the kitchen', integration: 'manual' },
        { id: 'evening-prep', title: "Stage tomorrow's top task", integration: 'task', taskTemplate: { title: "Prep tomorrow's top task", domain: 'Personal', priority: 'medium' } },
        { id: 'evening-lights', title: 'Lights out by 10:30', integration: 'manual' },
      ],
    },
    {
      id: 'routine-weekly-planning',
      name: 'Weekly planning session',
      kind: 'weekly',
      description: 'Close financial loose ends and line up the week ahead.',
      cadence: { type: 'weekly', weekdays: [0] },
      timeWindow: { start: '17:00', end: '19:00' },
      enabled: true,
      steps: [
        { id: 'weekly-finance-review', title: 'Reconcile rental receipts', integration: 'task', taskId: 'task-4' },
        { id: 'weekly-finance-snapshot', title: 'Run the Weekly Finance Snapshot', integration: 'automation', automationId: 'weekly-finance', automationAction: 'run' },
        { id: 'weekly-calendar-review', title: 'Review the calendar for next week', integration: 'manual' },
      ],
    },
    {
      id: 'routine-household-reset',
      name: 'Sunday home reset',
      kind: 'household',
      description: 'Keep the household running: laundry, pantry, and a clean reset.',
      cadence: { type: 'weekly', weekdays: [0] },
      timeWindow: { start: '10:00', end: '13:00' },
      enabled: true,
      steps: [
        { id: 'household-reset-checkin', title: 'Sunday home reset check-in', integration: 'habit', habitId: 'habit-reset' },
        { id: 'household-laundry', title: 'Run a load of laundry', integration: 'manual' },
        { id: 'household-pantry', title: 'Restock pantry staples', integration: 'task', taskTemplate: { title: 'Restock pantry staples', domain: 'Home', priority: 'low' } },
      ],
    },
    {
      id: 'routine-content-production',
      name: 'Weekly content production',
      kind: 'content',
      description: 'Turn saved ideas into a produced, reviewed content batch.',
      cadence: { type: 'weekly', weekdays: [5] },
      timeWindow: { start: '09:00', end: '12:00' },
      enabled: true,
      steps: [
        { id: 'content-planning', title: 'Run the Content Planning Session', integration: 'automation', automationId: 'content-planning', automationAction: 'run' },
        { id: 'content-script', title: 'Draft the short-form script', integration: 'task', taskTemplate: { title: 'Draft short-form script', domain: 'Work', priority: 'medium' } },
        { id: 'content-record', title: 'Record and review footage', integration: 'manual' },
      ],
    },
    {
      id: 'routine-finance-deep-clean',
      name: 'Bi-weekly finance deep clean',
      kind: 'custom',
      description: 'A deeper account reconciliation pass every other week.',
      cadence: { type: 'custom', intervalDays: 14, anchorDate: '2026-09-06' },
      timeWindow: { start: '18:00', end: '20:00' },
      enabled: false,
      steps: [
        { id: 'finance-reconcile', title: 'Reconcile all accounts', integration: 'manual' },
        { id: 'finance-followup', title: 'Reconcile rental receipts', integration: 'task', taskId: 'task-4' },
      ],
    },
  ],
  instances: [],
}
