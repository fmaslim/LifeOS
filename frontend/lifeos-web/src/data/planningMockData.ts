import type { PlanningData } from '../models/planning'

// Frontend-only seed data. Links and dependencies reference real ids from goalMockData
// and projectMockData so planning reuses those existing records instead of duplicating
// them, matching the LifeOS convention used by routineMockData.
export const planningMockData: PlanningData = {
  links: [
    { id: 'link-goal-business-project-lifeos', goalId: 'goal-business', projectId: 'project-lifeos', note: 'LifeOS is the platform the client pipeline runs on.', createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'link-goal-content-project-content', goalId: 'goal-content', projectId: 'project-content', note: 'Corporate Collapse automation is the content system.', createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'link-goal-home-project-home', goalId: 'goal-home', projectId: 'project-home', note: 'ADU planning is the home refresh project.', createdAt: '2026-08-01T09:00:00.000Z' },
  ],
  dependencies: [
    { id: 'dep-project-content-project-lifeos', projectId: 'project-content', dependsOnProjectId: 'project-lifeos', reason: "Content automation ships on top of LifeOS's advanced workflows.", createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'dep-project-home-project-content', projectId: 'project-home', dependsOnProjectId: 'project-content', reason: 'ADU contractor bids wait on the content automation revenue lift.', createdAt: '2026-08-01T09:00:00.000Z' },
  ],
}
