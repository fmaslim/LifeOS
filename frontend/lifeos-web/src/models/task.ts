export type TaskStatus = 'todo' | 'in-progress' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskDomain = 'Work' | 'Home' | 'Health' | 'Finances' | 'Personal'

/** A portable task record; dates use the local YYYY-MM-DD format. */
export interface Task {
  id: string
  title: string
  domain: TaskDomain
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  source?: string
}

export interface TaskData { tasks: Task[] }
