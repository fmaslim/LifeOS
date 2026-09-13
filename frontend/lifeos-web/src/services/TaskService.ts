import type { TaskData } from '../models/task'

/** Contract for Tasks data. A backend adapter can replace the local mock later. */
export interface TaskService { getTaskData(): TaskData }
