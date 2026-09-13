import type { ActivityData } from '../models/activity'
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
export const activityMockData: ActivityData = { events: [
  { id: 'act-1', timestamp: ago(8), source: 'Automations', type: 'Run completed', description: 'Morning LifeOS review finished successfully.', status: 'success', route: 'automations' },
  { id: 'act-2', timestamp: ago(34), source: 'Jarvis', type: 'Prospect qualified', description: 'A new high-fit prospect entered the review queue.', status: 'in-progress', route: 'jarvis' },
  { id: 'act-3', timestamp: ago(75), source: 'Content', type: 'Draft ready', description: 'A new short-form script package is ready.', status: 'success', route: 'content' },
  { id: 'act-4', timestamp: ago(140), source: 'DocIQ', type: 'Risk flagged', description: 'One document item needs review.', status: 'attention', route: 'dociq' },
  { id: 'act-5', timestamp: ago(240), source: 'Tasks', type: 'Task completed', description: 'Review weekly operating priorities.', status: 'success', route: 'tasks' },
  { id: 'act-6', timestamp: ago(460), source: 'Goals', type: 'Milestone updated', description: 'LifeOS foundation milestone advanced.', status: 'in-progress', route: 'goals' },
  { id: 'act-7', timestamp: ago(780), source: 'Home', type: 'Maintenance scheduled', description: 'HVAC inspection added to the home plan.', status: 'info', route: 'home' },
  { id: 'act-8', timestamp: ago(1200), source: 'Health', type: 'Routine logged', description: 'Recovery walk marked complete.', status: 'success', route: 'health' },
  { id: 'act-9', timestamp: ago(1700), source: 'Finances', type: 'Payment recorded', description: 'Monthly housing payment recorded.', status: 'success', route: 'finances' },
] }
