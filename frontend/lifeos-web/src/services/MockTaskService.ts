import { taskMockData } from '../data/taskMockData'
import type { TaskData } from '../models/task'
import type { TaskService } from './TaskService'

/** Local TaskService implementation used while Tasks is frontend-only. */
export class MockTaskService implements TaskService {
  getTaskData(): TaskData { return taskMockData }
}
