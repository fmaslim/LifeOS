import assert from 'node:assert/strict'
import test from 'node:test'
import { MockGitHubProjectProvider, ProviderBackedGitHubProjectService } from '../src/services/GitHubProjectService.ts'

test('GitHub project data is supplied through a provider boundary with working links', () => {
  const data = new ProviderBackedGitHubProjectService(new MockGitHubProjectProvider()).getProjectData(); const repository = data.repositories[0]
  assert.equal(data.connection, 'connected'); assert.match(repository?.issues[0]?.url ?? '', /^https:\/\/github\.com\//); assert.equal(repository?.checks[0]?.state, 'success'); assert.ok(repository?.agentActivity.length)
})

test('GitHub provider failures are isolated', () => {
  const data = new ProviderBackedGitHubProjectService({ getProjects: () => { throw new Error('offline') } }).getProjectData()
  assert.equal(data.connection, 'disconnected'); assert.deepEqual(data.repositories, [])
})
