import type { NotificationData } from '../models/notification'
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
export const notificationMockData: NotificationData = { notifications: [
  { id: 'notice-1', title: 'Automation needs attention', message: 'One scheduled workflow is waiting for review.', source: 'Automations', severity: 'important', timestamp: ago(12), read: false, route: 'automations' },
  { id: 'notice-2', title: 'Task due today', message: 'Review the LifeOS release checklist.', source: 'Tasks', severity: 'normal', timestamp: ago(38), read: false, route: 'tasks' },
  { id: 'notice-3', title: 'Document risk flagged', message: 'DocIQ found an item that needs manual review.', source: 'DocIQ', severity: 'critical', timestamp: ago(90), read: false, route: 'dociq' },
  { id: 'notice-4', title: 'Content package ready', message: 'Your latest short package is ready to review.', source: 'Content', severity: 'normal', timestamp: ago(170), read: true, route: 'content' },
  { id: 'notice-5', title: 'Health routine reminder', message: 'Recovery walk is scheduled for this afternoon.', source: 'Health', severity: 'normal', timestamp: ago(260), read: true, route: 'health' },
  { id: 'notice-6', title: 'Goal milestone approaching', message: 'The local-first foundation milestone is due soon.', source: 'Goals', severity: 'important', timestamp: ago(540), read: false, route: 'goals' },
] }
