export type ProjectDomain = 'Product' | 'Content' | 'Home' | 'Finance' | 'Personal'
export type ProjectStatus = 'active' | 'planning' | 'paused' | 'completed'
export interface ProjectMilestone { id: string; title: string; completed: boolean }
export interface Project { id: string; title: string; description: string; domain: ProjectDomain; status: ProjectStatus; targetDate: string; progress: number; milestones: ProjectMilestone[]; linkedTaskIds: string[] }
export interface ProjectData { projects: Project[] }
