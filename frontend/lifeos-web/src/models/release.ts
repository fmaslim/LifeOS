export type ReleaseComponent = 'frontend' | 'backend'
export type ReleaseState = 'current' | 'superseded' | 'failed'
export interface ReleaseRecord { id: string; component: ReleaseComponent; environment: string; commitSha: string; branch: string; buildId: string; imageId: string; revisionId: string; deployedAt: string; state: ReleaseState; sourceUrl?: string }
export interface RollbackGuidance { releaseId: string; summary: string; steps: string[]; approvalRequired: true }
