import type { TaskData } from '../models/task'

const dateOffset = (offset: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

// Centralized mock data only. No integrations or user data are accessed.
export const taskMockData: TaskData = {
  tasks: [
    { id: 'task-1', title: 'Review automation handoff', domain: 'Work', priority: 'high', status: 'in-progress', dueDate: dateOffset(-1), source: 'Automations' },
    { id: 'task-2', title: 'Send project update', domain: 'Work', priority: 'high', status: 'todo', dueDate: dateOffset(0), source: 'Today' },
    { id: 'task-3', title: 'Book annual physical', domain: 'Health', priority: 'medium', status: 'todo', dueDate: dateOffset(0), source: 'Health' },
    { id: 'task-4', title: 'Reconcile rental receipts', domain: 'Finances', priority: 'medium', status: 'todo', dueDate: dateOffset(2), source: 'Finances' },
    { id: 'task-5', title: 'Order pantry staples', domain: 'Home', priority: 'low', status: 'todo', dueDate: dateOffset(4), source: 'Home' },
    { id: 'task-6', title: 'Outline Sunday reset', domain: 'Personal', priority: 'low', status: 'completed', dueDate: dateOffset(-2), source: 'Today' },
  ],
}
