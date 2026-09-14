import assert from 'node:assert/strict'
import test from 'node:test'
import { MockAgentProvider, ProviderBackedAgentControlService } from '../src/services/AgentControlService.ts'

test('monitoring and control use separate provider capabilities', () => {
  const provider = new MockAgentProvider(); const service = new ProviderBackedAgentControlService(provider, provider); const current = service.getStatus().tasks.find(task => task.state === 'current')!
  const stopped = service.control({ action: 'stop', taskId: current.id, idempotencyKey: 'stop-once' })
  assert.equal(stopped.accepted, true); assert.equal(service.getStatus().agentStatus, 'paused')
  service.control({ action: 'resume', taskId: current.id, idempotencyKey: 'resume-once' }); assert.equal(service.getStatus().agentStatus, 'running')
})

test('control requests are idempotent and provider outages are isolated', () => {
  const provider = new MockAgentProvider(); const service = new ProviderBackedAgentControlService(provider, provider); const request = { action: 'retry' as const, taskId: 'agent-failed', idempotencyKey: 'retry-once' }
  assert.equal(service.control(request).accepted, true); assert.match(service.control(request).message, /already/)
  const unavailable = new ProviderBackedAgentControlService({ readStatus: () => { throw new Error('offline') } }, provider).getStatus(); assert.equal(unavailable.connection, 'unavailable')
})
