export type GitHubConnectionState = 'connected' | 'stale' | 'loading' | 'unauthorized' | 'disconnected'
export interface GitHubProjectItem { id: string; title: string; detail: string; url: string; state: 'open' | 'merged' | 'success' | 'failure' | 'pending' | 'info' }
export interface GitHubRepositoryProject { fullName: string; url: string; defaultBranch: string; issues: GitHubProjectItem[]; pullRequests: GitHubProjectItem[]; checks: GitHubProjectItem[]; commits: GitHubProjectItem[]; agentActivity: GitHubProjectItem[] }
export interface GitHubProjectData { connection: GitHubConnectionState; fetchedAt?: string; repositories: GitHubRepositoryProject[]; message?: string }
