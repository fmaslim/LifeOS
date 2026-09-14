import type { GitHubProjectData } from '../models/githubProject.ts'
export interface GitHubProjectProvider { getProjects(): GitHubProjectData }
export interface GitHubProjectService { getProjectData(): GitHubProjectData }
export class ProviderBackedGitHubProjectService implements GitHubProjectService {
  private readonly provider: GitHubProjectProvider
  constructor(provider: GitHubProjectProvider) { this.provider = provider }
  getProjectData() { try { return this.provider.getProjects() } catch { return { connection: 'disconnected' as const, repositories: [], message: 'GitHub project data is unavailable. Other LifeOS workspaces remain operational.' } } }
}

const base = 'https://github.com/fmaslim/LifeOS'
export class MockGitHubProjectProvider implements GitHubProjectProvider { getProjects(): GitHubProjectData { return { connection: 'connected', fetchedAt: new Date().toISOString(), repositories: [{ fullName: 'fmaslim/LifeOS', url: base, defaultBranch: 'main', issues: [{ id: '74', title: 'Add GitHub project dashboard', detail: 'Roadmap · open', url: `${base}/issues/74`, state: 'open' }], pullRequests: [{ id: '99', title: 'Connect Jarvis provider boundary', detail: 'Merged to main', url: `${base}/pull/99`, state: 'merged' }], checks: [{ id: 'frontend', title: 'Frontend validation', detail: 'Lint, unit, build, E2E', url: `${base}/actions`, state: 'success' }], commits: [{ id: 'latest', title: 'Connect Jarvis provider boundary', detail: 'main · recent', url: `${base}/commits/main`, state: 'info' }], agentActivity: [{ id: 'agent-74', title: 'Issue #74 implementation active', detail: 'Dedicated branch', url: `${base}/tree/agent/issue-74`, state: 'pending' }] }] } } }
export class MockGitHubProjectService extends ProviderBackedGitHubProjectService { constructor(provider: GitHubProjectProvider = new MockGitHubProjectProvider()) { super(provider) } }
