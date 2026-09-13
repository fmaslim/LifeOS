import { projectMockData } from '../data/projectMockData'; import type { ProjectData } from '../models/project'; import type { ProjectService } from './ProjectService'
export class MockProjectService implements ProjectService { getProjectData(): ProjectData { return projectMockData } }
